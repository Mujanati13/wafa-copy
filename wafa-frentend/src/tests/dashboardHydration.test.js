import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
async function setup(get, post) {
  const values = new Map();
  const events = [];
  const localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const context = vm.createContext({ localStorage, window: { dispatchEvent: event => events.push(event) }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, console, Date, URLSearchParams });
  const profile = new vm.SourceTextModule(await readFile(new URL('../utils/profileState.js', import.meta.url), 'utf8'), { context });
  const api = new vm.SyntheticModule(['api', 'safeLocalStorage'], function () { this.setExport('api', { get, post }); this.setExport('safeLocalStorage', localStorage); }, { context });
  const service = new vm.SourceTextModule(await readFile(new URL('../services/userService.js', import.meta.url), 'utf8'), { context });
  await service.link(specifier => specifier.includes('profileState') ? profile : api);
  await service.evaluate();
  const dashboard = new vm.SourceTextModule(await readFile(new URL('../services/dashboardService.js', import.meta.url), 'utf8'), { context });
  await dashboard.link(specifier => specifier.includes('userService') ? service : api);
  await dashboard.evaluate();
  return { userService: service.namespace.userService, dashboardService: dashboard.namespace.dashboardService, profile: profile.namespace, events, localStorage };
}

test('first profile hydration publishes the selected free module to same-tab subscribers', async () => {
  const request = deferred();
  let calls = 0;
  const state = await setup(() => { calls++; return request.promise; });
  state.localStorage.setItem('user', JSON.stringify({ _id: 'new-user', plan: 'Free' }));
  const first = state.userService.getUserProfile(true);
  const second = state.userService.getUserProfile(true);
  const user = { _id: 'new-user', plan: 'Free', semesters: ['S1'], freeModule: 'anatomie-1' };
  request.resolve({ data: { data: { user } } });
  assert.equal((await first).freeModule, 'anatomie-1');
  assert.equal((await second).freeModule, 'anatomie-1');
  assert.equal(calls, 1);
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].type, 'user-profile-updated');
  assert.equal(state.events[0].detail.freeModule, 'anatomie-1');
  assert.equal(state.profile.resolveProfileSemester(user, 'S4'), 'S1');
  assert.equal(JSON.parse(state.localStorage.getItem('user')).freeModule, 'anatomie-1');
});

test('unchanged refresh does not publish a second event or erase the current profile', async () => {
  const user = { _id: 'user', semesters: ['S1', 'S2'], freeModule: 'anatomie' };
  const request = deferred();
  let calls = 0;
  const state = await setup(() => ++calls === 1 ? Promise.resolve({ data: { data: { user } } }) : request.promise);
  await state.userService.getUserProfile();
  const refreshing = state.userService.getUserProfile(true);
  assert.equal(JSON.parse(state.localStorage.getItem('userProfile')).freeModule, 'anatomie');
  request.resolve({ data: { data: { user } } });
  await refreshing;
  assert.equal(state.events.length, 1);
  assert.equal(state.profile.resolveProfileSemester(user, 'S2'), 'S2');
});

test('an old session request cannot overwrite a new session profile', async () => {
  const old = deferred();
  const current = deferred();
  let calls = 0;
  const state = await setup(() => ++calls === 1 ? old.promise : current.promise);
  const first = state.userService.getUserProfile();
  state.userService.clearProfileCache();
  const second = state.userService.getUserProfile();
  old.resolve({ data: { data: { user: { _id: 'old-user' } } } });
  current.resolve({ data: { data: { user: { _id: 'new-user', freeModule: 'anatomie' } } } });
  assert.equal((await first)._id, 'new-user');
  assert.equal((await second)._id, 'new-user');
  assert.equal(JSON.parse(state.localStorage.getItem('userProfile'))._id, 'new-user');
  assert.equal(state.events.some(event => event.detail._id === 'old-user'), false);
});

test('dashboard refresh bypasses cached statistics and rank for the same semester', async () => {
  let statsCalls = 0, rankCalls = 0;
  const state = await setup(async url => {
    if (url.includes('my-stats')) return { data: { data: { stats: { examsCompleted: ++statsCalls } } } };
    if (url.includes('leaderboard')) return { data: { data: { userRank: ++rankCalls } } };
    return { data: { data: { user: { _id: 'user' } } } };
  });
  await state.userService.getUserProfile();
  assert.equal((await state.dashboardService.getUserStats('S1')).data.stats.examsCompleted, 1);
  assert.equal((await state.dashboardService.getUserStats('S1')).data.stats.examsCompleted, 1);
  assert.equal((await state.dashboardService.getUserStats('S1', true)).data.stats.examsCompleted, 2);
  assert.equal((await state.dashboardService.getLeaderboardRank('S1')).rank, 1);
  assert.equal((await state.dashboardService.getLeaderboardRank('S1', true)).rank, 2);
});

test('failed fresh analytics requests reject so the dashboard can show retry instead of zeros', async () => {
  const state = await setup(async () => { throw new Error('offline'); });
  state.localStorage.setItem('userProfile', JSON.stringify({ _id: 'user' }));
  await assert.rejects(state.dashboardService.getUserStats('S1', true), /offline/);
  await assert.rejects(state.dashboardService.getLeaderboardRank('S1', true), /offline/);
});


test('free-module activation publishes returned access before navigation', async () => {
  const selected = { _id: 'user', plan: 'Free', semesters: ['S1'], freeModule: 'anatomie' };
  const state = await setup(async () => ({}), async () => ({ data: { success: true, data: { user: selected } } }));
  state.localStorage.setItem('user', JSON.stringify({ _id: 'user', firstName: 'Student' }));
  await state.userService.selectFreeSemester('S1', 'anatomie');
  const stored = JSON.parse(state.localStorage.getItem('userProfile'));
  assert.equal(stored.freeModule, 'anatomie');
  assert.equal(stored.firstName, 'Student');
  assert.equal(state.events[0].detail.freeModule, 'anatomie');
  assert.equal((await state.userService.getUserProfile()).freeModule, 'anatomie');
});


test('forced profile refresh rejects instead of accepting an incomplete cached login profile', async () => {
  const state = await setup(async () => { throw new Error('profile offline'); });
  state.localStorage.setItem('user', JSON.stringify({ _id: 'user', plan: 'Free', semesters: ['S3'] }));
  await assert.rejects(state.userService.getUserProfile(true), /profile offline/);
});

test('access resolution can notify mounted consumers even when storage already has that profile', async () => {
  const state = await setup(async () => ({}));
  const user = { _id: 'user', plan: 'Free', freeModule: 'anatomy', semesters: ['S3'] };
  state.localStorage.setItem('userProfile', JSON.stringify(user));
  state.profile.publishUserProfile(user, { notify: true });
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].detail.freeModule, 'anatomy');
});
