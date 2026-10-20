// Mongo Map keys cannot contain dots. Context and question IDs form one slot.
export const answerKey = (contextId, questionId) => `${contextId}:${questionId}`;
export const answerQuestionId = key => String(key).split(':').at(-1);
export const answerContextId = (key, answer, question) =>
  String(String(key).includes(':') ? String(key).split(':')[0]
    : answer?.examId || question?.examId || question?.qcmBanqueId || question?.examCourseId || '');

// Repair imported duplicates without merging answers from different contexts.
export const remapQuestionAnswers = (answers, replacements) => {
  const affected = new Set([...replacements.keys(), ...replacements.values()].map(String));
  const result = new Map();
  const canonical = new Map();
  for (const [key, answer] of answers) {
    const questionId = answerQuestionId(key);
    const targetId = String(replacements.get(questionId) || questionId);
    const context = answerContextId(key, answer);
    const targetKey = affected.has(questionId) && context ? answerKey(context, targetId)
      : affected.has(questionId) ? targetId : key;
    const previous = result.get(targetKey);
    const time = value => new Date(value?.answeredAt || 0).getTime() || 0;
    const isCanonical = questionId === targetId;
    if (!previous || (answer?.isVerified === true && previous.isVerified !== true)
      || (answer?.isVerified === previous.isVerified && (time(answer) > time(previous)
        || (time(answer) === time(previous) && isCanonical && !canonical.get(targetKey))))) {
      result.set(targetKey, answer);
      canonical.set(targetKey, isCanonical);
    }
  }
  return result;
};
