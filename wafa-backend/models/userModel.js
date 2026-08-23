import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      trim: true,
    },
    isAactive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    activeSessionId: {
      type: String,
      default: null,
      select: false,
    },
    activeSessionExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    activeSessionIp: {
      type: String,
      default: null,
      select: false,
    },
    activeSessionDevice: {
      type: String,
      default: null,
      select: false,
    },
    activeSessionLocation: {
      type: String,
      default: null,
      select: false,
    },
    activeSessionStartedAt: {
      type: Date,
      default: null,
      select: false,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedReason: {
      type: String,
      trim: true,
      default: null,
    },
    isAdmin: {
      type: Boolean,
      default: false,
      required: true,
    },
    // Admin role for sub-admin management
    adminRole: {
      type: String,
      enum: ["super_admin", "admin", "moderator", "editor"],
      default: null,
    },
    // Admin permissions array
    permissions: {
      type: [String],
      enum: ["users", "content", "analytics", "payments", "notifications", "reports", "settings"],
      default: [],
    },
    resetCode: {
      type: String,
      trim: true,
    },
    plan: {
      type: String,
      default: "Free",
      enum: ["Free", "Premium", "Premium Annuel"],
    },
    planExpiry: {
      type: Date,
      default: null,
    },
    semesters: {
      type: [String],
      enum: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"],
    },
    // Email verification
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      trim: true,
    },
    emailVerificationExpires: {
      type: Date,
    },
    // Password reset
    resetPasswordToken: {
      type: String,
      trim: true,
    },
    resetPasswordExpires: {
      type: Date,
    },
    // Google OAuth
    googleId: {
      type: String,
      trim: true,
      sparse: true,
    },
    // Firebase Authentication
    firebaseUid: {
      type: String,
      trim: true,
      sparse: true,
    },
    // Profile information
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    address: {
      type: String,
      trim: true,
    },
    university: {
      type: String,
      trim: true,
    },
    faculty: {
      type: String,
      trim: true,
    },
    currentYear: {
      type: String,
      trim: true,
    },
    studentId: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    // Consent tracking
    consentAcceptedAt: {
      type: Date,
      default: null,
    },
    // Payment approval tracking
    approvalDate: {
      type: Date,
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    // Payment mode tracking
    paymentMode: {
      type: String,
      enum: ["PayPal", "Bank Transfer", "Contact", "Manual", null],
      default: null,
    },
    // Free semester selection tracking
    hasUsedFreeSemester: {
      type: Boolean,
      default: false,
    },
    freeSemesterSelectedAt: {
      type: Date,
      default: null,
    },
    // Free plan allowed modules (for restricted access)
    freeModules: {
      type: [String],
      default: [],
    },
    // The free plan grants access to exactly one exam in one module.
    freeModule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      default: null,
    },
    freeExam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamParYear",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ plan: 1, createdAt: -1 });
userSchema.index({ plan: 1, updatedAt: -1 });
userSchema.index({ isAactive: 1, isBlocked: 1, semesters: 1 });
userSchema.index({ isAactive: 1, isBlocked: 1, currentYear: 1 });

export default mongoose.model("User", userSchema);
