import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';
import { transform } from 'esbuild';
import * as sessionSort from '../../utils/examSessionSort.js';
import * as questionProgress from '../../utils/questionProgress.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
export const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    key: index => [...values.keys()][index],
    get length() { return values.size; },
  };
};

export async function mountExam(type, data, options = {}) {
  let routeType = type;
  let routeData = data;
  let routeId = 'exam';
  const primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const button = ({ children, ...props }) => React.createElement('button', props, children);
  const navigation = [];
  const navigate = (...args) => navigation.push(args);
  const translate = key => key;
  const silentConsole = { log() {}, error() {}, warn() {} };
  const local = options.localStorage || storage();
  const sessions = options.sessionStorage || storage();
  const serverAnswers = options.serverAnswers || {};
  const events = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const calls = [];
  const published = [];
  const api = {
    get: async url => {
      calls.push({ method: 'get', url });
      if (url.startsWith('/questions/user-answers/')) {
        if (options.restoreFailure) throw new Error('offline');
        return { data: { data: serverAnswers } };
      }
      if (options.fetchFailure) throw new Error('exam request failed');
      return { data: { data: routeData, success: false } };
    },
    post: async (url, body) => {
      calls.push({ method: 'post', url, body });
      if (url === '/questions/verify-answer') {
        if (options.verifyFailure) throw new Error('verification failed');
        const questions = Array.isArray(routeData.questions) ? routeData.questions : Object.values(routeData.questions || {}).flat();
        const question = questions.find(q => q._id === body.questionId);
        const correct = question.options.flatMap((option, index) => option.isCorrect ? [index] : []);
        const isCorrect = body.selectedAnswers.length === correct.length && body.selectedAnswers.every(i => correct.includes(i));
        return { data: { data: { isCorrect, totalPoints: 1 } } };
      }
      if (url === '/questions/save-answer') {
        if (options.saveFailure) throw new Error('save failed');
        if (options.beforeSave) await options.beforeSave(body);
        if (body.reset) delete serverAnswers[body.questionId];
        else serverAnswers[body.questionId] = { ...body };
        return { data: { success: true, data: { ...body,
          completedQuestions: Object.values(serverAnswers).filter(a => a.isVerified).length } } };
      }
      return { data: { success: true } };
    },
  };
  const context = vm.createContext({
    console: silentConsole, localStorage: local, sessionStorage: sessions,
    setTimeout: (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
    clearTimeout: id => timers.delete(id), setInterval: () => 1, clearInterval() {},
    window: {
      history: { state: { idx: options.historyIndex ?? 1 } },
      addEventListener(type, handler) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(handler); },
      removeEventListener(type, handler) { events.get(type)?.delete(handler); }, scrollTo() {},
    },
    document: { querySelector: () => null, createElement: () => ({ style: {} }), head: { appendChild() {} },
      body: { style: {} }, documentElement: { classList: { contains: () => false } } },
  });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const source = await readFile(new URL('../../pages/ExamPage.jsx', import.meta.url), 'utf8');
  const deps = {
    react: synthetic({ ...React, default: React }),
    'react/jsx-runtime': synthetic(jsxRuntime),
    'react-i18next': synthetic({ useTranslation: () => ({ t: translate }) }),
    'react-router-dom': synthetic({ useParams: () => ({ examId: routeId }),
      useNavigate: () => navigate, useLocation: () => options.location || { pathname: `/exam/${routeId}`, state: null },
      useSearchParams: () => [new URLSearchParams({ type: routeType })] }),
    'framer-motion': synthetic({ motion: { div: primitive, button }, AnimatePresence: primitive }),
    sonner: synthetic({ toast: { error() {}, info() {}, warning() {}, success() {} } }),
    '@/lib/utils': synthetic({ cn: (...values) => values.filter(Boolean).join(' '), api }),
    '@/utils/authNavigation': new vm.SourceTextModule(await readFile(new URL('../../utils/authNavigation.js', import.meta.url), 'utf8'), { context }),
    './examNavigation.js': new vm.SourceTextModule(await readFile(new URL('../../utils/examNavigation.js', import.meta.url), 'utf8'), { context }),
    '@/utils/examProgress': synthetic({ publishExamCompletedCount: (...args) => published.push(args) }),
    '@/utils/questionProgress': synthetic(questionProgress),
    '@/services/dashboardService': synthetic({ dashboardService: { clearCache() {} } }),
    '@/services/userService': synthetic({ userService: { getUserProfile: options.getUserProfile || (async () => ({ _id: 'user', plan: 'PREMIUM PRO' })) } }),
    '@/lib/mediaUrl': synthetic({ resolveQuestionImageUrl: value => value }),
    '@/utils/subscriptionDisplay': synthetic({ isPremiumPlan: () => true, isPremiumProPlan: () => true }),
    '@/utils/examSessionSort': synthetic(sessionSort),
  };
  const iconNames = source.match(/import\s*{([^}]+)}\s*from\s*"lucide-react"/)[1].split(',').map(name => name.trim());
  deps['lucide-react'] = synthetic(Object.fromEntries(iconNames.map(name => [name, () => null])));
  for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*"(@\/components\/ui\/[^" ]+)"/g)) {
    deps[match[2]] = synthetic(Object.fromEntries(match[1].split(',').map(name => {
      const key = name.trim();
      return [key, key === 'Button' ? button : primitive];
    })));
  }
  for (const name of ['ExplicationModel', 'NoteModal', 'ReportModal', 'CommunityModal', 'ResumesModal', 'PlaylistModal']) {
    deps[`@/components/ExamsPage/${name}`] = synthetic({ default: props => name === 'NoteModal' ? React.createElement('note-modal', props) : null });
  }
  deps['@/components/shared/ImageViewerModal'] = synthetic({ default: () => null });
  const componentSource = await readFile(new URL('../../components/ExamsPage/ExamQuestionContext.jsx', import.meta.url), 'utf8');
  const compiledContext = await transform(componentSource, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  deps['@/components/ExamsPage/ExamQuestionContext'] = new vm.SourceTextModule(compiledContext.code, { context });
  const compiledPage = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  const page = new vm.SourceTextModule(compiledPage.code, { context });
  await page.link(specifier => {
    assert.ok(deps[specifier], `Unmocked import: ${specifier}`);
    return deps[specifier];
  });
  await page.evaluate();
  let root;
  await act(async () => { root = create(React.createElement(page.namespace.default)); });
  root.harness = {
    localStorage: local, sessionStorage: sessions, serverAnswers, calls, published, options, navigation,
    async navigateTo(nextType, nextData, nextId = 'other-exam') {
      routeType = nextType;
      routeData = nextData;
      routeId = nextId;
      await act(async () => root.update(React.createElement(page.namespace.default)));
    },
    async key(key) {
      await act(async () => {
        for (const handler of [...(events.get('keydown') || [])]) handler({ key, target: { tagName: 'BODY' }, preventDefault() {}, stopPropagation() {} });
      });
    },
    async flushTimers(maxDelay = 1000) {
      const pending = [...timers].filter(([, timer]) => timer.delay <= maxDelay);
      await act(async () => {
        for (const [id, timer] of pending) { timers.delete(id); await timer.callback(); }
      });
    },
  };
  return root;
}
