import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
    normalizeQuestionImagePath,
    normalizeQuestionImages,
    QUESTION_IMAGES_DIRECTORY,
} from "../utils/questionImagePath.js";

test("normalizes stored question image paths", () => {
    assert.equal(normalizeQuestionImagePath("uploads/questions/a.jpg"), "/uploads/questions/a.jpg");
    assert.equal(normalizeQuestionImagePath("questions/a.jpg"), "/uploads/questions/a.jpg");
    assert.equal(normalizeQuestionImagePath("C:\\app\\uploads\\questions\\a.jpg"), "/uploads/questions/a.jpg");
    assert.equal(normalizeQuestionImagePath("https://old.example.com/uploads/questions/a.jpg"), "/uploads/questions/a.jpg");
    assert.equal(normalizeQuestionImagePath("a.jpg"), "/uploads/questions/a.jpg");
});

test("keeps external URLs and removes empty values", () => {
    const external = "https://cdn.example.com/question.jpg";
    assert.deepEqual(normalizeQuestionImages([external, "", null]), [external]);
});

test("uses the backend uploads directory regardless of the launch directory", () => {
    assert.equal(path.basename(QUESTION_IMAGES_DIRECTORY), "questions");
    assert.equal(path.basename(path.dirname(QUESTION_IMAGES_DIRECTORY)), "uploads");
    assert.equal(path.basename(path.dirname(path.dirname(QUESTION_IMAGES_DIRECTORY))), "wafa-backend");
});
