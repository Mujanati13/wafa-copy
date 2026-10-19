import { compareSessionNames } from './examSessionSort.js';

export const flattenExamQuestions = (groups = {}) => {
  const seen = new Set();
  return Object.entries(groups).sort(([a], [b]) => compareSessionNames(a, b))
    .flatMap(([sessionLabel, questions]) => [...questions]
      .sort((a, b) => (a.questionNumber ?? Infinity) - (b.questionNumber ?? Infinity))
      .filter(question => {
        if (seen.has(String(question._id))) return false;
        seen.add(String(question._id));
        return true;
      }).map(question => ({ ...question, sessionLabel })))
    .map((question, index) => ({ ...question, displayNumber: question.questionNumber || index + 1 }));
};

export const isVerified = value => value === true || value?.verified === true;
export const isCorrect = (question, selected = [], verification) => {
  if (!isVerified(verification)) return false;
  if (typeof verification?.isCorrect === 'boolean') return verification.isCorrect;
  const correct = question.options.flatMap((option, index) => option.isCorrect ? [index] : []);
  return selected.length > 0 && selected.length === correct.length && selected.every(index => correct.includes(index));
};

export const questionProgress = (questions, answers, verified, flags = new Set(), visits = new Set()) => {
  const sections = {};
  let verifiedCount = 0;
  let correctCount = 0;
  let answeredCount = 0;
  const statuses = questions.map((question, index) => {
    const checked = isVerified(verified[index]);
    const correct = isCorrect(question, answers[index], verified[index]);
    const answered = answers[index]?.length > 0;
    const section = sections[question.sessionLabel] ||= { total: 0, verified: 0, correct: 0, incorrect: 0 };
    section.total++;
    if (answered) answeredCount++;
    if (checked) {
      verifiedCount++;
      section.verified++;
      if (correct) { correctCount++; section.correct++; } else section.incorrect++;
    }
    const isFlagged = flags.has(index);
    const isVisited = visits.has(index) || answered || checked;
    return { status: isFlagged ? 'flagged' : checked ? (correct ? 'correct' : 'incorrect') : isVisited ? 'visited' : 'unanswered', isFlagged, isVisited };
  });
  return { verifiedCount, correctCount, incorrectCount: verifiedCount - correctCount, answeredCount, sections, statuses };
};

// Persist identities, never array positions: sorting/importing a session must
// not move an answer, highlight, visit, or cursor onto another question.
export const progressSnapshot = (questions, { answers, verified, flags, visits, currentQ, ...rest }) => ({
  ...rest, version: 2,
  answers: Object.fromEntries(questions.flatMap((q, i) => answers[i] ? [[q._id, answers[i]]] : [])),
  verified: Object.fromEntries(questions.flatMap((q, i) => verified[i] ? [[q._id, verified[i]]] : [])),
  flags: [...flags].map(i => questions[i]?._id).filter(Boolean),
  visits: [...visits].map(i => questions[i]?._id).filter(Boolean),
  currentQ: questions[currentQ]?._id,
});

export const restoreSnapshot = (questions, snapshot) => {
  const indexOf = value => snapshot.version === 2
    ? questions.findIndex(q => String(q._id) === String(value)) : Number(value);
  const valid = index => Number.isInteger(index) && index >= 0 && index < questions.length;
  const mapped = values => Object.fromEntries(Object.entries(values || {}).flatMap(([key, value]) => {
    const index = indexOf(key);
    return valid(index) ? [[index, value]] : [];
  }));
  const indices = values => new Set((Array.isArray(values) ? values : []).map(indexOf).filter(valid));
  const current = indexOf(snapshot.currentQ);
  return { answers: mapped(snapshot.answers), verified: mapped(snapshot.verified), flags: indices(snapshot.flags),
    visits: indices(snapshot.visits), currentQ: valid(current) ? current : 0 };
};
