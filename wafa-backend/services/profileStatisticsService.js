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
  totalExamsCompleted = 0,
  totalExams = 0,
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
  const examIds = new Set(
    verifiedAnswers.map((answer) => asId(answer.examId)).filter(Boolean),
  );
  const legacyExamCount = Math.max(
    nonNegativeNumber(totalExamsCompleted),
    nonNegativeNumber(totalExams),
  );

  return {
    examsCompleted: examIds.size || legacyExamCount,
    averageScore: questionsAttempted > 0
      ? percentage(correctAnswers, questionsAttempted)
      : Math.min(100, nonNegativeNumber(averageScore)),
    questionsAttempted,
    correctAnswers,
    incorrectAnswers: Math.max(0, questionsAttempted - correctAnswers),
  };
};
