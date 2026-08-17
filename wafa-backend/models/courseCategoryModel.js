import mongoose from "mongoose";

const courseCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
        required: true
    },
    imageUrl: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    color: {
        type: String,
        default: "#3b82f6" // Default blue color
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
}, {
    timestamps: true
});

// Index for faster queries
courseCategorySchema.index({ moduleId: 1, name: 1 });
courseCategorySchema.index({ moduleId: 1, status: 1, createdAt: -1 });

const CourseCategory = mongoose.model("CourseCategory", courseCategorySchema);

export default CourseCategory;
