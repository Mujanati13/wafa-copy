import { normalizeImportText, normalizeLessonNumber } from "./courseImport.js";
import xlsx from "xlsx";

// Use the same title identity for template checks, imported rows and DB records.
// Preserve meaningful punctuation and words; never fuzzy-match different exams.
export const normalizeMatrixExamTitle = (value) => String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .trim()
    .toLocaleLowerCase("fr");

export const readQuestionMappingWorkbook = (buffer) => {
    const workbook = xlsx.read(buffer, { type: "buffer", cellDates: false, cellNF: true });
    const sheetName = workbook.SheetNames.find(name => name.trim().toLowerCase() === "matrice")
        || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) throw new Error("Le classeur ne contient aucune feuille.");
    // Keep physical row numbers and displayed exam titles, but read question
    // numbers independently of Excel number formatting (e.g. 1,000 or 42.00).
    const matrix = xlsx.utils.sheet_to_json(worksheet, {
        header: 1, defval: "", blankrows: true, raw: false, range: 0,
    });
    matrix.forEach((row, rowIndex) => {
        if (rowIndex < 2) return;
        row.forEach((value, columnIndex) => {
            if (columnIndex === 0) return;
            const cell = worksheet[xlsx.utils.encode_cell({ r: rowIndex, c: columnIndex })];
            if (cell?.t === "n") {
                // Excel may turn a range like 7-10 into a date. Do not import
                // its serial number as a question number.
                row[columnIndex] = xlsx.SSF.is_date(cell.z || "")
                    ? `Date Excel « ${value} » : utilisez le format Texte puis ressaisissez la plage`
                    : cell.v;
            }
        });
    });
    return matrix;
};

export const MAX_MATRIX_EXAMS = 500;
export const MAX_MATRIX_LESSONS = 250;
export const MAX_QUESTIONS_PER_MATRIX_CELL = 2000;
export const MAX_MATRIX_QUESTION_ASSIGNMENTS = 100000;

export const applyQuestionMappingCorrections = (matrix, corrections = {}) => {
    if (!corrections || typeof corrections !== "object" || Array.isArray(corrections)
        || Object.keys(corrections).length > 1000) {
        throw new Error("Les corrections doivent être une liste de cellules (1 000 maximum).");
    }
    const corrected = matrix.map(row => [...row]);
    for (const [cell, expression] of Object.entries(corrections)) {
        if (!/^[A-Z]{1,3}[1-9]\d*$/.test(cell) || typeof expression !== "string" || expression.length > 10000) {
            throw new Error(`Correction invalide pour la cellule ${cell}.`);
        }
        const { r, c } = xlsx.utils.decode_cell(cell);
        if (r < 2 || r >= matrix.length || c < 1 || c >= (matrix[0]?.length || 0)) {
            throw new Error(`La correction ${cell} doit viser une cellule de questions existante.`);
        }
        corrected[r][c] = expression;
    }
    return corrected;
};

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
    if (normalized === "-") return { numbers: [], error: null };
    if (/\d\s*\.\s*\d/.test(normalized)) {
        return { numbers: [], error: `Valeur ambiguë « ${source} ». Séparez les questions par une virgule (ex. 29,30) ou indiquez une plage (29-30). Excel peut supprimer un zéro final : vérifiez les numéros avant de corriger.` };
    }

    const numbers = [];
    const seen = new Set();

    for (const rawPart of normalized.split(/[,;]|\r?\n|\r/)) {
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

    // Some copied tables place the first lesson name in A2 and leave the
    // final lesson name empty. Shift names only when the entire pattern fits;
    // the controller still verifies every number/name pair against the module.
    const lessonCount = (matrix[0]?.length || 0) - 1;
    const names = matrix[1] || [];
    const shiftedNames = lessonCount > 0
        && Array.from({ length: lessonCount }, (_, index) => (
            normalizeLessonNumber(matrix[0][index + 1]) === `L${index + 1}`
            && String(names[index] ?? "").trim() !== ""
        )).every(Boolean)
        && names.slice(lessonCount).every(value => !String(value ?? "").trim());
    const lessonNames = shiftedNames ? ["", ...names.slice(0, lessonCount)] : names;
    const warnings = shiftedNames
        ? ["La ligne des noms de leçons a été réalignée de A2 vers B2. Les numéros de questions restent dans leurs colonnes d'origine."]
        : [];
    const width = Math.max(matrix[0]?.length || 0, lessonNames.length);
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
        const lessonName = String(lessonNames[columnIndex] ?? "").trim();
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
        const hasMapping = row.slice(1).some((value) => {
            const parsed = parseQuestionNumberExpression(value);
            return Boolean(parsed.error) || parsed.numbers.length > 0;
        });
        if (!examName && !hasMapping) continue;
        if (!examName) {
            errors.push({
                row: rowIndex + 1,
                field: `A${rowIndex + 1}`,
                reason: "Le titre exact de l'examen par année est requis",
            });
            continue;
        }
        const examNameKey = normalizeMatrixExamTitle(examName);
        if (seenExamNames.has(examNameKey)) {
            errors.push({
                row: rowIndex + 1,
                field: `A${rowIndex + 1}`,
                reason: `Examen en double dans le fichier: ${examName}`,
            });
            continue;
        }
        seenExamNames.add(examNameKey);
        examRows.push({ rowIndex, rowNumber: rowIndex + 1, examName });

        row.forEach((value, columnIndex) => {
            if (columnIndex === 0 || lessons.some(lesson => lesson.columnIndex === columnIndex)) return;
            const parsed = parseQuestionNumberExpression(value);
            if (parsed.error || parsed.numbers.length > 0) {
                errors.push({
                    row: rowIndex + 1,
                    field: `${getExcelColumnName(columnIndex)}${rowIndex + 1}`,
                    reason: "Cette cellule contient des questions sans en-tête de leçon valide. Renseignez le numéro en ligne 1 et le nom en ligne 2.",
                });
            }
        });

        lessons.forEach((lesson) => {
            const expression = String(row[lesson.columnIndex] ?? "").trim();
            if (!expression) return;
            const parsed = parseQuestionNumberExpression(expression);
            const cell = `${getExcelColumnName(lesson.columnIndex)}${rowIndex + 1}`;
            if (parsed.error) {
                errors.push({ row: rowIndex + 1, field: cell, reason: parsed.error, value: expression, correctable: true });
                return;
            }
            if (parsed.numbers.length === 0) return;

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
    return { lessons, examRows, mappings, errors, warnings };
};
