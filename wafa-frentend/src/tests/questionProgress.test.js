import test from 'node:test';
import assert from 'node:assert/strict';
import { act } from 'react-test-renderer';
import { flattenExamQuestions, questionProgress, progressSnapshot, restoreSnapshot } from '../utils/questionProgress.js';
import { mountExam, storage } from './helpers/examPageHarness.js';

const q = (_id, questionNumber = 1) => ({ _id, questionNumber, text: `Question ${_id}`,
  options: [{ text: 'Oui', isCorrect: true }, { text: 'Non', isCorrect: false }] });
const textOf = node => typeof node === 'string' ? node : node.children.map(textOf).join('');
const verifiedLabels = root => root.root.findAll(node => node.type === 'span' && node.props['aria-label'] === 'Questions vérifiées').map(textOf);
const status = (root, id) => root.root.findAll(node => node.type === 'button' && node.props['data-question-id'] === id)[0]?.props['data-question-status'];
const data = { _id: 'exam', name: 'Cours', moduleId: 'module', questions: {
  '2026 rattrapage': [q('ratt')],
  '2026 normale': [q('normal-2', 2), q('normal-1')],
  '2026 session exceptionnelle': [q('exceptional')],
} };
const completed = {
  'normal-2': { selectedAnswers: [1], isVerified: true, isCorrect: false },
  ratt: { selectedAnswers: [0], isVerified: true, isCorrect: true },
};

test('all counters use the distinct displayed questions; highlights do not hide completion', () => {
  const questions = flattenExamQuestions({ A: [q('one'), q('one'), q('two', 2), q('draft', 3)] });
  const stats = questionProgress(questions, { 0: [0], 1: [1], 2: [0] },
    { 0: true, 1: { verified: true, isCorrect: false }, 99: true }, new Set([0]), new Set([2]));
  assert.equal(questions.length, 3);
  assert.equal(stats.verifiedCount, 2);
  assert.equal(stats.correctCount, 1);
  assert.equal(stats.incorrectCount, 1);
  assert.deepEqual(stats.statuses.map(s => s.status), ['flagged', 'incorrect', 'visited']);
  assert.deepEqual(stats.sections.A, { total: 3, verified: 2, correct: 1, incorrect: 1 });
});

test('ID snapshots survive inserted questions, category reordering and deleted questions', () => {
  const questions = flattenExamQuestions(data.questions);
  const snapshot = progressSnapshot(questions, { userId: 'user', answers: { 1: [1] },
    verified: { 1: { verified: true, isCorrect: false } }, flags: new Set([1]), visits: new Set([0, 1]), currentQ: 1 });
  const reordered = [q('inserted'), ...questions].filter(q => q._id !== questions[0]._id);
  const restored = restoreSnapshot(reordered, snapshot);
  const index = reordered.findIndex(q => q._id === 'normal-2');
  assert.deepEqual(restored.answers[index], [1]);
  assert.equal(restored.verified[index].isCorrect, false);
  assert.ok(restored.flags.has(index));
  assert.equal(restored.currentQ, index);
  assert.equal(restored.visits.size, 1);
});

for (const mode of ['exam', 'course', 'qcm', 'playlist']) {
  test(`${mode}: restores mixed categories in display order with consistent footer, sections and colors`, async () => {
    const exam = ['qcm', 'playlist'].includes(mode) ? { ...data, questions: Object.values(data.questions).flat().map(question => ({ ...question,
      sessionLabel: question._id === 'ratt' ? '2026 rattrapage' : question._id === 'exceptional' ? '2026 session exceptionnelle' : '2026 normale' })) } : data;
    const root = await mountExam(mode, exam, { serverAnswers: structuredClone(completed) });
    try {
      assert.ok(verifiedLabels(root).every(label => label.startsWith('2 / 4')));
      if (mode !== 'playlist') {
        assert.equal(status(root, 'normal-1'), 'visited');
        const section = root.root.findAll(node => node.type === 'div' && node.props['aria-label'] === 'Progression 2026 normale')[0];
        assert.equal(textOf(section), '1 / 2');
      }
      const desktop = root.root.findAll(node => node.type === 'button' && node.props['data-question-status']);
      assert.equal(desktop.filter(node => node.props['data-question-status'] === 'correct').length, 1);
      assert.equal(desktop.filter(node => node.props['data-question-status'] === 'incorrect').length, 1);
      assert.equal(root.harness.published.at(-1)[1], 2);
      await root.harness.key('ArrowRight');
      assert.ok(textOf(root.root.find(node => node.type === 'div' && node.props.className?.includes('exam-question-card'))).includes('Question normal-2') || mode === 'playlist');
      await root.harness.key('ArrowLeft');
      assert.ok(verifiedLabels(root).every(label => label.startsWith('2 / 4')));
      await act(async () => root.root.findByProps({ 'aria-label': 'Show questions' }).props.onClick());
      assert.deepEqual(verifiedLabels(root), ['2 / 4', '2 / 4 vérifiées']);
    } finally { await act(async () => root.unmount()); }
  });
}

test('reported course case: two verified answers among 98 remain two after navigation and refresh', async () => {
  const localStorage = storage();
  const serverAnswers = structuredClone(completed);
  const course = { ...data, questions: { ...data.questions, '2025 normale': Array.from({ length: 94 }, (_, index) => q(`older-${index}`, index + 1)) } };
  let root = await mountExam('course', course, { localStorage, serverAnswers });
  try {
    assert.deepEqual(verifiedLabels(root), ['2 / 98']);
    await root.harness.key('ArrowRight');
    await root.harness.key('f');
    assert.equal(root.root.findAll(node => node.type === 'button' && node.props['data-question-status'] === 'flagged').length, 1);
    await root.harness.key('ArrowRight');
    await act(async () => root.unmount());
    root = await mountExam('course', course, { localStorage, serverAnswers });
    assert.deepEqual(verifiedLabels(root), ['2 / 98']);
    assert.equal(root.root.findAll(node => node.type === 'button' && node.props['data-question-status'] === 'flagged').length, 1);
    const saved = JSON.parse(localStorage.getItem('exam_progress_user_course_exam'));
    assert.equal(saved.currentQ, 'ratt');
    assert.ok(saved.visits.includes('normal-2'));
    assert.equal(saved.verified['normal-2'].isCorrect, false);
  } finally { await act(async () => root.unmount()); }
});

test('verification, failed saves and retries publish only saved results and never count a question twice', async () => {
  const options = { serverAnswers: {} };
  const root = await mountExam('course', data, options);
  try {
    await root.harness.key('2');
    options.saveFailure = true;
    await root.harness.key('Enter');
    assert.deepEqual(verifiedLabels(root), ['0 / 4']);
    assert.equal(root.root.findAll(node => node.type === 'button' && node.props['data-question-status'] === 'correct').length, 0);
    options.saveFailure = false;
    await root.harness.key('Enter');
    await root.harness.key('Enter');
    assert.deepEqual(verifiedLabels(root), ['1 / 4']);
    assert.equal(root.harness.calls.filter(call => call.url === '/questions/save-answer' && call.body.isVerified).length, 2); // failed + successful; no duplicate
    const retry = root.root.findAllByType('button').find(node => textOf(node).includes('Ressayer'));
    assert.ok(retry);
    await act(async () => retry.props.onClick({ preventDefault() {}, stopPropagation() {} }));
    assert.deepEqual(verifiedLabels(root), ['0 / 4']);
    assert.equal(Object.keys(options.serverAnswers).length, 0);
    await root.harness.key('1');
    await root.harness.key('Enter');
    assert.deepEqual(verifiedLabels(root), ['1 / 4']);
    assert.equal(root.root.findAll(node => node.type === 'button' && node.props['data-question-status'] === 'correct').length, 1);
  } finally { await act(async () => root.unmount()); }
});

test('successful empty server progress overrides stale cached verification; offline restores the confirmed cache', async () => {
  const localStorage = storage();
  const snapshot = progressSnapshot(flattenExamQuestions(data.questions), { userId: 'user', answers: { 0: [0] },
    verified: { 0: { verified: true, isCorrect: true } }, flags: new Set(), visits: new Set([0]), currentQ: 0 });
  for (const restoreFailure of [true, false]) {
    localStorage.setItem('exam_progress_user_course_exam', JSON.stringify(snapshot));
    const root = await mountExam('course', data, { localStorage, restoreFailure });
    try { assert.deepEqual(verifiedLabels(root), [restoreFailure ? '1 / 4' : '0 / 4']); }
    finally { await act(async () => root.unmount()); }
  }
});

test('drafts save and clear independently of navigation and timer updates', async () => {
  const serverAnswers = {};
  const root = await mountExam('course', data, { serverAnswers });
  try {
    await root.harness.key('1');
    await root.harness.key('ArrowRight');
    await root.harness.flushTimers();
    assert.equal(serverAnswers['normal-1'].isVerified, false);
    await root.harness.key('ArrowLeft');
    await root.harness.key('1');
    await root.harness.flushTimers();
    assert.deepEqual(Array.from(serverAnswers['normal-1'].selectedAnswers), []);
    assert.deepEqual(verifiedLabels(root), ['0 / 4']);
  } finally { await act(async () => root.unmount()); }
});

test('changing exam ID or mode resets the page scope and loads the new questions', async () => {
  const root = await mountExam('course', data, { serverAnswers: structuredClone(completed) });
  try {
    await root.harness.key('ArrowRight');
    await root.harness.key('f');
    const next = { _id: 'other-exam', moduleId: 'module', name: 'Autre examen', questions: { '2025 normale': [q('unanswered')] } };
    await root.harness.navigateTo('exam', next);
    assert.deepEqual(verifiedLabels(root), ['0 / 1']);
    assert.equal(status(root, 'unanswered'), 'visited');
    assert.ok(root.harness.calls.some(call => call.url === '/exams/all/other-exam'));
    await root.harness.navigateTo('course', data, 'other-exam');
    assert.deepEqual(verifiedLabels(root), ['2 / 4']);
    assert.equal(status(root, 'normal-2'), 'incorrect');
    assert.ok(root.harness.calls.some(call => call.url === '/exam-courses/other-exam'));
  } finally { await act(async () => root.unmount()); }
});

test('a slow profile request cannot permanently skip saved progress restoration', async () => {
  let resolveProfile;
  const profile = new Promise(resolve => { resolveProfile = resolve; });
  const root = await mountExam('course', data, { serverAnswers: structuredClone(completed), getUserProfile: () => profile });
  try {
    await root.harness.flushTimers(4000);
    await act(async () => resolveProfile({ _id: 'user', plan: 'PREMIUM PRO' }));
    assert.deepEqual(verifiedLabels(root), ['2 / 4']);
    assert.equal(status(root, 'normal-2'), 'incorrect');
    assert.equal(status(root, 'ratt'), 'correct');
  } finally { await act(async () => root.unmount()); }
});

test('a failed header profile request still restores authenticated server answers', async () => {
  const root = await mountExam('course', data, { serverAnswers: structuredClone(completed),
    getUserProfile: async () => { throw new Error('profile unavailable'); } });
  try {
    await root.harness.flushTimers(4000);
    assert.deepEqual(verifiedLabels(root), ['2 / 4']);
    assert.ok(root.harness.calls.some(call => call.url === '/questions/user-answers/exam'));
  } finally { await act(async () => root.unmount()); }
});
