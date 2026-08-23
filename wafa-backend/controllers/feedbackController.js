import Feedback from "../models/feedbackModel.js";
import asyncHandler from "../handlers/asyncHandler.js";

export const REVIEW_SUBJECTS = [
  "Expérience générale",
  "Qualité de contenu",
  "Interface & navigation",
  "Idées d'amélioration",
];

const normalizeText = (value) => String(value || "").trim();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const validatePublicReview = (body = {}) => {
  const review = {
    name: normalizeText(body.name),
    email: normalizeText(body.email).toLowerCase(),
    subject: normalizeText(body.subject),
    message: normalizeText(body.message),
    rating: Number(body.rating),
  };
  const errors = {};

  if (review.name.length < 2 || review.name.length > 100) errors.name = "Le nom doit contenir entre 2 et 100 caractères.";
  if (!isValidEmail(review.email) || review.email.length > 254) errors.email = "Veuillez saisir une adresse e-mail valide.";
  if (!REVIEW_SUBJECTS.includes(review.subject)) errors.subject = "Veuillez sélectionner un sujet valide.";
  if (review.message.length < 10 || review.message.length > 2000) errors.message = "Le message doit contenir entre 10 et 2000 caractères.";
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) errors.rating = "La note doit être comprise entre 1 et 5.";

  return { review, errors };
};

// @desc    Get all feedbacks (admin)
// @route   GET /api/feedbacks/admin
// @access  Private/Admin
export const getAllFeedbacks = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find().sort({ order: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: feedbacks.length,
    data: feedbacks,
  });
});

// @desc    Get approved feedbacks (public)
// @route   GET /api/feedbacks
// @access  Public
export const getApprovedFeedbacks = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find({ isApproved: true })
    .select("name role subject message rating imageUrl isFeatured order createdAt")
    .sort({
      isFeatured: -1,
      order: 1,
      createdAt: -1,
    });

  res.status(200).json({
    success: true,
    count: feedbacks.length,
    data: feedbacks,
  });
});

// @desc    Submit a public review for administrator moderation
// @route   POST /api/feedbacks/submit
// @access  Public
export const submitPublicReview = asyncHandler(async (req, res) => {
  const { review, errors } = validatePublicReview(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      message: "Veuillez corriger les champs indiqués.",
      errors,
    });
  }

  const feedback = await Feedback.create({
    ...review,
    role: review.subject,
    isApproved: false,
    isFeatured: false,
    moderationStatus: "pending",
    order: 0,
  });

  return res.status(201).json({
    success: true,
    message: "Votre avis a été envoyé et sera publié après validation.",
    data: { id: feedback._id, moderationStatus: feedback.moderationStatus },
  });
});

// @desc    Get single feedback
// @route   GET /api/feedbacks/:id
// @access  Private/Admin
export const getFeedbackById = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  res.status(200).json({
    success: true,
    data: feedback,
  });
});

// @desc    Create new feedback
// @route   POST /api/feedbacks
// @access  Private/Admin
export const createFeedback = asyncHandler(async (req, res) => {
  const { name, email, subject, role, message, rating, imageUrl, isApproved, isFeatured, order } = req.body;
  const approved = isApproved === true || isApproved === "true";

  const feedback = await Feedback.create({
    name,
    email,
    subject,
    role,
    message,
    rating,
    imageUrl,
    isApproved: approved,
    moderationStatus: approved ? "approved" : "pending",
    isFeatured,
    order,
  });

  res.status(201).json({
    success: true,
    message: "Feedback created successfully",
    data: feedback,
  });
});

// @desc    Update feedback
// @route   PUT /api/feedbacks/:id
// @access  Private/Admin
export const updateFeedback = asyncHandler(async (req, res) => {
  let feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  const updates = { ...req.body };
  if (updates.isApproved !== undefined) {
    const approved = updates.isApproved === true || updates.isApproved === "true";
    updates.isApproved = approved;
    updates.moderationStatus = approved ? "approved" : "pending";
  }

  feedback = await Feedback.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Feedback updated successfully",
    data: feedback,
  });
});

// @desc    Delete feedback
// @route   DELETE /api/feedbacks/:id
// @access  Private/Admin
export const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  await feedback.deleteOne();

  res.status(200).json({
    success: true,
    message: "Feedback deleted successfully",
  });
});

// @desc    Toggle feedback approval
// @route   PATCH /api/feedbacks/:id/approve
// @access  Private/Admin
export const toggleApproval = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  feedback.isApproved = !feedback.isApproved;
  feedback.moderationStatus = feedback.isApproved ? "approved" : "pending";
  if (!feedback.isApproved) feedback.isFeatured = false;
  await feedback.save();

  res.status(200).json({
    success: true,
    message: `Feedback ${feedback.isApproved ? "approved" : "unapproved"}`,
    data: feedback,
  });
});

// @desc    Approve or reject a submitted review
// @route   PATCH /api/feedbacks/:id/moderation
// @access  Private/Admin
export const setModerationStatus = asyncHandler(async (req, res) => {
  const status = normalizeText(req.body.status).toLowerCase();
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(422).json({ success: false, message: "Le statut doit être approved ou rejected." });
  }

  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  feedback.moderationStatus = status;
  feedback.isApproved = status === "approved";
  if (status === "rejected") feedback.isFeatured = false;
  await feedback.save();

  return res.status(200).json({
    success: true,
    message: status === "approved" ? "Avis approuvé" : "Avis rejeté",
    data: feedback,
  });
});

// @desc    Toggle feedback featured status
// @route   PATCH /api/feedbacks/:id/feature
// @access  Private/Admin
export const toggleFeatured = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  feedback.isFeatured = !feedback.isFeatured;
  await feedback.save();

  res.status(200).json({
    success: true,
    message: `Feedback ${feedback.isFeatured ? "featured" : "unfeatured"}`,
    data: feedback,
  });
});
