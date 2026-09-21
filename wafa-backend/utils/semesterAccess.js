export const ALLOWED_SEMESTERS = [
  "S1", "S2", "S3", "S4", "S5",
  "S6", "S7", "S8", "S9", "S10",
];

const semesterRank = (semester) => Number.parseInt(semester.slice(1), 10);

export const normalizeSemesterAccess = (semesters) => {
  if (!Array.isArray(semesters)) return null;

  const normalized = semesters.map((semester) => String(semester || "").trim().toUpperCase());
  if (normalized.some((semester) => !ALLOWED_SEMESTERS.includes(semester))) return null;

  return [...new Set(normalized)].sort((left, right) => semesterRank(left) - semesterRank(right));
};
