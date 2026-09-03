import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import xlsx from "xlsx";
import { examCourseController } from "../controllers/examCourseController.js";
import ExamCourse from "../models/examCourseModel.js";
import ExamParYear from "../models/examParYearModel.js";
import Module from "../models/moduleModel.js";
import Question from "../models/questionModule.js";
import {
    buildQuestionMappingTemplateMatrix,
    parseQuestionMappingMatrix,
    parseQuestionNumberExpression,
} from "../utils/questionMappingMatrix.js";

const createResponse = () => ({
    statusCode: 200,
    payload: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.payload = payload;
        return this;
    },
});

const createMatrixBuffer = (matrix) => {
    const worksheet = xlsx.utils.aoa_to_sheet(matrix);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Matrice");
    return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
};

test("builds the template without a category row", () => {
    const matrix = buildQuestionMappingTemplateMatrix(
        [
            { lessonNumber: "L1", name: "Generalites" },
            { lessonNumber: "L2", name: "Genou" },
        ],
        [{ name: "2020 normal" }, { name: "1 Janvier 2026" }]
    );

    assert.deepEqual(matrix, [
        ["EXAMEN", "L1", "L2"],
        ["", "Generalites", "Genou"],
        ["2020 normal", "", ""],
        ["1 Janvier 2026", "", ""],
    ]);
});

test("preserves the two-row matrix layout through an XLSX write/read round trip", () => {
    const matrix = buildQuestionMappingTemplateMatrix(
        [{ lessonNumber: "L1", name: "Généralités rhumato" }],
        [{ name: "2020 normal" }]
    );
    const worksheet = xlsx.utils.aoa_to_sheet(matrix);
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Matrice");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    const reopened = xlsx.read(buffer, { type: "buffer" });
    const reopenedMatrix = xlsx.utils.sheet_to_json(reopened.Sheets.Matrice, {
        header: 1,
        defval: "",
        raw: false,
    });

    assert.deepEqual(reopenedMatrix, matrix);
    assert.deepEqual(reopened.Sheets.Matrice["!merges"], worksheet["!merges"]);
});

test("parses individual, discrete, range, and combined question expressions", () => {
    assert.deepEqual(parseQuestionNumberExpression("42").numbers, [42]);
    assert.deepEqual(parseQuestionNumberExpression("43, 46").numbers, [43, 46]);
    assert.deepEqual(parseQuestionNumberExpression("38-40").numbers, [38, 39, 40]);
    assert.deepEqual(parseQuestionNumberExpression("5, 7-10, 16").numbers, [5, 7, 8, 9, 10, 16]);
});

test("treats standalone hyphen and Unicode dash cells as empty mappings", () => {
    for (const placeholder of ["-", " - ", "–", "—", "−"]) {
        assert.deepEqual(parseQuestionNumberExpression(placeholder), {
            numbers: [],
            error: null,
        });
    }
});

test("rejects malformed and descending question expressions", () => {
    assert.match(parseQuestionNumberExpression("7-").error, /Format invalide/);
    assert.match(parseQuestionNumberExpression("10-7").error, /Plage invalide/);
    assert.match(parseQuestionNumberExpression("5,,7").error, /Format invalide/);
});

test("parses a matrix with lesson numbers directly above lesson names", () => {
    const matrix = [
        ["exam par annee name", "L1", "L2"],
        ["", "Généralités rhumato", "Genou"],
        ["2020 normal", "42", "43, 46"],
        ["1 Janvier 2026", "38-40", "5, 7-10, 16"],
    ];
    const result = parseQuestionMappingMatrix(matrix);

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.lessons.map(item => item.lessonNumber), ["L1", "L2"]);
    assert.equal(result.examRows[1].examName, "1 Janvier 2026");
    assert.deepEqual(result.mappings[3].questionNumbers, [5, 7, 8, 9, 10, 16]);
});

test("accepts a partial matrix with one exam row and ignores dash placeholders", () => {
    const result = parseQuestionMappingMatrix([
        ["EXAMEN", "L1", "L2", "L3", "L4"],
        ["", "Generalites", "Genou", "Rachis", "Epaule"],
        ["2020 normal", "42", "-", "", "5, 7-9"],
    ]);

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.examRows.map(row => row.examName), ["2020 normal"]);
    assert.deepEqual(result.mappings.map(mapping => mapping.cell), ["B3", "E3"]);
    assert.deepEqual(result.mappings[1].questionNumbers, [5, 7, 8, 9]);
});

test("accepts a valid no-op exam row containing only blank placeholders", () => {
    const result = parseQuestionMappingMatrix([
        ["EXAMEN", "L1", "L2"],
        ["", "Generalites", "Genou"],
        ["2020 normal", "-", ""],
    ]);

    assert.deepEqual(result.errors, []);
    assert.equal(result.examRows.length, 1);
    assert.deepEqual(result.mappings, []);
});

test("controller imports only submitted exam rows and ignores dash cells", { concurrency: false }, async () => {
    const moduleId = new mongoose.Types.ObjectId();
    const examId = new mongoose.Types.ObjectId();
    const questionId = new mongoose.Types.ObjectId();
    const courseL1Id = new mongoose.Types.ObjectId();
    const courseL2Id = new mongoose.Types.ObjectId();
    const originals = {
        moduleFindById: Module.findById,
        courseFind: ExamCourse.find,
        courseBulkWrite: ExamCourse.bulkWrite,
        examFind: ExamParYear.find,
        questionFind: Question.find,
        consoleInfo: console.info,
    };
    let examFilter;
    let bulkOperations;

    try {
        Module.findById = () => ({
            select: () => ({
                lean: async () => ({ _id: moduleId, name: "Anatomie", semester: "S1" }),
            }),
        });
        ExamCourse.find = () => ({
            select: () => ({
                lean: async () => [
                    {
                        _id: courseL1Id,
                        name: "Generalites",
                        lessonNumber: "L1",
                        linkedQuestions: [],
                        questionSources: [],
                    },
                    {
                        _id: courseL2Id,
                        name: "Genou",
                        lessonNumber: "L2",
                        linkedQuestions: [],
                        questionSources: [],
                    },
                ],
            }),
        });
        ExamParYear.find = (filter) => {
            examFilter = filter;
            return {
                select: () => ({
                    lean: async () => [{ _id: examId, name: "2020 normal", year: 2020 }],
                }),
            };
        };
        Question.find = () => ({
            select: () => ({
                sort: () => ({
                    lean: async () => [{
                        _id: questionId,
                        examId,
                        questionNumber: 42,
                        createdAt: new Date("2020-01-01"),
                    }],
                }),
            }),
        });
        ExamCourse.bulkWrite = async (operations) => {
            bulkOperations = operations;
            return { modifiedCount: operations.length };
        };
        console.info = () => {};

        const res = createResponse();
        await examCourseController.importQuestionMappingMatrix({
            body: { moduleId: moduleId.toString() },
            file: {
                originalname: "partial-matrix.xlsx",
                buffer: createMatrixBuffer([
                    ["EXAMEN", "L1", "L2"],
                    ["", "Generalites", "Genou"],
                    ["2020 normal", "42", "-"],
                ]),
            },
            user: { _id: new mongoose.Types.ObjectId() },
        }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.payload.success, true);
        assert.deepEqual(examFilter, {
            moduleId,
            name: { $in: ["2020 normal"] },
        });
        assert.equal(bulkOperations.length, 1);
        assert.equal(res.payload.data.total, 1);
        assert.equal(res.payload.data.imported, 1);
        assert.equal(res.payload.data.mappingCells, 1);
    } finally {
        Module.findById = originals.moduleFindById;
        ExamCourse.find = originals.courseFind;
        ExamCourse.bulkWrite = originals.courseBulkWrite;
        ExamParYear.find = originals.examFind;
        Question.find = originals.questionFind;
        console.info = originals.consoleInfo;
    }
});

test("rejects the obsolete top-level category row", () => {
    const result = parseQuestionMappingMatrix([
        ["", "Rhumatologie", ""],
        ["exam par annee name", "L1", "L2"],
        ["", "Généralités", "Genou"],
        ["2020 normal", "41", "42"],
    ]);

    assert.ok(result.errors.some(error => error.field === "A1"));
});

test("reports incomplete lesson headers and unnamed exam rows", () => {
    const result = parseQuestionMappingMatrix([
        ["exam par annee name", "L1", ""],
        ["", "", "Genou"],
        ["", "42", "43"],
    ]);

    assert.ok(result.errors.some(error => error.reason.includes("numéro de leçon")));
    assert.ok(result.errors.some(error => error.reason.includes("titre exact")));
});
