// Only store learner reads under the account and access snapshot that requested them.
const entries = new Map();
let generation = 0;

export function learnerScope() {
  try {
    const user = JSON.parse(localStorage.getItem('userProfile') || localStorage.getItem('user') || '{}');
    return JSON.stringify([user._id, user.plan, user.semesters, user.freeModule?._id || user.freeModule]);
  } catch { return 'anonymous'; }
}

export function clearLearnerCache() {
  generation++;
  entries.clear();
}

export function invalidateLearnerReads(matches) {
  for (const [key, entry] of entries) if (matches(entry.resource)) entries.delete(key);
}

export function cachedLearnerRead(key, read, { maxAge = 30000, forceRefresh = false } = {}) {
  const scope = learnerScope();
  const scopedKey = `${scope}:${key}`;
  const current = entries.get(scopedKey);
  if (current?.pending) return current.pending;
  if (!forceRefresh && current && Date.now() - current.time < maxAge) return Promise.resolve(current.value);
  const version = generation;
  const entry = { resource: key, value: current?.value, time: current?.time || 0 };
  const pending = Promise.resolve().then(read).then(value => {
    if (version === generation && learnerScope() === scope && entries.get(scopedKey) === entry) {
      entry.value = value;
      entry.time = Date.now();
    }
    return value;
  }).finally(() => {
    if (entries.get(scopedKey) === entry) {
      entry.pending = null;
      if (!entry.time) entries.delete(scopedKey);
    }
  });
  entry.pending = pending;
  entries.set(scopedKey, entry);
  // Bound inactive accounts, modules and search combinations in long-lived tabs.
  if (entries.size > 100) {
    for (const [oldKey, oldEntry] of entries) {
      if (!oldEntry.pending && oldKey !== scopedKey) { entries.delete(oldKey); break; }
    }
  }
  return pending;
}
