export const getHistoryIndex = () => {
  const index = typeof window === 'undefined' ? null : window.history?.state?.idx;
  return Number.isInteger(index) && index >= 0 ? index : null;
};

const positions = new Map();
const scrollKey = (location) => {
  let userId = 'anonymous';
  try {
    const user = JSON.parse(localStorage.getItem('userProfile') || localStorage.getItem('user') || '{}');
    userId = user?._id || userId;
  } catch { /* Storage can be disabled by the browser. */ }
  return `examReturnScroll:${userId}:${location.key}`;
};

const validPosition = (position) => Number.isFinite(position?.top) && Number.isFinite(position?.left);

export const readExamReturnPosition = (location) => {
  if (validPosition(location.state?.examReturnPosition)) return location.state.examReturnPosition;
  const key = scrollKey(location);
  if (positions.has(key)) return positions.get(key);
  try {
    const position = JSON.parse(sessionStorage.getItem(key));
    return validPosition(position) ? position : null;
  } catch { return null; }
};

// The origin travels with the question route and survives refreshes. Its index
// lets Exit return across intermediate question routes without adding a loop.
export const openExam = (navigate, target, location) => {
  const position = { top: window.scrollY, left: window.scrollX };
  const origin = {
    pathname: location.pathname, search: location.search, hash: location.hash,
    key: location.key, state: location.state, historyIndex: getHistoryIndex(), position,
  };
  positions.set(scrollKey(location), position);
  try { sessionStorage.setItem(scrollKey(location), JSON.stringify(position)); }
  catch { /* The explicit origin still provides a return route. */ }
  navigate(target, { state: { examOrigin: origin } });
};

export const exitExam = (navigate, { origin, examType, moduleId, historyIndex = getHistoryIndex() } = {}) => {
  const validOrigin = typeof origin?.pathname === 'string'
    && /^\/dashboard(?:\/|$)/.test(origin.pathname)
    && !/[?#\\]/.test(origin.pathname);
  if (validOrigin) {
    if (validPosition(origin.position)) positions.set(scrollKey(origin), origin.position);
    if (Number.isInteger(origin.historyIndex) && origin.historyIndex >= 0
      && Number.isInteger(historyIndex) && historyIndex > origin.historyIndex) {
      return navigate(origin.historyIndex - historyIndex);
    }
    const search = typeof origin.search === 'string' && origin.search.startsWith('?') ? origin.search : '';
    const hash = typeof origin.hash === 'string' && origin.hash.startsWith('#') ? origin.hash : '';
    return navigate(origin.pathname + search + hash, { replace: true, state: {
      ...origin.state, examReturnPosition: validPosition(origin.position) ? origin.position : null,
    } });
  }

  if (Number.isInteger(historyIndex) && historyIndex > 0) return navigate(-1);

  let fallback = '/dashboard/home';
  if (examType === 'playlist') fallback = '/dashboard/playlist';
  else if (moduleId) {
    fallback = `/dashboard/subjects/${encodeURIComponent(moduleId)}`;
    if (examType === 'course' || examType === 'qcm') fallback += `?type=${examType}`;
  }
  return navigate(fallback, { replace: true });
};
