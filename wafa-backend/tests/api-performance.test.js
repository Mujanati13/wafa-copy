import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { AdminAnalyticsController } from "../controllers/adminAnalyticsController.js";
import { courseCategoryController } from "../controllers/courseCategoryController.js";
import { moduleController } from "../controllers/moduleController.js";
import CourseCategory from "../models/courseCategoryModel.js";
import ExamCourse from "../models/examCourseModel.js";
import ExamParYear from "../models/examParYearModel.js";
import Module from "../models/moduleModel.js";
import Question from "../models/questionModule.js";
import Transaction from "../models/transactionModel.js";
import User from "../models/userModel.js";
import UserStats from "../models/userStatsModel.js";
import { claimSingleSession, getSessionMetadata, refreshSingleSession } from "../services/singleSessionService.js";

const createResponse = () => ({
  statusCode: 200,
  payload: null,
  headers: {},
  set(name, value) {
    this.headers[name] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

test("module summary counts questions without loading question documents", { concurrency: false }, async () => {
  const moduleId = new mongoose.Types.ObjectId();
  const examId = new mongoose.Types.ObjectId();
  const originals = {
    moduleFind: Module.find,
    examFind: ExamParYear.find,
    questionFind: Question.find,
    questionAggregate: Question.aggregate,
  };
  let fullQuestionFindCalled = false;

  try {
    Module.find = () => ({
      select: () => ({
        sort: () => ({ lean: async () => [{ _id: moduleId, name: "Cardiology" }] }),
      }),
    });
    ExamParYear.find = () => ({
      select: () => ({
        lean: async () => [{ _id: examId, moduleId, name: "2026", year: 2026 }],
      }),
    });
    Question.find = () => {
      fullQuestionFindCalled = true;
      return {
        lean: async () => [{ _id: new mongoose.Types.ObjectId(), examId, text: "Q1" }],
      };
    };
    Question.aggregate = async () => [{ _id: examId, count: 37 }];

    const res = createResponse();
    await moduleController.getAll({ query: {} }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.success, true);
    assert.equal(fullQuestionFindCalled, false);
    assert.equal(res.payload.data[0].totalQuestions, 37);
    assert.equal(Object.hasOwn(res.payload.data[0], "questions"), false);

    fullQuestionFindCalled = false;
    const fullRes = createResponse();
    await moduleController.getAll({ query: { includeQuestions: "true" } }, fullRes);
    assert.equal(fullQuestionFindCalled, true);
    assert.equal(fullRes.payload.data[0].questions.length, 1);
  } finally {
    Module.find = originals.moduleFind;
    ExamParYear.find = originals.examFind;
    Question.find = originals.questionFind;
    Question.aggregate = originals.questionAggregate;
  }
});

test("category list replaces N+1 counts with one aggregate", { concurrency: false }, async () => {
  const moduleId = new mongoose.Types.ObjectId();
  const originals = {
    categoryFind: CourseCategory.find,
    courseAggregate: ExamCourse.aggregate,
    courseCount: ExamCourse.countDocuments,
  };
  let aggregateCalls = 0;

  try {
    CourseCategory.find = () => ({
      populate: () => ({
        sort: () => ({
          lean: async () => [
            { _id: new mongoose.Types.ObjectId(), name: "A", moduleId: { _id: moduleId } },
            { _id: new mongoose.Types.ObjectId(), name: "B", moduleId: { _id: moduleId } },
          ],
        }),
      }),
    });
    ExamCourse.aggregate = async () => {
      aggregateCalls += 1;
      return [
        { _id: { moduleId, category: "A" }, count: 3 },
        { _id: { moduleId, category: "B" }, count: 5 },
      ];
    };
    ExamCourse.countDocuments = async () => {
      throw new Error("N+1 countDocuments should not be used");
    };

    const res = createResponse();
    await courseCategoryController.getAll({ query: {} }, res);

    assert.equal(res.payload.success, true);
    assert.equal(aggregateCalls, 1);
    assert.deepEqual(res.payload.data.map(item => item.examCourseCount), [3, 5]);
  } finally {
    CourseCategory.find = originals.categoryFind;
    ExamCourse.aggregate = originals.courseAggregate;
    ExamCourse.countDocuments = originals.courseCount;
  }
});

test("single-session metadata extracts proxy IP, location, and device", () => {
  const metadata = getSessionMetadata({
    headers: {
      "x-forwarded-for": "197.12.34.56, 10.0.0.2",
      "cf-ipcity": "Rabat",
      "cf-ipcountry": "MA",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
    },
    socket: { remoteAddress: "::ffff:10.0.0.2" },
  });

  assert.deepEqual(metadata, {
    ip: "197.12.34.56",
    location: "Rabat, MA",
    device: "Chrome sur Windows (ordinateur)",
  });
});

test("single-session claim persists identifying metadata", { concurrency: false }, async () => {
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  let captured;

  try {
    User.findOneAndUpdate = (...args) => {
      captured = args;
      return { _id: args[0]._id };
    };

    const userId = new mongoose.Types.ObjectId();
    const claimed = await claimSingleSession(userId, "new-session", {
      ip: "197.12.34.56",
      location: "Rabat, MA",
      device: "Chrome sur Windows (ordinateur)",
    });
    const [, update] = captured;

    assert.equal(claimed, true);
    assert.equal(update.$set.activeSessionIp, "197.12.34.56");
    assert.equal(update.$set.activeSessionLocation, "Rabat, MA");
    assert.equal(update.$set.activeSessionDevice, "Chrome sur Windows (ordinateur)");
    assert.ok(update.$set.activeSessionStartedAt instanceof Date);
  } finally {
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("single-session refresh is atomic and suppresses timestamp writes", { concurrency: false }, async () => {
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  let captured;

  try {
    User.findOneAndUpdate = (...args) => {
      captured = args;
      return { _id: args[0]._id };
    };

    const userId = new mongoose.Types.ObjectId();
    const result = await refreshSingleSession(userId, "session-id");
    const [filter, update, options] = captured;

    assert.equal(result._id, userId);
    assert.equal(filter.activeSessionId, "session-id");
    assert.ok(filter.activeSessionExpiresAt.$gt instanceof Date);
    assert.equal(Array.isArray(update), true);
    assert.ok(update[0].$set.activeSessionExpiresAt.$cond);
    assert.equal(options.new, true);
    assert.equal(options.timestamps, false);
  } finally {
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("dashboard metrics start all independent database reads concurrently", { concurrency: false }, async () => {
  const originals = {
    userCount: User.countDocuments,
    statsAggregate: UserStats.aggregate,
    transactionAggregate: Transaction.aggregate,
  };
  let callsStarted = 0;
  let release;
  const gate = new Promise(resolve => {
    release = resolve;
  });

  const delayed = (value) => {
    callsStarted += 1;
    if (callsStarted === 7) queueMicrotask(release);
    return gate.then(() => value);
  };

  try {
    let userCountCall = 0;
    const countValues = [100, 20, 10, 5];
    User.countDocuments = () => delayed(countValues[userCountCall++]);

    let statsCall = 0;
    UserStats.aggregate = () => delayed(
      statsCall++ === 0
        ? [{ totalExams: 50, avgScore: 75, totalStudyHours: 120 }]
        : [{ count: 8 }]
    );
    Transaction.aggregate = () => delayed([{ total: 400 }]);

    const res = createResponse();
    await Promise.race([
      AdminAnalyticsController.getDashboardStats({ query: {} }, res),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error("analytics queries did not start concurrently")),
        1000
      )),
    ]);

    assert.equal(callsStarted, 7);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.data.monthlyRevenue.value, 400);
  } finally {
    User.countDocuments = originals.userCount;
    UserStats.aggregate = originals.statsAggregate;
    Transaction.aggregate = originals.transactionAggregate;
  }
});
