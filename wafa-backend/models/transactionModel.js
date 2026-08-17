import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "cancelled"],
      default: "pending",
      required: true,
    },
    paypalOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paypalPaymentId: {
      type: String,
      sparse: true,
    },
    plan: {
      type: String,
      enum: ["Premium", "Premium Annuel", "Gratuit"],
      required: true,
    },
    duration: {
      type: String,
      enum: ["1month", "3months", "6months", "1year"],
    },
    paymentMethod: {
      type: String,
      enum: ["PayPal", "Bank Transfer", "Contact"],
      default: "Contact",
    },
    // Selected semesters for the subscription
    semesters: {
      type: [String],
      enum: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying user transactions
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, status: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
