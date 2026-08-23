import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    subject: {
      type: String,
      enum: [
        "Expérience générale",
        "Qualité de contenu",
        "Interface & navigation",
        "Idées d'amélioration",
      ],
      default: "Expérience générale",
    },
    role: {
      type: String,
      default: "Étudiant en médecine",
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Feedback message is required"],
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for faster queries
feedbackSchema.index({ isApproved: 1, isFeatured: 1, order: 1 });
feedbackSchema.index({ moderationStatus: 1, createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
