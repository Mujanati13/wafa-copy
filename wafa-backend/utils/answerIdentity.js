// Mongo Map keys cannot contain dots. Context and question IDs form one slot.
export const answerKey = (contextId, questionId) => `${contextId}:${questionId}`;
export const answerQuestionId = key => String(key).split(':').at(-1);
export const answerContextId = (key, answer, question) =>
  String(String(key).includes(':') ? String(key).split(':')[0]
    : answer?.examId || question?.examId || question?.qcmBanqueId || question?.examCourseId || '');
