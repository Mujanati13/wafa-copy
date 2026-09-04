export const EXAM_PROGRESS_UPDATED_EVENT = "wafa:exam-progress-updated";

const activeUserId = () => {
  if (typeof window === "undefined") return "anonymous";

  try {
    const user = JSON.parse(
      window.localStorage.getItem("userProfile")
      || window.localStorage.getItem("user")
      || "{}",
    );
    return String(user?._id || user?.id || "anonymous");
  } catch {
    return "anonymous";
  }
};

const storageKey = (examId) => (
  `exam_completed_questions_${activeUserId()}_${String(examId || "")}`
);

export const getSessionExamCompletedCount = (examId) => {
  if (!examId || typeof window === "undefined") return 0;

  const value = Number(window.sessionStorage.getItem(storageKey(examId)));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

export const publishExamCompletedCount = (examId, completedQuestions) => {
  if (!examId || typeof window === "undefined") return;

  const completed = Math.max(0, Math.floor(Number(completedQuestions) || 0));
  window.sessionStorage.setItem(storageKey(examId), String(completed));
  window.dispatchEvent(new CustomEvent(EXAM_PROGRESS_UPDATED_EVENT, {
    detail: { examId: String(examId), completedQuestions: completed },
  }));
};
