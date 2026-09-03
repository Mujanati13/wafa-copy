import { normalizeImportText, normalizeLessonNumber } from "./courseImport.js";

export const MAX_MATRIX_EXAMS = 500;
export const MAX_MATRIX_LESSONS = 250;
export const MAX_QUESTIONS_PER_MATRIX_CELL = 2000;
export const MAX_MATRIX_QUESTION_ASSIGNMENTS = 100000;

export const getExcelColumnName = (index) => {
    let value = index + 1;
    let result = "";
    while (value > 0) {
        const remainder = (value - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        value = Math.floor((value - 1) / 26);
    }
    return result;
};

export const buildQuestionMappingTemplateMatrix = (courses = [], exams = []) => [
    ["EXAMEN", ...courses.map(course => course.lessonNumber)],
    ["", ...courses.map(course => course.name)],
    ...exams.map(exam => [exam.name, ...courses.map(() => "")]),
];

export const parseQuestionNumberExpression = (value) => {
    const source = String(value ?? "").trim();
    if (!source) return { numbers: [], error: null };

    const normalized = source.replace(/[\u2010-\u2015\u2212]/g, "-");
    const numbers = [];
    const seen = new Set();

    for (const rawPart of normalized.split(",")) {
        const part = rawPart.trim();
        if (!part) {
            return { numbers: [], error: `Format invalide « ${source} »` };
        }
        const match = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
        if (!match) {
            return { numbers: [], error: `Format invalide « ${part} »` };
        }
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : start;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
            return { numbers: [], error: `Plage invalide « ${part} »` };
        }
        if ((end - start + 1) > MAX_QUESTIONS_PER_MATRIX_CELL) {
            return { numbers: [], error: `La plage « ${part} » est trop grande` };
        }
        for (let number = start; number <= end; number += 1) {
            if (!seen.has(number)) {
                seen.add(number);
                numbers.push(number);
            }
        }
        if (numbers.length > MAX_QUESTIONS_PER_MATRIX_CELL) {
            return {
                numbers: [],
                error: `Une cellule ne peut pas contenir plus de ${MAX_QUESTIONS_PER_MATRIX_CELL} questions`,
            };
        }
    }

    return { numbers, error: null };
};

export const parseQuestionMappingMatrix = (matrix = []) => {
    const errors = [];
    if (!Array.isArray(matrix) || matrix.length < 2) {
        return {
            lessons: [], examRows: [], mappings: [],
            errors: [{ row: 1, field: "A1", reason: "Les deux lignes d'en-tête sont requises" }],
        };
    }

    const firstHeader = normalizeImportText(matrix[0]?.[0]);
    if (!["exam par annee name", "examen", "exam"].includes(firstHeader)) {
        errors.push({
            row: 1,
            field: "A1",
            reason: "La première cellule doit contenir « EXAMEN »",
        });
    }

    const width = Math.max(matrix[0]?.length || 0, matrix[1]?.length || 0);
    if (width - 1 > MAX_MATRIX_LESSONS) {
        errors.push({
            row: 1,
            field: "Leçons",
            reason: `Le fichier dépasse la limite de ${MAX_MATRIX_LESSONS} leçons`,
        });
    }

    const lessons = [];
    const lessonNumberKeys = new Set();
    for (let columnIndex = 1; columnIndex < width; columnIndex += 1) {
        const rawLessonNumber = String(matrix[0]?.[columnIndex] ?? "").trim();
        const lessonName = String(matrix[1]?.[columnIndex] ?? "").trim();
        if (!rawLessonNumber && !lessonName) continue;

        const cell = `${getExcelColumnName(columnIndex)}1`;
        const lessonNumber = normalizeLessonNumber(rawLessonNumber);
        if (!rawLessonNumber || !lessonName) {
            errors.push({
                row: !rawLessonNumber ? 1 : 2,
                field: !rawLessonNumber ? cell : `${getExcelColumnName(columnIndex)}2`,
                reason: "Chaque colonne doit contenir le numéro de leçon au-dessus de son nom",
            });
            continue;
        }
        const numberKey = normalizeImportText(lessonNumber);
        if (lessonNumberKeys.has(numberKey)) {
            errors.push({ row: 1, field: cell, reason: `Leçon en double: ${lessonNumber}` });
            continue;
        }
        lessonNumberKeys.add(numberKey);
        lessons.push({ columnIndex, lessonNumber, lessonName });
    }
    if (lessons.length === 0) {
        errors.push({ row: 1, field: "Leçons", reason: "Aucune leçon valide n'est définie dans les colonnes" });
    }

    const examRows = [];
    const mappings = [];
    const seenExamNames = new Set();
    let assignmentCount = 0;
    for (let rowIndex = 2; rowIndex < matrix.length; rowIndex += 1) {
        const row = matrix[rowIndex] || [];
        const examName = String(row[0] ?? "").trim();
        const hasMapping = row.slice(1).some(value => String(value ?? "").trim());
        if (!examName && !hasMapping) continue;
        if (!examName) {
            errors.push({
                row: rowIndex + 1,
                field: `A${rowIndex + 1}`,
                reason: "Le titre exact de l'examen par année est requis",
            });
            continue;
        }
        if (seenExamNames.has(examName)) {
            errors.push({
                row: rowIndex + 1,
                field: `A${rowIndex + 1}`,
                reason: `Examen en double dans le fichier: ${examName}`,
            });
            continue;
        }
        seenExamNames.add(examName);
        examRows.push({ rowIndex, rowNumber: rowIndex + 1, examName });

        lessons.forEach((lesson) => {
            const expression = String(row[lesson.columnIndex] ?? "").trim();
            if (!expression) return;
            const parsed = parseQuestionNumberExpression(expression);
            const cell = `${getExcelColumnName(lesson.columnIndex)}${rowIndex + 1}`;
            if (parsed.error) {
                errors.push({ row: rowIndex + 1, field: cell, reason: parsed.error });
                return;
            }
            if ((assignmentCount + parsed.numbers.length) > MAX_MATRIX_QUESTION_ASSIGNMENTS) {
                errors.push({
                    row: rowIndex + 1,
                    field: cell,
                    reason: `La matrice ne peut pas contenir plus de ${MAX_MATRIX_QUESTION_ASSIGNMENTS} liaisons`,
                });
                return;
            }
            assignmentCount += parsed.numbers.length;
            mappings.push({
                rowNumber: rowIndex + 1,
                cell,
                examName,
                lessonNumber: lesson.lessonNumber,
                lessonName: lesson.lessonName,
                questionNumbers: parsed.numbers,
                expression,
            });
        });
    }

    if (examRows.length > MAX_MATRIX_EXAMS) {
        errors.push({
            row: 3,
            field: "Examens",
            reason: `Le fichier dépasse la limite de ${MAX_MATRIX_EXAMS} examens`,
        });
    }
    if (examRows.length === 0) {
        errors.push({ row: 3, field: "Examens", reason: "Aucun examen par année n'est défini" });
    }
    if (mappings.length === 0 && errors.length === 0) {
        errors.push({ row: 3, field: "Matrice", reason: "Aucun numéro de question n'est renseigné" });
    }

    return { lessons, examRows, mappings, errors };
};
