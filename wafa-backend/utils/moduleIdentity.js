const ROMAN_NUMERALS = new Map([
    ["i", "1"],
    ["ii", "2"],
    ["iii", "3"],
    ["iv", "4"],
    ["v", "5"],
    ["vi", "6"],
    ["vii", "7"],
    ["viii", "8"],
    ["ix", "9"],
    ["x", "10"],
]);

const normalizeFrenchToken = (token) => {
    const numericToken = ROMAN_NUMERALS.get(token) || token;

    // Historical module imports contain small naming variations such as
    // "pathologies digestif" and "pathologie digestive". Keep this
    // intentionally narrow so unrelated modules are never merged.
    const adjectiveNormalized = numericToken
        .replace(/ives?$/, "if")
        .replace(/ales$/, "al")
        .replace(/aux$/, "al");

    if (adjectiveNormalized.length > 4 && /[sx]$/.test(adjectiveNormalized)) {
        return adjectiveNormalized.slice(0, -1);
    }

    return adjectiveNormalized;
};

export const normalizeModuleIdentity = (value = "") => String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeFrenchToken)
    .join(" ");

export const moduleNamesAreEquivalent = (left, right) => {
    const leftIdentity = normalizeModuleIdentity(left);
    const rightIdentity = normalizeModuleIdentity(right);
    return Boolean(leftIdentity && leftIdentity === rightIdentity);
};

export const findEquivalentModules = (selectedModule, modules = []) => {
    if (!selectedModule) return [];

    return modules.filter((candidate) => {
        if (!moduleNamesAreEquivalent(selectedModule.name, candidate.name)) return false;

        // The same numbered/name module can legitimately appear in different
        // semesters. Only bridge records inside the selected semester when
        // both records specify one.
        return !selectedModule.semester || !candidate.semester
            || selectedModule.semester === candidate.semester;
    });
};
