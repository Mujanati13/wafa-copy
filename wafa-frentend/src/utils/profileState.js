export const PROFILE_UPDATED_EVENT = 'user-profile-updated';

// Storage writes alone do not notify React or other listeners in the same tab.
export function publishUserProfile(user) {
  const serialized = JSON.stringify(user);
  const changed = localStorage.getItem('userProfile') !== serialized;
  localStorage.setItem('userProfile', serialized);
  localStorage.setItem('user', serialized);
  if (changed) window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: user }));
}

export function resolveProfileSemester(user, currentSemester) {
  const semesters = Array.isArray(user?.semesters) ? user.semesters : [];
  return semesters.includes(currentSemester) ? currentSemester : semesters[0] || null;
}
