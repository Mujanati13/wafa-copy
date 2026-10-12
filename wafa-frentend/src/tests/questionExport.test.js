import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ExcelJS from 'exceljs';
import { buildQuestionsXlsx } from '../utils/questionExport.js';

// Independently read the bytes with the reader used by the backend imports.
const require = createRequire(new URL('../../../wafa-backend/package.json', import.meta.url));
const XLSX = require('xlsx');
const readRows = bytes => {
  const workbook = XLSX.read(Buffer.from(bytes), { type: 'buffer' });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
};

test('the XLSX file preserves French accents, Unicode, IDs, and separate columns', async () => {
  const bytes = await buildQuestionsXlsx([{ _id: '6aa096209000000000000001', text: 'Hémoptysie : évoquer une récidive, après 50 ans ?',
    options: [{ text: 'Une sarcoïdose', isCorrect: true }, { text: 'Le cœur 🫀', isCorrect: false }] }]);
  assert.equal(Buffer.from(bytes).subarray(0, 2).toString(), 'PK');
  const rows = readRows(bytes);
  assert.equal(rows[0].length, 8);
  assert.equal(rows[0][1], 'Question');
  assert.equal(rows[1][0], '6aa096209000000000000001');
  assert.equal(rows[1][1], 'Hémoptysie : évoquer une récidive, après 50 ans ?');
  assert.equal(rows[1][2], 'Une sarcoïdose');
  assert.equal(rows[1][3], 'Le cœur 🫀');
  assert.equal(rows[1][7], 'Une sarcoïdose');
  assert.equal(rows.length, 2);
});

test('quotes, delimiters, line breaks, and formula-like text remain literal cell values', async () => {
  const text = 'La lettre "a", signifie :\nÉlément à vérifier; cœur 🫀';
  const option = '=HYPERLINK("https://example.com","Réponse")';
  const bytes = await buildQuestionsXlsx([{ id: '000123', text, options: [{ text: option, isCorrect: true }] }]);
  const rows = readRows(bytes);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], '000123');
  assert.equal(rows[1][1], text);
  assert.equal(rows[1][2], option);
  assert.equal(rows[1][7], option);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  assert.equal(workbook.getWorksheet('Questions').getCell('C2').type, ExcelJS.ValueType.String);
});

test('all correct answers, options beyond E, and empty cells survive export', async () => {
  const options = Array.from({ length: 6 }, (_, index) => ({ text: `Réponse ${index + 1}`, isCorrect: index === 0 || index === 5 }));
  const rows = readRows(await buildQuestionsXlsx([{ text: 'Choisissez deux réponses', options }, { text: 'Question vide' }]));
  assert.equal(rows[0][7], 'Option F');
  assert.equal(rows[1][7], 'Réponse 6');
  assert.equal(rows[1][8], 'Réponse 1\nRéponse 6');
  assert.equal(rows[2][8], '');
});

test('annulled questions retain their status instead of listing correct answers', async () => {
  const rows = readRows(await buildQuestionsXlsx([{ text: 'Annulée', isAnnulled: true, options: [{ text: 'A', isCorrect: true }] }]));
  assert.equal(rows[1][7], 'Annulée');
});

test('saved workbook has readable dimensions, wrapping, contrast, filters, and frozen headers', async () => {
  const longText = 'Les diagnostics à évoquer devant un tableau de pneumopathie interstitielle diffuse : '.repeat(6);
  const bytes = await buildQuestionsXlsx([{ text: longText, options: [{ text: 'Une miliaire tuberculeuse', isCorrect: true }] },
    { text: 'Une deuxième question', options: [] }]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.getWorksheet('Questions');
  assert.equal(sheet.getCell('B2').value, longText);
  assert.ok(sheet.getColumn(1).width >= 26, 'full MongoDB IDs should fit');
  assert.ok(sheet.getColumn(2).width >= 60, 'the question should have a wide column');
  assert.ok(sheet.getColumn(3).width >= 30, 'options must be readable');
  assert.equal(sheet.getCell('B2').alignment.wrapText, true);
  assert.equal(sheet.getCell('B2').alignment.vertical, 'top');
  assert.ok(sheet.getRow(2).height > sheet.getRow(3).height, 'longer text needs a taller row');
  assert.equal(sheet.getCell('B1').font.bold, true);
  assert.equal(sheet.getCell('B1').font.color.argb, 'FFFFFFFF');
  assert.equal(sheet.getCell('B1').fill.fgColor.argb, 'FF1E3A5F');
  assert.notEqual(sheet.getCell('B2').fill.fgColor.argb, sheet.getCell('B3').fill.fgColor.argb);
  assert.equal(sheet.views[0].state, 'frozen');
  assert.equal(sheet.views[0].ySplit, 1);
  assert.equal(sheet.autoFilter, 'A1:H3');
});

test('an empty export still produces a valid workbook with headers', async () => {
  const rows = readRows(await buildQuestionsXlsx([]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0][7], 'Correct Answer');
});
