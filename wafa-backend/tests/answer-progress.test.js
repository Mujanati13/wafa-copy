import test from "node:test";
import assert from "node:assert/strict";
import { buildAnsweredCountByExam } from "../utils/answerProgress.js";

test("counts verified answers per exam from a Map", () => {
    const answers = new Map([
        ["question-1", { examId: "exam-1", isVerified: true }],
        ["question-2", { examId: "exam-1", isVerified: true }],
        ["question-3", { examId: "exam-2", isVerified: true }],
    ]);

    assert.deepEqual(buildAnsweredCountByExam(answers), {
        "exam-1": 2,
        "exam-2": 1,
    });
});

test("ignores drafts and malformed answers from plain objects", () => {
    const answers = {
        first: { examId: "exam-1", isVerified: false },
        second: { examId: "exam-1", isVerified: true },
        missingExam: { isVerified: true },
        empty: null,
    };

    assert.deepEqual(buildAnsweredCountByExam(answers), { "exam-1": 1 });
});
