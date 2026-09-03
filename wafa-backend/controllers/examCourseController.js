import asyncHandler from "../handlers/asyncHandler.js";
import ExamCourse from "../models/examCourseModel.js";
import Question from "../models/questionModule.js";
import ExamParYear from "../models/examParYearModel.js";
import Module from "../models/moduleModel.js";
import xlsx from "xlsx";
import mongoose from "mongoose";
import {
    findEquivalentModules,
    moduleNamesAreEquivalent,
} from "../utils/moduleIdentity.js";
import { getAnsweredCountByExam } from "../utils/answerProgress.js";
import {
    getCourseImportDuplicateKeys,
    mapCourseImportRows,
    MAX_COURSE_IMPORT_ROWS,
    normalizeImportText,
    normalizeLessonNumber,
    normalizeSemester,
    validateCourseImportCellTypes,
    validateCourseImportRecord,
} from "../utils/courseImport.js";
import {
    CourseCategoryImportError,
    findOrCreateCourseImportCategories,
} from "../services/courseCategoryImportService.js";
import {
    COURSE_QUESTION_IMPORT_HEADER_LABELS,
    MAX_COURSE_QUESTION_IMPORT_ROWS,
    parseCourseQuestionImportRows,
} from "../utils/courseQuestionImport.js";
import {
    buildQuestionMappingTemplateMatrix,
    MAX_MATRIX_EXAMS,
    MAX_MATRIX_LESSONS,
    parseQuestionMappingMatrix,
} from "../utils/questionMappingMatrix.js";

const COURSE_IMPORT_HEADER_LABELS = {
    semester: "Semestre",
    module: "Module",
    category: "Catégorie",
    lessonNumber: "Numéro de leçon",
    lessonName: "Nom de la leçon",
};

const addImportError = (errors, row, field, reason) => {
    if (errors.length < 100) errors.push({ row, field, reason });
};

export const examCourseController = {
    // Create a new exam course
    create: asyncHandler(async (req, res) => {
        const { name, moduleId, category, lessonNumber, subCategory, description, imageUrl, status } = req.body;

        const newCourse = await ExamCourse.create({
            name,
            moduleId,
            category,
            lessonNumber,
            subCategory,
            description,
            imageUrl,
            status: status || "draft",
        });

        res.status(201).json({
            success: true,
            data: newCourse,
            message: "Cours créé avec succès",
        });
    }),

    // Get all exam courses with optional filters
    getAll: asyncHandler(async (req, res) => {
        const { moduleId, category, status, search } = req.query;

        const filter = {};
        if (moduleId) filter.moduleId = moduleId;
        if (category) filter.category = category;
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { subCategory: { $regex: search, $options: "i" } },
            ];
        }

        // Use lean() and only select necessary fields for better performance
        const courses = await ExamCourse.find(filter)
            .populate("moduleId", "name semester")
            .select('name moduleId category lessonNumber subCategory description difficulty color imageUrl status totalQuestions')
            .lean()
            .sort({ createdAt: -1 });

        // Add question count from totalQuestions field (updated by pre-save hook)
        const coursesWithCount = courses.map(course => ({
            ...course,
            questionCount: course.totalQuestions || 0
        }));

        res.status(200).json({
            success: true,
            data: coursesWithCount,
        });
    }),

    // Get a single exam course with questions
    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const course = await ExamCourse.findById(id)
            .populate("moduleId", "name color")
            .populate({
                path: "linkedQuestions",
                options: { sort: { questionNumber: 1, createdAt: 1 } }
            })
            .lean();

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Cours non trouvé",
            });
        }

        const questions = course.linkedQuestions || [];
        const questionSources = course.questionSources || [];
        
        // Create a map of questionId to source info (yearName)
        const sourceMap = {};
        questionSources.forEach(source => {
            sourceMap[source.questionId?.toString()] = source;
        });

        // Group questions by yearName from questionSources or by sessionLabel
        const groupedQuestions = questions.reduce((acc, q) => {
            const qId = q._id?.toString();
            const source = sourceMap[qId];
            
            // Use yearName from questionSources, then sessionLabel, then default
            const session = source?.yearName || q.sessionLabel || course.name || "Session principale";
            
            if (!acc[session]) acc[session] = [];
            acc[session].push(q);
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                ...course,
                moduleName: course.moduleId?.name,
                moduleColor: course.moduleId?.color || course.color || '#6366f1',
                totalQuestions: questions.length,
                questions: groupedQuestions,
            },
        });
    }),

    // Get all exam courses for a specific module
    getByModuleId: asyncHandler(async (req, res) => {
        const { moduleId } = req.params;

        const module = await Module.findById(moduleId).select("_id name semester").lean();
        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module non trouvé",
            });
        }

        // Historical datasets use equivalent labels such as "Anatomie 1" and
        // "Anatomie I". Resolve those aliases inside the same semester before
        // querying courses so older links remain usable.
        const moduleCandidateFilter = module.semester
            ? {
                $or: [
                    { semester: module.semester },
                    { semester: "" },
                    { semester: null },
                ],
            }
            : {};
        const moduleCandidates = await Module.find(moduleCandidateFilter)
            .select("_id name semester")
            .lean();
        const equivalentModules = findEquivalentModules(module, moduleCandidates);
        const equivalentModuleIds = equivalentModules.length > 0
            ? equivalentModules.map(item => item._id)
            : [module._id];

        const equivalentNames = [...new Set([
            module.name,
            ...equivalentModules.map(item => item.name),
        ].filter(Boolean))];

        const courses = await ExamCourse.find({ moduleId: { $in: equivalentModuleIds } })
            .populate("moduleId", "name")
            .select('name moduleId category lessonNumber subCategory description difficulty color imageUrl status totalQuestions helpText')
            .lean()
            .sort({ createdAt: -1 });

        // Support older imports that stored a string moduleId/module name.
        // The raw compatibility scan is only needed when the indexed ObjectId
        // query found nothing, keeping the normal route fast.
        let resolvedCourses = courses;
        if (resolvedCourses.length === 0) {
            const equivalentModuleIdStrings = equivalentModuleIds.map(String);
            const legacyCandidates = await ExamCourse.collection.find({
                $or: [
                    { moduleId: { $in: equivalentModuleIdStrings } },
                    { moduleName: { $exists: true, $ne: "" } },
                    { module: { $exists: true, $ne: "" } },
                ],
            }).sort({ createdAt: -1 }).toArray();

            resolvedCourses = legacyCandidates.filter((course) => {
                if (equivalentModuleIdStrings.includes(String(course.moduleId))) return true;
                const legacyModuleName = course.moduleName || course.module;
                return equivalentNames.some((name) => (
                    moduleNamesAreEquivalent(legacyModuleName, name)
                ));
            });
        }

        const answeredCountByExam = await getAnsweredCountByExam(req.user?._id);

        // Add total and user-specific completed question counts for each course.
        const coursesWithCount = resolvedCourses.map(course => ({
            ...course,
            moduleId: course.moduleId || { _id: module._id, name: module.name },
            questionCount: course.totalQuestions ?? course.linkedQuestions?.length ?? 0,
            answeredQuestions: answeredCountByExam[course._id.toString()] || 0,
        }));

        res.status(200).json({
            success: true,
            data: coursesWithCount,
        });
    }),

    // Update an exam course
    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, moduleId, category, lessonNumber, subCategory, description, imageUrl, status, helpText } = req.body;

        const updated = await ExamCourse.findByIdAndUpdate(
            id,
            { name, moduleId, category, lessonNumber, subCategory, description, imageUrl, status, helpText },
            { new: true, runValidators: true }
        ).populate("moduleId", "name");

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Cours non trouvé",
            });
        }

        res.status(200).json({
            success: true,
            data: updated,
            message: "Cours mis à jour avec succès",
        });
    }),

    // Delete an exam course
    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const deleted = await ExamCourse.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Cours non trouvé",
            });
        }

        res.status(200).json({
            success: true,
            message: "Cours supprimé avec succès",
        });
    }),

    downloadImportTemplate: asyncHandler(async (req, res) => {
        const worksheet = xlsx.utils.json_to_sheet([
            {
                semestre: "S3",
                module: "Sémiologie 1",
                categorie: "Rhumatologie",
                num_lesson: "L1",
                "lesson name": "Introduction et généralités en sémiologie de rhumatologie",
            },
        ]);
        worksheet["!cols"] = [
            { wch: 12 },
            { wch: 28 },
            { wch: 24 },
            { wch: 20 },
            { wch: 42 },
        ];
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Cours");
        const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="modele-import-cours.xlsx"');
        return res.status(200).send(buffer);
    }),

    downloadQuestionImportTemplate: asyncHandler(async (req, res) => {
        const worksheet = xlsx.utils.json_to_sheet([{
            "qst Num": 1,
            Question: "Quelle est la bonne réponse ?",
            A: "Première proposition",
            B: "Deuxième proposition",
            C: "Troisième proposition",
            D: "Quatrième proposition",
            E: "",
            answer: "A",
            Session: "Session principale",
            Note: "",
        }]);
        worksheet["!cols"] = [
            { wch: 12 }, { wch: 45 }, { wch: 28 }, { wch: 28 }, { wch: 28 },
            { wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 32 },
        ];
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Questions");
        const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="modele-questions-exam-par-cours.xlsx"');
        return res.status(200).send(buffer);
    }),

    importQuestionsFromExcel: asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Veuillez fournir un fichier Excel." });
        }
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Cours sélectionné invalide." });
        }
        const course = await ExamCourse.findById(id);
        if (!course) {
            return res.status(404).json({ success: false, message: "Cours sélectionné introuvable." });
        }

        let workbook;
        let rows;
        let headers;
        try {
            workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: false });
            const worksheet = workbook.Sheets[workbook.SheetNames?.[0]];
            if (!worksheet) throw new Error("Le classeur ne contient aucune feuille.");
            const matrix = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "", blankrows: false });
            headers = matrix[0] || [];
            rows = xlsx.utils.sheet_to_json(worksheet, { defval: "", blankrows: false, raw: false });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Le fichier Excel est illisible: ${error.message}`,
            });
        }

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Le fichier Excel ne contient aucune question." });
        }
        if (rows.length > MAX_COURSE_QUESTION_IMPORT_ROWS) {
            return res.status(413).json({
                success: false,
                message: `Le fichier dépasse la limite de ${MAX_COURSE_QUESTION_IMPORT_ROWS} lignes.`,
            });
        }

        const parsed = parseCourseQuestionImportRows(rows, headers);
        if (parsed.missingHeaders.length > 0) {
            const missingHeaders = parsed.missingHeaders.map(field => COURSE_QUESTION_IMPORT_HEADER_LABELS[field]);
            return res.status(422).json({
                success: false,
                code: "INVALID_QUESTION_IMPORT_HEADERS",
                message: `Colonnes obligatoires manquantes: ${missingHeaders.join(", ")}.`,
                data: { missingHeaders },
            });
        }

        const existingNumbers = new Set(
            (await Question.find({ _id: { $in: course.linkedQuestions || [] } })
                .select("questionNumber")
                .lean())
                .map(question => question.questionNumber)
                .filter(Boolean)
        );
        const errors = parsed.errors.slice(0, 100);
        const documents = parsed.records.filter((record) => {
            if (!existingNumbers.has(record.questionNumber)) return true;
            if (errors.length < 100) {
                errors.push({
                    row: record.rowNumber,
                    field: "qst Num",
                    reason: "Ce numéro existe déjà dans le cours sélectionné",
                });
            }
            return false;
        }).map(({ rowNumber, ...record }) => ({
            ...record,
            examCourseId: course._id,
        }));

        let createdQuestions = [];
        try {
            if (documents.length > 0) {
                createdQuestions = await Question.insertMany(documents);
                course.linkedQuestions.push(...createdQuestions.map(question => question._id));
                await course.save();
            }
        } catch (error) {
            if (createdQuestions.length > 0) {
                await Question.deleteMany({ _id: { $in: createdQuestions.map(question => question._id) } });
            }
            console.error("Course question Excel import failed", {
                adminId: req.user?._id?.toString(),
                courseId: id,
                filename: req.file.originalname,
                message: error.message,
            });
            return res.status(500).json({
                success: false,
                message: "Les questions n'ont pas pu être enregistrées. Aucune question n'a été ajoutée au cours.",
            });
        }

        const failed = rows.length - createdQuestions.length;
        return res.status(createdQuestions.length > 0 ? 201 : 422).json({
            success: createdQuestions.length > 0,
            message: createdQuestions.length > 0
                ? `${createdQuestions.length} question(s) importée(s), ${failed} ligne(s) ignorée(s).`
                : "Aucune question n'a été importée. Corrigez les erreurs indiquées.",
            data: {
                total: rows.length,
                imported: createdQuestions.length,
                failed,
                errors,
                errorsTruncated: parsed.errors.length > 100,
                course: { id: course._id, name: course.name },
            },
        });
    }),

    downloadQuestionMappingTemplate: asyncHandler(async (req, res) => {
        const moduleId = String(req.query?.moduleId || "").trim();
        if (!mongoose.isValidObjectId(moduleId)) {
            return res.status(400).json({ success: false, message: "Sélectionnez un module valide." });
        }
        const scopedModule = await Module.findById(moduleId).select("_id name semester").lean();
        if (!scopedModule) {
            return res.status(404).json({ success: false, message: "Module sélectionné introuvable." });
        }

        const [courses, exams] = await Promise.all([
            ExamCourse.find({ moduleId: scopedModule._id })
                .select("_id name lessonNumber")
                .lean(),
            ExamParYear.find({ moduleId: scopedModule._id })
                .select("_id name year")
                .sort({ year: -1, name: 1 })
                .lean(),
        ]);
        const invalidCourses = courses.filter(course => !String(course.lessonNumber || "").trim());
        if (invalidCourses.length > 0) {
            return res.status(422).json({
                success: false,
                message: `Ajoutez un numéro de leçon aux cours suivants avant de générer le modèle: ${invalidCourses.slice(0, 10).map(course => course.name).join(", ")}.`,
            });
        }
        if (courses.length === 0) {
            return res.status(422).json({ success: false, message: "Ce module ne contient aucun cours à mapper." });
        }
        if (courses.length > MAX_MATRIX_LESSONS) {
            return res.status(422).json({
                success: false,
                message: `Ce module dépasse la limite de ${MAX_MATRIX_LESSONS} leçons par matrice.`,
            });
        }
        if (exams.length === 0) {
            return res.status(422).json({ success: false, message: "Ce module ne contient aucun examen par année." });
        }
        if (exams.length > MAX_MATRIX_EXAMS) {
            return res.status(422).json({
                success: false,
                message: `Ce module dépasse la limite de ${MAX_MATRIX_EXAMS} examens par matrice.`,
            });
        }

        const duplicateExamNames = exams.reduce((counts, exam) => {
            const name = String(exam.name || "").trim();
            counts.set(name, (counts.get(name) || 0) + 1);
            return counts;
        }, new Map());
        const ambiguousExamNames = [...duplicateExamNames.entries()]
            .filter(([, count]) => count > 1)
            .map(([name]) => name);
        if (ambiguousExamNames.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Les titres d'examens doivent être uniques dans ce module: ${ambiguousExamNames.slice(0, 10).join(", ")}.`,
            });
        }

        courses.sort((left, right) => (
            String(left.lessonNumber).localeCompare(String(right.lessonNumber), "fr", { numeric: true })
            || String(left.name).localeCompare(String(right.name), "fr")
        ));
        const matrix = buildQuestionMappingTemplateMatrix(courses, exams);
        const worksheet = xlsx.utils.aoa_to_sheet(matrix);
        worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }];
        worksheet["!cols"] = [
            { wch: 28 },
            ...courses.map(course => ({
                wch: Math.min(42, Math.max(16, String(course.name).length + 2)),
            })),
        ];
        worksheet["!rows"] = [{ hpt: 24 }, { hpt: 36 }];
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Matrice");
        const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="modele-matrice-exam-par-cours.xlsx"');
        return res.status(200).send(buffer);
    }),

    importQuestionMappingMatrix: asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Veuillez fournir un fichier Excel." });
        }
        const moduleId = String(req.body?.moduleId || "").trim();
        if (!mongoose.isValidObjectId(moduleId)) {
            return res.status(400).json({ success: false, message: "Sélectionnez un module valide." });
        }
        const scopedModule = await Module.findById(moduleId).select("_id name semester").lean();
        if (!scopedModule) {
            return res.status(404).json({ success: false, message: "Module sélectionné introuvable." });
        }

        let matrix;
        try {
            const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: false });
            const worksheet = workbook.Sheets[workbook.SheetNames?.[0]];
            if (!worksheet) throw new Error("Le classeur ne contient aucune feuille.");
            matrix = xlsx.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: "",
                blankrows: false,
                raw: false,
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                code: "INVALID_MAPPING_WORKBOOK",
                message: `Le fichier Excel est illisible: ${error.message}`,
            });
        }

        const parsed = parseQuestionMappingMatrix(matrix);
        if (parsed.errors.length > 0) {
            return res.status(422).json({
                success: false,
                code: "INVALID_MAPPING_MATRIX",
                message: "La matrice contient des erreurs. Aucun lien n'a été modifié.",
                data: {
                    total: parsed.mappings.length,
                    imported: 0,
                    failed: parsed.errors.length,
                    errors: parsed.errors.slice(0, 100),
                    errorsTruncated: parsed.errors.length > 100,
                },
            });
        }

        const [courses, exams] = await Promise.all([
            ExamCourse.find({ moduleId: scopedModule._id })
                .select("_id name lessonNumber linkedQuestions questionSources")
                .lean(),
            ExamParYear.find({ moduleId: scopedModule._id })
                .select("_id name year")
                .lean(),
        ]);
        const validationErrors = [];
        const addValidationError = (row, field, reason) => {
            if (validationErrors.length < 100) validationErrors.push({ row, field, reason });
        };

        const coursesByLessonNumber = courses.reduce((result, course) => {
            const key = normalizeImportText(normalizeLessonNumber(course.lessonNumber));
            if (!result.has(key)) result.set(key, []);
            result.get(key).push(course);
            return result;
        }, new Map());
        const courseByLessonNumber = new Map();
        parsed.lessons.forEach((lesson) => {
            const key = normalizeImportText(lesson.lessonNumber);
            const candidates = coursesByLessonNumber.get(key) || [];
            const exactCandidates = candidates.filter(course => (
                normalizeImportText(course.name) === normalizeImportText(lesson.lessonName)
            ));
            if (exactCandidates.length !== 1) {
                const reason = candidates.length === 0
                    ? `La leçon ${lesson.lessonNumber} n'existe pas dans le module sélectionné`
                    : exactCandidates.length === 0
                        ? `Le nom « ${lesson.lessonName} » ne correspond pas à la leçon ${lesson.lessonNumber}`
                        : `La leçon ${lesson.lessonNumber} est ambiguë dans la base de données`;
                addValidationError(1, `${xlsx.utils.encode_col(lesson.columnIndex)}1`, reason);
                return;
            }
            courseByLessonNumber.set(key, exactCandidates[0]);
        });

        const examsByName = exams.reduce((result, exam) => {
            const name = String(exam.name || "").trim();
            if (!result.has(name)) result.set(name, []);
            result.get(name).push(exam);
            return result;
        }, new Map());
        const examByName = new Map();
        parsed.examRows.forEach((examRow) => {
            const candidates = examsByName.get(examRow.examName) || [];
            if (candidates.length !== 1) {
                addValidationError(
                    examRow.rowNumber,
                    `A${examRow.rowNumber}`,
                    candidates.length === 0
                        ? `L'examen « ${examRow.examName} » n'existe pas exactement dans le module sélectionné`
                        : `Plusieurs examens portent le titre exact « ${examRow.examName} »`
                );
                return;
            }
            examByName.set(examRow.examName, candidates[0]);
        });

        if (validationErrors.length > 0) {
            return res.status(422).json({
                success: false,
                code: "MAPPING_TARGETS_NOT_FOUND",
                message: "Certaines leçons ou certains examens ne correspondent pas à la base de données. Aucun lien n'a été modifié.",
                data: {
                    total: parsed.mappings.length,
                    imported: 0,
                    failed: validationErrors.length,
                    errors: validationErrors,
                },
            });
        }

        const examIds = [...new Set([...examByName.values()].map(exam => exam._id.toString()))];
        const questions = await Question.find({ examId: { $in: examIds } })
            .select("_id examId questionNumber createdAt")
            .sort({ examId: 1, questionNumber: 1, createdAt: 1 })
            .lean();
        const questionsByExam = questions.reduce((result, question) => {
            const key = question.examId.toString();
            if (!result.has(key)) result.set(key, []);
            result.get(key).push(question);
            return result;
        }, new Map());
        const questionMapsByExam = new Map();
        questionsByExam.forEach((examQuestions, examId) => {
            const questionMap = new Map();
            examQuestions.forEach((question, index) => {
                const number = question.questionNumber || index + 1;
                if (!questionMap.has(number)) questionMap.set(number, []);
                questionMap.get(number).push(question);
            });
            questionMapsByExam.set(examId, questionMap);
        });

        const existingCourseIdsByQuestion = courses.reduce((result, course) => {
            (course.linkedQuestions || []).forEach((questionId) => {
                const key = questionId.toString();
                if (!result.has(key)) result.set(key, new Set());
                result.get(key).add(course._id.toString());
            });
            return result;
        }, new Map());

        const assignments = [];
        const assignedCourseByQuestion = new Map();
        parsed.mappings.forEach((mapping) => {
            const course = courseByLessonNumber.get(normalizeImportText(mapping.lessonNumber));
            const exam = examByName.get(mapping.examName);
            const questionMap = questionMapsByExam.get(exam._id.toString()) || new Map();
            mapping.questionNumbers.forEach((questionNumber) => {
                const questionCandidates = questionMap.get(questionNumber) || [];
                if (questionCandidates.length === 0) {
                    addValidationError(
                        mapping.rowNumber,
                        mapping.cell,
                        `La question ${questionNumber} n'existe pas dans l'examen « ${mapping.examName} »`
                    );
                    return;
                }
                if (questionCandidates.length > 1) {
                    addValidationError(
                        mapping.rowNumber,
                        mapping.cell,
                        `Plusieurs questions portent le numéro ${questionNumber} dans l'examen « ${mapping.examName} »`
                    );
                    return;
                }
                const question = questionCandidates[0];
                const existingCourseIds = existingCourseIdsByQuestion.get(question._id.toString()) || new Set();
                if ([...existingCourseIds].some(courseId => courseId !== course._id.toString())) {
                    addValidationError(
                        mapping.rowNumber,
                        mapping.cell,
                        `La question ${questionNumber} est déjà liée à une autre leçon dans la base de données`
                    );
                    return;
                }
                const assignmentKey = `${exam._id}:${question._id}`;
                const previousCourseId = assignedCourseByQuestion.get(assignmentKey);
                if (previousCourseId && previousCourseId !== course._id.toString()) {
                    addValidationError(
                        mapping.rowNumber,
                        mapping.cell,
                        `La question ${questionNumber} est déjà affectée à une autre leçon dans cette matrice`
                    );
                    return;
                }
                assignedCourseByQuestion.set(assignmentKey, course._id.toString());
                assignments.push({ course, exam, question, questionNumber });
            });
        });

        if (validationErrors.length > 0) {
            return res.status(422).json({
                success: false,
                code: "MAPPING_QUESTIONS_NOT_FOUND",
                message: "Certaines questions sont introuvables ou affectées plusieurs fois. Aucun lien n'a été modifié.",
                data: {
                    total: assignments.length,
                    imported: 0,
                    failed: validationErrors.length,
                    errors: validationErrors,
                    errorsTruncated: validationErrors.length >= 100,
                },
            });
        }

        const plansByCourse = new Map();
        let alreadyLinked = 0;
        assignments.forEach(({ course, exam, question, questionNumber }) => {
            const courseId = course._id.toString();
            if (!plansByCourse.has(courseId)) {
                plansByCourse.set(courseId, {
                    course,
                    newQuestionIds: new Map(),
                    newSources: new Map(),
                    existingQuestionIds: new Set((course.linkedQuestions || []).map(id => id.toString())),
                    existingSourceIds: new Set((course.questionSources || []).map(source => source.questionId?.toString()).filter(Boolean)),
                });
            }
            const plan = plansByCourse.get(courseId);
            const questionId = question._id.toString();
            if (plan.existingQuestionIds.has(questionId) || plan.newQuestionIds.has(questionId)) {
                alreadyLinked += 1;
            } else {
                plan.newQuestionIds.set(questionId, question._id);
            }
            if (!plan.existingSourceIds.has(questionId) && !plan.newSources.has(questionId)) {
                plan.newSources.set(questionId, {
                    questionId: question._id,
                    examParYearId: exam._id,
                    yearName: exam.name,
                    questionNumber,
                });
            }
        });

        const changedPlans = [...plansByCourse.values()].filter(plan => (
            plan.newQuestionIds.size > 0 || plan.newSources.size > 0
        ));
        const operations = changedPlans.map(plan => ({
            updateOne: {
                filter: { _id: plan.course._id },
                update: [
                    {
                        $set: {
                            linkedQuestions: {
                                $setUnion: [
                                    { $ifNull: ["$linkedQuestions", []] },
                                    [...plan.newQuestionIds.values()],
                                ],
                            },
                            questionSources: {
                                $setUnion: [
                                    { $ifNull: ["$questionSources", []] },
                                    [...plan.newSources.values()],
                                ],
                            },
                        },
                    },
                    { $set: { totalQuestions: { $size: "$linkedQuestions" } } },
                ],
            },
        }));

        try {
            if (operations.length > 0) await ExamCourse.bulkWrite(operations, { ordered: true });
        } catch (error) {
            console.error("Question mapping matrix import failed", {
                adminId: req.user?._id?.toString(),
                moduleId,
                filename: req.file.originalname,
                message: error.message,
            });
            return res.status(500).json({
                success: false,
                code: "MAPPING_DATABASE_FAILED",
                message: "La matrice est valide, mais les liens n'ont pas pu être enregistrés.",
            });
        }

        const questionsLinked = [...plansByCourse.values()]
            .reduce((sum, plan) => sum + plan.newQuestionIds.size, 0);
        console.info("Question mapping matrix imported", {
            adminId: req.user?._id?.toString(),
            moduleId,
            filename: req.file.originalname,
            mappingCells: parsed.mappings.length,
            requestedQuestions: assignments.length,
            questionsLinked,
            alreadyLinked,
            lessonsUpdated: operations.length,
        });
        return res.status(200).json({
            success: true,
            message: `${questionsLinked} nouvelle(s) liaison(s) créée(s), ${alreadyLinked} déjà existante(s).`,
            data: {
                total: assignments.length,
                imported: questionsLinked,
                failed: 0,
                mappingCells: parsed.mappings.length,
                alreadyLinked,
                lessonsUpdated: operations.length,
                errors: [],
            },
        });
    }),

    importFromExcel: asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Veuillez fournir un fichier Excel." });
        }

        let workbook;
        try {
            workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: false });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Le fichier Excel est illisible: ${error.message}`,
            });
        }

        if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
            return res.status(400).json({ success: false, message: "Le classeur ne contient aucune feuille." });
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) {
            return res.status(400).json({ success: false, message: "Le classeur ne contient aucune feuille." });
        }

        let headers;
        let rows;
        try {
            const matrix = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "", blankrows: false });
            headers = matrix[0] || [];
            rows = xlsx.utils.sheet_to_json(worksheet, { defval: "", blankrows: false, raw: true });
        } catch (error) {
            return res.status(400).json({
                success: false,
                code: "INVALID_IMPORT_CONTENT",
                message: `Impossible de lire les lignes du fichier Excel: ${error.message}`,
            });
        }

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Le fichier Excel ne contient aucun cours." });
        }
        if (rows.length > MAX_COURSE_IMPORT_ROWS) {
            return res.status(413).json({
                success: false,
                message: `Le fichier dépasse la limite de ${MAX_COURSE_IMPORT_ROWS} lignes.`,
            });
        }

        const { headerMap, missingHeaders, records } = mapCourseImportRows(rows, headers);
        if (missingHeaders.length > 0) {
            return res.status(422).json({
                success: false,
                code: "INVALID_IMPORT_HEADERS",
                message: `Colonnes obligatoires manquantes: ${missingHeaders.map(field => COURSE_IMPORT_HEADER_LABELS[field]).join(", ")}.`,
                data: { missingHeaders: missingHeaders.map(field => COURSE_IMPORT_HEADER_LABELS[field]) },
            });
        }

        const requestedSemester = String(req.body?.semester || "").trim();
        const requestedModuleId = String(req.body?.moduleId || "").trim();
        if (!requestedSemester || !requestedModuleId) {
            return res.status(400).json({
                success: false,
                message: "Sélectionnez le semestre et le module avant d'importer le fichier.",
            });
        }

        const scopedSemester = normalizeSemester(requestedSemester);
        if (!scopedSemester || !mongoose.isValidObjectId(requestedModuleId)) {
            return res.status(400).json({ success: false, message: "Semestre ou module invalide." });
        }
        const scopedModule = await Module.findById(requestedModuleId).select("_id name semester").lean();
        if (!scopedModule) {
            return res.status(404).json({ success: false, message: "Module sélectionné introuvable." });
        }
        if (scopedModule.semester !== scopedSemester) {
            return res.status(422).json({
                success: false,
                message: `Le module sélectionné n'appartient pas au semestre ${scopedSemester}.`,
            });
        }

        const errors = [];
        const resolvedRecords = [];
        records.forEach((record, index) => {
            const validationErrors = [
                ...validateCourseImportCellTypes(rows[index], headerMap),
                ...validateCourseImportRecord(record),
            ];
            validationErrors.forEach(error => addImportError(errors, record.rowNumber, error.field, error.reason));
            if (validationErrors.length > 0) return;

            if (record.semester !== scopedSemester) {
                addImportError(
                    errors,
                    record.rowNumber,
                    "Semestre",
                    `La ligne indique ${record.semester}, mais ${scopedSemester} est sélectionné.`
                );
                return;
            }
            if (!moduleNamesAreEquivalent(record.moduleName, scopedModule.name)) {
                addImportError(
                    errors,
                    record.rowNumber,
                    "Module",
                    `La ligne indique « ${record.moduleName} », mais « ${scopedModule.name} » est sélectionné.`
                );
                return;
            }
            resolvedRecords.push({ ...record, module: scopedModule });
        });

        const targetModuleIds = [...new Map(
            resolvedRecords.map(record => [record.module._id.toString(), record.module._id])
        ).values()];
        const existingCourses = targetModuleIds.length > 0
            ? await ExamCourse.find({ moduleId: { $in: targetModuleIds } })
                .select("moduleId category lessonNumber name")
                .lean()
            : [];
        const existingKeys = new Set(existingCourses.flatMap(course => (
            getCourseImportDuplicateKeys(course)
        )));
        const pendingKeys = new Set();
        const documents = [];

        resolvedRecords.forEach((record) => {
            const duplicateKeys = getCourseImportDuplicateKeys({
                ...record,
                moduleId: record.module._id,
            });
            if (duplicateKeys.some(key => existingKeys.has(key))) {
                addImportError(errors, record.rowNumber, "Cours", "Ce numéro ou ce nom de leçon existe déjà dans cette catégorie du module.");
                return;
            }
            if (duplicateKeys.some(key => pendingKeys.has(key))) {
                addImportError(errors, record.rowNumber, "Cours", "Doublon détecté dans le fichier.");
                return;
            }
            duplicateKeys.forEach(key => pendingKeys.add(key));
            documents.push({
                name: record.lessonName,
                moduleId: record.module._id,
                category: record.category,
                lessonNumber: record.lessonNumber,
                status: "draft",
            });
        });

        let createdCourses = [];
        let createdCategoryNames = [];
        if (documents.length > 0) {
            try {
                const categoryResult = await findOrCreateCourseImportCategories({
                    moduleId: scopedModule._id,
                    categoryNames: documents.map(document => document.category),
                });
                createdCategoryNames = categoryResult.createdNames;
                documents.forEach((document) => {
                    const category = categoryResult.categoriesByKey.get(normalizeImportText(document.category));
                    document.category = category.name;
                    document.courseCategoryId = category._id;
                });
                createdCourses = await ExamCourse.insertMany(documents);
            } catch (error) {
                const isCategoryError = error instanceof CourseCategoryImportError;
                const field = isCategoryError ? "Catégorie" : "Base de données";
                const reason = isCategoryError
                    ? `${error.message} (${error.categoryName})`
                    : error?.name === "ValidationError"
                        ? `Données refusées: ${error.message}`
                        : "L'enregistrement des cours a échoué. Réessayez; si le problème persiste, contactez l'administrateur technique.";
                console.error("Course Excel import database failure", {
                    adminId: req.user?._id?.toString(),
                    filename: req.file.originalname,
                    moduleId: scopedModule._id.toString(),
                    errorName: error?.name,
                    errorCode: error?.code,
                    message: error?.message,
                });
                return res.status(isCategoryError && error?.cause?.code === 11000 ? 409 : 500).json({
                    success: false,
                    code: isCategoryError ? "CATEGORY_CREATION_FAILED" : "COURSE_IMPORT_DATABASE_FAILED",
                    message: "L'import a été interrompu avant la création des cours.",
                    data: {
                        total: records.length,
                        imported: 0,
                        failed: records.length,
                        errors: [{ row: null, field, reason }],
                    },
                });
            }
        }
        const failed = records.length - createdCourses.length;
        console.info("Course Excel import completed", {
            adminId: req.user?._id?.toString(),
            filename: req.file.originalname,
            total: records.length,
            imported: createdCourses.length,
            failed,
            categoriesCreated: createdCategoryNames.length,
            semester: scopedSemester,
            moduleId: scopedModule?._id?.toString(),
        });

        const status = createdCourses.length > 0 ? 201 : 422;
        return res.status(status).json({
            success: createdCourses.length > 0,
            message: createdCourses.length > 0
                ? `${createdCourses.length} cours importé(s), ${failed} ligne(s) ignorée(s).`
                : "Aucun cours n'a été importé. Corrigez les erreurs indiquées.",
            data: {
                total: records.length,
                imported: createdCourses.length,
                failed,
                categoriesCreated: createdCategoryNames.length,
                createdCategoryNames,
                errors,
                errorsTruncated: errors.length >= 100 && failed > errors.length,
                scope: {
                    semester: scopedSemester,
                    moduleId: scopedModule._id,
                    moduleName: scopedModule.name,
                },
            },
        });
    }),

    // Link questions to a course
    linkQuestions: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { questionLinks } = req.body;
        // questionLinks: [{ examParYearId, questionNumbers: "1-5,7,10-12", yearName }]

        const course = await ExamCourse.findById(id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Cours non trouvé",
            });
        }

        let linkedCount = 0;
        const newSources = [];

        for (const link of questionLinks) {
            const { examParYearId, questionNumbers, yearName } = link;

            // Parse question numbers (e.g., "1-5,7,10-12" -> [1,2,3,4,5,7,10,11,12])
            const parsedNumbers = parseQuestionNumbers(questionNumbers);

            // Get all questions from this exam, sorted by questionNumber then createdAt
            const questions = await Question.find({ examId: examParYearId })
                .sort({ questionNumber: 1, createdAt: 1 });

            // Build a map of questionNumber -> question for efficient lookup
            const questionsByNumber = new Map();
            questions.forEach((q, idx) => {
                // Use stored questionNumber if available, otherwise use position (1-indexed)
                const qNum = q.questionNumber || (idx + 1);
                questionsByNumber.set(qNum, q);
            });

            for (const num of parsedNumbers) {
                // First try to find by questionNumber, then fall back to position
                let question = questionsByNumber.get(num);
                if (!question) {
                    // Fallback: use array position (0-indexed)
                    const index = num - 1;
                    if (index >= 0 && index < questions.length) {
                        question = questions[index];
                    }
                }
                
                if (question && !course.linkedQuestions.includes(question._id)) {
                    course.linkedQuestions.push(question._id);
                    newSources.push({
                        questionId: question._id,
                        examParYearId,
                        yearName,
                        questionNumber: num,
                    });
                    linkedCount++;
                }
            }
        }

        course.questionSources.push(...newSources);
        await course.save();

        res.status(200).json({
            success: true,
            data: course,
            message: `${linkedCount} question(s) liée(s) au cours`,
        });
    }),

    // Unlink a question from a course
    unlinkQuestion: asyncHandler(async (req, res) => {
        const { id, questionId } = req.params;

        const course = await ExamCourse.findById(id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Cours non trouvé",
            });
        }

        course.linkedQuestions = course.linkedQuestions.filter(
            q => q.toString() !== questionId
        );
        course.questionSources = course.questionSources.filter(
            s => s.questionId.toString() !== questionId
        );
        await course.save();

        res.status(200).json({
            success: true,
            data: course,
            message: "Question retirée du cours",
        });
    }),

    // Get available questions to link (from ExamParYear)
    getAvailableQuestions: asyncHandler(async (req, res) => {
        const { moduleId, examParYearId } = req.query;

        let filter = {};

        if (examParYearId) {
            filter.examId = examParYearId;
        } else if (moduleId) {
            // Get all ExamParYear for this module
            const exams = await ExamParYear.find({ moduleId }).select("_id");
            const examIds = exams.map(e => e._id);
            filter.examId = { $in: examIds };
        }

        const questions = await Question.find(filter)
            .populate({
                path: "examId",
                select: "name year moduleId",
                populate: {
                    path: "moduleId",
                    select: "name",
                },
            })
            .sort({ createdAt: 1 });

        // Group by exam
        const grouped = {};
        questions.forEach((q, idx) => {
            const examName = q.examId?.name || "Unknown";
            if (!grouped[examName]) {
                grouped[examName] = {
                    examId: q.examId?._id,
                    examName,
                    year: q.examId?.year,
                    moduleName: q.examId?.moduleId?.name,
                    questions: [],
                };
            }
            grouped[examName].questions.push({
                _id: q._id,
                questionNumber: grouped[examName].questions.length + 1,
                text: q.text?.substring(0, 100) + (q.text?.length > 100 ? "..." : ""),
                sessionLabel: q.sessionLabel,
            });
        });

        res.status(200).json({
            success: true,
            data: Object.values(grouped),
        });
    }),

    // Get exam years for a module (for dropdown)
    getExamYearsForModule: asyncHandler(async (req, res) => {
        const { moduleId } = req.params;

        const examYears = await ExamParYear.find({ moduleId })
            .select("name year")
            .sort({ year: -1 });

        res.status(200).json({
            success: true,
            data: examYears,
        });
    }),

    // Get categories for a module (distinct values)
    getCategoriesForModule: asyncHandler(async (req, res) => {
        const { moduleId } = req.params;

        const categories = await ExamCourse.distinct("category", { moduleId });

        res.status(200).json({
            success: true,
            data: categories,
        });
    }),

    // Seed course categories (Admin only - for testing)
    createCategoriesForCourses: asyncHandler(async (req, res) => {
        const categories = [
            { name: "Anatomie", color: "#ef4444", difficulty: "medium" },
            { name: "Physiologie", color: "#f97316", difficulty: "hard" },
            { name: "Biochimie", color: "#f59e0b", difficulty: "hard" },
            { name: "Histologie", color: "#eab308", difficulty: "medium" },
            { name: "Embryologie", color: "#84cc16", difficulty: "medium" },
            { name: "Génétique", color: "#22c55e", difficulty: "hard" },
            { name: "Immunologie", color: "#10b981", difficulty: "hard" },
            { name: "Hématologie", color: "#14b8a6", difficulty: "medium" },
            { name: "Microbiologie", color: "#06b6d4", difficulty: "medium" },
            { name: "Pharmacologie", color: "#0ea5e9", difficulty: "hard" },
            { name: "Pathologie", color: "#3b82f6", difficulty: "hard" },
            { name: "Sémiologie", color: "#6366f1", difficulty: "medium" },
            { name: "Radiologie", color: "#8b5cf6", difficulty: "medium" },
            { name: "Cardiologie", color: "#a855f7", difficulty: "hard" },
            { name: "Pneumologie", color: "#c026d3", difficulty: "medium" },
            { name: "Gastro-entérologie", color: "#d946ef", difficulty: "medium" },
            { name: "Néphrologie", color: "#ec4899", difficulty: "hard" },
            { name: "Endocrinologie", color: "#f43f5e", difficulty: "hard" },
            { name: "Neurologie", color: "#dc2626", difficulty: "hard" },
            { name: "Psychiatrie", color: "#ea580c", difficulty: "medium" },
            { name: "Dermatologie", color: "#d97706", difficulty: "easy" },
            { name: "ORL", color: "#ca8a04", difficulty: "medium" },
            { name: "Ophtalmologie", color: "#65a30d", difficulty: "medium" },
            { name: "Pédiatrie", color: "#16a34a", difficulty: "medium" },
            { name: "Gynécologie-Obstétrique", color: "#059669", difficulty: "hard" },
            { name: "Chirurgie générale", color: "#0d9488", difficulty: "hard" },
            { name: "Orthopédie", color: "#0891b2", difficulty: "medium" },
            { name: "Urologie", color: "#0284c7", difficulty: "medium" },
            { name: "Oncologie", color: "#2563eb", difficulty: "hard" },
            { name: "Médecine d'urgence", color: "#4f46e5", difficulty: "hard" },
            { name: "Santé publique", color: "#7c3aed", difficulty: "easy" },
            { name: "Éthique médicale", color: "#9333ea", difficulty: "easy" }
        ];

        // Get all modules to create sample exam courses with different categories
        const modules = await Module.find().limit(5);

        if (modules.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Aucun module trouvé. Veuillez créer des modules d'abord.",
            });
        }

        // Delete existing exam courses (optional - can be removed if you want to keep existing)
        const deleteResult = await ExamCourse.deleteMany({});

        // Create sample exam courses for each category
        const examCourses = [];

        for (let i = 0; i < categories.length; i++) {
            const categoryData = categories[i];
            const module = modules[i % modules.length]; // Cycle through modules

            examCourses.push({
                name: `Cours ${categoryData.name}`,
                moduleId: module._id,
                category: categoryData.name,
                subCategory: i % 3 === 0 ? "Session principale" : i % 3 === 1 ? "Session rattrapage" : "",
                description: `Cours complet sur ${categoryData.name.toLowerCase()} avec questions et exercices.`,
                difficulty: categoryData.difficulty,
                color: categoryData.color,
                contentType: "text",
                imageUrl: "",
                status: i % 4 === 0 ? "draft" : "active",
                linkedQuestions: [],
                totalQuestions: 0
            });
        }

        const createdCourses = await ExamCourse.insertMany(examCourses);

        // Get unique categories with their colors and difficulties
        const uniqueCategories = categories.map(c => ({
            name: c.name,
            color: c.color,
            difficulty: c.difficulty
        }));

        res.status(201).json({
            success: true,
            data: {
                categories: uniqueCategories,
                coursesCreated: createdCourses.length,
                coursesDeleted: deleteResult.deletedCount,
            },
            message: `${createdCourses.length} cours créés avec ${uniqueCategories.length} catégories`,
        });
    }),
};

// Helper function to parse question numbers like "1-5,7,10-12"
function parseQuestionNumbers(str) {
    if (!str) return [];
    const result = [];
    const parts = str.split(",");

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes("-")) {
            const [start, end] = trimmed.split("-").map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    result.push(i);
                }
            }
        } else {
            const num = parseInt(trimmed);
            if (!isNaN(num)) {
                result.push(num);
            }
        }
    }

    return [...new Set(result)].sort((a, b) => a - b);
}
