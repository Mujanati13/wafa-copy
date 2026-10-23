import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as router from 'react-router-dom';
import { act, create } from 'react-test-renderer';
import { transform } from 'esbuild';
import { exitExam } from '../utils/authNavigation.js';
import * as subscriptionDisplay from '../utils/subscriptionDisplay.js';
import { mountExam } from './helpers/examPageHarness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const textContent = node => typeof node === 'string' ? node : node.children.map(textContent).join('');

test('Exit returns to the saved origin across intermediate history entries', () => {
  const calls = [];
  exitExam((...args) => calls.push(args), { historyIndex: 9, origin: {
    pathname: '/dashboard/subjects/m1', search: '?type=course&q=Thyro', hash: '#courses',
    key: 'origin', historyIndex: 5, position: { top: 1240, left: 0 }, state: null,
  } });
  assert.deepEqual(calls, [[-4]]);
});

test('Exit from a direct course link has a usable module fallback', () => {
  const calls = [];
  exitExam((...args) => calls.push(args), { historyIndex: 0, examType: 'course', moduleId: 'm1' });
  assert.deepEqual(calls, [['/dashboard/subjects/m1?type=course', { replace: true }]]);
});

async function mountLibrary({ plan = 'Premium Pro', entry, storageUnavailable = false, pageName = 'SubjectsPage', listData = null, statsData = null, moduleData = {}, metadataRead = null } = {}) {
  entry ||= pageName === 'SubjectsPage' ? '/dashboard/subjects/m1?ref=bookmark'
    : pageName === 'Myplaylist' ? '/dashboard/playlist' : '/dashboard/playlists';
  const snapshots = new Map();
  const moduleRequests = [];
  const moduleReadOptions = [];
  const scrolls = [];
  const browser = { history: { scrollRestoration: 'auto' }, scrollX: 0, scrollY: 0,
    addEventListener() {}, removeEventListener() {},
    scrollTo(position) { scrolls.push(position); this.scrollX = position.left; this.scrollY = position.top; } };
  let nextModuleLoad;
  let currentLocation;
  let navigate;
  let historyIndex = 1;
  const historyEntries = new Map();
  const moduleResponse = id => ({ data: { data: { _id: id, name: 'Endocrinologie', semester: 'S1', ...moduleData } } });
  const context = vm.createContext({ console, URLSearchParams, AbortController, window: browser,
    localStorage: { getItem: () => JSON.stringify({ _id: 'student', plan, freeModule: 'm1' }) },
    sessionStorage: {
      getItem(key) { if (storageUnavailable) throw new Error('storage denied'); return snapshots.get(key) ?? null; },
      setItem(key, value) { if (storageUnavailable) throw new Error('storage denied'); snapshots.set(key, value); },
    },
  });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const button = ({ children, ...props }) => React.createElement('button', props, children);
  const source = await readFile(new URL(`../pages/${pageName}.jsx`, import.meta.url), 'utf8');
  const playlists = [{ _id: 'playlist-1', title: 'Thyroïde', description: 'Hormones', questionIds: ['q1'], questions: ['q1'] }];
  const deps = {
    react: synthetic({ ...React, default: React }),
    'react/jsx-runtime': synthetic(jsxRuntime),
    'react-router-dom': synthetic(router),
    'react-i18next': synthetic({ useTranslation: () => ({ t: (key, fallback) => fallback || key }) }),
    'framer-motion': synthetic({ motion: { div: primitive, button }, AnimatePresence: primitive }),
    sonner: synthetic({ toast: { info() {} } }),
    '@/services/moduleService': synthetic({ moduleService: { getModuleById: async id => {
      if (nextModuleLoad) { const pending = nextModuleLoad; nextModuleLoad = null; return pending; }
      return metadataRead ? metadataRead(id) : moduleResponse(id);
    }, getModuleList: async (id, type, forceRefresh) => { moduleRequests.push(type); moduleReadOptions.push({ id, type, forceRefresh }); if (typeof listData === 'function') return { data: { data: await listData(id, type) } }; return ({ data: { data: listData?.[type] ?? (type === 'course' ? [
      { _id: 'course-1', name: 'Thyroïde', category: 'Hormones', totalQuestions: 98 },
      { _id: 'course-2', name: 'Diabète', category: 'Métabolisme', totalQuestions: 20 },
    ] : type === 'year' ? [{ _id: 'year-1', name: '2024 normale', year: 2024, totalQuestions: 10 }]
    : [{ _id: 'qcm-1', name: 'QCM', totalQuestions: 5 }]) } }); } } }),
    '@/lib/utils': synthetic({ cn: (...values) => values.filter(Boolean).join(' '), api: { get: async url => ({ data: { data:
      url.startsWith('/exam-courses/') ? [
        { _id: 'course-1', name: 'Thyroïde', category: 'Hormones', totalQuestions: 98 },
        { _id: 'course-2', name: 'Diabète', category: 'Métabolisme', totalQuestions: 20 },
      ] : url.startsWith('/exams/') ? [{ _id: 'year-1', name: '2024 normale', year: 2024, totalQuestions: 10 }]
        : url.startsWith('/qcm-banque/') ? [{ _id: 'qcm-1', name: 'QCM', totalQuestions: 5 }]
          : url === '/playlists' ? playlists : url.startsWith('/modules/') ? statsData : null,
    } }) } }),
    '@/context/SemesterContext': synthetic({ useSemester: () => ({ selectedSemester: 'S1', user: { _id: 'student', plan, freeModule: 'm1' }, loading: false }) }),
    '@/utils/subscriptionDisplay': synthetic(subscriptionDisplay),
    '@/services/playlistService': synthetic({ playlistService: { getAll: async () => ({ data: playlists }) } }),
    '@/components/shared': synthetic({ PageHeader: primitive }),
    '@/lib/mediaUrl': synthetic({ resolveMediaUrl: value => value }),
    '@/utils/examProgress': synthetic({ EXAM_PROGRESS_UPDATED_EVENT: 'progress-updated', getSessionExamCompletedCount: () => 0 }),
    '@/utils/examNavigation': new vm.SourceTextModule(await readFile(new URL('../utils/examNavigation.js', import.meta.url), 'utf8'), { context }),
    '@/hooks/useExamReturnPosition': new vm.SourceTextModule(await readFile(new URL('../hooks/useExamReturnPosition.js', import.meta.url), 'utf8'), { context }),
  };
  const icons = source.match(/import\s*{([^}]+)}\s*from\s*["']lucide-react["']/)[1].split(',').map(name => name.trim()).filter(Boolean);
  deps['lucide-react'] = synthetic(Object.fromEntries(icons.map(name => [name, () => null])));
  for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*["'](@\/components\/ui\/[^"' ]+)["']/g)) {
    deps[match[2]] = synthetic(Object.fromEntries(match[1].split(',').map(name => [name.trim(), name.trim() === 'Button' ? button
      : name.trim() === 'Input' ? props => React.createElement('input', props) : primitive])));
  }
  const compiled = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  const page = new vm.SourceTextModule(compiled.code, { context });
  await page.link(specifier => { assert.ok(deps[specifier], specifier); return deps[specifier]; });
  await page.evaluate();
  function ObserveLocation() {
    currentLocation = router.useLocation();
    navigate = router.useNavigate();
    const navigationType = router.useNavigationType();
    if (historyEntries.has(currentLocation.key)) historyIndex = historyEntries.get(currentLocation.key);
    else {
      if (navigationType === 'PUSH') historyIndex++;
      historyEntries.set(currentLocation.key, historyIndex);
    }
    browser.history.state = { idx: historyIndex };
    return null;
  }
  function ExamExit() {
    const go = router.useNavigate();
    return React.createElement('button', { onClick: () => exitExam(go, {
      origin: currentLocation.state?.examOrigin, historyIndex: browser.history.state.idx,
    }) }, 'Quitter');
  }
  let root;
  await act(async () => { root = create(React.createElement(router.MemoryRouter, {
    initialEntries: ['/dashboard/home', { pathname: entry.split('?')[0], search: entry.includes('?') ? '?' + entry.split('?')[1] : '', state: { source: 'module-list' } }], initialIndex: 1,
  }, React.createElement(ObserveLocation), React.createElement(router.Routes, null,
    React.createElement(router.Route, { path: pageName === 'SubjectsPage' ? '/dashboard/subjects/:courseId'
      : pageName === 'Myplaylist' ? '/dashboard/playlist' : '/dashboard/playlists', element: React.createElement(page.namespace.default) }),
    React.createElement(router.Route, { path: '/exam/:examId', element: React.createElement(ExamExit) }),
    React.createElement(router.Route, { path: '*', element: React.createElement('p', null, 'Autre page') }),
  ))); });
  return { root, browser, snapshots, scrolls, moduleRequests, moduleReadOptions,
    get location() { return currentLocation; },
    click: async label => act(async () => {
      const control = root.root.findAllByType('button').find(node => textContent(node).includes(label));
      assert.ok(control, `Missing button: ${label}`);
      control.props.onClick();
    }),
    search: async value => act(async () => root.root.findByProps({ id: 'library-exam-search', type: 'search' }).props.onChange({ target: { value } })),
    go: async (target, options) => act(async () => navigate(target, options)),
    delayNextLoad() {
      let resolve;
      nextModuleLoad = new Promise(done => { resolve = done; });
      return async () => act(async () => resolve(moduleResponse('m1')));
    },
    unmount: async () => act(async () => root.unmount()),
  };
}

for (const back of ['exit', 'browser']) {
  test(`${back} Back restores the course section, category, search and scroll after loading`, async () => {
    const screen = await mountLibrary();
    try {
      await screen.click('Examens par cours');
      await screen.click('Hormones');
      await screen.search('Thyro');
      const origin = screen.location;
      assert.equal(new URLSearchParams(origin.search).get('ref'), 'bookmark');
      screen.browser.scrollY = 1240;
      await screen.click('Commencer');
      assert.equal(screen.location.pathname + screen.location.search, '/exam/course-1?type=course');
      screen.browser.scrollY = 0;
      const finishLoading = screen.delayNextLoad();
      if (back === 'exit') await screen.click('Quitter');
      else await screen.go(-1);
      assert.equal(screen.scrolls.length, 0, 'must wait for the full list before restoring scroll');
      await finishLoading();
      assert.equal(screen.location.key, origin.key);
      assert.deepEqual(screen.location.state, { source: 'module-list' });
      assert.equal(screen.root.root.findByProps({ id: 'library-exam-search', type: 'search' }).props.value, 'Thyro');
      for (const label of ['Examens par cours', 'Hormones']) {
        assert.equal(screen.root.root.findAllByType('button').find(node => textContent(node).includes(label)).props['aria-pressed'], true);
      }
      assert.equal(JSON.stringify(screen.root.toJSON()).includes('Diabète'), false);
      assert.deepEqual({ ...screen.scrolls.at(-1) }, { top: 1240, left: 0, behavior: 'instant' });
      // Filter changes replace the origin entry; another Back reaches the actual previous page.
      await screen.go(-1);
      assert.equal(screen.location.pathname, '/dashboard/home');
    } finally { await screen.unmount(); }
  });
}

test('a fresh visit to another module does not inherit the previous library view or scroll', async () => {
  const screen = await mountLibrary();
  try {
    await screen.click('Examens par cours');
    await screen.click('Hormones');
    await screen.search('Thyro');
    screen.browser.scrollY = 750;
    await screen.click('Commencer');
    await screen.click('Quitter');
    screen.scrolls.length = 0;
    await screen.go('/dashboard/subjects/m2');
    assert.equal(screen.root.root.findAllByType('button').find(node => textContent(node).includes('Examens par année')).props['aria-pressed'], true);
    assert.equal(screen.root.root.findByProps({ id: 'library-exam-search', type: 'search' }).props.value, '');
    assert.equal(screen.scrolls.length, 0);
  } finally { await screen.unmount(); }
});

test('Back restores a previously returned module again after visiting a different module', async () => {
  const screen = await mountLibrary();
  try {
    await screen.click('Examens par cours');
    await screen.search('Thyro');
    const origin = screen.location;
    screen.browser.scrollY = 750;
    await screen.click('Commencer');
    await screen.click('Quitter');
    assert.equal(screen.browser.scrollY, 750);
    await screen.go('/dashboard/subjects/m2');
    screen.browser.scrollY = 0;
    screen.scrolls.length = 0;
    const finishLoading = screen.delayNextLoad();
    await screen.go(-1);
    assert.equal(screen.location.key, origin.key);
    assert.equal(screen.scrolls.length, 0, 'wait until the original module finishes loading');
    await finishLoading();
    assert.equal(screen.browser.scrollY, 750, 'the same history entry must restore on each return');
    assert.equal(screen.location.search, origin.search);
  } finally { await screen.unmount(); }
});

test('unavailable session storage does not prevent opening or exiting a course', async () => {
  const screen = await mountLibrary({ storageUnavailable: true });
  try {
    await screen.click('Examens par cours');
    await screen.search('Thyro');
    await screen.click('Commencer');
    await screen.click('Quitter');
    assert.equal(new URLSearchParams(screen.location.search).get('type'), 'course');
    assert.equal(screen.root.root.findByProps({ id: 'library-exam-search', type: 'search' }).props.value, 'Thyro');
  } finally { await screen.unmount(); }
});

test('a restored URL cannot bypass free-plan section access', async () => {
  const screen = await mountLibrary({ plan: 'Free', entry: '/dashboard/subjects/m1?type=course&category=Hormones' });
  try {
    assert.equal(new URLSearchParams(screen.location.search).has('type'), false);
    assert.equal(new URLSearchParams(screen.location.search).has('category'), false);
    assert.equal(screen.root.root.findAllByType('button').find(node => textContent(node).includes('Examens par année')).props['aria-pressed'], true);
  } finally { await screen.unmount(); }
});

for (const [type, trigger] of ['course', 'exam'].flatMap(type => ['mobile', 'desktop', 'Escape'].map(trigger => [type, trigger]))) {
  test(`the real ${type} question page exits once via ${trigger}`, async () => {
    const root = await mountExam(type, { _id: 'exam', name: 'Endocrinologie', questions: {
      '24 normale': [{ _id: 'q1', text: 'Question', options: [{ text: 'Réponse', isCorrect: true }] }],
    } });
    try {
      const exits = root.root.findAllByType('button').filter(node => textContent(node) === 'Exit');
      assert.equal(exits.length, 2, 'mobile and desktop Exit controls');
      if (trigger === 'Escape') await root.harness.key('Escape');
      else await act(async () => exits[trigger === 'mobile' ? 0 : 1].props.onClick());
      // A second click/key event while navigation is pending must not skip the origin.
      for (const exit of exits) await act(async () => exit.props.onClick());
      await root.harness.key('Escape');
      assert.deepEqual(root.harness.navigation, [[-1]]);
    } finally { await act(async () => root.unmount()); }
  });
}

test('an intermediate question entry still exits to the original filtered course list and position', async () => {
  const screen = await mountLibrary();
  try {
    await screen.click('Examens par cours');
    await screen.search('Thyro');
    const origin = screen.location;
    screen.browser.scrollY = 850;
    await screen.click('Commencer');
    const stateAfterRefresh = JSON.parse(JSON.stringify(screen.location.state));
    await screen.go('/exam/another?type=course', { state: stateAfterRefresh });
    await screen.click('Quitter');
    assert.equal(screen.location.key, origin.key);
    assert.equal(screen.location.search, origin.search);
    assert.equal(screen.browser.scrollY, 850);
  } finally { await screen.unmount(); }
});

test('the explicit origin restores filters and scroll when its history index is no longer available', async () => {
  const screen = await mountLibrary();
  try {
    await screen.click('Examens par cours');
    await screen.search('Thyro');
    screen.browser.scrollY = 920;
    await screen.click('Commencer');
    screen.browser.scrollY = 0;
    screen.browser.history.state = { idx: 0 };
    await screen.click('Quitter');
    assert.equal(screen.location.pathname, '/dashboard/subjects/m1');
    assert.equal(new URLSearchParams(screen.location.search).get('q'), 'Thyro');
    assert.equal(screen.browser.scrollY, 920);
    const restoredCount = screen.scrolls.length;
    screen.browser.scrollY = 600;
    await screen.search('Thyr');
    assert.equal(screen.scrolls.length, restoredCount, 'editing filters must not replay an old return position');
  } finally { await screen.unmount(); }
});

for (const pageName of ['Myplaylist', 'PlaylistsPage']) {
  test(`${pageName} records its exact origin and restores its position after Exit`, async () => {
    const screen = await mountLibrary({ pageName });
    try {
      if (pageName === 'Myplaylist') {
        const search = screen.root.root.findAllByType('input').find(node => node.props.placeholder?.startsWith('Rechercher'));
        await act(async () => search.props.onChange({ target: { value: 'Thyro' } }));
      }
      const origin = screen.location;
      screen.browser.scrollY = 640;
      await screen.click("S'entraîner");
      assert.equal(screen.location.pathname + screen.location.search, '/exam/playlist-1?type=playlist');
      assert.equal(screen.location.state.examOrigin.pathname, origin.pathname);
      screen.browser.scrollY = 0;
      await screen.click('Quitter');
      assert.equal(screen.location.key, origin.key);
      assert.equal(screen.location.search, origin.search);
      assert.equal(screen.browser.scrollY, 640);
    } finally { await screen.unmount(); }
  });
}

test('the unavailable question screen returns to the saved origin instead of the dashboard', async () => {
  const origin = { pathname: '/dashboard/subjects/m1', search: '?type=course', key: 'origin', historyIndex: 1 };
  const root = await mountExam('course', {}, { fetchFailure: true, historyIndex: 3, location: { state: { examOrigin: origin } } });
  try {
    await act(async () => root.root.findByProps({ 'aria-label': 'Retour à la page précédente' }).props.onClick());
    assert.deepEqual(root.harness.navigation, [[-2]]);
  } finally { await act(async () => root.unmount()); }
});

test('directly opened questions return to their course module when there is no Back entry', async () => {
  const root = await mountExam('course', { _id: 'course', moduleId: 'm1', name: 'Endocrinologie', questions: {
    '24 normale': [{ _id: 'q1', text: 'Question', options: [{ text: 'Réponse', isCorrect: true }] }],
  } }, { historyIndex: 0 });
  try {
    const exit = root.root.findAllByType('button').find(node => textContent(node) === 'Exit');
    await act(async () => exit.props.onClick());
    assert.deepEqual(JSON.parse(JSON.stringify(root.harness.navigation)), [['/dashboard/subjects/m1?type=course', { replace: true }]]);
  } finally { await act(async () => root.unmount()); }
});

for (const firstSession of ['24 premier exceptionnel', '24 1ère session exceptionnelle']) {
test(`both real question sidebars keep ${firstSession} visible and selectable alongside 2024 sessions`, async () => {
  const labels = ['17 normale', '24 rattrapage', firstSession, '23 normale', '25 normale', '24 normale', '2026 ratt'];
  const expected = ['2026 ratt', '25 normale', firstSession, '24 normale', '24 rattrapage', '23 normale', '17 normale'];
  const root = await mountExam('course', { _id: 'course', name: 'Endocrinologie', questions: Object.fromEntries(
    labels.map((label, index) => [label, [{ _id: `q${index}`, text: `Question de ${label}`, options: [{ text: 'Réponse', isCorrect: true }] }]]),
  ) });
  try {
    await act(async () => root.root.findByProps({ 'aria-label': 'Show questions' }).props.onClick());
    const sessionHeaders = root.root.findAll(node => typeof node.type === 'string'
      && expected.some(label => node.props['aria-label'] === `Progression ${label}`));
    assert.deepEqual(sessionHeaders.map(node => node.props['aria-label'].replace('Progression ', '')), [...expected, ...expected]);
    const firstSessionQuestions = root.root.findAllByType('button').filter(node => node.props['data-question-id'] === 'q2');
    assert.equal(firstSessionQuestions.length, 2, 'the exceptional session question is present in each sidebar');
    await act(async () => firstSessionQuestions[1].props.onClick());
    const questionCard = root.root.find(node => node.type === 'div' && node.props.className?.includes('exam-question-card'));
    assert.ok(textContent(questionCard).includes(`Question de ${firstSession}`));
  } finally { await act(async () => root.unmount()); }
});
}


for (const [type, category, title] of [['year', 'Exam par years', 'Legacy annual'], ['qcm', 'QCM banque', 'Legacy bank']]) {
  test(`an empty ${type} endpoint preserves exams from older course imports`, async () => {
    const screen = await mountLibrary({ entry: `/dashboard/subjects/m1?type=${type}`, listData: {
      [type]: [], course: [{ _id: 'legacy', name: title, category, totalQuestions: 5 }],
    } });
    try {
      assert.ok(textContent(screen.root.root).includes(title));
      assert.deepEqual(screen.moduleRequests, [type, 'course']);
    } finally { await screen.unmount(); }
  });
}

test('empty free annual lists do not request premium course fallbacks', async () => {
  const screen = await mountLibrary({ plan: 'Free', listData: { year: [], course: [{ _id: 'legacy', name: 'Locked legacy', category: 'Exam par years' }] } });
  try { assert.deepEqual(screen.moduleRequests, ['year']); }
  finally { await screen.unmount(); }
});

test('module progress uses the fresh statistics denominator instead of a cached catalog count', async () => {
  const screen = await mountLibrary({ moduleData: { totalQuestions: 10 }, statsData: { totalQuestions: 20, questionsAnswered: 3, percentage: 15 } });
  try {
    const labels = screen.root.root.findAllByType('span').map(textContent);
    assert.ok(labels.includes('3 / 20 questions'));
    assert.ok(screen.root.root.findAllByProps({ role: 'progressbar' }).some(node => node.props['aria-valuenow'] === 15));
  } finally { await screen.unmount(); }
});

test('metadata errors remain visible when only the library tab changes', async () => {
  const screen = await mountLibrary({ metadataRead: async () => { throw new Error('metadata unavailable'); } });
  try {
    assert.ok(textContent(screen.root.root).includes('Contenu indisponible'));
    await screen.go('/dashboard/subjects/m1?type=course');
    assert.ok(textContent(screen.root.root).includes('Contenu indisponible'));
  } finally { await screen.unmount(); }
});

test('retrying a library request does not force every later tab request', async () => {
  let fail = true;
  const screen = await mountLibrary({ listData: async () => {
    if (fail) { fail = false; throw new Error('offline'); }
    return [{ _id: 'exam', name: 'Recovered', totalQuestions: 5 }];
  } });
  try {
    await screen.click('Réessayer');
    assert.equal(screen.moduleReadOptions.at(-1).forceRefresh, true);
    await screen.click('Examens par cours');
    assert.equal(screen.moduleReadOptions.at(-1).forceRefresh, false);
  } finally { await screen.unmount(); }
});

test('a retired module request does not start a legacy fallback after navigation', async () => {
  let release;
  const gate = new Promise(done => { release = done; });
  const screen = await mountLibrary({ listData: (id, type) => id === 'm1' && type === 'year' ? gate : [] });
  try {
    await screen.go('/dashboard/subjects/m2?type=course');
    await act(async () => release([]));
    assert.deepEqual(screen.moduleReadOptions.filter(request => request.id === 'm1').map(request => request.type), ['year']);
  } finally { release([]); await screen.unmount(); }
});
