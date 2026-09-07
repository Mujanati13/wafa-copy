import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  buildCompleteActivitySources,
  buildProgressStatistics,
  filterModulesBySemester,
} from "../services/progressStatisticsService.js";

test("strictly keeps only modules from the selected semester", () => {
  const modules = filterModulesBySemester([
    { _id: "m1", semester: "S1" },
    { _id: "m3", semester: "S3" },
    { _id: "global", semester: "", availableInAllSemesters: true },
  ], "s1");

  assert.deepEqual(modules.map((module) => module._id), ["m1"]);
});

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

test("includes unmapped annual-exam and QCM-bank activity without double counting course questions", () => {
  const sources = buildCompleteActivitySources({
    courses: [{
      _id: "course-1",
      name: "Cours thématique",
      moduleId: "module-1",
      linkedQuestions: ["q1"],
    }],
    annualExams: [{ _id: "exam-1", name: "2026 normal", moduleId: "module-1" }],
    qcmBanks: [{ _id: "bank-1", name: "Entraînement", moduleId: "module-1" }],
    questions: [
      { _id: "q1", examId: "exam-1" },
      { _id: "q2", examId: "exam-1" },
      { _id: "q3", qcmBanqueId: "bank-1" },
    ],
  });

  const result = buildProgressStatistics({
    modules: [{ _id: "module-1", name: "Anatomie I", semester: "S1" }],
    courses: sources,
    answeredQuestions: {
      q1: { isVerified: true, isCorrect: true, answeredAt: "2026-09-01T10:00:00.000Z" },
      q2: { isVerified: true, isCorrect: false, answeredAt: "2026-09-02T10:00:00.000Z" },
      q3: { isVerified: true, isCorrect: true, answeredAt: "2026-09-03T10:00:00.000Z" },
    },
  });

  assert.equal(result.summary.courseCount, 1);
  assert.equal(result.summary.totalQuestions, 3);
  assert.equal(result.summary.answeredQuestions, 3);
  assert.equal(result.summary.correctAnswers, 2);
  assert.equal(result.summary.incorrectAnswers, 1);
  assert.equal(result.summary.completionPercentage, 100);
  assert.equal(result.modules[0].highlights.recent.courseName, "Cours thématique");
  assert.equal(result.modules[0].courses.length, 1);
  assert.equal(result.modules[0].courses[0].courseName, "Cours thématique");
});

test("strictly excludes yearly exams from courses and highlights (untouched, recent, lowest, highest)", () => {
  const sources = buildCompleteActivitySources({
    courses: [{
      _id: "course-1",
      name: "Anatomie du Coeur",
      moduleId: "module-1",
      linkedQuestions: ["q1"],
    }, {
      _id: "course-2",
      name: "Anatomie topographique de membre supérieur",
      moduleId: "module-1",
      linkedQuestions: ["q2"],
    }],
    annualExams: [
      { _id: "exam-1", name: "2025 ratt", moduleId: "module-1" },
      { _id: "exam-2", name: "2026 normal", moduleId: "module-1" },
    ],
    questions: [
      { _id: "q1" },
      { _id: "q2" },
      { _id: "q3", examId: "exam-1" },
      { _id: "q4", examId: "exam-2" },
    ],
  });

  const result = buildProgressStatistics({
    modules: [{ _id: "module-1", name: "Anatomie I", semester: "S1" }],
    courses: sources,
    answeredQuestions: {
      q1: { isVerified: true, isCorrect: true, answeredAt: "2026-09-06T10:00:00.000Z" },
    },
  });

  assert.equal(result.modules[0].courseCount, 2);
  assert.equal(result.modules[0].courses.length, 2);
  assert.deepEqual(result.modules[0].courses.map((c) => c.courseName), [
    "Anatomie du Coeur",
    "Anatomie topographique de membre supérieur",
  ]);
  assert.equal(result.modules[0].highlights.recent.courseName, "Anatomie du Coeur");
  assert.deepEqual(result.modules[0].highlights.untouched.map((c) => c.courseName), [
    "Anatomie topographique de membre supérieur",
  ]);
  // Verify '2025 ratt' is not in untouched, recent, or courses
  assert.equal(result.modules[0].highlights.untouched.some((c) => c.courseName.includes("2025")), false);
  assert.equal(result.modules[0].courses.some((c) => c.courseName.includes("2025")), false);
  // But all 4 questions in module are counted in module total
  assert.equal(result.modules[0].totalQuestions, 4);
  assert.equal(result.modules[0].answeredQuestions, 1);
});
