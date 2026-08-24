const SEMESTER_PATTERN = /^S(\d{1,2})$/i;

/**
 * Derive the study year represented by one or more semester identifiers.
 * When multiple semesters are assigned, the latest semester determines the
 * user's current year.
 */
export const getAcademicYearFromSemesters = (semesters) => {
    const values = Array.isArray(semesters) ? semesters : [semesters];
    const semesterNumbers = values
        .map((semester) => String(semester ?? "").trim().match(SEMESTER_PATTERN))
        .filter(Boolean)
        .map((match) => Number.parseInt(match[1], 10))
        .filter((semester) => semester >= 1 && semester <= 12);

    if (semesterNumbers.length === 0) return null;

    return String(Math.ceil(Math.max(...semesterNumbers) / 2));
};

/**
 * Keep an explicitly stored year, but provide a derived value for legacy user
 * records that already have semesters and are missing currentYear.
 */
export const withAcademicYear = (user) => {
    if (!user) return user;

    const storedYear = String(user.currentYear ?? "").trim();
    return {
        ...user,
        currentYear: storedYear || getAcademicYearFromSemesters(user.semesters),
    };
};
