import test from 'node:test';
import assert from 'node:assert/strict';
import { act } from 'react-test-renderer';
import { mountExam, storage } from './helpers/examPageHarness.js';

test('a 1,000-question exam does not rerender its question or serialize progress on clock ticks', async () => {
  const local = storage(), writes = [];
  const originalSet = local.setItem;
  local.setItem = (key, value) => { writes.push(key); originalSet(key, value); };
  const questions = Array.from({ length: 1000 }, (_, index) => ({
    _id: `q${index}`, question: `Question ${index + 1}`, questionNumber: index + 1,
    sessionLabel: 'Session', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }],
  }));
  const root = await mountExam('exam', { name: 'Large exam', questions: { Session: questions } }, { localStorage: local });
  try {
    const initialRenders = root.harness.contextRenders;
    assert.ok(initialRenders > 0);
    const snapshots = () => writes.filter(key => key.startsWith('exam_progress_') && !key.endsWith(':time')).length;
    const initialSnapshots = snapshots();
    await root.harness.tick(1);
    assert.equal(root.harness.contextRenders, initialRenders);
    assert.equal(snapshots(), initialSnapshots);
    await root.harness.tick(10);
    assert.equal(root.harness.contextRenders, initialRenders);
    assert.equal(snapshots(), initialSnapshots);
    assert.ok(writes.some(key => key.endsWith(':time')));
  } finally { await act(async () => root.unmount()); }
});

test('unavailable local storage does not prevent restoring authenticated server progress', async () => {
  const local = storage();
  local.getItem = () => { throw new Error('storage unavailable'); };
  local.setItem = () => { throw new Error('storage unavailable'); };
  const root = await mountExam('exam', { name: 'Exam', questions: { Session: [{ _id: 'q1', question: 'Q', options: [{ text: 'A', isCorrect: true }] }] } }, {
    localStorage: local, serverAnswers: { q1: { selectedAnswers: [0], isVerified: true, isCorrect: true } },
  });
  try { assert.ok(root.harness.published.some(([, count]) => count === 1)); }
  finally { await act(async () => root.unmount()); }
});

for (const saveFailure of [false, true]) {
  test(`finishing flushes drafts and ${saveFailure ? 'retains recovery data on failure' : 'clears recovery data after success'}`, async () => {
    const root = await mountExam('exam', { name: 'Exam', questions: { Session: [{ _id: 'q1', question: 'Q',
      options: [{ text: 'Right option', isCorrect: true }, { text: 'Wrong option', isCorrect: false }] }] } }, { saveFailure });
    const text = node => typeof node === 'string' ? node : node.children.map(text).join('');
    const click = async label => act(async () => {
      const button = root.root.findAllByType('button').find(node => text(node).includes(label));
      assert.ok(button, `Missing ${label}`);
      await button.props.onClick();
    });
    try {
      await click('Wrong option');
      await act(async () => root.root.findAllByProps({ "aria-label": "Voir toutes les questions" })[0].props.onClick());
      await click("Terminer l'examen");
      await click('dashboard:submit');
      assert.ok(root.harness.calls.some(call => call.url === '/questions/save-answer'));
      const saved = root.harness.localStorage.getItem('exam_progress_user_exam_exam');
      if (saveFailure) assert.ok(saved, 'failed submissions keep their recovery draft');
      else assert.equal(saved, null);
    } finally { await act(async () => root.unmount()); }
  });
}

test('failed autosaves stop retrying until the learner retries or changes an answer', async () => {
  const root = await mountExam('exam', { name: 'Exam', questions: { Session: [{ _id: 'q1', question: 'Q',
    options: [{ text: 'Answer', isCorrect: false }] }] } }, { saveFailure: true });
  const text = node => typeof node === 'string' ? node : node.children.map(text).join('');
  try {
    const answer = root.root.findAllByType('button').find(node => text(node).includes('Answer'));
    await act(async () => answer.props.onClick());
    await root.harness.flushTimers();
    await root.harness.flushTimers();
    assert.equal(root.harness.calls.filter(call => call.url === '/questions/save-answer').length, 1);
    root.harness.options.saveFailure = false;
    await act(async () => root.root.findAllByProps({ 'aria-label': 'Réessayer la sauvegarde' })[0].props.onClick());
    await root.harness.flushTimers();
    assert.deepEqual(Array.from(root.harness.serverAnswers.q1.selectedAnswers), [0]);
    assert.equal(root.harness.calls.filter(call => call.url === '/questions/save-answer').length, 2);
  } finally { await act(async () => root.unmount()); }
});

test('clearing an answer while its draft is in flight persists the cleared value', async () => {
  let release, started;
  const gate = new Promise(done => { release = done; });
  const reached = new Promise(done => { started = done; });
  const root = await mountExam('exam', { name: 'Exam', questions: { Session: [{ _id: 'q1', question: 'Q',
    options: [{ text: 'Answer', isCorrect: false }] }] } }, { beforeSave: async () => { started(); await gate; } });
  const text = node => typeof node === 'string' ? node : node.children.map(text).join('');
  const click = () => act(async () => root.root.findAllByType('button').find(node => text(node).includes('Answer')).props.onClick());
  try {
    await click();
    const saving = await root.harness.startTimers();
    await reached;
    await click();
    release();
    await saving.finish();
    await root.harness.flushTimers();
    assert.deepEqual(Array.from(root.harness.serverAnswers.q1.selectedAnswers), []);
  } finally { release(); await act(async () => root.unmount()); }
});

test('selecting then clearing before the debounce leaves no pending save', async () => {
  const root = await mountExam('exam', { name: 'Exam', questions: { Session: [{ _id: 'q1', question: 'Q',
    options: [{ text: 'Answer', isCorrect: false }] }] } });
  const text = node => typeof node === 'string' ? node : node.children.map(text).join('');
  const click = () => act(async () => root.root.findAllByType('button').find(node => text(node).includes('Answer')).props.onClick());
  try {
    await click();
    await click();
    await root.harness.flushTimers();
    assert.equal(root.harness.calls.filter(call => call.url === '/questions/save-answer').length, 0);
    assert.ok(root.root.findAllByType('span').some(node => text(node) === 'Enregistré'));
  } finally { await act(async () => root.unmount()); }
});
