import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildQuestionsCsv } from '../utils/questionExport.js';

// Use the application's existing Excel reader to round-trip the actual bytes.
const require = createRequire(new URL('../../../wafa-backend/package.json', import.meta.url));
const XLSX = require('xlsx');
const readRows = csv => {
  const workbook = XLSX.read(Buffer.from(csv, 'utf8'), { type: 'buffer' });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
};

test('Excel reads separate columns and intact French accents from the exported bytes', () => {
  const csv = buildQuestionsCsv([{ _id: 'question-1', text: 'Hémoptysie : évoquer une récidive, après 50 ans ?',
    options: [{ text: 'Une sarcoïdose', isCorrect: true }, { text: 'Une tuberculose', isCorrect: false }] }]);
  assert.ok(csv.startsWith('\ufeffsep=,\r\n'));
  const rows = readRows(csv);
  assert.equal(rows[0].length, 8);
  assert.equal(rows[0][1], 'Question');
  assert.equal(rows[1][1], 'Hémoptysie : évoquer une récidive, après 50 ans ?');
  assert.equal(rows[1][2], 'Une sarcoïdose');
  assert.equal(rows[1][7], 'Une sarcoïdose');
  assert.equal(rows.length, 2);
});

test('quotes, delimiters, line breaks, and Unicode remain within their original cells', () => {
  const text = 'La lettre "a", signifie :\r\nÉlément à vérifier; cœur 🫀';
  const option = 'Réponse "B", avec virgule\net une seconde ligne';
  const csv = buildQuestionsCsv([{ id: 'legacy-id', text, options: [{ text: option, isCorrect: true }] }]);
  assert.ok(csv.includes(text.replace(/"/g, '""')));
  const rows = readRows(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'legacy-id');
  // Excel's reader normalizes CRLF within cells to LF.
  assert.equal(rows[1][1], text.replace(/\r\n/g, '\n'));
  assert.equal(rows[1][2], option);
  assert.equal(rows[1][7], option);
});

test('all correct answers and options beyond E survive export', () => {
  const options = Array.from({ length: 6 }, (_, index) => ({ text: `Réponse ${index + 1}`, isCorrect: index === 0 || index === 5 }));
  const rows = readRows(buildQuestionsCsv([{ text: 'Choisissez deux réponses', options }, { text: 'Question vide' }]));
  assert.equal(rows[0][7], 'Option F');
  assert.equal(rows[1][7], 'Réponse 6');
  assert.equal(rows[1][8], 'Réponse 1 | Réponse 6');
  assert.equal(rows[2][8], '');
});

test('annulled questions retain their status', () => {
  const rows = readRows(buildQuestionsCsv([{ text: 'Annulée', isAnnulled: true, options: [{ text: 'A', isCorrect: true }] }]));
  assert.equal(rows[1][7], 'Annulée');
});
