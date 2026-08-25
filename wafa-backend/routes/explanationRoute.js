import { Router } from "express";
import { explanationController } from "../controllers/explanationController.js";
import validate from "../middleware/validateSchema.js";
import explanationSchema from "../validators/ExplanationSchema.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
    isAllowedExplanationFile,
    MAX_EXPLANATION_FILE_SIZE,
} from "../utils/explanationUpload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads", "explanations");
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
        cb(null, "explanation-" + uniqueSuffix + ext);
    }
});

const uploadExplanationFiles = multer({
    storage: storage,
    limits: { fileSize: MAX_EXPLANATION_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (isAllowedExplanationFile(file)) return cb(null, true);
        return cb(new Error("Types acceptés: JPG, PNG, GIF, WebP, PDF, PPT, PPTX, DOC, DOCX"), false);
    }
}).fields([
    { name: 'images', maxCount: 5 },
    { name: 'pdf', maxCount: 1 }
]);

const explanationDocumentUpload = multer({
    storage,
    limits: { fileSize: MAX_EXPLANATION_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (isAllowedExplanationFile(file)) return cb(null, true);
        return cb(new Error("Types acceptés: PDF, PPT, PPTX, DOC, DOCX"), false);
    },
}).single("pdf");

const handleExplanationUpload = (upload) => (req, res, next) => {
    upload(req, res, (error) => {
        if (!error) {
            const uploadedFiles = [
                ...(req.file ? [req.file] : []),
                ...Object.values(req.files || {}).flat(),
            ];

            // Multer writes to disk before controller validation. Remove those
            // files automatically whenever the request ultimately fails.
            res.on("finish", () => {
                if (res.statusCode < 400) return;
                uploadedFiles.forEach(file => {
                    fs.promises.unlink(file.path).catch(unlinkError => {
                        if (unlinkError.code !== "ENOENT") {
                            console.error("Failed to clean explanation upload:", unlinkError);
                        }
                    });
                });
            });

            return next();
        }

        const tooLarge = error.code === "LIMIT_FILE_SIZE";
        return res.status(tooLarge ? 413 : 422).json({
            success: false,
            code: tooLarge ? "EXPLANATION_FILE_TOO_LARGE" : "EXPLANATION_FILE_INVALID",
            message: tooLarge
                ? "Chaque fichier doit être inférieur ou égal à 100 Mo."
                : error.message || "Le fichier sélectionné n'est pas valide.",
        });
    });
};

// Create with file upload support
router.post("/create", isAuthenticated, handleExplanationUpload(uploadExplanationFiles), explanationController.create);
// Admin bulk create with file upload support
router.post("/admin-create", isAuthenticated, isAdmin, handleExplanationUpload(uploadExplanationFiles), explanationController.adminCreate);
// Upload document endpoint (PDF, PPTX, Word) - returns URL
router.post("/upload-pdf", isAuthenticated, isAdmin, handleExplanationUpload(explanationDocumentUpload), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Aucun fichier fourni" });
    }
    const fileUrl = `/uploads/explanations/${req.file.filename}`;
    res.json({ success: true, data: { url: fileUrl, filename: req.file.filename } });
});

// Gemini AI generation endpoints - MUST come before /:id routes
router.get("/test-gemini", isAuthenticated, isAdmin, explanationController.testGeminiConnection);
router.post("/generate-gemini", isAuthenticated, explanationController.generateWithGemini); // Available to all authenticated users
router.post("/batch-generate-gemini", isAuthenticated, isAdmin, explanationController.batchGenerateWithGemini);

// Upload PDF for context extraction
router.post("/upload-pdf-context", isAuthenticated, isAdmin, multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error("Seuls les fichiers PDF sont acceptés"), false);
        }
    }
}).single('pdf'), explanationController.extractPdfContext);

// Specific routes before parameterized routes
router.get("/question/:questionId", explanationController.getByQuestionId);
router.get("/slots/:questionId", explanationController.getSlotsInfo);
router.post("/ai/create", isAuthenticated, isAdmin, explanationController.createAiExplanation);

// General CRUD routes
router.get("/", explanationController.getAll);
router.get("/:id", explanationController.getById);
router.put("/:id", isAuthenticated, validate(explanationSchema), explanationController.update);
router.delete("/:id", isAuthenticated, explanationController.delete);
router.patch("/:id/status", isAuthenticated, isAdmin, explanationController.updateStatus);

// Voting endpoints
router.post("/:id/vote", isAuthenticated, explanationController.vote);

export default router;
