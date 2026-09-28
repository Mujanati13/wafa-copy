import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { buildProfileActivityStatistics } from "../services/profileStatisticsService.js";

test("distinguishes a completed exam from a partially verified exam", () => {
  const firstExamId = new mongoose.Types.ObjectId();
  const secondExamId = new mongoose.Types.ObjectId();
  const statistics = buildProfileActivityStatistics({
    answeredQuestions: new Map([
      ["q1", { isVerified: true, isCorrect: true, examId: firstExamId }],
      ["q2", { isVerified: true, isCorrect: false, examId: firstExamId }],
      ["q3", { isVerified: true, isCorrect: true, examId: secondExamId }],
      ["q4", { isVerified: false, isCorrect: true, examId: secondExamId }],
    ]),
    totalQuestionsAttempted: 0,
    totalCorrectAnswers: 0,
    averageScore: 0,
    totalExamsCompleted: 0,
    exams: [
      { _id: firstExamId, questionIds: ["q1", "q2"] },
      { _id: secondExamId, questionIds: ["q3", "q4"] },
    ],
  });

  assert.equal(statistics.examsStarted, 2);
  assert.equal(statistics.examsCompleted, 1);
  assert.equal(statistics.questionsAttempted, 3);
  assert.equal(statistics.correctAnswers, 2);
  assert.equal(statistics.incorrectAnswers, 1);
  assert.ok(Math.abs(statistics.averageScore - (200 / 3)) < Number.EPSILON * 100);
});

test("legacy question aggregates do not prove that exams were completed", () => {
  const statistics = buildProfileActivityStatistics({
    answeredQuestions: { q1: { isVerified: false, isCorrect: true } },
    totalQuestionsAttempted: 10,
    totalCorrectAnswers: 7,
    averageScore: 12,
    totalExamsCompleted: 3,
  });

  assert.deepEqual(statistics, {
    examsStarted: 0,
    examsCompleted: 0,
    averageScore: 70,
    questionsAttempted: 10,
    correctAnswers: 7,
    incorrectAnswers: 3,
  });
});

test("two or three answers do not complete a course; the final verified answer does", () => {
  const answers = {};
  const exams = [{ _id: "course", questionIds: ["q1", "q2", "q3", "q4", "q4"] }];
  const stats = () => buildProfileActivityStatistics({ answeredQuestions: answers, exams });
  assert.equal(stats().examsStarted, 0);
  answers.q1 = { examId: "course", selectedAnswers: [0], isVerified: false };
  assert.equal(stats().examsStarted, 1);
  assert.equal(stats().examsCompleted, 0);
  for (const id of ["q1", "q2", "q3"]) {
    answers[id] = { examId: "course", isVerified: true, isCorrect: false };
    assert.equal(stats().examsCompleted, 0);
  }
  answers.q4 = { examId: "course", isVerified: false, selectedAnswers: [0] };
  assert.equal(stats().examsCompleted, 0);
  answers.q4.isVerified = true;
  assert.equal(stats().examsCompleted, 1);
  // Re-answering the same question does not create another completed exam.
  answers.q4.isCorrect = true;
  assert.equal(stats().examsCompleted, 1);
});

test("empty, unknown and unrelated exam answers cannot establish completion", () => {
  const result = buildProfileActivityStatistics({
    answeredQuestions: {
      q1: { examId: "other", isVerified: true },
      stale: { examId: "course", isVerified: true },
      draft: { examId: "empty", isVerified: false },
    },
    exams: [
      { _id: "course", questionIds: ["q1"] },
      { _id: "empty", questionIds: [] },
    ],
    totalExamsCompleted: 99,
    totalExams: 99,
  });
  assert.equal(result.examsStarted, 0);
  assert.equal(result.examsCompleted, 0);
});
