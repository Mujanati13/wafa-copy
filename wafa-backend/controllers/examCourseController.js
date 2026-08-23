import asyncHandler from "../handlers/asyncHandler.js";
import ExamCourse from "../models/examCourseModel.js";
import Question from "../models/questionModule.js";
import ExamParYear from "../models/examParYearModel.js";
import Module from "../models/moduleModel.js";

const buildExactNamePattern = (name = "") => {
    const escapedName = name
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\s+/g, "\\s+");
    return new RegExp(`^\\s*${escapedName}\\s*$`, "i");
};

export const examCourseController = {
    // Create a new exam course
    create: asyncHandler(async (req, res) => {
        const { name, moduleId, category, subCategory, description, imageUrl, status } = req.body;

        const newCourse = await ExamCourse.create({
            name,
            moduleId,
            category,
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
            .select('name moduleId category subCategory description difficulty color imageUrl status totalQuestions')
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

        const module = await Module.findById(moduleId).select("_id name").lean();
        if (!module) {
            return res.status(404).json({
                success: false,
                message: "Module non trouvé",
            });
        }

        // Include historical duplicate module records with the same display
        // name. Older imports may point at one of those IDs instead of the
        // currently selected module record.
        const equivalentModules = await Module.find({
            name: buildExactNamePattern(module.name),
        }).select("_id").lean();
        const equivalentModuleIds = equivalentModules.length > 0
            ? equivalentModules.map(item => item._id)
            : [module._id];

        let courses = await ExamCourse.find({ moduleId: { $in: equivalentModuleIds } })
            .populate("moduleId", "name")
            .select('name moduleId category subCategory description difficulty color imageUrl status totalQuestions helpText')
            .lean()
            .sort({ createdAt: -1 });

        // Support older imports that stored the module name/string instead of
        // the current Module ObjectId relation.
        if (courses.length === 0) {
            courses = await ExamCourse.collection.find({
                $or: [
                    { moduleId: { $in: equivalentModuleIds.map(String) } },
                    { moduleName: buildExactNamePattern(module.name) },
                    { module: buildExactNamePattern(module.name) },
                ],
            }).sort({ createdAt: -1 }).toArray();
        }

        // Add question count for each course
        const coursesWithCount = courses.map(course => ({
            ...course,
            moduleId: course.moduleId || { _id: module._id, name: module.name },
            questionCount: course.totalQuestions ?? course.linkedQuestions?.length ?? 0,
        }));

        res.status(200).json({
            success: true,
            data: coursesWithCount,
        });
    }),

    // Update an exam course
    update: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, moduleId, category, subCategory, description, imageUrl, status, helpText } = req.body;

        const updated = await ExamCourse.findByIdAndUpdate(
            id,
            { name, moduleId, category, subCategory, description, imageUrl, status, helpText },
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
