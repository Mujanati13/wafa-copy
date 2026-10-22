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

async function mountLibrary({ plan = 'Premium Pro', entry = '/dashboard/subjects/m1?ref=bookmark', storageUnavailable = false } = {}) {
  const snapshots = new Map();
  const scrolls = [];
  const browser = { history: { scrollRestoration: 'auto' }, scrollX: 0, scrollY: 0,
    addEventListener() {}, removeEventListener() {},
    scrollTo(position) { scrolls.push(position); this.scrollX = position.left; this.scrollY = position.top; } };
  let nextModuleLoad;
  let currentLocation;
  let navigate;
  const moduleResponse = id => ({ data: { data: { _id: id, name: 'Endocrinologie', semester: 'S1' } } });
  const context = vm.createContext({ console, URLSearchParams, window: browser,
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
  const source = await readFile(new URL('../pages/SubjectsPage.jsx', import.meta.url), 'utf8');
  const deps = {
    react: synthetic({ ...React, default: React }),
    'react/jsx-runtime': synthetic(jsxRuntime),
    'react-router-dom': synthetic(router),
    sonner: synthetic({ toast: { info() {} } }),
    '@/services/moduleService': synthetic({ moduleService: { getModuleById: async id => {
      if (nextModuleLoad) { const pending = nextModuleLoad; nextModuleLoad = null; return pending; }
      return moduleResponse(id);
    } } }),
    '@/lib/utils': synthetic({ cn: (...values) => values.filter(Boolean).join(' '), api: { get: async url => ({ data: { data:
      url.startsWith('/exam-courses/') ? [
        { _id: 'course-1', name: 'Thyroïde', category: 'Hormones', totalQuestions: 98 },
        { _id: 'course-2', name: 'Diabète', category: 'Métabolisme', totalQuestions: 20 },
      ] : url.startsWith('/exams/') ? [{ _id: 'year-1', name: '2024 normale', year: 2024, totalQuestions: 10 }]
        : url.startsWith('/qcm-banque/') ? [{ _id: 'qcm-1', name: 'QCM', totalQuestions: 5 }] : null,
    } }) } }),
    '@/context/SemesterContext': synthetic({ useSemester: () => ({ selectedSemester: 'S1' }) }),
    '@/utils/subscriptionDisplay': synthetic(subscriptionDisplay),
    '@/lib/mediaUrl': synthetic({ resolveMediaUrl: value => value }),
    '@/utils/examProgress': synthetic({ EXAM_PROGRESS_UPDATED_EVENT: 'progress-updated', getSessionExamCompletedCount: () => 0 }),
  };
  const icons = source.match(/import\s*{([^}]+)}\s*from\s*"lucide-react"/)[1].split(',').map(name => name.trim()).filter(Boolean);
  deps['lucide-react'] = synthetic(Object.fromEntries(icons.map(name => [name, () => null])));
  for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*"(@\/components\/ui\/[^" ]+)"/g)) {
    deps[match[2]] = synthetic(Object.fromEntries(match[1].split(',').map(name => [name.trim(), name.trim() === 'Button' ? button : primitive])));
  }
  const compiled = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  const page = new vm.SourceTextModule(compiled.code, { context });
  await page.link(specifier => { assert.ok(deps[specifier], specifier); return deps[specifier]; });
  await page.evaluate();
  function ObserveLocation() {
    currentLocation = router.useLocation();
    navigate = router.useNavigate();
    return null;
  }
  function ExamExit() {
    const go = router.useNavigate();
    return React.createElement('button', { onClick: () => exitExam(go) }, 'Quitter');
  }
  let root;
  await act(async () => { root = create(React.createElement(router.MemoryRouter, {
    initialEntries: ['/dashboard/home', { pathname: entry.split('?')[0], search: entry.includes('?') ? '?' + entry.split('?')[1] : '', state: { source: 'module-list' } }], initialIndex: 1,
  }, React.createElement(ObserveLocation), React.createElement(router.Routes, null,
    React.createElement(router.Route, { path: '/dashboard/subjects/:courseId', element: React.createElement(page.namespace.default) }),
    React.createElement(router.Route, { path: '/exam/:examId', element: React.createElement(ExamExit) }),
    React.createElement(router.Route, { path: '*', element: React.createElement('p', null, 'Autre page') }),
  ))); });
  return { root, browser, snapshots, scrolls,
    get location() { return currentLocation; },
    click: async label => act(async () => {
      const control = root.root.findAllByType('button').find(node => textContent(node).includes(label));
      assert.ok(control, `Missing button: ${label}`);
      control.props.onClick();
    }),
    search: async value => act(async () => root.root.findByProps({ id: 'library-exam-search', type: 'search' }).props.onChange({ target: { value } })),
    go: async target => act(async () => navigate(target)),
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

for (const type of ['course', 'exam']) {
  test(`the real ${type} question page sends both Exit controls and Escape to browser Back`, async () => {
    const root = await mountExam(type, { _id: 'exam', name: 'Endocrinologie', questions: {
      '24 normale': [{ _id: 'q1', text: 'Question', options: [{ text: 'Réponse', isCorrect: true }] }],
    } });
    try {
      const exits = root.root.findAllByType('button').filter(node => textContent(node) === 'Exit');
      assert.equal(exits.length, 2, 'mobile and desktop Exit controls');
      for (const exit of exits) await act(async () => exit.props.onClick());
      await root.harness.key('Escape');
      assert.deepEqual(root.harness.navigation, [[-1], [-1], [-1]]);
    } finally { await act(async () => root.unmount()); }
  });
}

test('both real question sidebars keep the exceptional 2024 session visible and selectable', async () => {
  const labels = ['17 normale', '24 rattrapage', '24 1ère session exceptionnelle', '23 normale', '25 normale', '24 normale', '2026 ratt'];
  const expected = ['2026 ratt', '25 normale', '24 1ère session exceptionnelle', '24 normale', '24 rattrapage', '23 normale', '17 normale'];
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
    assert.ok(textContent(questionCard).includes('Question de 24 1ère session exceptionnelle'));
  } finally { await act(async () => root.unmount()); }
});
