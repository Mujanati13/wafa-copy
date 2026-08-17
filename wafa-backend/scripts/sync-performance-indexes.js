import dotenv from "dotenv";
import mongoose from "mongoose";
import CourseCategory from "../models/courseCategoryModel.js";
import ExamCourse from "../models/examCourseModel.js";
import Module from "../models/moduleModel.js";
import Transaction from "../models/transactionModel.js";
import User from "../models/userModel.js";

dotenv.config();

const indexedModels = [
  Module,
  CourseCategory,
  ExamCourse,
  Transaction,
  User,
];

const syncPerformanceIndexes = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required to create database indexes.");
  }

  await mongoose.connect(process.env.MONGO_URL);

  try {
    for (const model of indexedModels) {
      const indexNames = await model.createIndexes();
      console.log(`${model.modelName}: ${indexNames.join(", ") || "indexes already current"}`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

syncPerformanceIndexes().catch((error) => {
  console.error("Failed to create performance indexes:", error.message);
  process.exitCode = 1;
});
