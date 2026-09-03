const HEADER_ALIASES = {
    questionNumber: ["qst num", "qst number", "numero", "numero question", "n question", "number"],
    question: ["question", "texte"],
    optionA: ["a", "option a"],
    optionB: ["b", "option b"],
    optionC: ["c", "option c"],
    optionD: ["d", "option d"],
    optionE: ["e", "option e"],
    answer: ["answer", "correct", "reponse", "reponse correcte"],
    session: ["session"],
    note: ["note"],
};

export const MAX_COURSE_QUESTION_IMPORT_ROWS = 2000;
export const COURSE_QUESTION_IMPORT_HEADER_LABELS = {
    questionNumber: "qst Num",
    question: "Question",
    optionA: "A",
    optionB: "B",
    optionC: "C",
    optionD: "D",
    answer: "answer",
};

const normalizeHeader = (value = "") => String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const fieldByAlias = new Map(
    Object.entries(HEADER_ALIASES).flatMap(([field, aliases]) => (
        aliases.map(alias => [normalizeHeader(alias), field])
    ))
);

export const resolveCourseQuestionImportHeaders = (headers = []) => {
    const result = {};
    headers.forEach((header) => {
        const field = fieldByAlias.get(normalizeHeader(header));
        if (field && !result[field]) result[field] = header;
    });
    return result;
};

const getCell = (row, header) => header ? row[header] : "";

export const parseCourseQuestionImportRows = (rows = [], headers = []) => {
    const headerMap = resolveCourseQuestionImportHeaders(headers);
    const requiredFields = ["questionNumber", "question", "optionA", "optionB", "optionC", "optionD", "answer"];
    const missingHeaders = requiredFields.filter(field => !headerMap[field]);
    if (missingHeaders.length > 0) return { missingHeaders, records: [], errors: [] };

    const records = [];
    const errors = [];
    const seenNumbers = new Set();
    rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const rawQuestionNumber = String(getCell(row, headerMap.questionNumber) ?? "").trim();
        const questionNumber = Number.parseInt(rawQuestionNumber, 10);
        const questionText = String(getCell(row, headerMap.question) ?? "").trim();
        const optionLetters = ["A", "B", "C", "D", "E"];
        const options = optionLetters.map(letter => ({
            letter,
            text: String(getCell(row, headerMap[`option${letter}`]) ?? "").trim(),
        })).filter(option => option.text);
        const rawAnswer = String(getCell(row, headerMap.answer) ?? "").trim();
        const normalizedAnswer = normalizeHeader(rawAnswer);
        const isAnnulled = !rawAnswer || normalizedAnswer === "null" || normalizedAnswer === "nulle";
        const answers = isAnnulled
            ? []
            : rawAnswer.split(",").map(answer => normalizeHeader(answer)).filter(Boolean);

        const rowErrors = [];
        if (!/^\d+$/.test(rawQuestionNumber) || !Number.isSafeInteger(questionNumber) || questionNumber < 1) {
            rowErrors.push({ field: "qst Num", reason: "Un numéro entier positif est requis" });
        } else if (seenNumbers.has(questionNumber)) {
            rowErrors.push({ field: "qst Num", reason: "Numéro de question en double dans le fichier" });
        }
        if (!questionText) rowErrors.push({ field: "Question", reason: "Le texte de la question est requis" });
        if (options.length < 2) rowErrors.push({ field: "Options", reason: "Au moins deux options non vides sont requises" });

        const mappedOptions = options.map((option) => {
            const optionLetter = option.letter.toLowerCase();
            const optionText = normalizeHeader(option.text);
            return {
                text: option.text,
                isCorrect: !isAnnulled && answers.some(answer => (
                    answer === optionLetter || answer === optionText
                )),
            };
        });
        if (!isAnnulled && rawAnswer && !mappedOptions.some(option => option.isCorrect)) {
            rowErrors.push({
                field: "answer",
                reason: "La réponse doit être une lettre d'option (ex. A ou A,C) ou le texte exact d'une option",
            });
        }

        rowErrors.forEach(error => errors.push({ row: rowNumber, ...error }));
        if (rowErrors.length > 0) return;
        seenNumbers.add(questionNumber);
        records.push({
            rowNumber,
            questionNumber,
            text: questionText,
            options: mappedOptions,
            sessionLabel: String(getCell(row, headerMap.session) ?? "").trim(),
            note: String(getCell(row, headerMap.note) ?? "").trim(),
            images: [],
            isAnnulled,
        });
    });

    return { missingHeaders, records, errors };
};
