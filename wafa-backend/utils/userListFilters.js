const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseFilterDate = (value, endOfDay = false) => {
    if (!value) return null;

    const rawValue = String(value);
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return null;

    // Date pickers submit a day without a time. Keep its whole final day inclusive.
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        if (endOfDay) date.setUTCHours(23, 59, 59, 999);
        else date.setUTCHours(0, 0, 0, 0);
    }

    return date;
};

/**
 * Builds database filters before pagination so every page contains matching users.
 */
export const buildUserListFilter = (query = {}, baseFilter = {}) => {
    const clauses = Object.keys(baseFilter).length ? [baseFilter] : [];
    const search = String(query.search || "").trim();

    if (search) {
        const searchPattern = new RegExp(escapeRegExp(search), "i");
        clauses.push({
            $or: [
                { name: searchPattern },
                { username: searchPattern },
                { email: searchPattern },
            ],
        });
    }

    const academicYear = Number.parseInt(
        String(query.academicYear || "").replace(/\D/g, ""),
        10
    );
    if (Number.isInteger(academicYear) && academicYear >= 1 && academicYear <= 6) {
        const semesters = [
            `S${academicYear * 2 - 1}`,
            `S${academicYear * 2}`,
        ];
        const yearPattern = new RegExp(`(^|\\D)${academicYear}(\\D|$)`, "i");
        clauses.push({
            $or: [
                { semesters: { $in: semesters } },
                { currentYear: { $in: [String(academicYear), ...semesters] } },
                { currentYear: yearPattern },
            ],
        });
    }

    const addDateRange = (field, startValue, endValue) => {
        const start = parseFilterDate(startValue);
        const end = parseFilterDate(endValue, true);
        const range = {};
        if (start) range.$gte = start;
        if (end) range.$lte = end;
        if (Object.keys(range).length) clauses.push({ [field]: range });
    };

    addDateRange("createdAt", query.startDate, query.endDate);
    addDateRange("paymentDate", query.paymentStartDate, query.paymentEndDate);

    if (clauses.length === 0) return {};
    if (clauses.length === 1) return clauses[0];
    return { $and: clauses };
};
