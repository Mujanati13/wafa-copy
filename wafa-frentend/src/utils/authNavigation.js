export const DASHBOARD_PATH = '/dashboard/home';

// Replace the exam history entry so Back cannot immediately reopen it.
// Exiting an exam is navigation only; authentication is not modified here.
export const exitExam = (navigate) => navigate(DASHBOARD_PATH, { replace: true });

// Never restore a pre-login URL, especially an active /exam/* route.
export const getLoginDestination = (user) => (
  user?.isAdmin ? '/admin/analytics' : DASHBOARD_PATH
);
