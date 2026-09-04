import asyncHandler from "../handlers/asyncHandler.js";
import QuestionModel from "../models/questionModule.js";
import ExamParYear from "../models/examParYearModel.js";
import QCMBanque from "../models/qcmBanqueModel.js";
import UserModel from "../models/userModel.js";
import PointModel from "../models/pointModel.js";
import xlsx from "xlsx";
import { normalizeQuestionImages } from "../utils/questionImagePath.js";
import { buildAnsweredCountByExam } from "../utils/answerProgress.js";
import { normalizeUserPlan } from "../utils/planAccess.js";

export const questionController = {
    create: asyncHandler(async (req, res) => {
        const { examId, text, options, note, images, sessionLabel } = req.body;
        const newQuestion = await QuestionModel.create({
            examId,
            text,
            options,
            note,
            images: normalizeQuestionImages(images),
            sessionLabel
        });
        res.status(201).json({ success: true, data: newQuestion });
    }),

    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { examId, text, options, note, images, sessionLabel, questionNumber } = req.body;
        
        const updateData = { text, options, note };
        if (images !== undefined) updateData.images = normalizeQuestionImages(images);
        if (examId) updateData.examId = examId;
        if (sessionLabel !== undefined) updateData.sessionLabel = sessionLabel;
        if (questionNumber !== undefined) updateData.questionNumber = questionNumber;
        
        const updated = await QuestionModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }
        res.status(200).json({ success: true, data: updated });
    }),

    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const deleted = await QuestionModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }
        res.status(200).json({ success: true, message: "Question deleted successfully", data: deleted });
    }),

    getAll: asyncHandler(async (req, res) => {
        const { moduleId, moduleIds, examType } = req.query;
        
        let filter = {};
        
        // Build filter based on query params
        if (moduleId || (moduleIds && moduleIds.length > 0)) {
            // Get exams for the specified module(s)
            const moduleFilter = moduleId ? { moduleId } : { moduleId: { $in: moduleIds } };
            const exams = await ExamParYear.find(moduleFilter).select('_id');
            const qcms = await QCMBanque.find(moduleFilter).select('_id');
            
            const examIds = exams.map(e => e._id);
            const qcmIds = qcms.map(q => q._id);
            
            filter.$or = [
                { examId: { $in: examIds } },
                { qcmBanqueId: { $in: qcmIds } }
            ];
        }
        
        const questions = await QuestionModel.find(filter)
            .populate({
                path: 'examId',
                select: 'name year moduleId',
                populate: { path: 'moduleId', select: 'name semester' }
            })
            .populate({
                path: 'qcmBanqueId',
                select: 'name moduleId',
                populate: { path: 'moduleId', select: 'name semester' }
            })
            .sort({ createdAt: -1 });
            
        res.status(200).json({ success: true, data: questions });
    }),

    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const question = await QuestionModel.findById(id);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }
        if (normalizeUserPlan(req.user?.plan) === "Free" && !req.user?.isAdmin && question.examId?.toString() !== req.user.freeExam?.toString()) {
            return res.status(403).json({
                success: false,
                code: "FREE_PLAN_EXAM_LIMIT",
                message: "The free plan includes questions from one selected exam only."
            });
        }
        res.status(200).json({ success: true, data: question });
    }),

    getByExamId: asyncHandler(async (req, res) => {
        const { examId } = req.params;
        const questions = await QuestionModel.find({ 
            $or: [{ examId }, { qcmBanqueId: examId }] 
        })
            .populate({
                path: 'examId',
                select: 'name year moduleId',
                populate: { path: 'moduleId', select: 'name semester' }
            })
            .populate({
                path: 'qcmBanqueId',
                select: 'name moduleId',
                populate: { path: 'moduleId', select: 'name semester' }
            })
            .sort({ questionNumber: 1, createdAt: 1 });
        res.status(200).json({ success: true, data: questions });
    }),

    getByModuleId: asyncHandler(async (req, res) => {
        const { moduleId } = req.params;

        if (normalizeUserPlan(req.user?.plan) === "Free" && !req.user?.isAdmin && req.user.freeModule?.toString() !== moduleId) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Get all exams for this module
        const ExamParYear = (await import('../models/examParYearModel.js')).default;
        const ExamCourse = (await import('../models/examCourseModel.js')).default;
        const QcmBanque = (await import('../models/qcmBanqueModel.js')).default;

        const [examsByYear, examsByCourse, qcmBanques] = await Promise.all([
            ExamParYear.find({ moduleId }).select('_id').lean(),
            ExamCourse.find({ moduleId }).select('_id').lean(),
            QcmBanque.find({ moduleId }).select('_id').lean()
        ]);

        const examIds = [
            ...examsByYear.map(e => e._id),
            ...examsByCourse.map(e => e._id),
            ...qcmBanques.map(e => e._id)
        ];

        if (examIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Get all questions from these exams
        const questionFilter = {
            $or: [
                { examId: { $in: examIds } },
                { qcmBanqueId: { $in: examIds } }
            ]
        };

        if (normalizeUserPlan(req.user?.plan) === "Free" && !req.user?.isAdmin) {
            questionFilter.$or = req.user.freeExam ? [{ examId: req.user.freeExam }] : [];
        }

        const questions = await QuestionModel.find(questionFilter)
            .select('text options note images sessionLabel questionNumber examId qcmBanqueId')
            .lean()
            .sort({ questionNumber: 1, createdAt: 1 });
        
        res.status(200).json({ success: true, data: questions });
    }),

    // Get questions with advanced filters (module, exam type, category, course name)
    getFiltered: asyncHandler(async (req, res) => {
        const { moduleId, examType, category, courseName, page = 1, limit = 50 } = req.query;

        // Build filter for exams first
        const examFilter = {};
        if (moduleId) examFilter.moduleId = moduleId;
        if (category) examFilter.category = category;
        if (courseName) examFilter.courseName = courseName;

        // Get matching exam IDs
        const exams = await ExamParYear.find(examFilter).select('_id');
        const examIds = exams.map(e => e._id);

        // Get questions for those exams
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const questions = await QuestionModel.find({ examId: { $in: examIds } })
            .populate({
                path: 'examId',
                select: 'name moduleId category courseName year',
                populate: { path: 'moduleId', select: 'name semester' }
            })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await QuestionModel.countDocuments({ examId: { $in: examIds } });

        res.status(200).json({
            success: true,
            data: questions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    }),

    // Bulk delete questions by exam ID or filter
    bulkDelete: asyncHandler(async (req, res) => {
        const { examId, questionIds, moduleId, courseName } = req.body;

        let deleteFilter = {};
        let deletedCount = 0;

        if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
            // Delete specific questions by IDs
            const result = await QuestionModel.deleteMany({ _id: { $in: questionIds } });
            deletedCount = result.deletedCount;
        } else if (examId) {
            // Delete all questions for a specific exam
            const result = await QuestionModel.deleteMany({ examId });
            deletedCount = result.deletedCount;
        } else if (moduleId || courseName) {
            // Delete questions by module or course
            const examFilter = {};
            if (moduleId) examFilter.moduleId = moduleId;
            if (courseName) examFilter.courseName = courseName;

            const exams = await ExamParYear.find(examFilter).select('_id');
            const examIds = exams.map(e => e._id);

            const result = await QuestionModel.deleteMany({ examId: { $in: examIds } });
            deletedCount = result.deletedCount;
        } else {
            return res.status(400).json({
                success: false,
                message: "Veuillez spécifier examId, questionIds, moduleId ou courseName"
            });
        }

        res.status(200).json({
            success: true,
            message: `${deletedCount} question(s) supprimée(s) avec succès`,
            deletedCount
        });
    }),

    // Export questions to Excel format (JSON for frontend to convert)
    exportToExcel: asyncHandler(async (req, res) => {
        const { examId, moduleId, courseName, category } = req.query;

        let filter = {};

        if (examId) {
            filter.examId = examId;
        } else if (moduleId || courseName || category) {
            const examFilter = {};
            if (moduleId) examFilter.moduleId = moduleId;
            if (category) examFilter.category = category;
            if (courseName) examFilter.courseName = courseName;

            const exams = await ExamParYear.find(examFilter).select('_id');
            const examIds = exams.map(e => e._id);
            filter.examId = { $in: examIds };
        }

        const questions = await QuestionModel.find(filter)
            .populate({
                path: 'examId',
                select: 'name moduleId category courseName year',
                populate: { path: 'moduleId', select: 'name semester' }
            })
            .lean();

        // Format data for Excel export
        const exportData = questions.map((q, index) => ({
            'N°': index + 1,
            'Module': q.examId?.moduleId?.name || '',
            'Semestre': q.examId?.moduleId?.semester || '',
            'Examen': q.examId?.name || '',
            'Catégorie': q.examId?.category || '',
            'Cours': q.examId?.courseName || '',
            'Année': q.examId?.year || '',
            'Session': q.sessionLabel || '',
            'Question': q.text || '',
            'Option A': q.options?.[0]?.text || '',
            'Option A Correcte': q.options?.[0]?.isCorrect ? 'Oui' : 'Non',
            'Option B': q.options?.[1]?.text || '',
            'Option B Correcte': q.options?.[1]?.isCorrect ? 'Oui' : 'Non',
            'Option C': q.options?.[2]?.text || '',
            'Option C Correcte': q.options?.[2]?.isCorrect ? 'Oui' : 'Non',
            'Option D': q.options?.[3]?.text || '',
            'Option D Correcte': q.options?.[3]?.isCorrect ? 'Oui' : 'Non',
            'Option E': q.options?.[4]?.text || '',
            'Option E Correcte': q.options?.[4]?.isCorrect ? 'Oui' : 'Non',
            'Note': q.note || '',
            'Images': q.images?.join(', ') || ''
        }));

        res.status(200).json({
            success: true,
            data: exportData,
            count: exportData.length,
            filename: `questions_export_${new Date().toISOString().split('T')[0]}.xlsx`
        });
    }),

    // Upload images to Cloudinary and return URLs
    uploadImages: asyncHandler(async (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Aucune image fournie"
            });
        }

        try {
            const uploadedImages = req.files.map(file => ({
                url: `/uploads/questions/${file.filename}`,
                originalName: file.originalname,
                filename: file.filename
            }));

            res.status(200).json({
                success: true,
                message: `${uploadedImages.length} image(s) téléchargée(s) avec succès`,
                data: uploadedImages
            });
        } catch (error) {
            console.error("Error uploading images:", error);
            return res.status(500).json({
                success: false,
                message: "Erreur lors du téléchargement des images: " + (error.message || "Erreur inconnue")
            });
        }
    }),

    // Attach images to questions by question numbers
    attachImagesToQuestions: asyncHandler(async (req, res) => {
        const { examId, qcmBanqueId, imageUrls, questionNumbers } = req.body;

        if ((!examId && !qcmBanqueId) || !imageUrls || !questionNumbers) {
            return res.status(400).json({
                success: false,
                message: "examId ou qcmBanqueId, imageUrls et questionNumbers sont requis"
            });
        }

        // Parse question numbers (e.g., "1-3,5,7-9" => [1,2,3,5,7,8,9])
        const parseNumbers = (str) => {
            const result = [];
            const parts = str.split(',').map(s => s.trim());
            for (const part of parts) {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    for (let i = start; i <= end; i++) {
                        result.push(i);
                    }
                } else {
                    result.push(Number(part));
                }
            }
            return [...new Set(result)].sort((a, b) => a - b);
        };

        const numbers = parseNumbers(questionNumbers);
        const normalizedImageUrls = normalizeQuestionImages(imageUrls);
        if (normalizedImageUrls.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Aucune URL d'image valide fournie"
            });
        }

        // Get questions for this exam or qcm banque, sorted by questionNumber then createdAt
        const filter = examId ? { examId } : { qcmBanqueId };
        const questions = await QuestionModel.find(filter).sort({ questionNumber: 1, createdAt: 1 });

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Aucune question trouvée"
            });
        }

        // Build a map of questionNumber -> question for efficient lookup
        const questionsByNumber = new Map();
        questions.forEach((q, idx) => {
            // Use stored questionNumber if available, otherwise use position (1-indexed)
            const qNum = q.questionNumber || (idx + 1);
            questionsByNumber.set(qNum, q);
        });

        // Attach images to specified questions (1-indexed)
        let updatedCount = 0;
        for (const num of numbers) {
            // First try to find by questionNumber, then fall back to position
            let question = questionsByNumber.get(num);
            if (!question) {
                // Fallback: use array position (0-indexed)
                const index = num - 1;
                if (index >= 0 && index < questions.length) {
                    question = questions[index];
                }
            }
            
            if (question) {
                const currentImages = question.images || [];
                const newImages = normalizeQuestionImages([...currentImages, ...normalizedImageUrls]);

                await QuestionModel.findByIdAndUpdate(question._id, {
                    images: newImages
                });
                updatedCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Images attachées à ${updatedCount} question(s)`,
            updatedCount
        });
    }),

    // Community vote - submit a vote for a question
    submitCommunityVote: asyncHandler(async (req, res) => {
        const { questionId } = req.params;
        const { selectedOptions } = req.body;
        const userId = req.user._id;

        if (!selectedOptions || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Veuillez sélectionner au moins une réponse"
            });
        }

        const question = await QuestionModel.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question non trouvée"
            });
        }

        // Check if user already voted
        const existingVoteIndex = question.communityVotes.findIndex(
            v => v.userId.toString() === userId.toString()
        );

        if (existingVoteIndex !== -1) {
            // Update existing vote
            question.communityVotes[existingVoteIndex].selectedOptions = selectedOptions;
            question.communityVotes[existingVoteIndex].votedAt = new Date();
        } else {
            // Add new vote with weight of 1
            // Weight will be increased to 20 only if/when their explanation for THIS question is approved
            question.communityVotes.push({
                userId,
                selectedOptions,
                hasExplanation: false,
                explanationApproved: false,
                voteWeight: 1, // Always start with 1
                votedAt: new Date()
            });
        }

        // Recalculate vote stats
        // Each user counts as ONE vote (their weight), regardless of how many options they selected
        const optionVotes = {};
        let totalVotes = 0;

        question.communityVotes.forEach(vote => {
            const weight = vote.voteWeight || 1;
            // Add weight once per user (not per selected option)
            totalVotes += weight;
            
            // Distribute the user's vote across their selected options
            vote.selectedOptions.forEach(optIndex => {
                const letter = String.fromCharCode(65 + optIndex);
                optionVotes[letter] = (optionVotes[letter] || 0) + weight;
            });
        });

        question.voteStats = {
            totalVotes,
            optionVotes
        };

        await question.save();

        res.status(200).json({
            success: true,
            message: "Vote enregistré avec succès",
            data: {
                voteStats: question.voteStats,
                userVote: selectedOptions
            }
        });
    }),

    // Get community vote stats for a question
    getCommunityVotes: asyncHandler(async (req, res) => {
        const { questionId } = req.params;
        const userId = req.user?._id;

        const question = await QuestionModel.findById(questionId)
            .select('options communityVotes voteStats text');

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question non trouvée"
            });
        }

        // Find user's vote if exists
        let userVote = null;
        if (userId) {
            const userVoteData = question.communityVotes.find(
                v => v.userId.toString() === userId.toString()
            );
            if (userVoteData) {
                userVote = {
                    selectedOptions: userVoteData.selectedOptions,
                    hasExplanation: userVoteData.hasExplanation,
                    explanationApproved: userVoteData.explanationApproved,
                    voteWeight: userVoteData.voteWeight
                };
            }
        }

        // Calculate correct answer percentage
        let correctVotes = 0;
        const correctIndices = question.options
            .map((opt, i) => opt.isCorrect ? i : -1)
            .filter(i => i !== -1);

        correctIndices.forEach(idx => {
            const letter = String.fromCharCode(65 + idx);
            correctVotes += question.voteStats?.optionVotes?.get?.(letter) || 
                           question.voteStats?.optionVotes?.[letter] || 0;
        });

        const totalVotes = question.voteStats?.totalVotes || 0;
        const correctPercentage = totalVotes > 0 
            ? ((correctVotes / totalVotes) * 100).toFixed(1) 
            : 0;

        res.status(200).json({
            success: true,
            data: {
                questionText: question.text,
                options: question.options,
                voteStats: {
                    totalVotes: question.voteStats?.totalVotes || 0,
                    optionVotes: question.voteStats?.optionVotes || {}
                },
                correctPercentage,
                userVote,
                totalVoters: question.communityVotes.length
            }
        });
    }),

    // Mark that user added explanation (called from explanation controller)
    markVoteWithExplanation: asyncHandler(async (questionId, userId) => {
        const question = await QuestionModel.findById(questionId);
        if (!question) return false;

        const voteIndex = question.communityVotes.findIndex(
            v => v.userId.toString() === userId.toString()
        );

        if (voteIndex !== -1) {
            question.communityVotes[voteIndex].hasExplanation = true;
            await question.save();
            return true;
        }
        return false;
    }),

    // Approve explanation and multiply vote weight (called when explanation is approved)
    approveVoteExplanation: asyncHandler(async (questionId, userId) => {
        const question = await QuestionModel.findById(questionId);
        if (!question) return false;

        const voteIndex = question.communityVotes.findIndex(
            v => v.userId.toString() === userId.toString()
        );

        if (voteIndex !== -1) {
            question.communityVotes[voteIndex].explanationApproved = true;
            question.communityVotes[voteIndex].voteWeight = 20; // Multiply by 20

            // Recalculate vote stats
            // Each user counts as ONE vote (their weight), regardless of how many options they selected
            const optionVotes = {};
            let totalVotes = 0;

            question.communityVotes.forEach(vote => {
                const weight = vote.voteWeight || 1;
                // Add weight once per user (not per selected option)
                totalVotes += weight;
                
                // Distribute the user's vote across their selected options
                vote.selectedOptions.forEach(optIndex => {
                    const letter = String.fromCharCode(65 + optIndex);
                    optionVotes[letter] = (optionVotes[letter] || 0) + weight;
                });
            });

            question.voteStats = {
                totalVotes,
                optionVotes
            };

            await question.save();

            // Award blue point to user
            await PointModel.create({
                userId,
                points: 1,
                type: 'bluePoints',
                reason: 'Explication approuvée pour la communauté',
                questionId
            });

            return true;
        }
        return false;
    }),

    // Import questions from Excel file
    importFromExcel: asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir un fichier Excel"
            });
        }

        const { examId, moduleId, qcmBanqueId, type, sessionName } = req.body;

        // Determine target ID based on type
        let targetId = examId || qcmBanqueId;
        if (!targetId && !moduleId) {
            return res.status(400).json({
                success: false,
                message: "Veuillez spécifier examId, qcmBanqueId ou moduleId"
            });
        }

        try {
            // Parse Excel file from buffer
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

            if (jsonData.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Le fichier Excel est vide"
                });
            }

            const questionsToCreate = [];

            for (const row of jsonData) {
                // Map Excel columns to question fields
                // Expected columns: qst Num, Question, A, B, C, D, answer (correct answer text separated by commas)
                const questionText = row['Question'] || row['question'] || row['Texte'] || row['texte'] || '';
                
                if (!questionText.trim()) continue;

                // Get question number from Excel (qst Num column)
                const qstNum = row['qst Num'] || row['qst num'] || row['Qst Num'] || row['QST NUM'] || 
                               row['N°'] || row['Num'] || row['num'] || row['Number'] || row['number'] || null;
                const questionNumber = qstNum ? parseInt(qstNum, 10) : null;

                // Get answer text(s) - can be comma-separated for multiple correct answers
                const answerText = row['answer'] || row['Answer'] || row['Correct'] || row['correct'] || row['Réponse'] || row['reponse'] || '';
                
                // Check if question is annulled (answer is "null", "nulle", or empty)
                const isAnnulled = !answerText || 
                                   answerText.toString().trim().toLowerCase() === 'null' || 
                                   answerText.toString().trim().toLowerCase() === 'nulle';
                
                // Split answer by comma to get individual correct answers (only if not annulled)
                const correctAnswerTexts = isAnnulled ? [] : answerText.toString().split(',').map(s => s.trim().toLowerCase()).filter(s => s);

                // Parse options from columns A, B, C, D (can also have E)
                const options = [];
                const optionLetters = ['A', 'B', 'C', 'D', 'E'];
                
                for (const letter of optionLetters) {
                    // Try different column name formats
                    let optionText = row[letter] || row[letter.toLowerCase()] || 
                                     row[`Option ${letter}`] || row[`option ${letter}`] || '';
                    
                    if (optionText.toString().trim()) {
                        const optionTextTrimmed = optionText.toString().trim();
                        
                        // Check if this option is correct by comparing text
                        // Support both: matching by letter (A,B,C,D) or by text content
                        // For annulled questions, all options are marked as not correct
                        let isCorrect = false;
                        
                        if (!isAnnulled) {
                            // Check if answer contains letter reference (e.g., "A" or "A,B")
                            const letterBasedAnswers = correctAnswerTexts.filter(a => 
                                optionLetters.map(l => l.toLowerCase()).includes(a.toLowerCase())
                            );
                            
                            if (letterBasedAnswers.length > 0) {
                                // Letter-based matching
                                isCorrect = letterBasedAnswers.includes(letter.toLowerCase());
                            } else {
                                // Text-based matching - check if any correct answer matches this option
                                isCorrect = correctAnswerTexts.some(correctText => 
                                    optionTextTrimmed.toLowerCase().includes(correctText) ||
                                    correctText.includes(optionTextTrimmed.toLowerCase())
                                );
                            }
                        }
                        
                        options.push({
                            text: optionTextTrimmed,
                            isCorrect: isCorrect
                        });
                    }
                }

                if (options.length < 2) continue; // Skip questions with less than 2 options

                const questionData = {
                    text: questionText.trim(),
                    options,
                    sessionLabel: sessionName || row['Session'] || row['session'] || '',
                    note: row['Note'] || row['note'] || '',
                    images: [],
                    isAnnulled: isAnnulled
                };

                // Add question number if provided
                if (questionNumber && !isNaN(questionNumber)) {
                    questionData.questionNumber = questionNumber;
                }

                // Set the appropriate reference based on type
                if (type === 'qcm-banque' && qcmBanqueId) {
                    questionData.qcmBanqueId = qcmBanqueId;
                } else if (examId) {
                    questionData.examId = examId;
                }

                questionsToCreate.push(questionData);
            }

            if (questionsToCreate.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Aucune question valide trouvée dans le fichier"
                });
            }

            // Create all questions
            const createdQuestions = await QuestionModel.insertMany(questionsToCreate);

            res.status(201).json({
                success: true,
                message: `${createdQuestions.length} question(s) importée(s) avec succès`,
                data: {
                    count: createdQuestions.length,
                    questions: createdQuestions
                }
            });
        } catch (error) {
            console.error("Error parsing Excel:", error);
            return res.status(400).json({
                success: false,
                message: "Erreur lors de la lecture du fichier Excel: " + error.message
            });
        }
    }),

    // Assign questions to sub-modules (sessions/categories)
    assignSubModules: asyncHandler(async (req, res) => {
        const { examId, qcmBanqueId, subModules } = req.body;

        if ((!examId && !qcmBanqueId) || !subModules || !Array.isArray(subModules)) {
            return res.status(400).json({
                success: false,
                message: "examId ou qcmBanqueId et subModules sont requis"
            });
        }

        // Parse question numbers helper
        const parseNumbers = (str) => {
            const result = [];
            const parts = str.split(',').map(s => s.trim());
            for (const part of parts) {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    for (let i = start; i <= end; i++) {
                        result.push(i);
                    }
                } else {
                    result.push(Number(part));
                }
            }
            return [...new Set(result)].sort((a, b) => a - b);
        };

        // Get questions for this exam or qcm banque, sorted by questionNumber then createdAt
        const filter = examId ? { examId } : { qcmBanqueId };
        const questions = await QuestionModel.find(filter).sort({ questionNumber: 1, createdAt: 1 });

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Aucune question trouvée"
            });
        }

        // Build a map of questionNumber -> question for efficient lookup
        const questionsByNumber = new Map();
        questions.forEach((q, idx) => {
            // Use stored questionNumber if available, otherwise use position (1-indexed)
            const qNum = q.questionNumber || (idx + 1);
            questionsByNumber.set(qNum, q);
        });

        let updatedCount = 0;

        for (const subModule of subModules) {
            const { name, questionNumbers } = subModule;
            if (!name || !questionNumbers) continue;

            const numbers = parseNumbers(questionNumbers);

            for (const num of numbers) {
                // First try to find by questionNumber, then fall back to position
                let question = questionsByNumber.get(num);
                if (!question) {
                    // Fallback: use array position (0-indexed)
                    const index = num - 1;
                    if (index >= 0 && index < questions.length) {
                        question = questions[index];
                    }
                }
                
                if (question) {
                    await QuestionModel.findByIdAndUpdate(question._id, {
                        sessionLabel: name
                    });
                    updatedCount++;
                }
            }
        }

        res.status(200).json({
            success: true,
            message: `${updatedCount} question(s) assignée(s) aux sous-modules/catégories`,
            updatedCount
        });
    }),

    // Verify question answer and award points
    verifyAnswer: asyncHandler(async (req, res) => {
        const { questionId, selectedAnswers, examId, moduleId, isRetry = false } = req.body;
        const userId = req.user._id;

        if (!questionId || !selectedAnswers || !Array.isArray(selectedAnswers)) {
            return res.status(400).json({
                success: false,
                message: "questionId et selectedAnswers sont requis"
            });
        }

        // Get the question
        const question = await QuestionModel.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question non trouvée"
            });
        }

        // Get correct answer indices
        const correctIndices = question.options
            .map((opt, idx) => opt.isCorrect ? idx : null)
            .filter(idx => idx !== null);

        // Check if answer is correct
        const isCorrect = selectedAnswers.length === correctIndices.length &&
            selectedAnswers.every(ans => correctIndices.includes(ans));

        // Check if user has already answered this question correctly before
        const UserStatsModel = (await import("../models/userStatsModel.js")).default;
        const userStats = await UserStatsModel.findOne({ userId });
        
        const existingAnswer = userStats?.answeredQuestions?.get(questionId.toString());
        const hasAlreadyAnsweredCorrectly = existingAnswer?.isVerified && existingAnswer?.isCorrect;

        // Calculate points
        let pointsAwarded = 0;
        let pointType = "normal";

        if (isRetry) {
            // 0 points for retry (no penalty)
            pointsAwarded = 0;
            pointType = "normal";
        } else if (isCorrect && !hasAlreadyAnsweredCorrectly) {
            // +1 point for correct answer (only if not already answered correctly)
            pointsAwarded = 1;
            pointType = "normal";
        } else if (isCorrect && hasAlreadyAnsweredCorrectly) {
            // Already answered correctly before, no additional points
            pointsAwarded = 0;
        }
        // 0 points for wrong answer (no point record needed)

        // Only create point record if points != 0
        if (pointsAwarded !== 0) {
            await PointModel.create({
                userId,
                type: pointType,
                amount: pointsAwarded,
                questionId,
                moduleId: moduleId || null,
                examId: examId || null,
                description: isRetry 
                    ? "Retry question penalty" 
                    : (isCorrect ? "Correct answer" : ""),
                metadata: {
                    selectedAnswers,
                    correctAnswers: correctIndices,
                    isCorrect,
                    isRetry
                }
            });

            // Update user's total points in UserStatsModel (this is the source of truth)
            const UserStatsModel = (await import("../models/userStatsModel.js")).default;
            await UserStatsModel.findOneAndUpdate(
                { userId },
                { $inc: { totalPoints: pointsAwarded } },
                { upsert: true, new: true }
            );
        }

        // Get updated user stats
        const updatedUserStats = await UserStatsModel.findOne({ userId });

        res.status(200).json({
            success: true,
            data: {
                isCorrect,
                correctAnswers: correctIndices,
                pointsAwarded,
                totalPoints: updatedUserStats?.totalPoints || 0,
                alreadyAnswered: hasAlreadyAnsweredCorrectly
            }
        });
    }),

    // Save user's answer for persistence (without verifying again)
    saveAnswer: asyncHandler(async (req, res) => {
        const { questionId, selectedAnswers, isVerified, isCorrect, examId, moduleId } = req.body;
        const userId = req.user._id;

        console.log('=== SAVE ANSWER ===');
        console.log('User ID:', userId);
        console.log('Question ID:', questionId);
        console.log('Selected answers:', selectedAnswers);
        console.log('Is verified:', isVerified);
        console.log('Exam ID:', examId);
        console.log('Module ID:', moduleId);

        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: "questionId est requis"
            });
        }

        // Store or update user's answer in a separate collection or user stats
        // For now, we'll use the UserStatsModel or create answer records
        const UserStatsModel = (await import("../models/userStatsModel.js")).default;
        
        // Find or create user stats
        let userStats = await UserStatsModel.findOne({ userId });
        if (!userStats) {
            console.log('Creating new user stats');
            userStats = await UserStatsModel.create({
                userId,
                questionsAnswered: 0,
                correctAnswers: 0,
                answeredQuestions: {},
                moduleProgress: []
            });
        }

        // Store the answer
        if (!userStats.answeredQuestions) {
            userStats.answeredQuestions = new Map();
        }
        
        // Check if this question was already answered
        const existingAnswer = userStats.answeredQuestions.get(questionId.toString());
        const isNewAnswer = !existingAnswer || !existingAnswer.isVerified;
        
        // Get module name if moduleId is provided (needed for storage)
        let moduleName = null;
        if (moduleId) {
            const Module = (await import("../models/moduleModel.js")).default;
            const module = await Module.findById(moduleId).select("name");
            moduleName = module?.name || "Unknown";
        }
        
        userStats.answeredQuestions.set(questionId.toString(), {
            selectedAnswers,
            isVerified: isVerified || false,
            isCorrect: isCorrect || false,
            answeredAt: new Date(),
            examId,
            moduleId,
            moduleName
        });

        console.log('Stored answer in Map for question:', questionId.toString());
        console.log('Total questions in Map:', userStats.answeredQuestions.size);

        // Update stats only for NEW verified answers (not re-attempts)
        if (isVerified && isNewAnswer) {
            userStats.questionsAnswered = (userStats.questionsAnswered || 0) + 1;
            userStats.totalQuestionsAttempted = (userStats.totalQuestionsAttempted || 0) + 1;
            
            if (isCorrect) {
                userStats.correctAnswers = (userStats.correctAnswers || 0) + 1;
                userStats.totalCorrectAnswers = (userStats.totalCorrectAnswers || 0) + 1;
                // Points are already handled by verify-answer endpoint (+2 for correct, -1 for retry)
            } else {
                userStats.totalIncorrectAnswers = (userStats.totalIncorrectAnswers || 0) + 1;
            }

            // Update module-specific progress
            if (moduleId) {
                const moduleIndex = userStats.moduleProgress.findIndex(
                    (m) => m.moduleId?.toString() === moduleId.toString()
                );

                if (moduleIndex === -1) {
                    // Add new module progress
                    userStats.moduleProgress.push({
                        moduleId,
                        moduleName,
                        questionsAttempted: 1,
                        correctAnswers: isCorrect ? 1 : 0,
                        incorrectAnswers: isCorrect ? 0 : 1,
                        lastAttempted: new Date()
                    });
                } else {
                    // Update existing module progress
                    userStats.moduleProgress[moduleIndex].questionsAttempted += 1;
                    if (isCorrect) {
                        userStats.moduleProgress[moduleIndex].correctAnswers += 1;
                    } else {
                        userStats.moduleProgress[moduleIndex].incorrectAnswers += 1;
                    }
                    userStats.moduleProgress[moduleIndex].lastAttempted = new Date();
                }
            }

            // Update average score
            if (userStats.totalQuestionsAttempted > 0) {
                userStats.averageScore = (userStats.totalCorrectAnswers / userStats.totalQuestionsAttempted) * 100;
            }
            
            // Update weekly activity (for performance charts)
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset to start of day
            const todayTime = today.getTime();
            
            const todayActivityIndex = userStats.weeklyActivity.findIndex(activity => {
                if (!activity.date) return false;
                const activityDate = new Date(activity.date);
                activityDate.setHours(0, 0, 0, 0);
                return activityDate.getTime() === todayTime;
            });
            
            if (todayActivityIndex !== -1) {
                // Update today's activity
                userStats.weeklyActivity[todayActivityIndex].questionsAttempted = 
                    (userStats.weeklyActivity[todayActivityIndex].questionsAttempted || 0) + 1;
                if (isCorrect) {
                    userStats.weeklyActivity[todayActivityIndex].correctAnswers = 
                        (userStats.weeklyActivity[todayActivityIndex].correctAnswers || 0) + 1;
                }
            } else {
                // Add new day activity
                userStats.weeklyActivity.push({
                    date: today,
                    questionsAttempted: 1,
                    correctAnswers: isCorrect ? 1 : 0,
                    timeSpent: 0, // Can be updated if time tracking added
                    examsCompleted: 0
                });
                
                // Keep only last 30 days (for performance trend)
                if (userStats.weeklyActivity.length > 30) {
                    userStats.weeklyActivity = userStats.weeklyActivity.slice(-30);
                }
            }
            
            userStats.lastActivityDate = new Date();
        }

        await userStats.save();
        console.log('✓ User stats saved successfully');

        const answeredCountByExam = buildAnsweredCountByExam(userStats.answeredQuestions);
        const completedQuestions = examId
            ? answeredCountByExam[examId.toString()] || 0
            : 0;

        res.status(200).json({
            success: true,
            message: "Réponse sauvegardée",
            data: {
                questionId,
                selectedAnswers,
                isVerified,
                isCorrect,
                completedQuestions
            }
        });
    }),

    // Get user's saved answers for an exam
    getUserAnswers: asyncHandler(async (req, res) => {
        const { examId } = req.params;
        const userId = req.user._id;

        console.log('=== GET USER ANSWERS ===');
        console.log('Exam ID from params:', examId);
        console.log('User ID:', userId);

        const UserStatsModel = (await import("../models/userStatsModel.js")).default;
        const userStats = await UserStatsModel.findOne({ userId });

        if (!userStats || !userStats.answeredQuestions) {
            console.log('No user stats or answered questions found');
            return res.status(200).json({
                success: true,
                data: {}
            });
        }

        console.log('Total answered questions:', userStats.answeredQuestions.size);

        // Filter answers for this exam - handle both string and ObjectId comparison
        const examAnswers = {};
        for (const [qId, answer] of userStats.answeredQuestions.entries()) {
            // Convert both to strings for comparison
            const answerExamId = answer.examId ? answer.examId.toString() : null;
            if (answerExamId === examId || answerExamId === examId.toString()) {
                examAnswers[qId] = answer;
                console.log(`Found answer for question ${qId}:`, answer.selectedAnswers);
            }
        }

        console.log('Filtered answers for this exam:', Object.keys(examAnswers).length);
        console.log('Exam answers:', examAnswers);

        res.status(200).json({
            success: true,
            data: examAnswers
        });
    })
};
