export const DASHBOARD_PATH = '/dashboard/home';
export const SEMESTER_SELECTION_PATH = '/select-semester';

// Return to the route that launched the exam (including its filters and scroll state).
// Exiting an exam is navigation only; authentication is not modified here.
export const exitExam = (navigate) => navigate(-1);

// Never restore a pre-login URL, especially an active /exam/* route.
export const getLoginDestination = (user) => {
  if (user?.isAdmin) return '/admin/analytics';

  // `semesters` is supplied by the post-auth profile. An explicitly empty
  // value means onboarding has not been completed; an absent value preserves
  // compatibility with older login responses while the profile is loading.
  if (Array.isArray(user?.semesters) && !user.semesters.some((semester) => String(semester || '').trim())) {
    return SEMESTER_SELECTION_PATH;
  }

  return DASHBOARD_PATH;
};
