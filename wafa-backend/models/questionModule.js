import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
    {
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamParYear",
            required: false // Changed to false to support QCM Banque questions
        },
        qcmBanqueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QCMBanque",
            required: false
        },
        examCourseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamCourse",
            required: false,
        },
        text: {
            type: String,
            required: true
        },
        questionNumber: {
            type: Number,
            required: false
        },
        options: [
            {
                text: {
                    type: String,
                    required: true
                },
                isCorrect: {
                    type: Boolean,
                    required: true
                }
            }
        ],
        note: {
            type: String,
        },
        images: [
            {
                type: String,
            }
        ],
        sessionLabel: {
            type: String,
            required: false // Changed to false as it may not always be needed
        },
        // Annulled question flag (for questions with "null" answers)
        isAnnulled: {
            type: Boolean,
            default: false
        },
        // Community voting system
        communityVotes: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                selectedOptions: [{
                    type: Number // Index of selected options (0-based)
                }],
                hasExplanation: {
                    type: Boolean,
                    default: false
                },
                explanationApproved: {
                    type: Boolean,
                    default: false
                },
                voteWeight: {
                    type: Number,
                    default: 1 // 1 for normal vote, 20 if explanation is approved
                },
                votedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        // Aggregated vote counts per option (for quick access)
        voteStats: {
            totalVotes: {
                type: Number,
                default: 0
            },
            optionVotes: {
                type: Map,
                of: Number,
                default: {}
            }
        }
    },
    { timestamps: true }
);

// Add indexes for frequently queried fields to improve performance
questionSchema.index({ examId: 1 });
questionSchema.index({ qcmBanqueId: 1 });
questionSchema.index({ examId: 1, questionNumber: 1 });
questionSchema.index({ qcmBanqueId: 1, questionNumber: 1 });
questionSchema.index({ examCourseId: 1, questionNumber: 1 });

export default mongoose.model("Question", questionSchema);


