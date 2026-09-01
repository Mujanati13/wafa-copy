import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { qcmBanqueController } from "../controllers/qcmBanqueController.js";
import { isAuthenticated, isAdmin, requiresPremiumAccess } from "../middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads", "qcm");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for local disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, "qcm-" + uniqueSuffix + ext);
    }
});

const uploadQCMImage = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Veuillez télécharger une image valide"), false);
        }
    }
}).single("qcmImage");

// Get all QCM Banques
router.get("/all", isAuthenticated, requiresPremiumAccess, qcmBanqueController.getAll);

// Get QCM Banques by module
router.get("/module/:moduleId", isAuthenticated, requiresPremiumAccess, qcmBanqueController.getByModuleId);

// Get single QCM Banque by ID
router.get("/:id", isAuthenticated, requiresPremiumAccess, qcmBanqueController.getById);

// Create QCM Banque with image upload (admin only)
router.post("/create-with-image", isAuthenticated, isAdmin, uploadQCMImage, async (req, res) => {
    try {
        if (req.file) {
            req.body.imageUrl = `/uploads/qcm/${req.file.filename}`;
        }
        return qcmBanqueController.create(req, res);
    } catch (error) {
        console.error("Error uploading QCM image:", error);
        res.status(500).json({ success: false, message: error.message || "Erreur lors de l'upload de l'image" });
    }
});

// Create QCM Banque (admin only) - legacy without image
router.post("/", isAuthenticated, isAdmin, qcmBanqueController.create);

// Update QCM Banque with image upload (admin only)
router.put("/update-with-image/:id", isAuthenticated, isAdmin, uploadQCMImage, async (req, res) => {
    try {
        if (req.file) {
            req.body.imageUrl = `/uploads/qcm/${req.file.filename}`;
        } else if (req.body.existingImageUrl) {
            // Preserve existing image URL if no new file is uploaded
            req.body.imageUrl = req.body.existingImageUrl;
        }
        return qcmBanqueController.update(req, res);
    } catch (error) {
        console.error("Error updating QCM with image:", error);
        res.status(500).json({ success: false, message: error.message || "Erreur lors de la mise à jour" });
    }
});

// Update QCM Banque (admin only) - legacy without image
router.put("/:id", isAuthenticated, isAdmin, qcmBanqueController.update);

// Delete QCM Banque (admin only)
router.delete("/:id", isAuthenticated, isAdmin, qcmBanqueController.delete);

export default router;
