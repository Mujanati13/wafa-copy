import test from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import { buildCompleteActivitySources, buildProgressStatistics } from "../services/progressStatisticsService.js";
import { moduleController } from "../controllers/moduleController.js";
import { questionController } from "../controllers/questionController.js";
import Module from "../models/moduleModel.js";
import Exam from "../models/examParYearModel.js";
import Course from "../models/examCourseModel.js";
import Bank from "../models/qcmBanqueModel.js";
import Question from "../models/questionModule.js";
import UserStats from "../models/userStatsModel.js";
import { deleteQuestionsAndUnlink } from "../services/questionDeletionService.js";

const query = (value) => ({ select() { return this; }, sort() { return this; }, lean: async () => value });
const response = () => ({ code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test("530 questions become 482 after deletion and return to 530 after reintegration, despite stale course links", () => {
    const modules = [{ _id: "m", name: "Méthodologie" }];
    const baseline = Array.from({ length: 482 }, (_, index) => ({ _id: `base-${index}`, examId: "base", questionNumber: index + 1 }));
    const imported = (prefix, examId) => Array.from({ length: 48 }, (_, index) => ({ _id: `${prefix}-${index}`, examId, questionNumber: index + 1 }));
    const oldQuestions = imported("old", "old-exam");
    const courses = [{ _id: "c", moduleId: "m", name: "Cours", linkedQuestions: [...baseline, ...oldQuestions].map(q => q._id) }];
    const count = (questions, annualExams) => buildProgressStatistics({
        modules, questions,
        courses: buildCompleteActivitySources({ courses, annualExams, questions }),
    }).summary.totalQuestions;
    const baseExam = { _id: "base", moduleId: "m" };
    assert.equal(count([...baseline, ...oldQuestions], [baseExam, { _id: "old-exam", moduleId: "m" }]), 530);
    assert.equal(count(baseline, [baseExam]), 482);
    const replacement = imported("new", "new-exam");
    assert.equal(count([...baseline, ...replacement], [baseExam, { _id: "new-exam", moduleId: "m" }]), 530);
    assert.equal(count([...baseline, ...replacement, ...imported("duplicate", "new-exam")], [baseExam, { _id: "new-exam", moduleId: "m" }]), 530);
});

test("module API and statistics agree on direct course questions, duplicate answers and drafts", async t => {
    const questions = [
        { _id: "new", examId: "exam", questionNumber: 1 },
        { _id: "old", examId: "exam", questionNumber: 1 },
        { _id: "direct", examCourseId: "c", questionNumber: 1 },
    ];
    const answeredQuestions = {
        old: { isVerified: true, isCorrect: true },
        direct: { isVerified: false, isCorrect: false },
    };
    t.mock.method(Module, "findById", () => query({ name: "Méthodologie" }));
    t.mock.method(Exam, "find", () => query([{ _id: "exam" }]));
    t.mock.method(Course, "find", () => query([{ _id: "c" }]));
    t.mock.method(Bank, "find", () => query([]));
    t.mock.method(UserStats, "findOne", () => query({ answeredQuestions }));
    t.mock.method(Question, "find", () => query(questions));
    const res = response();
    await moduleController.getUserModuleStats({ params: { id: "m" }, user: { _id: "u" } }, res);
    assert.equal(res.code, 200);
    const sources = buildCompleteActivitySources({
        courses: [{ _id: "c", name: "Cours", moduleId: "m", linkedQuestions: ["old"] }],
        annualExams: [{ _id: "exam", moduleId: "m" }], questions,
    });
    const { summary } = buildProgressStatistics({ modules: [{ _id: "m", name: "Méthodologie" }], courses: sources, questions, answeredQuestions });
    assert.equal(summary.totalQuestions, 2);
    assert.equal(summary.answeredQuestions, 1);
    assert.equal(res.body.data.totalQuestions, summary.totalQuestions);
    assert.equal(res.body.data.questionsAnswered, summary.answeredQuestions);
    assert.equal(res.body.data.percentage, summary.completionPercentage);
    assert.equal(res.headers["Cache-Control"], "private, no-store");
});

test("correction imports preserve IDs and images and keep equal numbers in different sessions distinct", async t => {
    let documents = [];
    let nextId = 0;
    t.mock.method(Question, "find", filter => query(documents.filter(q => q.examId === filter.examId)));
    t.mock.method(Question, "insertMany", async records => {
        const created = records.map(q => ({ ...q, _id: `q-${nextId++}` }));
        documents.push(...created);
        return created;
    });
    t.mock.method(Question, "bulkWrite", async operations => {
        operations.forEach(({ updateOne }) => Object.assign(documents.find(q => q._id === updateOne.filter._id), updateOne.update.$set));
    });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([
        { "qst Num": 1, Question: "Normal", A: "Oui", B: "Non", answer: "A", Session: "normal" },
        { "qst Num": 1, Question: "Rattrapage", A: "Oui", B: "Non", answer: "B", Session: "ratt" },
    ]), "Questions");
    const req = { body: { examId: "exam" }, file: { buffer: XLSX.write(book, { type: "buffer", bookType: "xlsx" }) } };
    const first = response();
    await questionController.importFromExcel(req, first);
    assert.equal(first.code, 201);
    assert.equal(first.body.data.createdCount, 2);
    const ids = documents.map(q => q._id);
    documents[0].images = ["/manual.jpg"];
    const second = response();
    await questionController.importFromExcel(req, second);
    assert.equal(second.code, 201);
    assert.equal(second.body.data.createdCount, 0);
    assert.equal(second.body.data.updatedCount, 2);
    assert.deepEqual(documents.map(q => q._id), ids);
    assert.deepEqual(documents[0].images, ["/manual.jpg"]);
});

test("deleting source questions unlinks courses before removing documents", async t => {
    const calls = [];
    t.mock.method(Question, "find", () => query([{ _id: "q" }]));
    t.mock.method(Course, "updateMany", async (filter, pipeline) => {
        calls.push("unlink");
        assert.deepEqual(filter.$or[0].linkedQuestions.$in, ["q"]);
        assert.deepEqual(pipeline[1].$set.totalQuestions, { $size: "$linkedQuestions" });
    });
    t.mock.method(Question, "deleteMany", async filter => {
        calls.push("delete");
        assert.deepEqual(filter, { _id: { $in: ["q"] } });
        return { deletedCount: 1 };
    });
    assert.equal((await deleteQuestionsAndUnlink({ examId: "exam" })).deletedCount, 1);
    assert.deepEqual(calls, ["unlink", "delete"]);
});
