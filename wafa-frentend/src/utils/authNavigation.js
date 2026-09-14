export const DASHBOARD_PATH = '/dashboard/home';

// Return to the route that launched the exam (including its filters and scroll state).
// Exiting an exam is navigation only; authentication is not modified here.
export const exitExam = (navigate) => navigate(-1);

// Never restore a pre-login URL, especially an active /exam/* route.
export const getLoginDestination = (user) => (
  user?.isAdmin ? '/admin/analytics' : DASHBOARD_PATH
);
