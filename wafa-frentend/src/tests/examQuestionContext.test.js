import test from 'node:test';
import assert from 'node:assert/strict';
import { act } from 'react-test-renderer';
import { mountExam } from './helpers/examPageHarness.js';

const textContent = node => typeof node === 'string' ? node : node.children.map(textContent).join('');

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

for (const type of ['course', 'exam']) {
  test('the exam page passes the selected course to the note modal only in course mode: ' + type, async () => {
    const root = await mountExam(type, { _id: 'exam', name: 'Anatomie du Coeur', moduleId: { _id: 'module', name: 'Anatomie I' }, questions: { '2026': [question] } });
    try {
      const button = root.root.findAllByType('button').find(node => node.props.title === 'Note');
      assert.ok(button);
      await act(async () => button.props.onClick());
      const modal = root.root.findByType('note-modal');
      assert.equal(modal.props.examCourseId, type === 'course' ? 'exam' : null);
      assert.equal(modal.props.questionId, 'q1');
      assert.equal(modal.props.moduleId, 'module');
    } finally { await act(async () => root.unmount()); }
  });
}
