import mongoose from "mongoose";

const examCoverSettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: "global",
            unique: true,
            immutable: true,
        },
        imageUrl: {
            type: String,
            required: true,
            trim: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model("ExamCoverSettings", examCoverSettingsSchema);
