import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { buildProfileActivityStatistics } from "../services/profileStatisticsService.js";

test("derives profile accuracy and distinct exams from verified answers", () => {
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
  });

  assert.equal(statistics.examsCompleted, 2);
  assert.equal(statistics.questionsAttempted, 3);
  assert.equal(statistics.correctAnswers, 2);
  assert.equal(statistics.incorrectAnswers, 1);
  assert.ok(Math.abs(statistics.averageScore - (200 / 3)) < Number.EPSILON * 100);
});

test("falls back to legacy aggregates when no verified answers are available", () => {
  const statistics = buildProfileActivityStatistics({
    answeredQuestions: { q1: { isVerified: false, isCorrect: true } },
    totalQuestionsAttempted: 10,
    totalCorrectAnswers: 7,
    averageScore: 12,
    totalExamsCompleted: 3,
  });

  assert.deepEqual(statistics, {
    examsCompleted: 3,
    averageScore: 70,
    questionsAttempted: 10,
    correctAnswers: 7,
    incorrectAnswers: 3,
  });
});
