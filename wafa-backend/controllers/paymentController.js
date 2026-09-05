import paypal from "@paypal/checkout-server-sdk";
import Transaction from "../models/transactionModel.js";
import User from "../models/userModel.js";
import asyncHandler from "../handlers/asyncHandler.js";
import { NotificationController } from "./notificationController.js";
import PaypalSettings from "../models/paypalSettingsModel.js";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";
import mongoose from "mongoose";
import {
  getBillingConfig,
  isPaidSemesterPlan,
  VALID_SUBSCRIPTION_SEMESTERS,
  validatePlanSemesters,
} from "../utils/subscriptionBilling.js";

// Cache PayPal settings
let cachedPaypalSettings = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get PayPal settings from database with caching
const getPaypalSettings = async () => {
  const now = Date.now();
  if (cachedPaypalSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPaypalSettings;
  }

  const settings = await PaypalSettings.findOne();
  if (settings) {
    cachedPaypalSettings = settings;
    cacheTimestamp = now;
  }
  return settings;
};

// Clear settings cache (call after updating settings)
export const clearPaypalSettingsCache = () => {
  cachedPaypalSettings = null;
  cacheTimestamp = 0;
};

// PayPal environment setup - now uses database settings with fallback to env vars
const environment = async () => {
  const settings = await getPaypalSettings();

  const clientId = settings?.clientId || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = settings?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
  const mode = settings?.mode || process.env.PAYPAL_MODE || "sandbox";

  return mode === "production"
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
};

const client = async () => new paypal.core.PayPalHttpClient(await environment());

// Create PayPal order
const createOrder = asyncHandler(async (req, res) => {
  const { semesters, planId } = req.body;

  // Force refresh settings from database (clear cache)
  clearPaypalSettingsCache();
  const settings = await getPaypalSettings();
  
  const clientId = settings?.clientId || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = settings?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
  const mode = settings?.mode || process.env.PAYPAL_MODE || "sandbox";

  console.log("PayPal Configuration:", {
    hasSettings: !!settings,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    mode,
    clientIdLength: clientId?.length,
    isActive: settings?.isActive
  });

  // Check if credentials are placeholder values
  if (!clientId || !clientSecret || 
      clientId === 'your_paypal_client_id' || 
      clientSecret === 'your_paypal_client_secret' ||
      clientId.trim() === '' || 
      clientSecret.trim() === '') {
    res.status(400);
    throw new Error("PayPal n'est pas configuré correctement. L'administrateur doit configurer les identifiants PayPal dans les paramètres.");
  }

  if (settings && !settings.isActive) {
    res.status(400);
    throw new Error("Les paiements PayPal sont temporairement désactivés.");
  }

  if (!mongoose.isValidObjectId(planId)) {
    res.status(400);
    throw new Error("Invalid subscription plan.");
  }

  const selectedPlan = await SubscriptionPlan.findOne({ _id: planId, status: "Active", price: { $gt: 0 } }).lean();
  if (!selectedPlan) {
    res.status(400);
    throw new Error("Invalid or inactive subscription plan.");
  }
  if (!isPaidSemesterPlan(selectedPlan)) {
    res.status(400);
    throw new Error("Seuls les abonnements par semestre sont disponibles.");
  }

  const billing = getBillingConfig(selectedPlan);
  const duration = billing.duration;

  // Validate semesters
  const validSemesters = VALID_SUBSCRIPTION_SEMESTERS;
  let selectedSemesters;
  try {
    selectedSemesters = validatePlanSemesters(semesters, billing.semesterCount);
  } catch (error) {
    res.status(400);
    throw error;
  }

  if (selectedSemesters.length === 0) {
    res.status(400);
    throw new Error("Veuillez sélectionner au moins un semestre");
  }

  // Validate that all selected semesters are valid
  for (const sem of selectedSemesters) {
    if (!validSemesters.includes(sem)) {
      res.status(400);
      throw new Error(`Semestre invalide: ${sem}`);
    }
  }

  const amount = selectedPlan.price;

  // Create transaction record with semesters
  const transaction = await Transaction.create({
    user: req.user._id,
    amount,
    currency: "USD",
    plan: billing.transactionPlan,
    duration,
    semesters: selectedSemesters,
    status: "pending",
    paymentMethod: "PayPal",
  });

  // Create PayPal order
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: transaction._id.toString(),
        amount: {
          currency_code: "USD",
          value: amount.toFixed(2),
        },
        description: `YourQcm ${billing.transactionPlan} - 1 semestre`,
      },
    ],
    application_context: {
      brand_name: "YourQcm Medical Education",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    },
  });

  try {
    const paypalClient = await client();
    const order = await paypalClient.execute(request);

    // Update transaction with PayPal order ID
    transaction.paypalOrderId = order.result.id;
    await transaction.save();

    res.status(200).json({
      success: true,
      orderId: order.result.id,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error("PayPal Order Creation Error:", {
      message: error.message,
      details: error.response?.body || error.response || error
    });

    transaction.status = "failed";
    transaction.errorMessage = error.message;
    await transaction.save();

    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.message.includes('invalid_client') || error.message.includes('Client Authentication failed')) {
      errorMessage = "Les identifiants PayPal sont invalides. Vérifiez que vous avez copié correctement le Client ID et Client Secret depuis le tableau de bord PayPal Developer, et que vous utilisez le bon mode (Sandbox/Production).";
    } else if (error.message.includes('AUTHENTICATION_FAILURE')) {
      errorMessage = "Échec de l'authentification PayPal. Assurez-vous que vos identifiants correspondent au mode sélectionné (Sandbox ou Production).";
    }

    res.status(500);
    throw new Error(errorMessage);
  }
});

// Capture PayPal payment
const capturePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400);
    throw new Error("Order ID is required");
  }

  const transaction = await Transaction.findOne({ paypalOrderId: orderId });

  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }

  if (transaction.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to capture this payment");
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const paypalClient = await client();
    const capture = await paypalClient.execute(request);

    if (capture.result.status === "COMPLETED") {
      // Update transaction
      transaction.status = "completed";
      transaction.paypalPaymentId = capture.result.purchase_units[0].payments.captures[0].id;
      transaction.metadata = {
        captureDetails: capture.result,
      };
      await transaction.save();

      // Update user subscription
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }

      // Calculate plan expiry based on duration
      const durationMap = {
        "1month": 30,
        "3months": 90,
        "6months": 180,
        "1year": 365,
      };

      const daysToAdd = durationMap[transaction.duration];
      const currentExpiry = user.planExpiry && user.planExpiry > new Date()
        ? new Date(user.planExpiry)
        : new Date();

      currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);

      user.plan = transaction.plan;
      user.planExpiry = currentExpiry;

      // Replace semesters with the selected ones (remove free semester)
      if (transaction.semesters && transaction.semesters.length > 0) {
        user.semesters = transaction.semesters;
      }

      await user.save();

      // Send subscription notification
      try {
        const durationText = {
          "1month": "1 mois",
          "3months": "3 mois",
          "6months": "6 mois",
          "1year": "période d'accès"
        }[transaction.duration] || transaction.duration;

        await NotificationController.createNotification(
          req.user._id,
          "subscription",
          "Abonnement Premium activé",
          `Votre abonnement Premium (${durationText}) a été activé avec succès. Profitez de tous les avantages!`,
          "/dashboard/subscription"
        );
      } catch (error) {
        console.error("Error creating subscription notification:", error);
      }

      res.status(200).json({
        success: true,
        message: "Payment completed successfully",
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          status: transaction.status,
        },
        subscription: {
          plan: user.plan,
          expiresAt: user.planExpiry,
        },
      });
    } else {
      transaction.status = "failed";
      transaction.errorMessage = `Payment status: ${capture.result.status}`;
      await transaction.save();

      res.status(400);
      throw new Error("Payment was not completed");
    }
  } catch (error) {
    transaction.status = "failed";
    transaction.errorMessage = error.message;
    await transaction.save();

    res.status(500);
    throw new Error("Error capturing payment: " + error.message);
  }
});

// Get user transactions
const getTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const transactions = await Transaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-metadata");

  const total = await Transaction.countDocuments({ user: req.user._id });

  res.status(200).json({
    success: true,
    transactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single transaction
const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }

  // Only user or admin can view transaction
  if (
    transaction.user._id.toString() !== req.user._id.toString() &&
    !req.user.isAdmin
  ) {
    res.status(403);
    throw new Error("Not authorized to view this transaction");
  }

  res.status(200).json({
    success: true,
    transaction,
  });
});

// Admin: Get all transactions
const getAllTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.userId) filter.user = req.query.userId;

  const transactions = await Transaction.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Transaction.countDocuments(filter);

  const stats = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    transactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    stats,
  });
});

// PayPal webhook handler
const handleWebhook = asyncHandler(async (req, res) => {
  const webhookEvent = req.body;

  // Verify webhook signature (implement based on PayPal docs)
  // For now, we'll process the event

  switch (webhookEvent.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED":
      const captureId = webhookEvent.resource.id;
      const orderId = webhookEvent.resource.supplementary_data.related_ids.order_id;

      const transaction = await Transaction.findOne({ paypalOrderId: orderId });
      if (transaction && transaction.status === "pending") {
        transaction.status = "completed";
        transaction.paypalPaymentId = captureId;
        await transaction.save();

        // Update user subscription
        const user = await User.findById(transaction.user);
        if (user) {
          const durationMap = {
            "1month": 30,
            "3months": 90,
            "6months": 180,
            "1year": 365,
          };

          const daysToAdd = durationMap[transaction.duration];
          const currentExpiry = user.planExpiry && user.planExpiry > new Date()
            ? new Date(user.planExpiry)
            : new Date();

          currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);

          user.plan = transaction.plan;
          user.planExpiry = currentExpiry;

          // Update user's semesters with the selected ones
          if (transaction.semesters && transaction.semesters.length > 0) {
            user.semesters = transaction.semesters;
          }

          await user.save();
        }
      }
      break;

    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      const failedOrderId = webhookEvent.resource.supplementary_data.related_ids.order_id;
      const failedTransaction = await Transaction.findOne({ paypalOrderId: failedOrderId });
      if (failedTransaction) {
        failedTransaction.status = "failed";
        failedTransaction.errorMessage = webhookEvent.summary;
        await failedTransaction.save();
      }
      break;

    case "PAYMENT.CAPTURE.REFUNDED":
      const refundedCaptureId = webhookEvent.resource.id;
      const refundedTransaction = await Transaction.findOne({ paypalPaymentId: refundedCaptureId });
      if (refundedTransaction) {
        refundedTransaction.status = "refunded";
        await refundedTransaction.save();

        // Optionally revoke user's premium access
        const user = await User.findById(refundedTransaction.user);
        if (user) {
          user.plan = "Free";
          user.planExpiry = null;
          await user.save();
        }
      }
      break;

    default:
      console.log(`Unhandled webhook event: ${webhookEvent.event_type}`);
  }

  res.status(200).json({ received: true });
});

// Create bank transfer request
const createBankTransferRequest = asyncHandler(async (req, res) => {
  const { planId, semesters } = req.body;

  if (!planId || !semesters) {
    res.status(400);
    throw new Error("Tous les champs sont requis");
  }

  // Validate semesters
  const validSemesters = VALID_SUBSCRIPTION_SEMESTERS;
  if (!Array.isArray(semesters) || semesters.length === 0) {
    res.status(400);
    throw new Error("Veuillez sélectionner au moins un semestre");
  }

  for (const sem of semesters) {
    if (!validSemesters.includes(sem)) {
      res.status(400);
      throw new Error(`Semestre invalide: ${sem}`);
    }
  }

  if (!mongoose.isValidObjectId(planId)) {
    res.status(400);
    throw new Error("Invalid subscription plan.");
  }

  const selectedPlan = await SubscriptionPlan.findOne({ _id: planId, status: "Active", price: { $gt: 0 } }).lean();
  if (!selectedPlan) {
    res.status(400);
    throw new Error("Invalid or inactive subscription plan.");
  }
  if (!isPaidSemesterPlan(selectedPlan)) {
    res.status(400);
    throw new Error("Seuls les abonnements par semestre sont disponibles.");
  }

  const billing = getBillingConfig(selectedPlan);
  let selectedSemesters;
  try {
    selectedSemesters = validatePlanSemesters(semesters, billing.semesterCount);
  } catch (error) {
    res.status(400);
    throw error;
  }

  // Create transaction record for bank transfer
  const transaction = await Transaction.create({
    user: req.user._id,
    amount: selectedPlan.price,
    currency: "MAD",
    plan: billing.transactionPlan,
    duration: billing.duration,
    semesters: selectedSemesters,
    status: "pending",
    paymentMethod: "Bank Transfer",
  });

  // Send notification to user
  await NotificationController.createNotification(
    req.user._id,
    "subscription",
    "Demande de paiement créée",
    `Votre demande de paiement pour le plan ${billing.transactionPlan} (1 semestre) a été enregistrée. Contactez-nous sur WhatsApp pour finaliser.`,
    "/dashboard/subscription"
  );

  res.status(201).json({
    success: true,
    message: "Demande de transfert bancaire créée avec succès",
    requestId: transaction._id,
    transaction
  });
});

// Admin: Approve a payment request
const approvePayment = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  const transaction = await Transaction.findById(transactionId);

  if (!transaction) {
    res.status(404);
    throw new Error("Transaction non trouvée");
  }

  if (transaction.status === 'completed') {
    res.status(400);
    throw new Error("Cette transaction a déjà été approuvée");
  }

  // Update transaction status
  transaction.status = 'completed';
  transaction.metadata = {
    ...transaction.metadata,
    approvedBy: req.user._id,
    approvedAt: new Date()
  };
  await transaction.save();

  // Update user subscription
  const user = await User.findById(transaction.user);
  if (!user) {
    res.status(404);
    throw new Error("Utilisateur non trouvé");
  }

  // Calculate plan expiry based on duration
  const durationMap = {
    "1month": 30,
    "3months": 90,
    "6months": 180,
    "1year": 365,
  };

  const daysToAdd = durationMap[transaction.duration];
  if (!daysToAdd) {
    res.status(400);
    throw new Error("Durée d'abonnement invalide");
  }
  const currentExpiry = user.planExpiry && user.planExpiry > new Date()
    ? new Date(user.planExpiry)
    : new Date();

  currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);

  // Persist the paid plan stored on the transaction.
  user.plan = transaction.plan;
  user.planExpiry = currentExpiry;
  user.approvalDate = new Date();
  user.paymentDate = new Date();

  // Replace semesters with the selected ones (remove free semester)
  if (transaction.semesters && transaction.semesters.length > 0) {
    user.semesters = transaction.semesters;
  }

  await user.save();

  // Send notification to user
  try {
    await NotificationController.createNotification(
      transaction.user,
      "subscription",
      "Paiement approuvé",
      `Votre paiement a été approuvé. Votre abonnement Premium est maintenant actif jusqu'au ${currentExpiry.toLocaleDateString('fr-FR')}.`,
      "/dashboard/subscription"
    );
  } catch (error) {
    console.error("Error creating approval notification:", error);
  }

  res.status(200).json({
    success: true,
    message: "Paiement approuvé avec succès",
    transaction,
    subscription: {
      plan: user.plan,
      expiresAt: user.planExpiry,
      semesters: user.semesters
    }
  });
});

// Admin: Reject a payment request
const rejectPayment = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { reason } = req.body || {};

  const transaction = await Transaction.findById(transactionId);

  if (!transaction) {
    res.status(404);
    throw new Error("Transaction non trouvée");
  }

  transaction.status = 'cancelled';
  transaction.errorMessage = reason || 'Paiement rejeté par l\'administrateur';
  transaction.metadata = {
    ...transaction.metadata,
    rejectedBy: req.user._id,
    rejectedAt: new Date(),
    rejectionReason: reason
  };
  await transaction.save();

  // Send notification to user
  try {
    await NotificationController.createNotification(
      transaction.user,
      "subscription",
      "Paiement rejeté",
      `Votre demande de paiement a été rejetée. ${reason ? `Raison: ${reason}` : 'Veuillez contacter le support.'}`,
      "/dashboard/subscription"
    );
  } catch (error) {
    console.error("Error creating rejection notification:", error);
  }

  res.status(200).json({
    success: true,
    message: "Paiement rejeté",
    transaction
  });
});

// Get pending payment requests with filters
const getPendingPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, dateFrom, dateTo } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = { status: 'pending' };

  // Date filter
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  let transactions = await Transaction.find(filter)
    .populate('user', 'name email username createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Search filter (applied after population)
  if (search) {
    const searchLower = search.toLowerCase();
    transactions = transactions.filter(t =>
      t.user?.name?.toLowerCase().includes(searchLower) ||
      t.user?.email?.toLowerCase().includes(searchLower) ||
      t.user?.username?.toLowerCase().includes(searchLower)
    );
  }

  const total = await Transaction.countDocuments(filter);

  res.status(200).json({
    success: true,
    transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

export default {
  createOrder,
  capturePayment,
  getTransactions,
  getTransaction,
  getAllTransactions,
  handleWebhook,
  createBankTransferRequest,
  approvePayment,
  rejectPayment,
  getPendingPayments,
};
