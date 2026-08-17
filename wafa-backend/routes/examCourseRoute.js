import { Router } from "express";
import { examCourseController } from "../controllers/examCourseController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { hasExamAccess, isAuthenticated } from "../middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads", "courses");
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
        cb(null, "course-" + uniqueSuffix + ext);
    }
});

const uploadCourseImage = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Veuillez télécharger une image valide"), false);
        }
    }
}).single("courseImage");

// Admin seed endpoint
router.post("/admin/createCategoriesForCourses", examCourseController.createCategoriesForCourses);

// Create with image upload
router.post("/create-with-image", uploadCourseImage, async (req, res) => {
    try {
        let imageUrl = "";

        if (req.file) {
            imageUrl = `/uploads/courses/${req.file.filename}`;
        }

        req.body.imageUrl = imageUrl;
        return examCourseController.create(req, res);
    } catch (error) {
        console.error("Error uploading course image:", error);
        res.status(500).json({ success: false, message: error.message || "Erreur lors de l'upload de l'image" });
    }
});

// Update with image upload
router.put("/update-with-image/:id", uploadCourseImage, async (req, res) => {
    try {
        // Handle image - new upload takes priority, otherwise preserve existing
        if (req.file) {
            req.body.imageUrl = `/uploads/courses/${req.file.filename}`;
        } else if (req.body.existingImageUrl) {
            req.body.imageUrl = req.body.existingImageUrl;
        }
        
        // Forward to the update controller
        return examCourseController.update(req, res);
    } catch (error) {
        console.error("Error updating course with image:", error);
        res.status(500).json({ success: false, message: error.message || "Erreur lors de la mise à jour" });
    }
});

// CRUD operations
router.get("/", examCourseController.getAll);

// Get courses by module - must be before /:id to avoid treating "module" as an ID
router.get("/module/:moduleId", isAuthenticated, examCourseController.getByModuleId);

router.get("/:id", isAuthenticated, hasExamAccess, examCourseController.getById);
router.post("/", examCourseController.create);
router.put("/:id", examCourseController.update);
router.delete("/:id", examCourseController.delete);

// Question linking operations
router.post("/:id/link-questions", examCourseController.linkQuestions);
router.delete("/:id/unlink-question/:questionId", examCourseController.unlinkQuestion);

// Helper endpoints
router.get("/available-questions", examCourseController.getAvailableQuestions);
router.get("/module/:moduleId/exam-years", examCourseController.getExamYearsForModule);
router.get("/module/:moduleId/categories", examCourseController.getCategoriesForModule);

export default router;
