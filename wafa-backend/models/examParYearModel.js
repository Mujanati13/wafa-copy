import mongoose from "mongoose";

const examParYearSchema = new mongoose.Schema(
    {
        name: { 
                type: String,
                required: [true, "Name is required"]
        },
        moduleId:{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Module",
                required: [true, "Module ID is required"]
        },
        year: {
                type: Number,
                required: [true, "Year is required"]
        },
        imageUrl: {
                type: String,
        },
        infoText: {
                type: String,
        },
        isOfficialCorrection: {
                type: Boolean,
                default: true,
        },
        courseCategoryId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "CourseCategory",
                default: null
        }
    },
    { timestamps: true }
);

// Add index for moduleId to improve query performance
examParYearSchema.index({ moduleId: 1 });

// Add index for year to improve query performance  
examParYearSchema.index({ year: 1 });

export default mongoose.model("ExamParYear", examParYearSchema);
