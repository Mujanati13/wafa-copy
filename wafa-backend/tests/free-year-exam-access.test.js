import test from "node:test";
import assert from "node:assert/strict";
import ExamParYear from "../models/examParYearModel.js";
import { hasExamAccess } from "../middleware/authMiddleware.js";

const YEARLY_EXAM_ID = "68c14f32b9e9fa2ed1df0c01";
const LOCKED_CONTENT_ID = "68c14f32b9e9fa2ed1df0c02";

const response = () => ({
    statusCode: 200,
    body: null,
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; },
});

test("the free plan can open any yearly exam but not unrelated content", async (t) => {
    t.mock.method(ExamParYear, "exists", async ({ _id }) => (
        String(_id) === YEARLY_EXAM_ID ? { _id: YEARLY_EXAM_ID } : null
    ));

    let yearlyNextCalls = 0;
    await hasExamAccess(
        { user: { plan: "Free" }, params: { id: YEARLY_EXAM_ID }, body: {} },
        response(),
        () => { yearlyNextCalls += 1; },
    );
    assert.equal(yearlyNextCalls, 1);

    const denied = response();
    await hasExamAccess(
        { user: { plan: "Free", freeExam: LOCKED_CONTENT_ID }, params: { id: LOCKED_CONTENT_ID }, body: {} },
        denied,
        () => assert.fail("non-yearly content must stay locked"),
    );
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.body.code, "FREE_PLAN_EXAM_LIMIT");
});
