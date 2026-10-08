import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';
import { transform } from 'esbuild';
import * as sessionSort from '../utils/examSessionSort.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const textContent = node => typeof node === 'string' ? node : node.children.map(textContent).join('');
const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    key: index => [...values.keys()][index],
    get length() { return values.size; },
  };
};

async function mountExam(type, data) {
  const primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const button = ({ children, ...props }) => React.createElement('button', props, children);
  const navigate = () => {};
  const translate = key => key;
  const silentConsole = { log() {}, error() {}, warn() {} };
  const context = vm.createContext({
    console: silentConsole, localStorage: storage(), sessionStorage: storage(),
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    window: { addEventListener() {}, removeEventListener() {}, scrollTo() {} },
    document: { createElement: () => ({ style: {} }), head: { appendChild() {} },
      body: { style: {} }, documentElement: { classList: { contains: () => false } } },
  });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const source = await readFile(new URL('../pages/ExamPage.jsx', import.meta.url), 'utf8');
  const deps = {
    react: synthetic({ ...React, default: React }),
    'react/jsx-runtime': synthetic(jsxRuntime),
    'react-i18next': synthetic({ useTranslation: () => ({ t: translate }) }),
    'react-router-dom': synthetic({ useParams: () => ({ examId: 'exam' }),
      useNavigate: () => navigate, useSearchParams: () => [new URLSearchParams({ type })] }),
    'framer-motion': synthetic({ motion: { div: primitive, button }, AnimatePresence: primitive }),
    sonner: synthetic({ toast: { error() {}, info() {} } }),
    '@/lib/utils': synthetic({ cn: (...values) => values.filter(Boolean).join(' '), api: {
      get: async url => ({ data: { data: url.startsWith('/questions/user-answers/') ? {} : data } }),
      post: async () => ({ data: { success: true } }),
    } }),
    '@/utils/authNavigation': synthetic({ exitExam() {} }),
    '@/utils/examProgress': synthetic({ publishExamCompletedCount() {} }),
    '@/services/dashboardService': synthetic({ dashboardService: { clearCache() {} } }),
    '@/services/userService': synthetic({ userService: { getUserProfile: async () => ({ _id: 'user', plan: 'PREMIUM PRO' }) } }),
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
    deps[`@/components/ExamsPage/${name}`] = synthetic({ default: () => null });
  }
  deps['@/components/shared/ImageViewerModal'] = synthetic({ default: () => null });
  const componentSource = await readFile(new URL('../components/ExamsPage/ExamQuestionContext.jsx', import.meta.url), 'utf8');
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
  return root;
}

const question = { _id: 'q1', text: 'Quel élément appartient au système nerveux ?',
  options: [{ text: 'Le cerveau', isCorrect: true }, { text: 'Le foie', isCorrect: false }] };

for (const [type, data, expected] of [
  ['exam', { moduleName: 'Anatomie I', year: 2026, name: 'Examen final', questions: { '2026 normal': [question] } }, 'Anatomie I > 2026 > Examen final > 2026 normal'],
  ['course', { moduleId: { _id: 'm', name: 'Anatomie I' }, name: 'Système nerveux', questions: { '2025 ratt': [question] } }, 'Anatomie I > Système nerveux > 2025 ratt'],
  ['qcm', { moduleName: 'Anatomie I', name: 'Entraînement', questions: [question] }, 'Anatomie I > Entraînement'],
  ['playlist', { title: 'Questions à revoir', questions: [question] }, 'Playlist > Questions à revoir'],
  ['exam', { moduleName: 'Anatomie I', year: 2026, name: '2026', questions: { '2026': [question] } }, 'Anatomie I > 2026'],
]) {
  test(`exam card restores the top context and preserves the question text (${type}: ${data.name || data.title})`, async () => {
    const root = await mountExam(type, { _id: 'exam', ...data });
    try {
      const header = root.root.findByProps({ 'aria-label': 'Contexte de la question' });
      assert.equal(textContent(header), expected);
      const card = root.root.find(node => node.type === 'div' && node.props.className?.includes('exam-question-card'));
      assert.equal(card.children[0].findByProps({ 'aria-label': 'Contexte de la question' }), header);
      assert.ok(textContent(card).includes(question.text));
      assert.ok(textContent(card).includes('Le cerveau'));
    } finally {
      await act(async () => root.unmount());
    }
  });
}

for (const [type, official, expected] of [
  ['exam', true, 'Correction officielle'],
  ['exam', false, 'Correction non officielle'],
  ['course', true, 'Correction officielle'],
  ['course', false, 'Correction non officielle'],
]) {
  test('correction source stays visible at mobile and desktop sizes (' + type + ': ' + official + ')', async () => {
    const linkedQuestion = { ...question, examId: { _id: 'original-exam', isOfficialCorrection: official } };
    const root = await mountExam(type, { _id: 'exam', name: 'Anatomie', isOfficialCorrection: official,
      questions: { '2026 normal': [linkedQuestion] } });
    try {
      const badge = root.root.findByProps({ 'aria-label': 'Source de la correction' });
      assert.equal(textContent(badge), expected);
      // Every ancestor must remain visible without requiring a breakpoint.
      for (let node = badge; node; node = node.parent) {
        const classes = String(node.props.className || '').split(/\s+/);
        assert.ok(!classes.some(value => /^(?:[\w-]+:)?hidden$/.test(value)), 'Hidden correction ancestor');
        assert.ok(!classes.includes('invisible'));
      }
    } finally { await act(async () => root.unmount()); }
  });
}

test('course questions without a known source are not labeled as official', async () => {
  const root = await mountExam('course', { _id: 'course', name: 'Anatomie', questions: { '2026': [question] } });
  try {
    assert.equal(root.root.findAllByProps({ 'aria-label': 'Source de la correction' }).length, 0);
  } finally { await act(async () => root.unmount()); }
});
