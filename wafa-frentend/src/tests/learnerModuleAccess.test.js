import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function setup() {
  const values = new Map(), published = [], modules = [];
  const first = { _id: 'first', plan: 'Free', semesters: ['S1'] };
  const setAccount = user => {
    values.set('user', JSON.stringify(user));
    values.set('userProfile', JSON.stringify(user));
  };
  setAccount(first);
  const access = deferred(); let accessCalls = 0;
  const userService = { _profileGeneration: 0, checkFreeSemesterStatus: () => { accessCalls++; return access.promise; } };
  const context = vm.createContext({ localStorage: { getItem: key => values.get(key) ?? null }, console });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const cache = new vm.SourceTextModule(await readFile(new URL('../services/learnerCache.js', import.meta.url), 'utf8'), { context });
  const service = new vm.SourceTextModule(await readFile(new URL('../services/learnerModuleService.js', import.meta.url), 'utf8'), { context });
  const deps = {
    './learnerCache': cache,
    './userService': synthetic({ userService }),
    './moduleService': synthetic({ moduleService: { getModuleById: async id => {
      modules.push(id); return { data: { data: { _id: id } } };
    } } }),
    '../utils/subscriptionDisplay': synthetic({ isPremiumPlan: plan => plan !== 'Free' }),
    '../utils/profileState': synthetic({ publishUserProfile: user => { published.push(user); setAccount(user); } }),
  };
  await service.link(specifier => deps[specifier]);
  await service.evaluate();
  return { first, setAccount, access, userService, published, modules,
    get accessCalls() { return accessCalls; }, getLearnerModules: service.namespace.getLearnerModules };
}

test('free access resolution shares one request and publishes the assignment', async () => {
  const state = await setup();
  const first = state.getLearnerModules(state.first);
  const second = state.getLearnerModules(state.first);
  state.access.resolve({ data: { plan: 'Free', currentSemesters: ['S1'], freeModule: 'module' } });
  await Promise.all([first, second]);
  assert.equal(state.accessCalls, 1);
  assert.equal(state.published.length, 1);
  assert.deepEqual(state.modules, ['module']);
});

for (const change of ['account', 'session', 'access']) {
  test(`a late free-access response cannot publish after a ${change} change`, async () => {
    const state = await setup();
    const pending = state.getLearnerModules(state.first);
    await Promise.resolve();
    assert.equal(state.accessCalls, 1);
    if (change === 'session') state.userService._profileGeneration++;
    else state.setAccount(change === 'account' ? { _id: 'second', plan: 'Free' } : { ...state.first, semesters: ['S2'] });
    state.access.resolve({ data: { plan: 'Free', currentSemesters: ['S1'], freeModule: 'module' } });
    await assert.rejects(pending, /session changed/);
    assert.equal(state.published.length, 0);
    assert.equal(state.modules.length, 0);
  });
}

test('an old caller is rejected even if the account changes before the request starts', async () => {
  const state = await setup();
  const pending = state.getLearnerModules(state.first);
  state.setAccount({ _id: 'second', plan: 'Free' });
  await assert.rejects(pending, /session changed/);
  await assert.rejects(state.getLearnerModules(state.first), /session changed/);
  assert.equal(state.accessCalls, 0);
  assert.equal(state.published.length, 0);
});
