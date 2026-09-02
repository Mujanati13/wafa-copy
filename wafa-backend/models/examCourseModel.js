import mongoose from "mongoose";

const examCourseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Course name is required"],
        },
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Module",
            required: [true, "Module ID is required"],
        },
        category: {
            type: String,
            default: "",
        },
        lessonNumber: {
            type: String,
            trim: true,
            maxlength: 30,
            default: "",
        },
        subCategory: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        difficulty: {
            type: String,
            enum: ["QE", "easy", "medium", "hard"],
            default: "QE",
        },
        color: {
            type: String,
            default: "#6366f1",
        },
        contentType: {
            type: String,
            enum: ["image", "text"],
            default: "text",
        },
        imageUrl: {
            type: String,
            default: "",
        },
        // Array of linked question IDs from ExamParYear questions
        linkedQuestions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
        }],
        // Store the source information for each linked question
        questionSources: [{
            questionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Question",
            },
            examParYearId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ExamParYear",
            },
            yearName: String,
            questionNumber: Number,
        }],
        status: {
            type: String,
            enum: ["active", "draft", "archived"],
            default: "draft",
        },
        totalQuestions: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Add indexes for frequently queried fields
examCourseSchema.index({ moduleId: 1 });
examCourseSchema.index({ category: 1 });
examCourseSchema.index({ status: 1 });
examCourseSchema.index({ moduleId: 1, status: 1 });
examCourseSchema.index({ moduleId: 1, category: 1 });
examCourseSchema.index({ moduleId: 1, lessonNumber: 1 });
examCourseSchema.index({ moduleId: 1, createdAt: -1 });

// Update totalQuestions when linkedQuestions changes
examCourseSchema.pre("save", function(next) {
    this.totalQuestions = this.linkedQuestions.length;
    next();
});

// Static method to get course with populated questions
examCourseSchema.statics.getWithQuestions = async function(courseId) {
    return this.findById(courseId)
        .populate("moduleId")
        .populate({
            path: "linkedQuestions",
            populate: {
                path: "examId",
                select: "name year",
            },
        });
};

export default mongoose.model("ExamCourse", examCourseSchema);
