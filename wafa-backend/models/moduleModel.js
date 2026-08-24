import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema(
    {
        name: { 
                type: String,
                unique: [true, "Name must be unique"],
                required: [true, "Name is required"]
        },
        semester: {
                type: String,
                enum: ["S1", "S2", "S3","S4", "S5", "S6","S7", "S8", "S9","S10", ""],
                // Validation is handled at controller level to avoid issues with findByIdAndUpdate context
                required: false
        },
        // Flag to make module available in all semesters
        availableInAllSemesters: {
                type: Boolean,
                default: false
        },
        // Order within semester for display
        order: {
                type: Number,
                default: 0,
        },
        // Category - 4 default categories
        category: {
                type: String,
                enum: ["Exam par years", "Exam par courses", "Résumé et cours", "QCM banque"],
                default: "Exam par years",
        },
        // List of course names within the module
        courseNames: {
                type: [String],
                default: [],
        },
        // Stable content types keep their internal keys while admins can
        // customize the labels displayed for each individual module.
        categoryLabels: {
                examByYears: {
                        type: String,
                        trim: true,
                        maxlength: 60,
                        default: "Exam par years",
                },
                examByCourses: {
                        type: String,
                        trim: true,
                        maxlength: 60,
                        default: "Exam par courses",
                },
                qcmBank: {
                        type: String,
                        trim: true,
                        maxlength: 60,
                        default: "QCM banque",
                },
        },
        imageUrl: {
                type: String,
        },
        infoText: {
                type: String,
        },
        // Module color for card/icon styling
        color: {
                type: String,
                default: "#6366f1", // Default indigo color
        },
        // Gradient color (optional second color for gradient effect)
        gradientColor: {
                type: String,
                default: "", // Empty means no gradient, just solid color
        },
        // Gradient direction
        gradientDirection: {
                type: String,
                enum: ["to-br", "to-tr", "to-bl", "to-tl", "to-r", "to-l", "to-b", "to-t"],
                default: "to-br", // to bottom right
        },
        // Help content for the help modal (text)
        helpContent: {
                type: String,
                default: "",
        },
        // Help image URL (separate from module main image)
        helpImage: {
                type: String,
                default: "",
        },
        // Help PDF URL
        helpPdf: {
                type: String,
                default: "",
        },
        // AI Context Files - Multiple PDF files that provide context for AI explanation generation
        aiContextFiles: [{
                filename: { type: String, required: true },
                url: { type: String, required: true },
                size: { type: Number }, // in bytes
                uploadedAt: { type: Date, default: Date.now },
                uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],
        // AI Prompt - Custom prompt for AI explanation generation for this module
        aiPrompt: {
                type: String,
                default: "",
        },
        // Difficulty level
        difficulty: {
                type: String,
                enum: ["QE", "easy", "medium", "hard"],
                default: "QE",
        },
        // Content type: image/pdf URL or text description
        contentType: {
                type: String,
                enum: ["url", "text"],
                default: "url",
        },
        // Text content when contentType is "text"
        textContent: {
                type: String,
                default: "",
        }
    },
    { timestamps: true }
);

moduleSchema.index({ semester: 1, order: 1 });

export default mongoose.model("Module", moduleSchema);
