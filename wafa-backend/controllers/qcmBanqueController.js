import QCMBanque from "../models/qcmBanqueModel.js";
import asyncHandler from '../handlers/asyncHandler.js';
import QuestionModel from "../models/questionModule.js";
import { getAnsweredCountByExam } from "../utils/answerProgress.js";

export const qcmBanqueController = {
    create: asyncHandler(async (req, res) => {
        const { name, moduleId, imageUrl, infoText } = req.body;
        const newQCM = await QCMBanque.create({
            name,
            moduleId,
            imageUrl,
            infoText
        });
        res.status(201).json({
            success: true,
            data: newQCM
        });
    }),

    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, moduleId, imageUrl, infoText } = req.body;
        const updatedQCM = await QCMBanque.findByIdAndUpdate(
            id,
            { name, moduleId, imageUrl, infoText },
            { new: true }
        );
        if (!updatedQCM) {
            return res.status(404).json({
                success: false,
                message: "QCM Banque not found"
            });
        }
        res.status(200).json({
            success: true,
            data: updatedQCM
        });
    }),

    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const deletedQCM = await QCMBanque.findByIdAndDelete(id);
        if (!deletedQCM) {
            return res.status(404).json({
                success: false,
                message: "QCM Banque not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "QCM Banque deleted successfully",
            data: deletedQCM
        });
    }),

    getAll: asyncHandler(async (req, res) => {
        const qcmList = await QCMBanque.find()
            .select('name moduleId imageUrl infoText')
            .populate('moduleId', 'name color')
            .lean();
        const qcmIds = qcmList.map(q => q._id);

        // Use aggregation to count questions efficiently
        const questionCounts = await QuestionModel.aggregate([
            { $match: { qcmBanqueId: { $in: qcmIds } } },
            { $group: { _id: '$qcmBanqueId', count: { $sum: 1 } } }
        ]);
        
        // Create a map for quick lookup
        const countMap = {};
        questionCounts.forEach(item => {
            countMap[item._id.toString()] = item.count;
        });

        // Attach question count and moduleName to each QCM
        const qcmWithQuestions = qcmList.map(qcm => ({
            ...qcm,
            moduleName: typeof qcm.moduleId === 'object' && qcm.moduleId !== null ? qcm.moduleId.name : undefined,
            moduleColor: typeof qcm.moduleId === 'object' && qcm.moduleId !== null ? qcm.moduleId.color : '#6366f1',
            totalQuestions: countMap[qcm._id.toString()] || 0
        }));

        res.status(200).json({
            success: true,
            data: qcmWithQuestions
        });
    }),

    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const qcm = await QCMBanque.findById(id).populate('moduleId', 'name color').lean();
        if (!qcm) {
            return res.status(404).json({
                success: false,
                message: "QCM Banque not found"
            });
        }

        const questions = await QuestionModel.find({ qcmBanqueId: id })
            .sort({ questionNumber: 1, createdAt: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: {
                ...qcm,
                moduleName: typeof qcm.moduleId === 'object' && qcm.moduleId !== null ? qcm.moduleId.name : undefined,
                moduleColor: typeof qcm.moduleId === 'object' && qcm.moduleId !== null ? qcm.moduleId.color : undefined,
                totalQuestions: questions.length,
                questions
            }
        });
    }),

    // Get all QCM banques for a specific module
    getByModuleId: asyncHandler(async (req, res) => {
        const { moduleId } = req.params;
        
        const qcmList = await QCMBanque.find({ moduleId })
            .select('name moduleId imageUrl infoText')
            .populate('moduleId', 'name')
            .lean();
        const qcmIds = qcmList.map(q => q._id);

        const questionCounts = qcmIds.length
            ? await QuestionModel.aggregate([
                { $match: { qcmBanqueId: { $in: qcmIds } } },
                { $group: { _id: '$qcmBanqueId', count: { $sum: 1 } } }
            ])
            : [];

        const questionsByQCM = {};
        questionCounts.forEach(({ _id, count }) => {
            questionsByQCM[_id.toString()] = count;
        });

        const answeredCountByExam = await getAnsweredCountByExam(req.user?._id);

        // Attach question count to each QCM
        const qcmWithCounts = qcmList.map(qcm => ({
            ...qcm,
            moduleName: typeof qcm.moduleId === 'object' && qcm.moduleId !== null ? qcm.moduleId.name : undefined,
            questionCount: questionsByQCM[qcm._id.toString()] || 0,
            answeredQuestions: answeredCountByExam[qcm._id.toString()] || 0
        }));

        res.status(200).json({
            success: true,
            data: qcmWithCounts
        });
    })
};
