import { Router } from "express";
import { resumeController } from "../controllers/resumeController.js";
import validate from "../middleware/validateSchema.js";
import resumeSchema from "../validators/ResumeSchema.js";
import { uploadDocument } from "../middleware/uploadMiddleware.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";

const router = Router();

const handleResumeUpload = (req, res, next) => {
    uploadDocument.single("file")(req, res, (error) => {
        if (!error) return next();

        const tooLarge = error.code === "LIMIT_FILE_SIZE";
        return res.status(tooLarge ? 413 : 422).json({
            success: false,
            code: tooLarge ? "RESUME_FILE_TOO_LARGE" : "RESUME_FILE_INVALID",
            message: tooLarge
                ? "Le fichier dépasse la limite autorisée de 50 Mo."
                : error.message || "Le fichier sélectionné n'est pas valide.",
        });
    });
};

// Base CRUD routes
router.post("/create", validate(resumeSchema), resumeController.create);
router.get("/", resumeController.getAll);
router.get("/with-modules", resumeController.getAllWithModules);
router.get("/:id", resumeController.getById);
router.put("/:id", validate(resumeSchema), resumeController.update);
router.delete("/:id", isAuthenticated, isAdmin, resumeController.delete);

// Admin upload with file
router.post("/admin-upload", isAuthenticated, isAdmin, handleResumeUpload, resumeController.adminUpload);

// Additional routes
router.get("/question/:questionId", resumeController.getByQuestionId);
router.get("/user/:userId", resumeController.getByUserId);
router.patch("/:id/status", isAuthenticated, isAdmin, resumeController.updateStatus);

export default router;
