import mongoose from 'mongoose';
import XLSX from 'xlsx';
import Exam from '../models/examParYearModel.js';
import Module from '../models/moduleModel.js';
import ExamCoverSettings from '../models/examCoverSettingsModel.js';
import asyncHandler from '../handlers/asyncHandler.js';
import { parseYearExamWorkbook, examImportKey } from '../utils/yearExamImport.js';

export const downloadYearExamTemplate = (_req, res) => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([['anne', 'anne_name'], [2024, '2024 normal'], [2023, '2023 normal']]);
    sheet['!cols'] = [{ wch: 12 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Examens');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="modele-examens-par-annees.xlsx"');
    res.send(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
};

export const importYearExams = asyncHandler(async (req, res) => {
    const { moduleId } = req.body;
    if (typeof moduleId !== 'string' || !mongoose.isObjectIdOrHexString(moduleId)) {
        return res.status(400).json({ success: false, message: 'Veuillez sélectionner un module valide.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'Veuillez sélectionner un fichier Excel.' });
    let parsed;
    try { parsed = parseYearExamWorkbook(req.file.buffer); }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    if (parsed.errorCount) return res.status(422).json({ success: false, message: 'Corrigez les lignes indiquées puis réessayez. Aucun examen importé.', errors: parsed.errors, errorCount: parsed.errorCount });
    if (!await Module.exists({ _id: moduleId })) return res.status(404).json({ success: false, message: 'Module introuvable.' });
    const existing = await Exam.find({ moduleId }).select('year name').lean();
    const keys = new Set(existing.map(examImportKey));
    const records = parsed.records.filter(record => !keys.has(examImportKey(record)));
    const cover = await ExamCoverSettings.findOne({ key: 'global' }).select('imageUrl').lean();
    if (records.length) await Exam.insertMany(records.map(record => ({ ...record, moduleId, imageUrl: cover?.imageUrl || '', courseCategoryId: null })));
    res.status(200).json({ success: true, data: { created: records.length, skipped: parsed.skipped + parsed.records.length - records.length } });
});
