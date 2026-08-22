import mongoose from "mongoose";
import asyncHandler from "../handlers/asyncHandler.js";
import Module from "../models/moduleModel.js";
import ExamCourse from "../models/examCourseModel.js";
import UserStats from "../models/userStatsModel.js";
import { buildProgressStatistics } from "../services/progressStatisticsService.js";

const VALID_SEMESTERS = new Set(Array.from({ length: 10 }, (_, index) => `S${index + 1}`));

export const getProgressStatistics = asyncHandler(async (req, res) => {
  const semester = String(req.query.semester || "").trim().toUpperCase();
  if (semester && !VALID_SEMESTERS.has(semester)) {
    return res.status(400).json({
      success: false,
      message: "Le semestre doit être compris entre S1 et S10.",
    });
  }

  const moduleFilter = semester
    ? { $or: [{ semester }, { availableInAllSemesters: true }] }
    : {};
  const modules = await Module.find(moduleFilter)
    .select("name semester color order courseNames")
    .sort({ semester: 1, order: 1, name: 1 })
    .lean();

  const moduleIds = modules.map((module) => new mongoose.Types.ObjectId(module._id));
  const moduleIdStrings = moduleIds.map(String);
  const moduleNames = modules.map((module) => module.name);

  const [courses, userStats] = await Promise.all([
    moduleIds.length === 0
      ? []
      : ExamCourse.collection.find({
          $and: [
            {
              $or: [
                { moduleId: { $in: moduleIds } },
                { moduleId: { $in: moduleIdStrings } },
                { moduleName: { $in: moduleNames } },
                { module: { $in: moduleNames } },
              ],
            },
            { category: { $nin: ["Exam par years", "QCM banque"] } },
            { status: { $ne: "archived" } },
          ],
        }, {
          projection: {
            name: 1,
            moduleId: 1,
            moduleName: 1,
            module: 1,
            category: 1,
            status: 1,
            linkedQuestions: 1,
          },
        }).sort({ name: 1 }).toArray(),
    UserStats.findOne({ userId: req.user._id }).select("answeredQuestions").lean(),
  ]);

  const progress = buildProgressStatistics({
    modules,
    courses,
    answeredQuestions: userStats?.answeredQuestions || {},
  });

  res.set("Cache-Control", "private, no-store");
  return res.status(200).json({
    success: true,
    data: {
      semester: semester || null,
      generatedAt: new Date().toISOString(),
      ...progress,
    },
  });
});

