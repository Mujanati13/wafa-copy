import test from "node:test";
import assert from "node:assert/strict";

import {
    CategoryLabelsError,
    validateCategoryLabelPatch,
} from "../utils/categoryLabels.js";
import Module from "../models/moduleModel.js";

test("accepts and trims an individual category label", () => {
    assert.deepEqual(validateCategoryLabelPatch({ qcmBank: "  TP/TD  " }), {
        qcmBank: "TP/TD",
    });
});

test("accepts all supported labels in one request", () => {
    assert.deepEqual(validateCategoryLabelPatch({
        examByYears: "Annales",
        examByCourses: "Cours ciblés",
        qcmBank: "TP/TD",
    }), {
        examByYears: "Annales",
        examByCourses: "Cours ciblés",
        qcmBank: "TP/TD",
    });
});

test("rejects empty, oversized, and unknown labels", () => {
    assert.throws(() => validateCategoryLabelPatch({ qcmBank: " " }), CategoryLabelsError);
    assert.throws(() => validateCategoryLabelPatch({ qcmBank: "x".repeat(61) }), CategoryLabelsError);
    assert.throws(() => validateCategoryLabelPatch({ unsupported: "Test" }), CategoryLabelsError);
});

test("module documents provide defaults and persist customized labels", () => {
    const module = new Module({ name: "Anatomie test", semester: "S1" });
    assert.equal(module.categoryLabels.examByYears, "Exam par years");
    assert.equal(module.categoryLabels.examByCourses, "Exam par courses");
    assert.equal(module.categoryLabels.qcmBank, "QCM banque");

    module.categoryLabels.qcmBank = "TP/TD";
    assert.equal(module.validateSync(), undefined);
    assert.equal(module.categoryLabels.qcmBank, "TP/TD");
});
