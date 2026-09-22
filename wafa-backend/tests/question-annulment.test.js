import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnnulledQuestion } from "../utils/questionAnnulment.js";
import QuestionSchema from "../validators/QuestionSchema.js";

const options = [
    { text: "A", isCorrect: true },
    { text: "B", isCorrect: false },
];

test("an annulled question clears every correct answer", () => {
    const result = normalizeAnnulledQuestion(options, true);
    assert.equal(result.isAnnulled, true);
    assert.deepEqual(result.options, [
        { text: "A", isCorrect: false },
        { text: "B", isCorrect: false },
    ]);
    assert.equal(options[0].isCorrect, true);
});

test("a regular question keeps its selected answers", () => {
    const result = normalizeAnnulledQuestion(options, false);
    assert.equal(result.isAnnulled, false);
    assert.strictEqual(result.options, options);
});

test("question payload validation accepts the annulled flag for create and update", () => {
    const create = QuestionSchema.createQuestionSchema.validate({
        examId: "507f1f77bcf86cd799439011",
        text: "Question sans correction",
        options,
        sessionLabel: "2024 normale",
        isAnnulled: true,
    });
    const update = QuestionSchema.updateQuestionSchema.validate({ isAnnulled: false });

    assert.equal(create.error, undefined);
    assert.equal(create.value.isAnnulled, true);
    assert.equal(update.error, undefined);
    assert.equal(update.value.isAnnulled, false);
});
