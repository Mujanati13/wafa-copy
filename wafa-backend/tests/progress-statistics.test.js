import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { buildProgressStatistics } from "../services/progressStatisticsService.js";

test("calculates module/course progress and deterministic highlights", () => {
  const result = buildProgressStatistics({
    modules: [{ _id: "module-1", name: "Cardiologie", semester: "S6", courseNames: ["Cours vide"] }],
    courses: [
      { _id: "course-1", name: "Rythme", moduleId: "module-1", linkedQuestions: ["q1", "q2"] },
      { _id: "course-2", name: "Valves", moduleId: "module-1", linkedQuestions: ["q3", "q4"] },
    ],
    answeredQuestions: {
      q1: { isVerified: true, isCorrect: true, answeredAt: "2026-08-20T10:00:00.000Z" },
      q2: { isVerified: true, isCorrect: false, answeredAt: "2026-08-20T11:00:00.000Z" },
      q3: { isVerified: true, isCorrect: true, answeredAt: "2026-08-21T10:00:00.000Z" },
    },
  });

  assert.equal(result.summary.moduleCount, 1);
  assert.equal(result.summary.courseCount, 3);
  assert.equal(result.summary.completionPercentage, 75);
  assert.equal(result.modules[0].correctAnswers, 2);
  assert.equal(result.modules[0].incorrectAnswers, 1);
  assert.equal(result.modules[0].highlights.highest.courseName, "Valves");
  assert.equal(result.modules[0].highlights.lowest.courseName, "Rythme");
  assert.equal(result.modules[0].highlights.recent.courseName, "Valves");
  assert.deepEqual(result.modules[0].highlights.untouched.map((course) => course.courseName), ["Cours vide"]);
});

test("does not count unverified answers and de-duplicates linked questions at module level", () => {
  const result = buildProgressStatistics({
    modules: [{ _id: "module-1", name: "Digestif" }],
    courses: [
      { _id: "course-1", name: "A", moduleId: "module-1", linkedQuestions: ["q1", "q2"] },
      { _id: "course-2", name: "B", moduleId: "module-1", linkedQuestions: ["q2", "q3"] },
    ],
    answeredQuestions: {
      q1: { isVerified: false, isCorrect: true },
      q2: { isVerified: true, isCorrect: false },
    },
  });

  assert.equal(result.modules[0].totalQuestions, 3);
  assert.equal(result.modules[0].answeredQuestions, 1);
  assert.equal(result.modules[0].incorrectAnswers, 1);
  assert.equal(result.modules[0].completionPercentage, 33);
});

test("handles MongoDB ObjectIds without recursive stack overflow", () => {
  const moduleId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const questionId = new mongoose.Types.ObjectId();

  const result = buildProgressStatistics({
    modules: [{ _id: moduleId, name: "Neurologie", semester: "S5" }],
    courses: [{
      _id: courseId,
      name: "Système nerveux",
      moduleId,
      linkedQuestions: [questionId],
    }],
    answeredQuestions: new Map([[
      questionId.toHexString(),
      { isVerified: true, isCorrect: true, answeredAt: "2026-08-25T10:00:00.000Z" },
    ]]),
  });

  assert.equal(result.modules[0].moduleId, moduleId.toHexString());
  assert.equal(result.modules[0].courses[0].courseId, courseId.toHexString());
  assert.equal(result.modules[0].answeredQuestions, 1);
  assert.equal(result.summary.successRate, 100);
});
