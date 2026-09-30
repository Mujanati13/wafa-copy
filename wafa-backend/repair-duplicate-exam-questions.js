import "dotenv/config";
import mongoose from "mongoose";
import ExamCourse from "./models/examCourseModel.js";
import ExamParYear from "./models/examParYearModel.js";
import Question from "./models/questionModule.js";
import UserStats from "./models/userStatsModel.js";

const args = process.argv.slice(2);
const applyChanges = args.includes("--apply");
const moduleIndex = args.indexOf("--module");
const moduleId = moduleIndex >= 0 ? args[moduleIndex + 1] : "";

if (!process.env.MONGO_URL) {
  throw new Error("MONGO_URL est requis.");
}
if (moduleId && !mongoose.isValidObjectId(moduleId)) {
  throw new Error("L'identifiant fourni après --module est invalide.");
}

const makeSourceKey = (source) => [
  String(source.questionId || ""),
  String(source.examParYearId || ""),
  String(source.questionNumber ?? ""),
  String(source.yearName || ""),
].join("|");

await mongoose.connect(process.env.MONGO_URL);

try {
  const examIds = moduleId
    ? (await ExamParYear.find({ moduleId }).select("_id").lean()).map((exam) => exam._id)
    : null;
  const questionFilter = examIds
    ? { examId: { $in: examIds }, questionNumber: { $type: "number" } }
    : { examId: { $exists: true, $ne: null }, questionNumber: { $type: "number" } };

  const groups = await Question.aggregate([
    { $match: questionFilter },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: {
          examId: "$examId",
          sessionLabel: { $ifNull: ["$sessionLabel", ""] },
          questionNumber: "$questionNumber",
        },
        keeperId: { $first: "$_id" },
        questionIds: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  const replacements = new Map();
  groups.forEach((group) => {
    group.questionIds.slice(1).forEach((duplicateId) => {
      replacements.set(String(duplicateId), group.keeperId);
    });
  });
  const duplicateIds = [...replacements.keys()].map((id) => new mongoose.Types.ObjectId(id));

  console.log(JSON.stringify({
    mode: applyChanges ? "apply" : "dry-run",
    moduleId: moduleId || null,
    duplicateGroups: groups.length,
    duplicateQuestions: duplicateIds.length,
  }, null, 2));

  if (!applyChanges || duplicateIds.length === 0) process.exitCode = 0;
  else {
    const affectedCourses = await ExamCourse.find({
      $or: [
        { linkedQuestions: { $in: duplicateIds } },
        { "questionSources.questionId": { $in: duplicateIds } },
      ],
    });

    for (const course of affectedCourses) {
      const nextLinkedQuestions = [];
      const linkedIds = new Set();
      (course.linkedQuestions || []).forEach((questionId) => {
        const resolvedId = replacements.get(String(questionId)) || questionId;
        if (linkedIds.has(String(resolvedId))) return;
        linkedIds.add(String(resolvedId));
        nextLinkedQuestions.push(resolvedId);
      });

      const sourceKeys = new Set();
      const nextQuestionSources = (course.questionSources || []).flatMap((source) => {
        const sourceObject = source.toObject?.() || source;
        const resolved = {
          ...sourceObject,
          questionId: replacements.get(String(sourceObject.questionId)) || sourceObject.questionId,
        };
        const key = makeSourceKey(resolved);
        if (sourceKeys.has(key)) return [];
        sourceKeys.add(key);
        return [resolved];
      });

      course.linkedQuestions = nextLinkedQuestions;
      course.questionSources = nextQuestionSources;
      await course.save();
    }

    // Preserve learner progress when the answer was stored against the older
    // duplicate ID. A newer answer already present on the keeper wins.
    const statsDocuments = await UserStats.find({ answeredQuestions: { $exists: true, $ne: {} } });
    let updatedStats = 0;
    for (const stats of statsDocuments) {
      const answers = stats.answeredQuestions instanceof Map
        ? new Map(stats.answeredQuestions.entries())
        : new Map(Object.entries(stats.answeredQuestions || {}));
      let changed = false;
      replacements.forEach((keeperId, duplicateId) => {
        if (!answers.has(duplicateId)) return;
        if (!answers.has(String(keeperId))) answers.set(String(keeperId), answers.get(duplicateId));
        answers.delete(duplicateId);
        changed = true;
      });
      if (!changed) continue;
      stats.answeredQuestions = new Map(answers);
      await stats.save();
      updatedStats += 1;
    }

    const deletion = await Question.deleteMany({ _id: { $in: duplicateIds } });
    console.log(JSON.stringify({
      repairedCourses: affectedCourses.length,
      repairedUserStats: updatedStats,
      deletedQuestions: deletion.deletedCount || 0,
    }, null, 2));
  }
} finally {
  await mongoose.connection.close();
}
