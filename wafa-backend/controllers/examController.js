import examModel from "../models/examParYearModel.js";
import ExamCoverSettings from "../models/examCoverSettingsModel.js";
import asyncHandler from '../handlers/asyncHandler.js';
import QuestionModel from "../models/questionModule.js";
import { sortGroupedQuestions } from "../utils/examSessionSort.js";
import { NotificationController } from "./notificationController.js";
import { getAnsweredCountByExam } from "../utils/answerProgress.js";

export const examController = {
    create: asyncHandler(async (req, res) => {

        const { name, moduleId, year, imageUrl, infoText, courseCategoryId } = req.body;
        const globalCover = imageUrl
            ? null
            : await ExamCoverSettings.findOne({ key: "global" }).select("imageUrl").lean();
        
        const newExam = await examModel.create({
            name,
            moduleId,
            year,
            imageUrl: imageUrl || globalCover?.imageUrl || "",
            infoText,
            courseCategoryId: courseCategoryId || null
        });
        res.status(201).json({
            success: true,
            data: newExam
        });

    }),

    getGlobalCover: asyncHandler(async (req, res) => {
        const settings = await ExamCoverSettings.findOne({ key: "global" })
            .select("imageUrl updatedAt")
            .lean();

        res.status(200).json({
            success: true,
            data: settings || { imageUrl: "", updatedAt: null }
        });
    }),

    updateGlobalCover: asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Veuillez sélectionner une image valide."
            });
        }

        const imageUrl = `/uploads/exams/${req.file.filename}`;
        const updateResult = await examModel.updateMany({}, { $set: { imageUrl } });

        await ExamCoverSettings.findOneAndUpdate(
            { key: "global" },
            {
                $set: {
                    imageUrl,
                    updatedBy: req.user?._id || null,
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({
            success: true,
            message: "L’image globale des examens a été mise à jour.",
            data: {
                imageUrl,
                matchedCount: updateResult.matchedCount,
                modifiedCount: updateResult.modifiedCount,
            }
        });
    }),

    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, moduleId, year, imageUrl, infoText, courseCategoryId } = req.body;
        
        const updatedExam = await examModel.findByIdAndUpdate(
            id,
            {
                name,
                moduleId,
                year,
                imageUrl,
                infoText,
                courseCategoryId: courseCategoryId || null
            },
            { new: true }
        );
        if (!updatedExam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found"
            });
        }
        res.status(200).json({
            success: true,
            data: updatedExam
        });
    }),

    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const deletedExam = await examModel.findByIdAndDelete(id);
        if (!deletedExam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Exam deleted successfully",
            data: deletedExam
        });
    }),
    getAll: asyncHandler(async (req, res) => {
        // Get all exams and populate related module name and color
        const exams = await examModel.find()
            .select('name moduleId year imageUrl infoText courseCategoryId')
            .populate('moduleId', 'name color')
            .lean();
        
        // For each exam, count questions instead of fetching all (much faster)
        const examIds = exams.map(e => e._id);
        
        // Use aggregation to count questions per exam efficiently
        const questionCounts = await QuestionModel.aggregate([
            { $match: { examId: { $in: examIds } } },
            { $group: { _id: '$examId', count: { $sum: 1 } } }
        ]);
        
        // Create a map for quick lookup
        const countMap = {};
        questionCounts.forEach(item => {
            countMap[item._id.toString()] = item.count;
        });

        // Attach question count and moduleName to each exam
        const examsWithQuestions = exams.map(exam => ({
            ...exam,
            moduleName: typeof exam.moduleId === 'object' && exam.moduleId !== null ? exam.moduleId.name : undefined,
            moduleColor: typeof exam.moduleId === 'object' && exam.moduleId !== null ? exam.moduleId.color : '#6366f1',
            courseCategoryId: exam.courseCategoryId || null,
            totalQuestions: countMap[exam._id.toString()] || 0
        }));

        res.status(200).json({
            success: true,
            data: examsWithQuestions
        });
    }),
    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Find exam
        const exam = await examModel.findById(id).populate('moduleId', 'name color').lean();
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found"
            });
        }

        // Get questions related to this exam, sorted by questionNumber then by createdAt
        const questions = await QuestionModel.find({ examId: id })
            .sort({ questionNumber: 1, createdAt: 1 })
            .lean();

        // Build default session name from exam name and year
        const defaultSessionName = exam.name || (exam.year ? `Exam ${exam.year}` : "Session principale");

        // Group questions by session.label
        const groupedQuestions = questions.reduce((acc, q) => {
            const session = q.sessionLabel || defaultSessionName; // fallback to exam name/year
            if (!acc[session]) acc[session] = [];
            acc[session].push(q);
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                ...exam,
                moduleName:
                    typeof exam.moduleId === 'object' && exam.moduleId !== null
                        ? exam.moduleId.name
                        : undefined,
                moduleColor:
                    typeof exam.moduleId === 'object' && exam.moduleId !== null
                        ? exam.moduleId.color
                        : '#6366f1',
                totalQuestions: questions.length,
                questions: sortGroupedQuestions(groupedQuestions),
            }
        });
    }),

    // Get exams by module ID
    getByModuleId: asyncHandler(async (req, res) => {
        const { moduleId } = req.params;

        const exams = await examModel.find({ moduleId })
            .select('name moduleId year imageUrl infoText courseCategoryId')
            .populate('moduleId', 'name color')
            .lean();

        // Get question counts for each exam
        const examIds = exams.map(e => e._id);
        const questionCounts = examIds.length
            ? await QuestionModel.aggregate([
                { $match: { examId: { $in: examIds } } },
                { $group: { _id: '$examId', count: { $sum: 1 } } }
            ])
            : [];

        const questionCountByExam = {};
        questionCounts.forEach(({ _id, count }) => {
            questionCountByExam[_id.toString()] = count;
        });

        const answeredCountByExam = await getAnsweredCountByExam(req.user?._id);

        const examsWithCounts = exams.map(exam => ({
            ...exam,
            moduleName: typeof exam.moduleId === 'object' && exam.moduleId !== null ? exam.moduleId.name : undefined,
            moduleColor: typeof exam.moduleId === 'object' && exam.moduleId !== null ? exam.moduleId.color : '#6366f1',
            questionCount: questionCountByExam[exam._id.toString()] || 0,
            answeredQuestions: answeredCountByExam[exam._id.toString()] || 0
        }));

        res.status(200).json({
            success: true,
            data: examsWithCounts
        });
    }),

    // Record exam completion and send notification
    completeExam: asyncHandler(async (req, res) => {
        const { examId, userId, score, totalQuestions } = req.body;

        if (!examId || !userId || score === undefined) {
            return res.status(400).json({
                success: false,
                message: "Exam ID, User ID, and Score are required"
            });
        }

        const exam = await examModel.findById(examId).populate('moduleId', 'name');
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found"
            });
        }

        // Create notification for exam completion
        try {
            const percentage = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
            await NotificationController.createNotification(
                userId,
                "exam_result",
                "Résultat d'examen disponible",
                `Votre résultat pour l'examen ${exam.name} est maintenant disponible. Score: ${percentage}%`,
                "/dashboard/results"
            );
        } catch (error) {
            console.error("Error creating exam notification:", error);
        }

        res.status(200).json({
            success: true,
            message: "Exam completed and notification sent"
        });
    })

};
