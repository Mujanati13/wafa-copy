import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { getProgressStatistics } from "../controllers/progressStatisticsController.js";
import Module from "../models/moduleModel.js";
import Course from "../models/examCourseModel.js";
import AnnualExam from "../models/examParYearModel.js";
import Bank from "../models/qcmBanqueModel.js";
import Question from "../models/questionModule.js";
import UserStats from "../models/userStatsModel.js";

const query = value => ({ select() { return this; }, sort() { return this; }, lean: async () => value });
const response = () => ({
  headers: {},
  set(key, value) { this.headers[key] = value; return this; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

test("progress endpoint returns the two answering modes even when all annual questions are linked to a course", async t => {
  const moduleId = new mongoose.Types.ObjectId();
  const examId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const questions = Array.from({ length: 690 }, () => ({ _id: new mongoose.Types.ObjectId(), examId }));
  t.mock.method(Module, "find", filter => {
    assert.deepEqual(filter, { semester: "S1" });
    return query([{ _id: moduleId, name: "Anatomie I", semester: "S1" }]);
  });
  t.mock.method(Course.collection, "find", () => ({
    sort() { return this; },
    toArray: async () => [{ _id: courseId, name: "Anatomie", moduleId, linkedQuestions: questions.map(q => q._id) }],
  }));
  t.mock.method(AnnualExam, "find", () => query([{ _id: examId, moduleId }]));
  t.mock.method(Bank, "find", () => query([]));
  t.mock.method(Question, "find", () => query(questions));
  t.mock.method(UserStats, "findOne", filter => {
    assert.equal(filter.userId, userId);
    return query({ answeredQuestions: Object.fromEntries(questions.slice(0, 3).map((q, index) => [
      q._id.toHexString(), { examId: index === 2 ? courseId : examId, isVerified: true, isCorrect: false },
    ])) });
  });
  const res = response();
  await getProgressStatistics({ query: { semester: "s1" }, user: { _id: userId, semesters: ["S1"] } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.headers["Cache-Control"], "private, no-store");
  for (const item of [res.body.data.summary, res.body.data.modules[0]]) {
    assert.equal(item.totalQuestions, 690);
    assert.equal(item.answeredQuestions, 3);
    assert.equal(item.answeredByYear, 2);
    assert.equal(item.answeredByCourse, 1);
    assert.equal(item.correctAnswers, 0);
    assert.equal(item.incorrectAnswers, 3);
  }
});

for (const [semester, code] of [["", 400], ["S11", 400], ["S2", 403]]) {
  test(`progress endpoint preserves semester validation and access checks (${semester || "missing"})`, async () => {
    const res = response();
    await getProgressStatistics({ query: { semester }, user: { semesters: ["S1"] } }, res);
    assert.equal(res.code, code);
    assert.equal(res.body.success, false);
  });
}
