const nonNegativeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const percentage = (correct, attempted) => attempted > 0
  ? Math.min(100, Math.max(0, (correct / attempted) * 100))
  : 0;

const asId = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") return value.toHexString();
    if (value._id && value._id !== value) return asId(value._id);
  }
  return String(value);
};

const answerValues = (answeredQuestions) => {
  if (!answeredQuestions) return [];
  if (answeredQuestions instanceof Map || typeof answeredQuestions.values === "function") {
    return Array.from(answeredQuestions.values());
  }
  return typeof answeredQuestions === "object" ? Object.values(answeredQuestions) : [];
};

export const buildProfileActivityStatistics = ({
  answeredQuestions,
  totalQuestionsAttempted = 0,
  totalCorrectAnswers = 0,
  averageScore = 0,
  exams = [],
} = {}) => {
  const verifiedAnswers = answerValues(answeredQuestions)
    .map((answer) => answer?.toObject?.() || answer || {})
    .filter((answer) => answer.isVerified === true);

  const hasVerifiedAnswers = verifiedAnswers.length > 0;
  const questionsAttempted = hasVerifiedAnswers
    ? verifiedAnswers.length
    : nonNegativeNumber(totalQuestionsAttempted);
  const correctAnswers = hasVerifiedAnswers
    ? verifiedAnswers.filter((answer) => answer.isCorrect === true).length
    : Math.min(questionsAttempted, nonNegativeNumber(totalCorrectAnswers));
  const entries = answeredQuestions instanceof Map
    ? [...answeredQuestions.entries()]
    : Object.entries(answeredQuestions || {});
  const answersByExam = new Map();
  for (const [questionId, answer] of entries) {
    const examId = asId(answer?.examId);
    if (!examId) continue;
    if (!answersByExam.has(examId)) answersByExam.set(examId, new Map());
    answersByExam.get(examId).set(asId(questionId), answer);
  }
  let examsStarted = 0;
  let examsCompleted = 0;
  const seenExams = new Set();
  for (const exam of exams) {
    const examId = asId(exam._id);
    if (!examId || seenExams.has(examId)) continue;
    seenExams.add(examId);
    const questionIds = [...new Set((exam.questionIds || []).map(asId).filter(Boolean))];
    const answers = answersByExam.get(examId);
    if (!questionIds.length || !answers) continue;
    if (questionIds.some((id) => answers.get(id)?.isVerified === true
      || answers.get(id)?.selectedAnswers?.length > 0)) examsStarted += 1;
    if (questionIds.every((id) => answers.get(id)?.isVerified === true)) examsCompleted += 1;
  }

  return {
    examsStarted,
    examsCompleted,
    averageScore: questionsAttempted > 0
      ? percentage(correctAnswers, questionsAttempted)
      : Math.min(100, nonNegativeNumber(averageScore)),
    questionsAttempted,
    correctAnswers,
    incorrectAnswers: Math.max(0, questionsAttempted - correctAnswers),
  };
};
