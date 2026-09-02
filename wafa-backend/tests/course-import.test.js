import test from "node:test";
import assert from "node:assert/strict";
import {
    mapCourseImportRows,
    normalizeLessonNumber,
    normalizeSemester,
    validateCourseImportRecord,
} from "../utils/courseImport.js";

test("maps French accented course import headers", () => {
    const rows = [{
        "Semestre": "Semestre 1",
        "Module": "Anatomie I",
        "Catégorie": "Ostéologie",
        "Numéro de leçon": 2,
        "Nom de la leçon": "Membre supérieur",
    }];
    const result = mapCourseImportRows(rows, Object.keys(rows[0]));

    assert.deepEqual(result.missingHeaders, []);
    assert.deepEqual(result.records[0], {
        rowNumber: 2,
        semester: "S1",
        semesterSource: "Semestre 1",
        moduleName: "Anatomie I",
        category: "Ostéologie",
        lessonNumber: "L2",
        lessonName: "Membre supérieur",
    });
});

test("maps the exact Exam par cours spreadsheet headers", () => {
    const rows = [{
        semestre: "S3",
        module: "Sémiologie 1",
        categorie: "Rhumatologie",
        num_lesson: "L1",
        "lesson name": "Introduction et généralités en sémiologie de rhumatologie",
    }];
    const result = mapCourseImportRows(rows, Object.keys(rows[0]));

    assert.deepEqual(result.missingHeaders, []);
    assert.equal(result.records[0].semester, "S3");
    assert.equal(result.records[0].moduleName, "Sémiologie 1");
    assert.equal(result.records[0].category, "Rhumatologie");
    assert.equal(result.records[0].lessonNumber, "L1");
    assert.equal(result.records[0].lessonName, "Introduction et généralités en sémiologie de rhumatologie");
});

test("normalizes semester and lesson number variants", () => {
    assert.equal(normalizeSemester("s10"), "S10");
    assert.equal(normalizeSemester("3"), "S3");
    assert.equal(normalizeSemester("S11"), "");
    assert.equal(normalizeLessonNumber(" l 03 "), "L3");
});

test("reports missing headers and invalid required values", () => {
    const missing = mapCourseImportRows([], ["Semestre", "Module"]);
    assert.deepEqual(missing.missingHeaders, ["lessonNumber", "lessonName"]);

    const errors = validateCourseImportRecord({
        semester: "",
        semesterSource: "S12",
        moduleName: "",
        category: "",
        lessonNumber: "",
        lessonName: "",
    });
    assert.equal(errors.length, 4);
});
