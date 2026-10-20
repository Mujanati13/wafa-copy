import test from "node:test";
import assert from "node:assert/strict";
import { buildAnsweredCountByExam } from "../utils/answerProgress.js";
import { remapQuestionAnswers } from "../utils/answerIdentity.js";

test("duplicate repair preserves legacy and scoped answers independently and is idempotent", () => {
    const annual = { examId: "annual", isVerified: true, isCorrect: true };
    const course = { examId: "course", isVerified: true, isCorrect: false };
    const replacements = new Map([["old", "new"]]);
    for (const entries of [
        [["old", annual], ["new", course]],
        [["annual:old", annual], ["course:new", course]],
        [["new", course], ["old", annual]],
    ]) {
        const result = remapQuestionAnswers(new Map(entries), replacements);
        assert.equal(result.size, 2);
        assert.equal(result.get("annual:new"), annual);
        assert.equal(result.get("course:new"), course);
        assert.deepEqual(remapQuestionAnswers(result, replacements), result);
    }
});

test("duplicate repair counts one result per context and retains the latest verified answer", () => {
    const older = { examId: "annual", isVerified: true, isCorrect: false, answeredAt: "2026-01-01" };
    const newer = { ...older, isCorrect: true, answeredAt: "2026-02-01" };
    const result = remapQuestionAnswers(new Map([["old", older], ["annual:new", newer]]), new Map([["old", "new"]]));
    assert.deepEqual([...result], [["annual:new", newer]]);
});

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
