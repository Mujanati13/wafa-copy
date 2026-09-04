const clampPercentage = (value) => Math.min(100, Math.max(0, Math.round(value || 0)));

export const filterModulesBySemester = (modules = [], semester = "") => {
  const normalizedSemester = String(semester || "").trim().toUpperCase();
  if (!normalizedSemester) return modules;

  return modules.filter(
    (module) => String(module?.semester || "").trim().toUpperCase() === normalizedSemester,
  );
};

const asId = (value, seen = new Set()) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "object") return String(value);

  // MongoDB ObjectIds expose an `_id` getter that returns the same object.
  // Convert them directly instead of recursively following that getter.
  if (typeof value.toHexString === "function") return value.toHexString();

  if (seen.has(value)) return "";
  seen.add(value);

  if (value._id !== null && value._id !== undefined && value._id !== value) {
    return asId(value._id, seen);
  }

  return String(value);
};

const asPlainAnswer = (value) => value?.toObject?.() || value || {};

const normalizeAnswers = (answeredQuestions) => {
  const entries = answeredQuestions instanceof Map
    ? Array.from(answeredQuestions.entries())
    : Object.entries(answeredQuestions || {});

  return new Map(entries.map(([questionId, rawAnswer]) => {
    const answer = asPlainAnswer(rawAnswer);
    return [String(questionId), {
      isVerified: answer.isVerified !== false,
      isCorrect: Boolean(answer.isCorrect),
      answeredAt: answer.answeredAt ? new Date(answer.answeredAt) : null,
    }];
  }));
};

const percentageOfTotal = (count, total) => total > 0
  ? clampPercentage((count / total) * 100)
  : 0;

const successRate = (correct, answered) => answered > 0
  ? clampPercentage((correct / answered) * 100)
  : 0;

const buildStats = (questionIds, answers) => {
  const uniqueQuestionIds = [...new Set((questionIds || []).map(asId).filter(Boolean))];
  const activity = uniqueQuestionIds
    .map((questionId) => answers.get(questionId))
    .filter((answer) => answer?.isVerified);
  const correctAnswers = activity.filter((answer) => answer.isCorrect).length;
  const incorrectAnswers = activity.length - correctAnswers;
  const lastActivity = activity.reduce((latest, answer) => {
    if (!answer.answeredAt || Number.isNaN(answer.answeredAt.getTime())) return latest;
    return !latest || answer.answeredAt > latest ? answer.answeredAt : latest;
  }, null);

  return {
    questionIds: uniqueQuestionIds,
    totalQuestions: uniqueQuestionIds.length,
    answeredQuestions: activity.length,
    correctAnswers,
    incorrectAnswers,
    completionPercentage: percentageOfTotal(activity.length, uniqueQuestionIds.length),
    correctPercentage: percentageOfTotal(correctAnswers, uniqueQuestionIds.length),
    incorrectPercentage: percentageOfTotal(incorrectAnswers, uniqueQuestionIds.length),
    successRate: successRate(correctAnswers, activity.length),
    lastActivity: lastActivity?.toISOString() || null,
  };
};

const toHighlight = (course) => course ? {
  courseId: course.courseId,
  courseName: course.courseName,
  answeredQuestions: course.answeredQuestions,
  totalQuestions: course.totalQuestions,
  correctAnswers: course.correctAnswers,
  successRate: course.successRate,
  completionPercentage: course.completionPercentage,
  lastActivity: course.lastActivity,
} : null;

const byName = (left, right) => left.courseName.localeCompare(right.courseName, "fr", { sensitivity: "base" });

const buildHighlights = (courses) => {
  const active = courses.filter((course) => course.answeredQuestions > 0);
  const highest = [...active].sort((left, right) =>
    right.successRate - left.successRate
    || right.correctAnswers - left.correctAnswers
    || right.answeredQuestions - left.answeredQuestions
    || byName(left, right))[0];
  const lowest = [...active].sort((left, right) =>
    left.successRate - right.successRate
    || left.answeredQuestions - right.answeredQuestions
    || byName(left, right))[0];
  const recent = [...active].sort((left, right) =>
    new Date(right.lastActivity || 0) - new Date(left.lastActivity || 0)
    || byName(left, right))[0];

  return {
    lowest: toHighlight(lowest),
    highest: toHighlight(highest),
    recent: toHighlight(recent),
    untouched: courses
      .filter((course) => course.answeredQuestions === 0)
      .map((course) => ({
        courseId: course.courseId,
        courseName: course.courseName,
        totalQuestions: course.totalQuestions,
      })),
  };
};

const getCourseModuleId = (course, moduleNameToId, moduleIds) => {
  const directId = asId(course.moduleId);
  if (moduleIds.has(directId)) return directId;
  if (moduleNameToId.has(directId)) return moduleNameToId.get(directId);
  return moduleNameToId.get(course.moduleName || course.module || "") || "";
};

export const buildCompleteActivitySources = ({
  courses = [],
  annualExams = [],
  qcmBanks = [],
  questions = [],
}) => {
  const linkedQuestionIds = new Set(
    courses.flatMap((course) => course.linkedQuestions || []).map(asId).filter(Boolean),
  );
  const questionsByAnnualExam = new Map();
  const questionsByQcmBank = new Map();

  questions.forEach((question) => {
    const questionId = asId(question._id);
    if (!questionId || linkedQuestionIds.has(questionId)) return;

    const annualExamId = asId(question.examId);
    const qcmBankId = asId(question.qcmBanqueId);
    if (annualExamId) {
      if (!questionsByAnnualExam.has(annualExamId)) questionsByAnnualExam.set(annualExamId, []);
      questionsByAnnualExam.get(annualExamId).push(questionId);
    }
    if (qcmBankId) {
      if (!questionsByQcmBank.has(qcmBankId)) questionsByQcmBank.set(qcmBankId, []);
      questionsByQcmBank.get(qcmBankId).push(questionId);
    }
  });

  const supplementalSources = [
    ...annualExams.map((exam) => ({
      _id: `exam-year-${asId(exam._id)}`,
      name: exam.name || "Examen par année",
      moduleId: exam.moduleId,
      category: "Exam par année",
      status: "active",
      linkedQuestions: questionsByAnnualExam.get(asId(exam._id)) || [],
    })),
    ...qcmBanks.map((qcm) => ({
      _id: `qcm-bank-${asId(qcm._id)}`,
      name: qcm.name || "Banque de QCM",
      moduleId: qcm.moduleId,
      category: "Banque de QCM",
      status: "active",
      linkedQuestions: questionsByQcmBank.get(asId(qcm._id)) || [],
    })),
  ].filter((source) => source.linkedQuestions.length > 0);

  return [...courses, ...supplementalSources];
};

export const buildProgressStatistics = ({ modules = [], courses = [], answeredQuestions = {} }) => {
  const answers = normalizeAnswers(answeredQuestions);
  const moduleNameToId = new Map(modules.map((module) => [module.name, asId(module._id)]));
  const moduleIds = new Set(modules.map((module) => asId(module._id)));
  const coursesByModule = new Map();

  courses.forEach((course) => {
    const moduleId = getCourseModuleId(course, moduleNameToId, moduleIds);
    if (!moduleId) return;
    if (!coursesByModule.has(moduleId)) coursesByModule.set(moduleId, []);
    coursesByModule.get(moduleId).push(course);
  });

  const moduleStats = modules.map((module) => {
    const moduleId = asId(module._id);
    const storedCourses = coursesByModule.get(moduleId) || [];
    const existingNames = new Set(storedCourses.map((course) => String(course.name || "").trim().toLocaleLowerCase("fr")));
    const legacyCourses = (module.courseNames || [])
      .filter((name) => name && !existingNames.has(String(name).trim().toLocaleLowerCase("fr")))
      .map((name, index) => ({
        _id: `legacy-${moduleId}-${index}`,
        name,
        linkedQuestions: [],
        status: "active",
      }));

    const courseStats = [...storedCourses, ...legacyCourses]
      .map((course) => {
        const stats = buildStats(course.linkedQuestions || [], answers);
        const activityStatus = stats.answeredQuestions === 0
          ? "untouched"
          : stats.totalQuestions > 0 && stats.answeredQuestions >= stats.totalQuestions
            ? "completed"
            : "in-progress";

        return {
          courseId: asId(course._id),
          courseName: course.name || "Cours sans nom",
          category: course.category || "",
          status: course.status || "active",
          activityStatus,
          ...stats,
          questionIds: undefined,
        };
      })
      .sort((left, right) => byName(left, right));

    const moduleQuestionIds = storedCourses.flatMap((course) => course.linkedQuestions || []);
    const stats = buildStats(moduleQuestionIds, answers);

    return {
      moduleId,
      moduleName: module.name,
      semester: module.semester || "",
      color: module.color || "#3b82f6",
      courseCount: courseStats.length,
      ...stats,
      questionIds: undefined,
      courses: courseStats,
      highlights: buildHighlights(courseStats),
    };
  });

  const summary = moduleStats.reduce((result, module) => ({
    moduleCount: result.moduleCount + 1,
    courseCount: result.courseCount + module.courseCount,
    totalQuestions: result.totalQuestions + module.totalQuestions,
    answeredQuestions: result.answeredQuestions + module.answeredQuestions,
    correctAnswers: result.correctAnswers + module.correctAnswers,
    incorrectAnswers: result.incorrectAnswers + module.incorrectAnswers,
  }), {
    moduleCount: 0,
    courseCount: 0,
    totalQuestions: 0,
    answeredQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
  });

  return {
    summary: {
      ...summary,
      completionPercentage: percentageOfTotal(summary.answeredQuestions, summary.totalQuestions),
      successRate: successRate(summary.correctAnswers, summary.answeredQuestions),
    },
    modules: moduleStats,
  };
};
