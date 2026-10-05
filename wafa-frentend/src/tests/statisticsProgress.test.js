import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { create, act } from 'react-test-renderer';
import { transform } from 'esbuild';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const textContent = node => typeof node === 'string' ? node : node.children.map(textContent).join('');
const metricValue = (root, label) => {
  const labelNode = root.findAllByType('p').find(node => textContent(node) === label);
  assert.ok(labelNode, `Missing metric: ${label}`);
  return textContent(labelNode.parent.findAllByType('p')[1]);
};

async function mountStatistics(module) {
  const context = vm.createContext({
    console, Intl, Date, Set, String, AbortController,
    window: { addEventListener() {}, removeEventListener() {} },
  });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const requests = [];
  const deps = {
    react: synthetic({ ...React, default: React }),
    'react/jsx-runtime': synthetic(jsxRuntime),
    'lucide-react': synthetic(Object.fromEntries([
      'BarChart3', 'BookOpen', 'CheckCircle2', 'ChevronDown', 'CircleGauge', 'Clock3',
      'RefreshCw', 'Target', 'TrendingDown', 'TrendingUp', 'XCircle',
    ].map(name => [name, () => null]))),
    '@/lib/utils': synthetic({ api: { get: async (url, options) => {
      requests.push({ url, semester: options.params.semester });
      return { data: { data: { summary: {}, modules: [module] } } };
    } } }),
    '@/context/SemesterContext': synthetic({ useSemester: () => ({
      selectedSemester: 'S1', setSelectedSemester() {}, userSemesters: ['S1'], loading: false,
    }) }),
    '@/components/ui/button': synthetic({ Button: ({ children, ...props }) => React.createElement('button', props, children) }),
    '@/components/ui/badge': synthetic({ Badge: primitive }),
    '@/components/ui/card': synthetic({ Card: primitive, CardContent: primitive }),
    '@/components/ui/skeleton': synthetic({ Skeleton: primitive }),
    '@/components/ui/tabs': synthetic({ Tabs: primitive, TabsContent: primitive, TabsList: primitive, TabsTrigger: primitive }),
    '@/utils/examProgress': synthetic({ EXAM_PROGRESS_UPDATED_EVENT: 'progress-updated' }),
  };
  const source = await readFile(new URL('../pages/StatisticsPage.jsx', import.meta.url), 'utf8');
  const compiled = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  const page = new vm.SourceTextModule(compiled.code, { context });
  await page.link(specifier => {
    assert.ok(deps[specifier], `Unmocked import: ${specifier}`);
    return deps[specifier];
  });
  await page.evaluate();
  let root;
  await act(async () => { root = create(React.createElement(page.namespace.default)); });
  return { root, requests };
}

for (const attempted of [0, 3]) {
  test(`module displays an isolated total and adjacent mode fractions (${attempted} answers)`, async () => {
    const module = {
      moduleId: 'anatomy', moduleName: 'Anatomie I', semester: 'S1', courseCount: 1,
      totalQuestions: 690, totalQuestionsByCourse: 20, answeredQuestions: attempted,
      answeredByYear: attempted ? 2 : 0, answeredByCourse: attempted ? 1 : 0,
      correctAnswers: 0, incorrectAnswers: attempted,
      correctPercentage: 0, incorrectPercentage: 0, completionPercentage: 0,
      courses: [{ courseId: 'course', courseName: 'Anatomie', totalQuestions: 20,
        answeredQuestions: attempted, correctAnswers: 0, incorrectAnswers: attempted,
        completionPercentage: attempted ? 15 : 0, correctPercentage: 0,
        incorrectPercentage: attempted ? 15 : 0, activityStatus: attempted ? 'in-progress' : 'untouched' }],
    };
    const { root, requests } = await mountStatistics(module);
    try {
      assert.deepEqual(requests, [{ url: '/users/progress', semester: 'S1' }]);
      const card = root.root.findByType('article');
      assert.equal(metricValue(card, 'Total traité'), String(attempted));
      assert.equal(metricValue(card, 'Exam par année'), `${attempted ? 2 : 0}/690`);
      assert.equal(metricValue(card, 'Exam par cours'), `${attempted ? 1 : 0}/20`);
      assert.equal(metricValue(card, 'Correctes'), '0 (0%)');
      assert.equal(metricValue(card, 'Incorrectes'), `${attempted} (0%)`);
      assert.equal(card.findAllByType('p').some(node => textContent(node) === 'Progression'), false);
      const year = card.findAllByType('p').find(node => textContent(node) === 'Exam par année');
      const course = card.findAllByType('p').find(node => textContent(node) === 'Exam par cours');
      assert.equal(year.parent.parent, course.parent.parent);
      await act(async () => card.findByType('button').props.onClick());
      assert.equal(metricValue(card, 'Progression'), `${attempted}/20 (${attempted ? 15 : 0}%)`);
    } finally {
      await act(async () => root.unmount());
    }
  });
}

for (const [description, courses, totalQuestionsByCourse, expected] of [
  ['shared questions across courses', [
    { courseId: 'a', courseName: 'A', totalQuestions: 350 },
    { courseId: 'b', courseName: 'B', totalQuestions: 360 },
  ], 710, '1/710'],
  ['no mapped course questions', [], 0, '0/0'],
  ['older API response with course totals', [
    { courseId: 'a', courseName: 'A', totalQuestions: 350 },
    { courseId: 'b', courseName: 'B', totalQuestions: 360 },
    { courseId: 'exam-year-2026', courseName: '2026 normal', totalQuestions: 690 },
  ], undefined, '1/710'],
]) {
  test(`module uses the course denominator for ${description}`, async () => {
    const { root } = await mountStatistics({
      moduleId: 'anatomy', moduleName: 'Anatomie I', semester: 'S1', courseCount: courses.length,
      totalQuestions: 690, totalQuestionsByCourse, answeredQuestions: 3,
      answeredByYear: 2, answeredByCourse: courses.length ? 1 : 0,
      correctAnswers: 1, incorrectAnswers: 2, correctPercentage: 0, incorrectPercentage: 0,
      courses,
    });
    try {
      const card = root.root.findByType('article');
      assert.equal(metricValue(card, 'Exam par année'), '2/690');
      assert.equal(metricValue(card, 'Exam par cours'), expected);
      assert.equal(metricValue(card, 'Total traité'), '3');
      assert.equal(metricValue(card, 'Correctes'), '1 (0%)');
      assert.equal(metricValue(card, 'Incorrectes'), '2 (0%)');
    } finally { await act(async () => root.unmount()); }
  });
}
