import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import ExamCourse from "../models/examCourseModel.js";
import ExamParYear from "../models/examParYearModel.js";
import QCMBanque from "../models/qcmBanqueModel.js";
import Question from "../models/questionModule.js";
import { loadProfileExams } from "../services/profileExamService.js";
import { buildProfileActivityStatistics } from "../services/profileStatisticsService.js";

test("loads real membership for courses, annual exams and banks before counting completion", async (t) => {
  const courseId = new mongoose.Types.ObjectId();
  const annualId = new mongoose.Types.ObjectId();
  const bankId = new mongoose.Types.ObjectId();
  const query = (data) => ({
    select() { return this; },
    populate() { return this; },
    lean: async () => data,
  });
  t.mock.method(ExamCourse, "find", () => query([
    { _id: courseId, linkedQuestions: [{ _id: "q1" }, { _id: "q2" }] },
  ]));
  t.mock.method(ExamParYear, "find", () => query([{ _id: annualId }]));
  t.mock.method(QCMBanque, "find", () => query([{ _id: bankId }]));
  t.mock.method(Question, "find", () => query([
    { _id: "q3", examId: annualId },
    { _id: "q4", qcmBanqueId: bankId },
  ]));
  const answeredQuestions = new Map([
    ["q1", { examId: courseId, isVerified: true }],
    ["q3", { examId: annualId, isVerified: true }],
    ["q4", { examId: bankId, isVerified: true }],
  ]);
  const exams = await loadProfileExams(answeredQuestions);
  assert.equal(exams.length, 3);
  const stats = buildProfileActivityStatistics({ answeredQuestions, exams });
  assert.equal(stats.examsStarted, 3);
  assert.equal(stats.examsCompleted, 2);
});

test("does not query the catalog for users without exam activity", async (t) => {
  const find = t.mock.method(ExamCourse, "find", () => { throw new Error("unexpected query"); });
  assert.deepEqual(await loadProfileExams({}), []);
  assert.deepEqual(await loadProfileExams({ q1: { examId: "invalid" } }), []);
  assert.equal(find.mock.callCount(), 0);
});
