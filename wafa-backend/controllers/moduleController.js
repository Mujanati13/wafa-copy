import asyncHandler from "../handlers/asyncHandler.js"
import moduleSchema from "../models/moduleModel.js";

import examParYearModel from "../models/examParYearModel.js";
import questionModule from "../models/questionModule.js";
import UserStats from "../models/userStatsModel.js";
import examCourseModel from "../models/examCourseModel.js";
import qcmBanqueModel from "../models/qcmBanqueModel.js";
import { buildModulePayload, ModulePayloadError } from "../utils/modulePayload.js";
import { questionLogicalKey, uniqueQuestionsByLogicalKey } from "../utils/questionIdentity.js";
import {
    CategoryLabelsError,
    DEFAULT_CATEGORY_LABELS,
    validateCategoryLabelPatch,
} from "../utils/categoryLabels.js";

const sendModulePayloadError = (res, error) => res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: { [error.field]: error.message }
});

const MODULE_LIST_CACHE_TTL_MS = 60 * 1000;
let moduleListCache = null;
let moduleListCacheExpiresAt = 0;

export const invalidateModuleListCache = () => {
    moduleListCache = null;
    moduleListCacheExpiresAt = 0;
};

export const moduleController = {
    updateCategoryLabels: asyncHandler(async (req, res) => {
        const { id } = req.params;
        let labels;

        try {
            labels = validateCategoryLabelPatch(req.body?.labels);
        } catch (error) {
            if (error instanceof CategoryLabelsError) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    errors: { labels: error.message },
                });
            }
            throw error;
        }

        const module = await moduleSchema.findById(id);
        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module non trouvé",
            });
        }

        const currentLabels = module.categoryLabels?.toObject?.()
            || module.categoryLabels
            || DEFAULT_CATEGORY_LABELS;
        module.categoryLabels = {
            ...DEFAULT_CATEGORY_LABELS,
            ...currentLabels,
            ...labels,
        };
        await module.save();
        invalidateModuleListCache();

        return res.status(200).json({
            success: true,
            data: {
                moduleId: module._id,
                categoryLabels: module.categoryLabels,
            },
            message: "Libellé de catégorie mis à jour avec succès",
        });
    }),

    create: asyncHandler(async (req, res) => {
        let createData;
        try {
            createData = buildModulePayload(req.body, { partial: false });
        } catch (error) {
            if (error instanceof ModulePayloadError) return sendModulePayloadError(res, error);
            throw error;
        }

        const newModule = await moduleSchema.create(createData);
        invalidateModuleListCache();
        res.status(201).json({
            success: true,
            data: newModule
        });
    }),

    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        let updateData;
        try {
            updateData = buildModulePayload(req.body, { partial: true });
        } catch (error) {
            if (error instanceof ModulePayloadError) return sendModulePayloadError(res, error);
            throw error;
        }

        const existingModule = await moduleSchema.findById(id);
        if (!existingModule) {
            return res.status(404).json({
                success: false,
                message: "Module not found"
            });
        }

        const finalAvailable = updateData.availableInAllSemesters ?? existingModule.availableInAllSemesters;
        const finalSemester = updateData.semester ?? existingModule.semester;
        if (!finalAvailable && !finalSemester) {
            return res.status(422).json({
                success: false,
                message: "Un semestre est requis lorsque le module n'est pas disponible pour tous les semestres.",
                errors: { semester: "Un semestre est requis lorsque le module n'est pas disponible pour tous les semestres." }
            });
        }

        existingModule.set(updateData);
        const updatedModule = await existingModule.save();

        invalidateModuleListCache();

        res.status(200).json({
            success: true,
            data: updatedModule
        });
    }),

    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const deletedModule = await moduleSchema.findByIdAndDelete(id);

        if (!deletedModule) {
            return res.status(404).json({
                success: false,
                message: "Module not found"
            });
        }

        invalidateModuleListCache();

        res.status(200).json({
            success: true,
            message: "Module deleted successfully"
        });
    }),

    getAll: asyncHandler(async (req, res) => {
        const includeQuestions = req.query.includeQuestions === "true";
        const now = Date.now();
        if (!includeQuestions && moduleListCache && now < moduleListCacheExpiresAt) {
            res.set('Cache-Control', 'private, no-cache');
            return res.status(200).json(moduleListCache);
        }

        // AI context data is only needed by the dedicated AI configuration endpoint.
        const modules = await moduleSchema.find({})
            .select('-aiContextFiles -aiPrompt')
            .sort({ semester: 1, order: 1, _id: 1 })
            .lean();

        // A module total is the number of distinct question documents from its
        // active yearly exams, QCM banks and course-owned questions.
        const moduleIds = modules.map(m => m._id);
        const [examParYears, qcmBanques, examCourses] = await Promise.all([
            examParYearModel.find({ moduleId: { $in: moduleIds } })
                .select('name moduleId year imageUrl infoText courseCategoryId')
                .lean(),
            qcmBanqueModel.find({ moduleId: { $in: moduleIds } })
                .select('_id moduleId')
                .lean(),
            examCourseModel.find({ moduleId: { $in: moduleIds }, status: { $ne: "archived" } })
                .select('_id moduleId')
                .lean(),
        ]);

        const allExamParYearIds = examParYears.map(epy => epy._id);
        const allQcmBanqueIds = qcmBanques.map(qcm => qcm._id);
        const allExamCourseIds = examCourses.map(course => course._id);
        const questionSourceFilters = [
            ...(allExamParYearIds.length ? [{ examId: { $in: allExamParYearIds } }] : []),
            ...(allQcmBanqueIds.length ? [{ qcmBanqueId: { $in: allQcmBanqueIds } }] : []),
            ...(allExamCourseIds.length ? [{ examCourseId: { $in: allExamCourseIds } }] : []),
        ];
        const questionData = questionSourceFilters.length === 0
            ? []
            : includeQuestions
                ? await questionModule.find({ $or: questionSourceFilters }).lean()
                : await questionModule.aggregate([
                    { $match: { $or: questionSourceFilters } },
                    { $project: { _id: 1, examId: 1, qcmBanqueId: 1, examCourseId: 1, sessionLabel: 1, questionNumber: 1 } },
                ]);

        // Build source ID -> module ID maps. A question is counted once, even
        // when historical data mistakenly stores more than one source field.
        const examIdToModuleId = {};
        examParYears.forEach(epy => {
            examIdToModuleId[epy._id.toString()] = epy.moduleId.toString();
        });
        const qcmIdToModuleId = {};
        qcmBanques.forEach(qcm => {
            qcmIdToModuleId[qcm._id.toString()] = qcm.moduleId.toString();
        });
        const courseIdToModuleId = {};
        examCourses.forEach(course => {
            courseIdToModuleId[course._id.toString()] = course.moduleId.toString();
        });

        // Group exams by moduleId
        const moduleIdToExams = {};
        examParYears.forEach(epy => {
            const moduleId = epy.moduleId.toString();
            if (!moduleIdToExams[moduleId]) moduleIdToExams[moduleId] = [];
            moduleIdToExams[moduleId].push(epy);
        });

        const moduleIdToQuestionIds = {};
        const moduleIdToQuestions = includeQuestions ? {} : null;
        questionData.forEach(question => {
            const moduleId = examIdToModuleId[question.examId?.toString()]
                || qcmIdToModuleId[question.qcmBanqueId?.toString()]
                || courseIdToModuleId[question.examCourseId?.toString()];
            if (!moduleId) return;
            if (!moduleIdToQuestionIds[moduleId]) moduleIdToQuestionIds[moduleId] = new Set();
            const logicalQuestionId = questionLogicalKey(question);
            if (moduleIdToQuestionIds[moduleId].has(logicalQuestionId)) return;
            moduleIdToQuestionIds[moduleId].add(logicalQuestionId);
            if (includeQuestions) {
                if (!moduleIdToQuestions[moduleId]) moduleIdToQuestions[moduleId] = [];
                moduleIdToQuestions[moduleId].push(question);
            }
        });

        // Attach question count to each module
        const modulesWithRelations = modules.map(m => {
            const moduleId = m._id.toString();
            return {
                ...m,
                totalQuestions: moduleIdToQuestionIds[moduleId]?.size || 0,
                exams: moduleIdToExams[moduleId] || [],
                ...(includeQuestions ? { questions: moduleIdToQuestions[moduleId] || [] } : {})
            };
        });

        const payload = {
            success: true,
            count: modulesWithRelations.length,
            data: modulesWithRelations
        };

        if (!includeQuestions) {
            moduleListCache = payload;
            moduleListCacheExpiresAt = Date.now() + MODULE_LIST_CACHE_TTL_MS;
        }
        res.set('Cache-Control', 'private, no-cache');
        res.status(200).json(payload);
    }),

    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Get the module
        const module = await moduleSchema.findById(id).lean();
        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module not found"
            });
        }

        // Count the same active sources as the dashboard so the two views can
        // never disagree about a module total.
        const [examParYears, qcmBanques, examCourses] = await Promise.all([
            examParYearModel.find({ moduleId: id }).select('name year imageUrl infoText').lean(),
            qcmBanqueModel.find({ moduleId: id }).select('_id').lean(),
            examCourseModel.find({ moduleId: id, status: { $ne: "archived" } }).select('_id').lean(),
        ]);
        const examParYearIds = examParYears.map(epy => epy._id);
        const qcmBanqueIds = qcmBanques.map(qcm => qcm._id);
        const examCourseIds = examCourses.map(course => course._id);
        const questionSourceFilters = [
            ...(examParYearIds.length ? [{ examId: { $in: examParYearIds } }] : []),
            ...(qcmBanqueIds.length ? [{ qcmBanqueId: { $in: qcmBanqueIds } }] : []),
            ...(examCourseIds.length ? [{ examCourseId: { $in: examCourseIds } }] : []),
        ];
        const sourceQuestions = questionSourceFilters.length
            ? await questionModule.find({ $or: questionSourceFilters })
                .select("_id examId qcmBanqueId examCourseId sessionLabel questionNumber")
                .sort({ createdAt: -1, _id: -1 })
                .lean()
            : [];
        const questionCount = uniqueQuestionsByLogicalKey(sourceQuestions).length;

        res.status(200).json({
            success: true,
            data: {
                ...module,
                exams: examParYears,
                totalQuestions: questionCount
            }
        });
    }),

    // Get module stats for current user
    getUserModuleStats: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user._id;

        const [module, examParYears, examCourses, qcmBanques, userStats] = await Promise.all([
            moduleSchema.findById(id).select("name").lean(),
            examParYearModel.find({ moduleId: id }).select("_id").lean(),
            examCourseModel.find({ moduleId: id, status: { $ne: "archived" } }).select("_id").lean(),
            qcmBanqueModel.find({ moduleId: id }).select("_id").lean(),
            UserStats.findOne({ userId }).select("answeredQuestions").lean()
        ]);

        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module not found"
            });
        }

        const yearExamIds = examParYears.map(exam => exam._id);
        const qcmIds = qcmBanques.map(qcm => qcm._id);
        const courseIds = examCourses.map(course => course._id);

        // Use source membership, rather than cached course links, so orphaned
        // questions cannot alter a learner's total after an exam is replaced.
        const sourceQuestions = await questionModule.find({
            $or: [
                { examId: { $in: yearExamIds } },
                { qcmBanqueId: { $in: qcmIds } },
                { examCourseId: { $in: courseIds } }
            ]
        }).select("_id examId qcmBanqueId examCourseId sessionLabel questionNumber").sort({ createdAt: -1, _id: -1 }).lean();
        const questions = uniqueQuestionsByLogicalKey(sourceQuestions);
        
        const totalQuestions = questions.length;

        let questionsAnswered = 0;
        let percentage = 0;

        if (userStats && userStats.answeredQuestions) {
            const answeredQuestionIds = new Set(
                userStats.answeredQuestions instanceof Map
                    ? userStats.answeredQuestions.keys()
                    : Object.keys(userStats.answeredQuestions)
            );

            questionsAnswered = questions.reduce(
                (count, question) => count + (answeredQuestionIds.has(question._id.toString()) ? 1 : 0),
                0
            );

            // Calculate percentage
            if (totalQuestions > 0) {
                percentage = Math.round((questionsAnswered / totalQuestions) * 100);
            }
        }

        res.status(200).json({
            success: true,
            data: {
                moduleId: id,
                moduleName: module.name,
                totalQuestions,
                questionsAnswered,
                percentage
            }
        });
    }),

    // Upload AI context files to a module
    uploadAiContextFiles: asyncHandler(async (req, res) => {
        const { id } = req.params; // module ID
        
        const module = await moduleSchema.findById(id);
        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module non trouvé"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Aucun fichier fourni"
            });
        }

        // Process uploaded files
        const newFiles = req.files.map(file => ({
            filename: file.originalname,
            url: `/uploads/ai-context/${file.filename}`,
            size: file.size,
            uploadedAt: new Date(),
            uploadedBy: req.user?._id
        }));

        // Add to module's aiContextFiles array
        module.aiContextFiles = [...(module.aiContextFiles || []), ...newFiles];
        await module.save();

        res.status(200).json({
            success: true,
            message: `${newFiles.length} fichier(s) ajouté(s) avec succès`,
            data: {
                moduleId: module._id,
                aiContextFiles: module.aiContextFiles
            }
        });
    }),

    // Get AI context files for a module
    getAiContextFiles: asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        const module = await moduleSchema.findById(id).select('aiContextFiles name').lean();
        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                moduleId: module._id,
                moduleName: module.name,
                aiContextFiles: module.aiContextFiles || []
            }
        });
    }),

    // Delete an AI context file from a module
    deleteAiContextFile: asyncHandler(async (req, res) => {
        const { id, fileId } = req.params; // module ID and file _id
        
        const module = await moduleSchema.findById(id);
        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module non trouvé"
            });
        }

        // Find and remove the file from the array
        const fileIndex = module.aiContextFiles.findIndex(
            f => f._id.toString() === fileId
        );

        if (fileIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Fichier non trouvé"
            });
        }

        // Get file info before removing
        const fileToDelete = module.aiContextFiles[fileIndex];
        
        // Remove from array
        module.aiContextFiles.splice(fileIndex, 1);
        await module.save();

        // Optionally delete the physical file from disk
        try {
            const fs = await import('fs');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'uploads', 'ai-context', path.basename(fileToDelete.url));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Error deleting physical file:', error);
            // Continue even if physical file deletion fails
        }

        res.status(200).json({
            success: true,
            message: "Fichier supprimé avec succès",
            data: {
                moduleId: module._id,
                deletedFile: fileToDelete,
                remainingFiles: module.aiContextFiles
            }
        });
    }),

    // Update module AI prompt
    updateAiPrompt: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { aiPrompt } = req.body;

        const module = await moduleSchema.findById(id);

        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module non trouvé"
            });
        }

        module.aiPrompt = aiPrompt || "";
        await module.save();

        res.status(200).json({
            success: true,
            message: "Prompt IA mis à jour avec succès",
            data: {
                moduleId: module._id,
                aiPrompt: module.aiPrompt
            }
        });
    }),

    // Get module AI configuration (prompt + context files)
    getAiConfig: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const module = await moduleSchema.findById(id).select('name aiPrompt aiContextFiles');

        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                moduleId: module._id,
                moduleName: module.name,
                aiPrompt: module.aiPrompt || "",
                aiContextFiles: module.aiContextFiles || []
            }
        });
    })
};
