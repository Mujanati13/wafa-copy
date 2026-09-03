import test from "node:test";
import assert from "node:assert/strict";
import { parseCourseQuestionImportRows } from "../utils/courseQuestionImport.js";

test("maps the documented Exam par cours QCM columns", () => {
    const row = {
        "qst Num": 1,
        Question: "Question exemple",
        A: "Choix A",
        B: "Choix B",
        C: "Choix C",
        D: "Choix D",
        E: "Choix E",
        answer: "A,C",
        Session: "Principale",
        Note: "Note exemple",
    };
    const result = parseCourseQuestionImportRows([row], Object.keys(row));

    assert.deepEqual(result.missingHeaders, []);
    assert.deepEqual(result.errors, []);
    assert.equal(result.records[0].questionNumber, 1);
    assert.deepEqual(result.records[0].options.map(option => option.isCorrect), [true, false, true, false, false]);
    assert.equal(result.records[0].sessionLabel, "Principale");
});

test("reports missing required QCM headers", () => {
    const result = parseCourseQuestionImportRows([], ["Question", "A", "B"]);
    assert.deepEqual(result.missingHeaders, ["questionNumber", "optionC", "optionD", "answer"]);
});

test("reports row-specific QCM validation errors", () => {
    const row = {
        "qst Num": "x",
        Question: "",
        A: "Oui",
        B: "",
        C: "",
        D: "",
        answer: "Z",
    };
    const result = parseCourseQuestionImportRows([row], Object.keys(row));
    assert.deepEqual(result.errors.map(error => error.field), ["qst Num", "Question", "Options", "answer"]);
});

test("accepts annulled questions with an empty answer", () => {
    const row = {
        "qst Num": 2,
        Question: "Question annulée",
        A: "Choix A",
        B: "Choix B",
        C: "",
        D: "",
        answer: "",
    };
    const result = parseCourseQuestionImportRows([row], Object.keys(row));
    assert.deepEqual(result.errors, []);
    assert.equal(result.records[0].isAnnulled, true);
});
