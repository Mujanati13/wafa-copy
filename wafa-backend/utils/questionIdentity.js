const asId = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value?.toHexString === "function") return value.toHexString();
  if (value?._id !== undefined && value._id !== value) return asId(value._id);
  return String(value);
};

const sourceId = (question = {}) => (
  asId(question.examId)
  || asId(question.qcmBanqueId)
  || asId(question.examCourseId)
);

const hasQuestionNumber = (value) => (
  value !== null
  && value !== undefined
  && value !== ""
  && Number.isFinite(Number(value))
);

// The imported number is the stable identity of a question within one source
// and one session. Falling back to Mongo's ID preserves every legacy question
// that has no imported number.
export const questionLogicalKey = (question = {}) => {
  const source = sourceId(question);
  const session = String(question.sessionLabel || "").trim();
  const number = hasQuestionNumber(question.questionNumber)
    ? Number(question.questionNumber)
    : asId(question._id);
  return `${source}|${session}|${number}`;
};

export const uniqueQuestionsByLogicalKey = (questions = []) => {
  const seen = new Set();
  return questions.filter((question) => {
    const key = questionLogicalKey(question);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
