import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  getAllFeedbacks,
  getApprovedFeedbacks,
  submitPublicReview,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  toggleApproval,
  setModerationStatus,
  toggleFeatured,
} from "../controllers/feedbackController.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "..", "uploads", "feedbacks");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "feedback-" + unique + path.extname(file.originalname));
  },
});

const uploadFeedbackImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Veuillez télécharger une image valide"), false);
  },
}).single("image");

// Middleware wrapper to set imageUrl from uploaded file
const withImageUpload = (handler) => (req, res) => {
  uploadFeedbackImage(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (req.file) req.body.imageUrl = `/uploads/feedbacks/${req.file.filename}`;
    return handler(req, res);
  });
};

const router = Router();

// Public route - get approved feedbacks for landing page
router.get("/", getApprovedFeedbacks);
router.post("/submit", submitPublicReview);

// Admin routes (protected)
router.get("/admin", isAuthenticated, isAdmin, getAllFeedbacks);
router.get("/:id", isAuthenticated, isAdmin, getFeedbackById);
router.post("/", isAuthenticated, isAdmin, withImageUpload(createFeedback));
router.put("/:id", isAuthenticated, isAdmin, withImageUpload(updateFeedback));
router.delete("/:id", isAuthenticated, isAdmin, deleteFeedback);
router.patch("/:id/approve", isAuthenticated, isAdmin, toggleApproval);
router.patch("/:id/moderation", isAuthenticated, isAdmin, setModerationStatus);
router.patch("/:id/feature", isAuthenticated, isAdmin, toggleFeatured);

export default router;
