import explanationModel from "../models/explanationModel.js";
import asyncHandler from '../handlers/asyncHandler.js';
import Point from "../models/pointModel.js";
import UserStats from "../models/userStatsModel.js";
import geminiService from '../services/geminiService.js';
import Question from "../models/questionModule.js";
import ExamCourse from "../models/examCourseModel.js";
import ExamParYear from "../models/examParYearModel.js";
import QCMBanque from "../models/qcmBanqueModel.js";

// Constants
const MAX_EXPLANATIONS_PER_QUESTION = 3;
const LEVEL_REQUIRED_FOR_VOTING = 20;
const APPROVED_EXPLANATION_VOTE_WEIGHT_MULTIPLIER = 20;

export const explanationController = {
    create: asyncHandler(async (req, res) => {
        const { questionId, title, contentText } = req.body;
        const userId = req.user._id; // Get from authenticated user

        // Debug logging
        console.log("=== Explanation Creation Request ===");
        console.log("Body:", { questionId, title, contentText });
        console.log("req.files exists:", !!req.files);
        if (req.files) {
            console.log("req.files keys:", Object.keys(req.files));
            console.log("req.files.images:", req.files.images ? `Array of ${req.files.images.length} files` : "undefined");
            console.log("req.files.pdf:", req.files.pdf ? `Array of ${req.files.pdf.length} files` : "undefined");
            if (req.files.images && Array.isArray(req.files.images)) {
                req.files.images.forEach((img, idx) => {
                    console.log(`  Image ${idx + 1}: ${img.filename} (${img.size} bytes, ${img.mimetype})`);
                });
            }
        }

        // Process uploaded files
        let imageUrls = [];
        let pdfUrl = null;

        if (req.files) {
            // Handle images (max 5)
            if (req.files.images) {
                imageUrls = req.files.images.map(file => `/uploads/explanations/${file.filename}`);
                console.log("Processed images:", imageUrls);
            }
            // Handle PDF (max 1)
            if (req.files.pdf && req.files.pdf.length > 0) {
                pdfUrl = `/uploads/explanations/${req.files.pdf[0].filename}`;
                console.log("Processed PDF:", pdfUrl);
            }
        }

        // Check if max explanations limit reached for this question
        const existingCount = await explanationModel.countDocuments({
            questionId,
            isAiGenerated: false
        });

        if (existingCount >= MAX_EXPLANATIONS_PER_QUESTION) {
            return res.status(400).json({
                success: false,
                message: `Le nombre maximum d'explications (${MAX_EXPLANATIONS_PER_QUESTION}) a été atteint pour cette question.`,
                maxReached: true
            });
        }

        // Check if user already has a user explanation for this question
        const userExplanation = await explanationModel.findOne({ userId, questionId, isAiGenerated: false });
        if (userExplanation) {
            return res.status(400).json({
                success: false,
                message: "Vous avez déjà soumis une explication pour cette question."
            });
        }

        const newExplanation = await explanationModel.create({
            userId,
            questionId,
            title: title || "Explication utilisateur",
            contentText,
            imageUrls, // Array of image URLs
            pdfUrl,    // Single PDF URL
            status: "pending",
            isAiGenerated: false
        });

        // Mark user's vote as having an explanation
        try {
            const question = await Question.findById(questionId);
            if (question) {
                const voteIndex = question.communityVotes.findIndex(
                    vote => vote.userId.toString() === userId.toString()
                );
                if (voteIndex !== -1) {
                    question.communityVotes[voteIndex].hasExplanation = true;
                    await question.save();
                }
            }
        } catch (error) {
            console.error('Error updating vote hasExplanation flag:', error);
        }

        res.status(201).json({
            success: true,
            data: newExplanation,
            remainingSlots: MAX_EXPLANATIONS_PER_QUESTION - existingCount - 1
        });
    }),

    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { title, contentText, imageUrl, status } = req.body;

        const updatedExplanation = await explanationModel.findByIdAndUpdate(
            id,
            {
                title,
                contentText,
                imageUrl,
                status
            },
            { new: true, runValidators: true }
        );

        if (!updatedExplanation) {
            return res.status(404).json({
                success: false,
                message: "Explanation not found"
            });
        }

        res.status(200).json({
            success: true,
            data: updatedExplanation
        });
    }),

    delete: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const deletedExplanation = await explanationModel.findByIdAndDelete(id);

        if (!deletedExplanation) {
            return res.status(404).json({
                success: false,
                message: "Explanation not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Explanation deleted successfully"
        });
    }),

    getAll: asyncHandler(async (req, res) => {
        const explanations = await explanationModel.find()
            .populate('userId', 'name email')
            .populate({
                path: 'questionId',
                select: 'text examId sessionLabel qcmBanqueId',
                populate: [
                    {
                        path: 'examId',
                        select: 'name year moduleId category courseName totalQuestions linkedQuestions',
                        populate: {
                            path: 'moduleId',
                            select: 'name category'
                        }
                    },
                    {
                        path: 'qcmBanqueId',
                        select: 'name moduleId',
                        populate: {
                            path: 'moduleId',
                            select: 'name category'
                        }
                    }
                ]
            })
            .lean();

        // Import Question model to get question positions
        const Question = (await import('../models/questionModule.js')).default;

        // Shape the data to include module and exam info
        const shaped = await Promise.all(explanations.map(async (item) => {
            // Determine the source (exam or qcm banque)
            const examSource = item.questionId?.examId;
            const qcmSource = item.questionId?.qcmBanqueId;
            const moduleSource = examSource?.moduleId || qcmSource?.moduleId;

            // Get question number (position in exam)
            let questionNumber = null;
            if (item.questionId && (examSource?._id || qcmSource?._id)) {
                const sourceId = examSource?._id || qcmSource?._id;
                const sourceField = examSource?._id ? 'examId' : 'qcmBanqueId';
                
                // Find all questions for this exam/qcm and get the position
                const allQuestions = await Question.find({ [sourceField]: sourceId })
                    .select('_id')
                    .sort({ createdAt: 1 })
                    .lean();
                
                const questionIndex = allQuestions.findIndex(
                    q => q._id.toString() === item.questionId._id.toString()
                );
                questionNumber = questionIndex !== -1 ? questionIndex + 1 : null;
            }

            return {
                ...item,
                // Question number
                questionNumber,
                // Module info
                moduleName: moduleSource?.name || null,
                moduleCategory: moduleSource?.category || null,
                // Exam/Course info
                examName: examSource?.name || qcmSource?.name || null,
                examYear: examSource?.year || null,
                courseCategory: examSource?.category || null,
                courseName: examSource?.courseName || examSource?.name || qcmSource?.name || null,
                // Number of questions in exam
                numberOfQuestions: examSource?.totalQuestions ||
                    examSource?.linkedQuestions?.length || null,
                // Question session label
                sessionLabel: item.questionId?.sessionLabel || null,
            };
        }));

        res.status(200).json({
            success: true,
            count: shaped.length,
            data: shaped
        });
    }),

    getById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const explanation = await explanationModel.findById(id)
            .populate('userId', 'name email')
            .populate('questionId');

        if (!explanation) {
            return res.status(404).json({
                success: false,
                message: "Explanation not found"
            });
        }

        res.status(200).json({
            success: true,
            data: explanation
        });
    }),

    // Additional method to get explanations by question ID
    getByQuestionId: asyncHandler(async (req, res) => {
        const { questionId } = req.params;

        const explanations = await explanationModel.find({ questionId })
            .populate('userId', 'name email')
            .populate('questionId');

        res.status(200).json({
            success: true,
            count: explanations.length,
            data: explanations
        });
    }),

    // Additional method to update explanation status
    updateStatus: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        }

        // Get current explanation to check previous status
        const currentExplanation = await explanationModel.findById(id);
        if (!currentExplanation) {
            return res.status(404).json({
                success: false,
                message: "Explanation not found"
            });
        }

        const previousStatus = currentExplanation.status;

        const updatedExplanation = await explanationModel.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        // Only award points if status changed from non-approved to approved
        if (status === 'approved' && previousStatus !== 'approved') {
            try {
                // Create point record
                await Point.create({
                    userId: updatedExplanation.userId,
                    type: 'bluePoints',
                    amount: 40, // +40 pts for approved explanation
                    questionId: updatedExplanation.questionId,
                    description: 'Explication approuvée'
                });
                
                // Update user stats - increment bluePoints count and add 40 to totalPoints
                await UserStats.findOneAndUpdate(
                    { userId: updatedExplanation.userId },
                    { 
                        $inc: { 
                            bluePoints: 1,      // Count of approved explanations
                            totalPoints: 40     // +40 pts per approved explanation
                        } 
                    },
                    { upsert: true }
                );

                // Update the vote weight in the question's communityVotes array
                const question = await Question.findById(updatedExplanation.questionId);
                if (question) {
                    // Find the user's vote in communityVotes array
                    const voteIndex = question.communityVotes.findIndex(
                        vote => vote.userId.toString() === updatedExplanation.userId.toString()
                    );

                    if (voteIndex !== -1) {
                        // Calculate the old vote weight contribution
                        const oldWeight = question.communityVotes[voteIndex].voteWeight;
                        const selectedOptions = question.communityVotes[voteIndex].selectedOptions;

                        // Update vote weight and explanation flags
                        question.communityVotes[voteIndex].voteWeight = APPROVED_EXPLANATION_VOTE_WEIGHT_MULTIPLIER;
                        question.communityVotes[voteIndex].hasExplanation = true;
                        question.communityVotes[voteIndex].explanationApproved = true;

                        // Recalculate voteStats completely from all votes
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
                    }
                }
            } catch (error) {
                console.error('Error awarding blue points:', error);
            }
        }

        res.status(200).json({
            success: true,
            data: updatedExplanation
        });
    }),

    // Vote on an explanation (with Level 20 restriction)
    vote: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { vote } = req.body; // 'up' or 'down'
        const userId = req.user._id;

        if (!['up', 'down'].includes(vote)) {
            return res.status(400).json({
                success: false,
                message: "Vote invalide. Utilisez 'up' ou 'down'."
            });
        }

        // Check user's level in the module (Level 20 = 20% progress required)
        const userStats = await UserStats.findOne({ userId });
        const userLevel = userStats?.overallLevel || 0;

        if (userLevel < LEVEL_REQUIRED_FOR_VOTING) {
            return res.status(403).json({
                success: false,
                message: `Vous devez atteindre le niveau ${LEVEL_REQUIRED_FOR_VOTING} pour voter.`,
                requiredLevel: LEVEL_REQUIRED_FOR_VOTING,
                currentLevel: userLevel
            });
        }

        const explanation = await explanationModel.findById(id);
        if (!explanation) {
            return res.status(404).json({
                success: false,
                message: "Explication non trouvée"
            });
        }

        // Check if user already voted
        const existingVoteIndex = explanation.voters.findIndex(
            v => v.userId.toString() === userId.toString()
        );

        // Calculate vote weight based on whether user has an approved explanation for THIS question
        // Only multiply by 20 if user has an approved explanation specifically for this question
        const hasApprovedExplanationForThisQuestion = await explanationModel.findOne({
            userId,
            questionId: explanation.questionId,
            status: 'approved'
        });
        const voteWeight = hasApprovedExplanationForThisQuestion
            ? APPROVED_EXPLANATION_VOTE_WEIGHT_MULTIPLIER
            : 1;

        if (existingVoteIndex !== -1) {
            // User already voted - update vote
            const oldVote = explanation.voters[existingVoteIndex].vote;
            const oldWeight = explanation.voters[existingVoteIndex].weight;

            if (oldVote === vote) {
                return res.status(400).json({
                    success: false,
                    message: "Vous avez déjà voté de cette façon."
                });
            }

            // Remove old vote count
            if (oldVote === 'up') {
                explanation.upvotes -= oldWeight;
            } else {
                explanation.downvotes -= oldWeight;
            }

            // Update voter record
            explanation.voters[existingVoteIndex].vote = vote;
            explanation.voters[existingVoteIndex].weight = voteWeight;
            explanation.voters[existingVoteIndex].votedAt = new Date();
        } else {
            // New vote
            explanation.voters.push({
                userId,
                vote,
                weight: voteWeight,
                votedAt: new Date()
            });
        }

        // Add new vote count
        if (vote === 'up') {
            explanation.upvotes += voteWeight;
        } else {
            explanation.downvotes += voteWeight;
        }

        await explanation.save();

        res.status(200).json({
            success: true,
            data: {
                upvotes: explanation.upvotes,
                downvotes: explanation.downvotes,
                userVote: vote,
                voteWeight
            }
        });
    }),

    // Get explanation slots info for a question
    getSlotsInfo: asyncHandler(async (req, res) => {
        const { questionId } = req.params;

        const userExplanations = await explanationModel.countDocuments({
            questionId,
            isAiGenerated: false
        });
        const aiExplanation = await explanationModel.findOne({
            questionId,
            isAiGenerated: true
        });

        res.status(200).json({
            success: true,
            data: {
                maxSlots: MAX_EXPLANATIONS_PER_QUESTION,
                usedSlots: userExplanations,
                remainingSlots: MAX_EXPLANATIONS_PER_QUESTION - userExplanations,
                hasAiExplanation: !!aiExplanation
            }
        });
    }),

    // Create AI-generated explanation (admin only)
    createAiExplanation: asyncHandler(async (req, res) => {
        const { questionId, title, contentText, aiProvider } = req.body;

        // Check if AI explanation already exists
        const existingAi = await explanationModel.findOne({
            questionId,
            isAiGenerated: true
        });

        if (existingAi) {
            return res.status(400).json({
                success: false,
                message: "Une explication IA existe déjà pour cette question."
            });
        }

        const aiExplanation = await explanationModel.create({
            userId: req.user._id, // Admin who created it
            questionId,
            title: title || "Explication IA",
            contentText,
            isAiGenerated: true,
            aiProvider: aiProvider || 'gemini',
            status: 'approved' // AI explanations are auto-approved
        });

        res.status(201).json({
            success: true,
            data: aiExplanation
        });
    }),

    // Generate explanation using Gemini AI
    generateWithGemini: asyncHandler(async (req, res) => {
        const { questionId, language, customPrompt, pdfContext, useModuleConfig } = req.body;

        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: "Question ID est requis"
            });
        }

        // Check if AI explanation already exists
        const existingAi = await explanationModel.findOne({
            questionId,
            isAiGenerated: true
        });

        if (existingAi) {
            return res.status(400).json({
                success: false,
                message: "Une explication IA existe déjà pour cette question.",
                data: existingAi
            });
        }

        // Get question data
        const Question = (await import('../models/questionModule.js')).default;
        const question = await Question.findById(questionId).populate('examId').lean();

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question non trouvée"
            });
        }

        // Get module ID from the exam
        let moduleId = null;
        if (question.examId?.moduleId) {
            moduleId = question.examId.moduleId;
        } else if (question.qcmBanqueId) {
            const QcmBanque = (await import('../models/qcmBanqueModel.js')).default;
            const qcmBanque = await QcmBanque.findById(question.qcmBanqueId).select('moduleId').lean();
            moduleId = qcmBanque?.moduleId;
        }

        // Fetch module's AI config (prompt + context files) if available
        let moduleContextText = '';
        let modulePrompt = '';
        if (moduleId) {
            const Module = (await import('../models/moduleModel.js')).default;
            const module = await Module.findById(moduleId).select('aiContextFiles aiPrompt name').lean();
            
            console.log(`[AI Config] Module: ${module?.name || 'Unknown'}, Prompt: ${!!module?.aiPrompt}, Context Files: ${module?.aiContextFiles?.length || 0}`);
            
            // Use module's prompt if useModuleConfig is true and no custom prompt provided
            if (useModuleConfig && module?.aiPrompt && !customPrompt) {
                modulePrompt = module.aiPrompt;
                console.log(`[AI Config] Using module prompt (${modulePrompt.length} chars)`);
                
                // Validate that module prompt contains the required placeholders
                const hasQuestionPlaceholder = modulePrompt.includes('{questionText}');
                const hasOptionsPlaceholder = modulePrompt.includes('{options}');
                const hasAnswersPlaceholder = modulePrompt.includes('{correctAnswers}');
                
                if (!hasQuestionPlaceholder || !hasOptionsPlaceholder || !hasAnswersPlaceholder) {
                    console.warn(`[AI Config] Module prompt is missing placeholders. Falling back to default prompt.`);
                    console.warn(`[AI Config] Has {questionText}: ${hasQuestionPlaceholder}, Has {options}: ${hasOptionsPlaceholder}, Has {correctAnswers}: ${hasAnswersPlaceholder}`);
                    modulePrompt = ''; // Clear invalid prompt to use default
                }
            }
            
            // Extract context from module's PDF files
            if (module?.aiContextFiles && module.aiContextFiles.length > 0) {
                const path = await import('path');
                
                const contextTexts = [];
                for (const file of module.aiContextFiles) {
                    try {
                        const filePath = path.default.join(process.cwd(), file.url.replace(/^\//, ''));
                        console.log(`[AI Context] Extracting text from: ${filePath}`);
                        const extractedText = await geminiService.extractTextFromPDF(filePath);
                        contextTexts.push(`\n--- Contexte de ${file.filename} ---\n${extractedText}`);
                        console.log(`[AI Context] Successfully extracted ${extractedText.length} characters from ${file.filename}`);
                    } catch (error) {
                        console.error(`[AI Context] Error extracting PDF ${file.filename}:`, error.message);
                    }
                }
                
                if (contextTexts.length > 0) {
                    moduleContextText = contextTexts.join('\n\n');
                    console.log(`[AI Context] Total context text: ${moduleContextText.length} characters from ${contextTexts.length} file(s)`);
                }
            }
        }

        // Combine uploaded PDF context with module's saved context
        const combinedContext = [pdfContext, moduleContextText]
            .filter(ctx => ctx && ctx.trim())
            .join('\n\n=== CONTEXTE ADDITIONNEL ===\n\n');

        console.log(`[AI Context] Combined context length: ${combinedContext.length} characters`);

        // Use module prompt if available, otherwise use custom prompt
        const finalPrompt = modulePrompt || customPrompt || null;
        console.log(`[AI Config] Final prompt source: ${modulePrompt ? 'module' : customPrompt ? 'custom' : 'default'}`);

        // Get correct answer indices
        const correctAnswers = question.options
            .map((opt, idx) => opt.isCorrect ? idx : null)
            .filter(idx => idx !== null);

        // Prepare question data for Gemini
        const questionData = {
            _id: question._id,
            text: question.text,
            options: question.options,
            correctAnswers
        };

        try {
            // Generate explanation using Gemini with combined context and prompt
            const generatedText = await geminiService.generateExplanation(
                questionData,
                language || 'fr',
                finalPrompt,
                combinedContext || null
            );

            // Save the AI explanation
            const aiExplanation = await explanationModel.create({
                userId: req.user._id,
                questionId,
                title: "Explication générée par IA",
                contentText: generatedText,
                isAiGenerated: true,
                aiProvider: 'gemini',
                status: 'approved'
            });

            res.status(201).json({
                success: true,
                message: "Explication générée avec succès",
                data: aiExplanation,
                debug: {
                    usedModulePrompt: !!modulePrompt,
                    usedModuleContext: !!moduleContextText,
                    contextLength: combinedContext.length
                }
            });
        } catch (error) {
            console.error('Gemini generation error:', error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de la génération de l'explication: " + error.message
            });
        }
    }),

    // Batch generate explanations for multiple questions
    batchGenerateWithGemini: asyncHandler(async (req, res) => {
        const { examId, moduleId, questionNumbers, language, customPrompt, pdfContext } = req.body;

        if (!examId && !moduleId) {
            return res.status(400).json({
                success: false,
                message: "Exam ID ou Module ID est requis"
            });
        }

        // Helper to parse question numbers
        const parseQuestionNumbers = (input) => {
            if (Array.isArray(input)) return input.map(n => parseInt(n));
            if (typeof input !== 'string') return [];
            
            const numbers = [];
            const parts = input.split(',').map(p => p.trim());
            
            for (const part of parts) {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) {
                            numbers.push(i);
                        }
                    }
                } else {
                    const num = parseInt(part);
                    if (!isNaN(num)) numbers.push(num);
                }
            }
            
            return [...new Set(numbers)];
        };

        const parsedNumbers = parseQuestionNumbers(questionNumbers);

        if (parsedNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Veuillez spécifier au moins un numéro de question"
            });
        }

        // Get questions based on examId or moduleId
        const Question = (await import('../models/questionModule.js')).default;
        let allQuestions = [];
        let targetModuleId = moduleId;

        if (examId) {
            // Get questions from specific exam
            allQuestions = await Question.find({ examId })
                .sort({ questionNumber: 1, createdAt: 1 })
                .lean();
        } else if (moduleId) {
            // Get all questions from all exams in this module
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

            if (examIds.length > 0) {
                allQuestions = await Question.find({ 
                    $or: [
                        { examId: { $in: examIds } },
                        { qcmBanqueId: { $in: examIds } }
                    ]
                })
                .sort({ questionNumber: 1, createdAt: 1 })
                .lean();
            }
        }

        if (allQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                message: examId ? "Aucune question trouvée pour cet examen" : "Aucune question trouvée pour ce module"
            });
        }

        // Get module ID - either from parameter or from the first question's exam
        let resolvedModuleId = targetModuleId;
        
        if (!resolvedModuleId && allQuestions.length > 0 && allQuestions[0].examId) {
            const ExamParYear = (await import('../models/examParYearModel.js')).default;
            const exam = await ExamParYear.findById(examId).select('moduleId').lean();
            if (exam) {
                resolvedModuleId = exam.moduleId;
            } else {
                // Try exam course
                const ExamCourse = (await import('../models/examCourseModel.js')).default;
                const examCourse = await ExamCourse.findById(examId).select('moduleId').lean();
                if (examCourse) {
                    resolvedModuleId = examCourse.moduleId;
                } else {
                    // Try QCM Banque
                    const QcmBanque = (await import('../models/qcmBanqueModel.js')).default;
                    const qcmBanque = await QcmBanque.findById(examId).select('moduleId').lean();
                    resolvedModuleId = qcmBanque?.moduleId;
                }
            }
        }

        // Fetch module's AI context files if available
        let moduleContextText = '';
        let modulePrompt = '';
        if (resolvedModuleId) {
            const Module = (await import('../models/moduleModel.js')).default;
            const module = await Module.findById(resolvedModuleId).select('aiContextFiles aiPrompt name').lean();
            
            console.log(`[Batch AI Config] Module: ${module?.name || 'Unknown'}, Prompt: ${!!module?.aiPrompt}, Context Files: ${module?.aiContextFiles?.length || 0}`);
            
            // Use module's prompt if no custom prompt provided
            if (module?.aiPrompt && !customPrompt) {
                modulePrompt = module.aiPrompt;
                console.log(`[Batch AI Config] Using module prompt (${modulePrompt.length} chars)`);
            }
            
            if (module?.aiContextFiles && module.aiContextFiles.length > 0) {
                // Extract text from all saved PDFs
                const path = await import('path');
                
                const contextTexts = [];
                for (const file of module.aiContextFiles) {
                    try {
                        const filePath = path.default.join(process.cwd(), file.url.replace(/^\//, ''));
                        console.log(`[Batch AI Context] Extracting text from: ${filePath}`);
                        const extractedText = await geminiService.extractTextFromPDF(filePath);
                        contextTexts.push(`\n--- Contexte de ${file.filename} ---\n${extractedText}`);
                        console.log(`[Batch AI Context] Successfully extracted ${extractedText.length} characters from ${file.filename}`);
                    } catch (error) {
                        console.error(`[Batch AI Context] Error extracting PDF ${file.filename}:`, error.message);
                    }
                }
                
                if (contextTexts.length > 0) {
                    moduleContextText = contextTexts.join('\n\n');
                    console.log(`[Batch AI Context] Total context text: ${moduleContextText.length} characters from ${contextTexts.length} file(s)`);
                }
            }
        }

        // Combine uploaded PDF context with module's saved context
        const combinedContext = [pdfContext, moduleContextText]
            .filter(ctx => ctx && ctx.trim())
            .join('\n\n=== CONTEXTE ADDITIONNEL ===\n\n');

        // Use module prompt if available, otherwise use custom prompt
        const finalPrompt = modulePrompt || customPrompt || null;
        console.log(`[Batch AI Config] Final prompt source: ${modulePrompt ? 'module' : customPrompt ? 'custom' : 'default'}`);
        console.log(`[Batch AI Context] Combined context length: ${combinedContext.length} characters`);
        console.log(`[Batch AI Context] Processing ${parsedNumbers.length} question(s) with ${moduleContextText ? 'module context' : 'no module context'}`);

        // Build question number map
        const questionsByNumber = new Map();
        allQuestions.forEach((q, idx) => {
            const qNum = q.questionNumber || (idx + 1);
            questionsByNumber.set(qNum, q);
        });

        // Get target questions
        const targetQuestions = parsedNumbers
            .map(num => questionsByNumber.get(num) || allQuestions[num - 1])
            .filter(q => q);

        if (targetQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Aucune question trouvée pour les numéros spécifiés"
            });
        }

        // Prepare questions for batch generation
        const questionsData = targetQuestions.map(q => ({
            _id: q._id,
            text: q.text,
            options: q.options,
            correctAnswers: q.options
                .map((opt, idx) => opt.isCorrect ? idx : null)
                .filter(idx => idx !== null)
        }));

        try {
            // Generate explanations in batch with combined context and prompt
            const results = await geminiService.generateBatchExplanations(
                questionsData,
                language || 'fr',
                finalPrompt,
                combinedContext || null
            );

            // Save successful explanations
            const saved = [];
            const failed = [];

            for (const result of results) {
                if (result.success) {
                    try {
                        // Check if already exists
                        const existing = await explanationModel.findOne({
                            questionId: result.questionId,
                            isAiGenerated: true
                        });

                        if (!existing) {
                            const explanation = await explanationModel.create({
                                userId: req.user._id,
                                questionId: result.questionId,
                                title: "Explication générée par IA",
                                contentText: result.explanation,
                                isAiGenerated: true,
                                aiProvider: 'gemini',
                                status: 'approved'
                            });
                            saved.push(explanation);
                        } else {
                            failed.push({
                                questionId: result.questionId,
                                reason: "Explication déjà existante"
                            });
                        }
                    } catch (error) {
                        failed.push({
                            questionId: result.questionId,
                            reason: error.message
                        });
                    }
                } else {
                    failed.push({
                        questionId: result.questionId,
                        reason: result.error
                    });
                }
            }

            res.status(201).json({
                success: true,
                message: `${saved.length} explication(s) générée(s) avec succès`,
                data: {
                    saved: saved.length,
                    failed: failed.length,
                    explanations: saved,
                    errors: failed,
                    usedModuleContext: !!moduleContextText
                }
            });
        } catch (error) {
            console.error('Batch generation error:', error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de la génération des explications: " + error.message
            });
        }
    }),

    // Test Gemini connection
    testGeminiConnection: asyncHandler(async (req, res) => {
        try {
            const isConnected = await geminiService.testGeminiConnection();
            
            if (isConnected) {
                res.status(200).json({
                    success: true,
                    message: "Connexion à Gemini AI réussie"
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: "Échec de la connexion à Gemini AI. Vérifiez votre clé API."
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Erreur lors du test de connexion: " + error.message
            });
        }
    }),

    // Extract text from uploaded PDF for context
    extractPdfContext: asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Aucun fichier PDF fourni"
            });
        }

        try {
            const pdfPath = req.file.path;
            const extractedText = await geminiService.extractTextFromPDF(pdfPath);
            
            // Clean up the uploaded file
            const fs = await import('fs');
            fs.unlinkSync(pdfPath);
            
            res.json({
                success: true,
                data: {
                    text: extractedText,
                    length: extractedText.length
                },
                message: "Texte extrait avec succès"
            });
        } catch (error) {
            console.error('PDF extraction error:', error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de l'extraction du PDF: " + error.message
            });
        }
    }),

    // Admin bulk create explanations (with file upload)
    adminCreate: asyncHandler(async (req, res) => {
        const { 
            moduleId, 
            examId, 
            questionNumbers, 
            title, 
            contentText,
            imageUrls: bodyImageUrls,
            pdfUrl: bodyPdfUrl,
            examType,
            courseId,
            qcmBanqueId,
            yearName
        } = req.body;
        const userId = req.user._id;

        // Helper function to parse question number ranges like "1-5,7,10"
        const parseQuestionNumbers = (input) => {
            if (Array.isArray(input)) return input.map(n => parseInt(n));
            if (typeof input !== 'string') return [];
            
            const numbers = [];
            const parts = input.split(',').map(p => p.trim());
            
            for (const part of parts) {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) {
                            numbers.push(i);
                        }
                    }
                } else {
                    const num = parseInt(part);
                    if (!isNaN(num)) numbers.push(num);
                }
            }
            
            return [...new Set(numbers)]; // Remove duplicates
        };

        const parsedQuestionNumbers = parseQuestionNumbers(questionNumbers);

        if (parsedQuestionNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Veuillez spécifier au moins un numéro de question valide."
            });
        }

        // Process uploaded files or use URLs from body
        let imageUrls = bodyImageUrls ? (Array.isArray(bodyImageUrls) ? bodyImageUrls : [bodyImageUrls]) : [];
        let pdfUrl = bodyPdfUrl || null;

        if (req.files) {
            // Handle images (max 5)
            if (req.files.images) {
                imageUrls = req.files.images.map(file => `/uploads/explanations/${file.filename}`);
            }
            // Handle PDF (max 1)
            if (req.files.pdf && req.files.pdf.length > 0) {
                pdfUrl = `/uploads/explanations/${req.files.pdf[0].filename}`;
            }
        }

        if (!String(contentText || "").trim() && imageUrls.length === 0 && !pdfUrl) {
            return res.status(400).json({
                success: false,
                message: "Ajoutez un texte, au moins une image ou un document.",
            });
        }

        let allQuestions = [];

        if (examType === "courses") {
            if (!courseId) {
                return res.status(400).json({
                    success: false,
                    message: "Veuillez sélectionner un cours.",
                });
            }

            const course = await ExamCourse.findById(courseId)
                .select("moduleId linkedQuestions questionSources")
                .lean();
            if (!course) {
                return res.status(404).json({ success: false, message: "Cours non trouvé." });
            }
            if (moduleId && String(course.moduleId) !== String(moduleId)) {
                return res.status(422).json({
                    success: false,
                    message: "Le cours sélectionné n'appartient pas au module choisi.",
                });
            }

            let linkedQuestionIds = course.linkedQuestions || [];
            if (yearName) {
                const matchingSourceIds = (course.questionSources || [])
                    .filter(source => String(source.yearName || "").includes(String(yearName)))
                    .map(source => source.questionId)
                    .filter(Boolean);
                if (matchingSourceIds.length > 0) linkedQuestionIds = matchingSourceIds;
            }

            const linkedQuestions = await Question.find({ _id: { $in: linkedQuestionIds } }).lean();
            const questionById = new Map(linkedQuestions.map(question => [String(question._id), question]));
            allQuestions = linkedQuestionIds
                .map(questionId => questionById.get(String(questionId)))
                .filter(Boolean);
        } else if (examType === "qcm") {
            if (!qcmBanqueId) {
                return res.status(400).json({
                    success: false,
                    message: "Veuillez sélectionner une banque QCM.",
                });
            }
            const qcmBanque = await QCMBanque.findById(qcmBanqueId).select("moduleId").lean();
            if (!qcmBanque) {
                return res.status(404).json({ success: false, message: "Banque QCM non trouvée." });
            }
            if (moduleId && String(qcmBanque.moduleId) !== String(moduleId)) {
                return res.status(422).json({
                    success: false,
                    message: "La banque QCM sélectionnée n'appartient pas au module choisi.",
                });
            }
            allQuestions = await Question.find({ qcmBanqueId })
                .sort({ questionNumber: 1, createdAt: 1 })
                .lean();
        } else {
            if (!examId) {
                return res.status(400).json({
                    success: false,
                    message: "Veuillez sélectionner un examen.",
                });
            }
            const exam = await ExamParYear.findById(examId).select("moduleId").lean();
            if (!exam) {
                return res.status(404).json({ success: false, message: "Examen non trouvé." });
            }
            if (moduleId && String(exam.moduleId) !== String(moduleId)) {
                return res.status(422).json({
                    success: false,
                    message: "L'examen sélectionné n'appartient pas au module choisi.",
                });
            }
            allQuestions = await Question.find({ examId })
                .sort({ questionNumber: 1, createdAt: 1 })
                .lean();
        }

        if (allQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Aucune question trouvée pour cet examen."
            });
        }

        // Get questions by their position (1-indexed numbers from user input)
        const questions = parsedQuestionNumbers
            .filter(num => num > 0 && num <= allQuestions.length)
            .map(num => ({ question: allQuestions[num - 1], questionNumber: num }));

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Aucune question trouvée pour les numéros spécifiés. L'examen contient ${allQuestions.length} question(s).`
            });
        }

        // Create explanations for each question
        const createdExplanations = [];
        const errors = [];

        for (let i = 0; i < questions.length; i++) {
            const { question, questionNumber: questionNum } = questions[i];
            
            try {
                // Check if explanation already exists for this question by this admin
                const existing = await explanationModel.findOne({ 
                    questionId: question._id,
                    userId
                });

                if (existing) {
                    errors.push({
                        questionNumber: questionNum,
                        error: "Une explication existe déjà pour cette question."
                    });
                    continue;
                }

                const explanation = await explanationModel.create({
                    userId,
                    questionId: question._id,
                    title: title || `Explication Q${questionNum}`,
                    contentText,
                    imageUrls,
                    pdfUrl,
                    status: 'approved', // Admin explanations are auto-approved
                    isAiGenerated: false
                });

                createdExplanations.push(explanation);
            } catch (error) {
                errors.push({
                    questionNumber: questionNum,
                    error: error.message
                });
            }
        }

        // Find which question numbers were out of range
        const notFoundNumbers = parsedQuestionNumbers.filter(
            num => num < 1 || num > allQuestions.length
        );

        res.status(201).json({
            success: true,
            message: `${createdExplanations.length} explication(s) créée(s) avec succès.`,
            data: createdExplanations,
            errors: errors.length > 0 ? errors : undefined,
            notFound: notFoundNumbers.length > 0 ? notFoundNumbers : undefined,
            totalQuestionsInExam: allQuestions.length
        });
    })
};
