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

// List denominators must use the same source/session/number identity as
// detail pages, rather than counting duplicate imported Mongo documents.
export const questionCountStages = field => [
  { $group: { _id: {
    context: `$${field}`,
    source: { $ifNull: ["$examId", { $ifNull: ["$qcmBanqueId", "$examCourseId"] }] },
    session: { $trim: { input: { $ifNull: ["$sessionLabel", ""] } } },
    number: { $ifNull: ["$questionNumber", "$_id"] },
  } } },
  { $group: { _id: "$_id.context", count: { $sum: 1 } } },
];

// Resolve module membership in the same exam -> bank -> course order as detail views.
// Group inside MongoDB so catalog responses never bring every question identity into Node.
export const moduleQuestionCountStages = (exams, banks, courses) => {
  const branches = [];
  for (const [field, sources] of [['examId', exams], ['qcmBanqueId', banks], ['examCourseId', courses]]) {
    const byModule = new Map();
    for (const source of sources) {
      const key = asId(source.moduleId);
      if (!byModule.has(key)) byModule.set(key, { moduleId: source.moduleId, ids: [] });
      byModule.get(key).ids.push(source._id);
    }
    for (const { moduleId, ids } of byModule.values()) {
      branches.push({ case: { $in: [`$${field}`, ids] }, then: { $literal: moduleId } });
    }
  }
  return [
    { $set: { countModuleId: { $switch: { branches, default: null } } } },
    { $group: { _id: {
      module: '$countModuleId',
      source: { $ifNull: ['$examId', { $ifNull: ['$qcmBanqueId', '$examCourseId'] }] },
      session: { $trim: { input: { $ifNull: ['$sessionLabel', ''] } } },
      number: { $cond: [
        { $in: [{ $ifNull: ['$questionNumber', null] }, [null, '']] }, '$_id',
        { $convert: { input: '$questionNumber', to: 'double', onError: '$_id', onNull: '$_id' } },
      ] },
    } } },
    { $group: { _id: '$_id.module', count: { $sum: 1 } } },
  ];
};
