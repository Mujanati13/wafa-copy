import assert from "node:assert/strict";
import test from "node:test";

import {
    getAcademicYearFromSemesters,
    withAcademicYear,
} from "../utils/academicYear.js";

test("derives a study year from each semester pair", () => {
    assert.equal(getAcademicYearFromSemesters(["S1"]), "1");
    assert.equal(getAcademicYearFromSemesters(["S2"]), "1");
    assert.equal(getAcademicYearFromSemesters(["S5"]), "3");
    assert.equal(getAcademicYearFromSemesters(["S10"]), "5");
});

test("uses the latest semester when a user has multiple semesters", () => {
    assert.equal(getAcademicYearFromSemesters(["S1", "S4", "S3"]), "2");
});

test("ignores malformed and out-of-range semester values", () => {
    assert.equal(getAcademicYearFromSemesters(["", "semester-1", "S0", "S13"]), null);
});

test("fills a missing year without replacing an explicitly stored year", () => {
    assert.deepEqual(
        withAcademicYear({ currentYear: "", semesters: ["S1"] }),
        { currentYear: "1", semesters: ["S1"] },
    );
    assert.deepEqual(
        withAcademicYear({ currentYear: "4", semesters: ["S1"] }),
        { currentYear: "4", semesters: ["S1"] },
    );
});
