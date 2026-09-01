import express from "express";
import { examController } from "../controllers/examController.js";
import { hasExamAccess, isAdmin, isAuthenticated } from "../middleware/authMiddleware.js";
import ExamParYearSchema from "../validators/ExamParYearSchema.js"
import validate from "../middleware/validateSchema.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const examUploadsDir = path.join(__dirname, "..", "uploads", "exams");
fs.mkdirSync(examUploadsDir, { recursive: true });

const globalExamCoverUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, callback) => callback(null, examUploadsDir),
        filename: (_req, file, callback) => {
            const extensionByMime = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/webp": ".webp",
                "image/gif": ".gif",
            };
            const extension = extensionByMime[file.mimetype] || ".img";
            callback(null, `global-cover-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
        if (!allowedTypes.has(file.mimetype)) {
            return callback(new Error("Format non pris en charge. Utilisez JPG, PNG, WebP ou GIF."));
        }
        callback(null, true);
    },
}).single("examImage");

const handleGlobalCoverUpload = (req, res, next) => {
    globalExamCoverUpload(req, res, (error) => {
        if (!error) return next();
        const isTooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
        return res.status(isTooLarge ? 413 : 400).json({
            success: false,
            message: isTooLarge
                ? "L’image dépasse la taille maximale de 5 Mo."
                : error.message || "Impossible de téléverser cette image."
        });
    });
};

router.get("/global-cover", isAuthenticated, isAdmin, examController.getGlobalCover);
router.put("/global-cover", isAuthenticated, isAdmin, handleGlobalCoverUpload, examController.updateGlobalCover);

router.post("/create", validate(ExamParYearSchema.examParYearSchema), examController.create);
router.patch("/update/:id", validate(ExamParYearSchema.updateExamParYearSchema), examController.update);
router.delete("/delete/:id", examController.delete);
router.get("/all", examController.getAll);
router.get("/all/:id", isAuthenticated, hasExamAccess, examController.getById);
router.get("/module/:moduleId", isAuthenticated, examController.getByModuleId);

// Route to record exam completion and send notification
router.post("/complete", isAuthenticated, examController.completeExam);

export default router;
