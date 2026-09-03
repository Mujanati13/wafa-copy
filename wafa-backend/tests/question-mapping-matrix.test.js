import test from "node:test";
import assert from "node:assert/strict";
import xlsx from "xlsx";
import {
    buildQuestionMappingTemplateMatrix,
    parseQuestionMappingMatrix,
    parseQuestionNumberExpression,
} from "../utils/questionMappingMatrix.js";

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
