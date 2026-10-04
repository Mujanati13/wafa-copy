import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  buildCompleteActivitySources,
  buildProgressStatistics,
  filterModulesBySemester,
} from "../services/progressStatisticsService.js";

for (const format of ["Map", "object"]) {
  test(`separates 2 yearly and 1 course answers over 690 shared questions (${format})`, () => {
    const modules = [{ _id: "m", name: "Anatomie I", semester: "S1" }];
    const annualExams = [{ _id: "annual", moduleId: "m" }];
    const questions = Array.from({ length: 690 }, (_, index) => ({ _id: `q${index}`, examId: "annual" }));
    const courses = buildCompleteActivitySources({
      annualExams, questions,
      courses: [{ _id: "course", name: "Anatomie", moduleId: "m", linkedQuestions: questions.map(q => q._id) }],
    });
    const answers = new Map([
      ["q0", { examId: "annual", isVerified: true, isCorrect: false }],
      ["q1", { examId: "annual", isVerified: true, isCorrect: false }],
      ["q2", { examId: "course", isVerified: true, isCorrect: false }],
      ["q3", { examId: "course", isVerified: false, isCorrect: true }],
      ["outside", { examId: "annual", isVerified: true, isCorrect: true }],
    ]);
    const progress = () => buildProgressStatistics({
      modules, courses, annualExams, questions,
      answeredQuestions: format === "Map" ? answers : Object.fromEntries(answers),
    });
    const check = (year, course) => {
      const result = progress();
      for (const item of [result.summary, result.modules[0], result.modules[0].courses[0]]) {
        assert.equal(item.totalQuestions, 690);
        assert.equal(item.answeredQuestions, 3);
        assert.equal(item.answeredByYear, year);
        assert.equal(item.answeredByCourse, course);
        assert.equal(item.correctAnswers, 0);
        assert.equal(item.incorrectAnswers, 3);
      }
    };
    check(2, 1);
    // The latest saved context moves the question to the other mode without
    // adding an attempt to the global unique-question count.
    answers.set("q0", { examId: "course", isVerified: true, isCorrect: false });
    check(1, 2);
  });
}

test("keeps QCM and legacy answers in the total without inventing a yearly or course origin", () => {
  const questions = [
    { _id: "qcm-question", qcmBanqueId: "bank" },
    { _id: "legacy", examId: "annual" },
    { _id: "unknown", examId: "annual" },
  ];
  const annualExams = [{ _id: "annual", moduleId: "m" }];
  const courses = buildCompleteActivitySources({
    questions, annualExams,
    qcmBanks: [{ _id: "bank", moduleId: "m" }],
    courses: [{ _id: "course", moduleId: "m", name: "A", linkedQuestions: ["legacy", "unknown"] }],
  });
  const result = buildProgressStatistics({
    modules: [{ _id: "m", name: "A" }], courses, annualExams, questions,
    answeredQuestions: {
      "qcm-question": { examId: "bank", isVerified: true, isCorrect: true },
      legacy: { isVerified: true, isCorrect: false },
      unknown: { examId: "deleted-exam", isVerified: true, isCorrect: true },
    },
  });
  for (const item of [result.modules[0], result.summary]) {
    assert.equal(item.answeredQuestions, 3);
    assert.equal(item.answeredByYear, 0);
    assert.equal(item.answeredByCourse, 0);
    assert.equal(item.correctAnswers, 2);
    assert.equal(item.incorrectAnswers, 1);
  }
});

test("uses the latest verified duplicate's answering mode with MongoDB exam IDs", () => {
  const annualId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const questions = [
    { _id: "new", examId: annualId, questionNumber: 1 },
    { _id: "old", examId: annualId, questionNumber: 1 },
  ];
  const annualExams = [{ _id: annualId, moduleId: "m" }];
  const courses = buildCompleteActivitySources({
    annualExams, questions,
    courses: [{ _id: courseId, moduleId: "m", name: "Cours", linkedQuestions: ["old"] }],
  });
  const result = buildProgressStatistics({
    modules: [{ _id: "m", name: "A" }], courses, annualExams, questions,
    answeredQuestions: {
      new: { examId: annualId, isVerified: true, isCorrect: false, answeredAt: "2026-09-01" },
      old: { examId: courseId.toHexString(), isVerified: true, isCorrect: true, answeredAt: "2026-09-02" },
    },
  });
  assert.equal(result.modules[0].totalQuestions, 1);
  assert.equal(result.modules[0].answeredQuestions, 1);
  assert.equal(result.modules[0].answeredByYear, 0);
  assert.equal(result.modules[0].answeredByCourse, 1);
  assert.equal(result.modules[0].correctAnswers, 1);
});

for (const format of ["Map", "object"]) {
  test(`preserves older duplicate links and latest verified answers (${format})`, () => {
    const questions = [
      { _id: "new", examId: "exam", questionNumber: 12 },
      { _id: "old", examId: "exam", questionNumber: 12 },
    ];
    const courses = buildCompleteActivitySources({
      questions,
      courses: [{ _id: "course", name: "A", moduleId: "m", linkedQuestions: ["old"] }],
      annualExams: [{ _id: "exam", moduleId: "m" }],
    });
    const answers = new Map([
      ["old", { isVerified: true, isCorrect: true, answeredAt: "2026-09-02" }],
    ]);
    const stats = () => buildProgressStatistics({
      modules: [{ _id: "m", name: "Module" }], courses, questions,
      answeredQuestions: format === "Map" ? answers : Object.fromEntries(answers),
    });
    const check = (correct) => {
      for (const item of [stats().summary, stats().modules[0], stats().modules[0].courses[0]]) {
        assert.equal(item.totalQuestions, 1);
        assert.equal(item.answeredQuestions, 1);
        assert.equal(item.correctAnswers, correct);
        assert.equal(item.incorrectAnswers, 1 - correct);
        assert.equal(item.completionPercentage, 100);
      }
    };
    check(1);
    answers.set("new", { isVerified: true, isCorrect: false, answeredAt: "2026-09-01" });
    check(1);
    answers.set("new", { isVerified: true, isCorrect: false, answeredAt: "2026-09-03" });
    check(0);
    // A draft on another duplicate does not replace verified progress.
    answers.set("old", { isVerified: false, isCorrect: true, answeredAt: "2026-09-04" });
    check(0);
  });
}

test("global summary counts shared questions once across modules", () => {
  const result = buildProgressStatistics({
    modules: [{ _id: "a", name: "A" }, { _id: "b", name: "B" }],
    courses: [
      { _id: "ca", name: "A", moduleId: "a", linkedQuestions: ["shared", "q2"] },
      { _id: "cb", name: "B", moduleId: "b", linkedQuestions: ["shared", "q3"] },
    ],
    answeredQuestions: { shared: { isVerified: true, isCorrect: true } },
  });
  assert.equal(result.summary.totalQuestions, 3);
  assert.equal(result.summary.answeredQuestions, 1);
  assert.equal(result.summary.completionPercentage, 33);
});

test("equal question numbers in different exams or sessions remain distinct", () => {
  const questions = [
    { _id: "q1", examId: "exam-a", questionNumber: 1, sessionLabel: "normal" },
    { _id: "q2", examId: "exam-b", questionNumber: 1, sessionLabel: "normal" },
    { _id: "q3", examId: "exam-a", questionNumber: 1, sessionLabel: "retake" },
    { _id: "legacy-a", examId: "exam-a" },
    { _id: "legacy-b", examId: "exam-a" },
  ];
  const courses = buildCompleteActivitySources({
    questions,
    courses: [{ _id: "c", name: "C", moduleId: "m", linkedQuestions: questions.map(q => q._id) }],
  });
  const result = buildProgressStatistics({
    modules: [{ _id: "m", name: "M" }], courses, questions,
    answeredQuestions: { q1: { isVerified: true, isCorrect: true } },
  });
  assert.equal(result.summary.totalQuestions, 5);
  assert.equal(result.summary.answeredQuestions, 1);
  assert.equal(result.summary.completionPercentage, 20);
});

test("missing verification flags and malformed answers do not count as completed", () => {
  const result = buildProgressStatistics({
    modules: [{ _id: "m", name: "M" }],
    courses: [{ _id: "c", name: "C", moduleId: "m", linkedQuestions: ["q1", "q2", "q3"] }],
    answeredQuestions: { q1: null, q2: {}, q3: { isCorrect: true } },
  });
  assert.equal(result.summary.answeredQuestions, 0);
});

test("strictly keeps only modules from the selected semester", () => {
  const modules = filterModulesBySemester([
    { _id: "m1", semester: "S1" },
    { _id: "m3", semester: "S3" },
    { _id: "global", semester: "", availableInAllSemesters: true },
  ], "s1");

  assert.deepEqual(modules.map((module) => module._id), ["m1"]);
});

for (const answerFormat of ["Map", "plain object"]) {
  test(`690 shared questions remain 690 after 10 course retries (${answerFormat})`, () => {
    const questionIds = Array.from({ length: 690 }, (_, index) => `question-${index}`);
    const modules = [{ _id: "anatomy", name: "Anatomie I", semester: "S1" }];
    const annualExams = [{ _id: "exam", name: "2026 normal", moduleId: "anatomy" }];
    const courses = buildCompleteActivitySources({
      courses: [
        { _id: "course-a", name: "A", moduleId: "anatomy", linkedQuestions: questionIds.slice(0, 350) },
        // Some questions also belong to more than one course.
        { _id: "course-b", name: "B", moduleId: "anatomy", linkedQuestions: questionIds.slice(340, 680) },
      ],
      annualExams,
      questions: questionIds.map((_id) => ({ _id, examId: "exam" })),
    });
    const answers = new Map();
    const progress = () => buildProgressStatistics({
      modules,
      courses,
      annualExams,
      answeredQuestions: answerFormat === "Map" ? answers : Object.fromEntries(answers),
    });
    const assertCounts = (answered, correct, incorrect) => {
      const result = progress();
      for (const stats of [result.modules[0], result.summary]) {
        assert.equal(stats.totalQuestions, 690);
        assert.equal(stats.answeredQuestions, answered);
        assert.equal(stats.correctAnswers, correct);
        assert.equal(stats.incorrectAnswers, incorrect);
        assert.equal(stats.correctAnswers + stats.incorrectAnswers, stats.answeredQuestions);
        assert.equal(stats.completionPercentage, Math.round(answered / 690 * 100));
      }
      return result;
    };

    assertCounts(0, 0, 0);
    questionIds.forEach((id) => answers.set(id, {
      examId: "exam", isVerified: true, isCorrect: false,
    }));
    const initial = assertCounts(690, 0, 690);
    assert.equal(initial.modules[0].answeredByYear, 690);
    assert.equal(initial.modules[0].answeredByCourse, 0);

    // Persistence is keyed by question ID, even when the exam context changes.
    questionIds.slice(0, 10).forEach((id, index) => {
      answers.set(id, { examId: "course-a", isVerified: true, isCorrect: true });
      const retried = assertCounts(690, index + 1, 689 - index);
      assert.equal(retried.modules[0].answeredByYear, 689 - index);
      assert.equal(retried.modules[0].answeredByCourse, index + 1);
    });
    const result = progress();
    assert.equal(result.modules[0].courses[0].answeredQuestions, 350);
    assert.equal(result.modules[0].courses[0].correctAnswers, 10);
    assert.equal(result.modules[0].courses[1].answeredQuestions, 340);

    // Answers outside the module must not increase its numerator.
    answers.set("unrelated-question", { isVerified: true, isCorrect: true });
    assertCounts(690, 10, 680);
  });
}

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

test("ignores a stale course link left by a deleted exam", () => {
  const sources = buildCompleteActivitySources({
    courses: [{
      _id: "course-1",
      name: "Cours thÃ©matique",
      moduleId: "module-1",
      linkedQuestions: ["deleted-question", "active-question"],
    }],
    annualExams: [{ _id: "exam-1", name: "2026 normal", moduleId: "module-1" }],
    questions: [{ _id: "active-question", examId: "exam-1" }],
  });

  const result = buildProgressStatistics({
    modules: [{ _id: "module-1", name: "MÃ©thodologie", semester: "S1" }],
    courses: sources,
    answeredQuestions: {},
  });

  assert.equal(result.modules[0].totalQuestions, 1);
  assert.equal(result.modules[0].courses[0].totalQuestions, 1);
});

test("counts a re-imported question number only once before data repair runs", () => {
  const sources = buildCompleteActivitySources({
    courses: [{
      _id: "course-1",
      name: "Communication",
      moduleId: "module-1",
      linkedQuestions: ["old-question", "new-question"],
    }],
    annualExams: [{ _id: "exam-2025", name: "2025 normal", moduleId: "module-1" }],
    questions: [
      { _id: "new-question", examId: "exam-2025", sessionLabel: "2025 normal", questionNumber: 12 },
      { _id: "old-question", examId: "exam-2025", sessionLabel: "2025 normal", questionNumber: 12 },
    ],
  });

  const result = buildProgressStatistics({
    modules: [{ _id: "module-1", name: "Communication", semester: "S1" }],
    courses: sources,
  });

  assert.equal(result.modules[0].totalQuestions, 1);
  assert.equal(result.modules[0].courses[0].totalQuestions, 1);
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
