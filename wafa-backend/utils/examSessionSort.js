/**
 * Exam Session Sorting Utility
 * Enforces strict chronological ordering:
 * 1. Descending by year (e.g. 2026, 2025, 2024, ..., 2017)
 * 2. Standard session order within the same year ("normal" before "ratt")
 * 3. Natural alphabetical comparison fallback
 */

export const parseSessionInfo = (sessionName) => {
    const str = String(sessionName || "").trim();

    // Match 4-digit years (e.g., 2026, 2025, 2024, 1999)
    const yearMatches = str.match(/\b(19\d{2}|20\d{2})\b/g);
    let year = 0;
    if (yearMatches && yearMatches.length > 0) {
        year = parseInt(yearMatches[0], 10);
    } else {
        const fallbackMatch = str.match(/\b(\d{4})\b/);
        if (fallbackMatch) {
            year = parseInt(fallbackMatch[1], 10);
        }
    }

    // Session priority within the same year:
    // Session normale / principale comes before Session de rattrapage
    const lower = str.toLowerCase();
    let sessionRank = 50; // Default middle rank
    if (lower.includes("norm") || lower.includes("princ") || lower.includes("ord") || lower.includes("s1")) {
        sessionRank = 10;
    } else if (lower.includes("ratt") || lower.includes("extra") || lower.includes("s2")) {
        sessionRank = 20;
    }

    return { year, sessionRank, str };
};

export const compareSessionNames = (nameA, nameB) => {
    const a = parseSessionInfo(nameA);
    const b = parseSessionInfo(nameB);

    // 1. Primary sort: Year descending (2026 -> 2025 -> 2024 ...)
    if (a.year !== b.year) {
        if (a.year === 0) return 1;
        if (b.year === 0) return -1;
        return b.year - a.year;
    }

    // 2. Secondary sort: Session rank ascending ("normal" rank 10 before "ratt" rank 20)
    if (a.sessionRank !== b.sessionRank) {
        return a.sessionRank - b.sessionRank;
    }

    // 3. Fallback: French alphabetical sort
    return a.str.localeCompare(b.str, "fr", { numeric: true, sensitivity: "base" });
};

export const sortGroupedQuestions = (groupedQuestions) => {
    if (!groupedQuestions || typeof groupedQuestions !== "object") {
        return {};
    }

    const sortedSessions = Object.keys(groupedQuestions).sort(compareSessionNames);
    const sortedResult = {};

    for (const session of sortedSessions) {
        sortedResult[session] = groupedQuestions[session];
    }

    return sortedResult;
};
