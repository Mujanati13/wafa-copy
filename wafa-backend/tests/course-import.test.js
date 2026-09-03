import test from "node:test";
import assert from "node:assert/strict";
import {
    getCourseImportDuplicateKeys,
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
    assert.deepEqual(missing.missingHeaders, ["category", "lessonNumber", "lessonName"]);

    const errors = validateCourseImportRecord({
        semester: "",
        semesterSource: "S12",
        moduleName: "",
        category: "",
        lessonNumber: "",
        lessonName: "",
    });
    assert.equal(errors.length, 5);
});

test("requires a category value for every imported course", () => {
    const rows = [{
        semestre: "S3",
        module: "Sémiologie 1",
        categorie: "",
        num_lesson: "L1",
        "lesson name": "Introduction",
    }];
    const { records } = mapCourseImportRows(rows, Object.keys(rows[0]));

    assert.deepEqual(validateCourseImportRecord(records[0]), [{
        field: "Catégorie",
        reason: "La catégorie est requise",
    }]);
});

test("allows the same lesson number in different categories", () => {
    const rheumatologyKeys = getCourseImportDuplicateKeys({
        moduleId: "module-1",
        category: "Rhumatologie",
        lessonNumber: "L1",
        lessonName: "Introduction rhumatologie",
    });
    const cardiologyKeys = getCourseImportDuplicateKeys({
        moduleId: "module-1",
        category: "Cardiologie",
        lessonNumber: "L1",
        lessonName: "Introduction cardiologie",
    });

    assert.equal(rheumatologyKeys.some(key => cardiologyKeys.includes(key)), false);
});

test("detects a repeated lesson inside the same module category", () => {
    const firstKeys = getCourseImportDuplicateKeys({
        moduleId: "module-1",
        category: "Rhumatologie",
        lessonNumber: "L01",
        lessonName: "Introduction",
    });
    const repeatedKeys = getCourseImportDuplicateKeys({
        moduleId: "module-1",
        category: "rhumatologie",
        lessonNumber: "L1",
        lessonName: "Introduction",
    });

    assert.deepEqual(firstKeys, repeatedKeys);
});
