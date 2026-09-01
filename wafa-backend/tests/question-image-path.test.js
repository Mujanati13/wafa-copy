import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuestionImagePath, normalizeQuestionImages } from "../utils/questionImagePath.js";

test("normalizes stored question image paths", () => {
    assert.equal(normalizeQuestionImagePath("uploads/questions/a.jpg"), "/uploads/questions/a.jpg");
    assert.equal(normalizeQuestionImagePath("questions/a.jpg"), "/uploads/questions/a.jpg");
    assert.equal(normalizeQuestionImagePath("C:\\app\\uploads\\questions\\a.jpg"), "/uploads/questions/a.jpg");
    assert.equal(normalizeQuestionImagePath("a.jpg"), "/uploads/questions/a.jpg");
});

test("keeps external URLs and removes empty values", () => {
    const external = "https://cdn.example.com/question.jpg";
    assert.deepEqual(normalizeQuestionImages([external, "", null]), [external]);
});
