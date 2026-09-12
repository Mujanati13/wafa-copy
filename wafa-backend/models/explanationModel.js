import mongoose from "mongoose";

const explanation = new mongoose.Schema(
    {

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: true
        },
        title: {
            type: String,
            required: true
        },
        contentText: {
            type: String
        },
        // Legacy single image support
        imageUrl: {
            type: String
        },
        // Multi-image support (1-5 images)
        imageUrls: [{
            type: String
        }],
        // PDF support (max 1)
        pdfUrl: {
            type: String
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        // AI-generated explanation flag (reserved slot for DeepSeek)
        isAiGenerated: {
            type: Boolean,
            default: false
        },
        aiProvider: {
            type: String,
            enum: ["gemini", "deepseek", "openai", "manual", null],
            default: null
        },
        // Community voting
        upvotes: {
            type: Number,
            default: 0
        },
        downvotes: {
            type: Number,
            default: 0
        },
        voters: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            vote: {
                type: String,
                enum: ["up", "down"]
            },
            weight: {
                type: Number,
                default: 1
            },
            votedAt: {
                type: Date,
                default: Date.now
            }
        }]

    },
    { timestamps: true }
);

explanation.index({ createdAt: -1, _id: -1 });
export default mongoose.model("Explanation", explanation);
