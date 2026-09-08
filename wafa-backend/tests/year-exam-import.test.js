import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { parseYearExamWorkbook } from '../utils/yearExamImport.js';
import { importYearExams, downloadYearExamTemplate } from '../controllers/yearExamImportController.js';
import Exam from '../models/examParYearModel.js';
import Module from '../models/moduleModel.js';
import Cover from '../models/examCoverSettingsModel.js';

function workbook(rows, bookType = 'xlsx') {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Examens');
    return XLSX.write(book, { type: 'buffer', bookType });
}
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('maps numeric and text years, reordered headers, blanks, duplicates and both Excel formats', () => {
    for (const format of ['xlsx', 'xls']) {
        const result = parseYearExamWorkbook(workbook([
            ['anne_name', 'anne'], [' 2024 normal ', 2024], [], ['2023 normal', '2023'], ['2024 NORMAL', 2024], ['2024 rattrapage', 2024],
        ], format));
        assert.deepEqual(result.records, [{ year: 2024, name: '2024 normal' }, { year: 2023, name: '2023 normal' }, { year: 2024, name: '2024 rattrapage' }]);
        assert.equal(result.skipped, 1);
        assert.equal(result.errorCount, 0);
    }
});
test('rejects bad headers, empty workbooks, non-Excel content and excessive rows', () => {
    for (const rows of [[['year', 'name']], [['anne', 'anne', 'anne_name']], [['anne', 'anne_name']]]) {
        assert.throws(() => parseYearExamWorkbook(workbook(rows)));
    }
    assert.throws(() => parseYearExamWorkbook(Buffer.from('anne,anne_name\n2024,test')));
    assert.throws(() => parseYearExamWorkbook(workbook([['anne', 'anne_name'], ...Array.from({ length: 2001 }, () => [2024, 'normal'])])), /Maximum/);
});
test('reports actual spreadsheet row numbers and caps validation errors', () => {
    const result = parseYearExamWorkbook(workbook([['anne', 'anne_name'], [], [2024.5, ''], ['no', 123]]));
    assert.deepEqual(result.errors.map(error => error.row), [3, 3, 4, 4]);
    const many = parseYearExamWorkbook(workbook([['anne', 'anne_name'], ...Array.from({ length: 101 }, () => ['no', ''])]));
    assert.equal(many.errors.length, 100);
    assert.equal(many.errorCount, 202);
});
test('template round-trips with the required columns and examples', () => {
    const res = { setHeader() {}, send(buffer) { this.buffer = buffer; } };
    downloadYearExamTemplate({}, res);
    assert.deepEqual(parseYearExamWorkbook(res.buffer).records, [{ year: 2024, name: '2024 normal' }, { year: 2023, name: '2023 normal' }]);
});
test('controller validates before writing and skips existing exams within the selected module', async t => {
    const moduleId = '68ab0eaf049261f556c36340';
    t.mock.method(Module, 'exists', async () => true);
    t.mock.method(Exam, 'find', filter => {
        assert.deepEqual(filter, { moduleId });
        return { select: () => ({ lean: async () => [{ year: 2024, name: '2024 normal' }] }) };
    });
    t.mock.method(Cover, 'findOne', () => ({ select: () => ({ lean: async () => ({ imageUrl: '/cover.jpg' }) }) }));
    const inserted = t.mock.method(Exam, 'insertMany', async records => {
        assert.deepEqual(records, [{ year: 2023, name: '2023 normal', moduleId, imageUrl: '/cover.jpg', courseCategoryId: null }]);
    });
    const res = response();
    await importYearExams({ body: { moduleId }, file: { buffer: workbook([['anne', 'anne_name'], [2024, '2024 normal'], [2023, '2023 normal']]) } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body.data, { created: 1, skipped: 1 });
    const invalid = response();
    await importYearExams({ body: { moduleId }, file: { buffer: workbook([['anne', 'anne_name'], ['bad', 'name']]) } }, invalid);
    assert.equal(invalid.code, 422);
    assert.equal(inserted.mock.callCount(), 1);
    const missing = response();
    await importYearExams({ body: { moduleId } }, missing);
    assert.equal(missing.code, 400);
    const badModule = response();
    await importYearExams({ body: { moduleId: 'bad' } }, badModule);
    assert.equal(badModule.code, 400);
});
