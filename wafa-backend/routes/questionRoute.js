import express from "express";
import { questionController } from "../controllers/questionController.js";
import validate from "../middleware/validateSchema.js";
import QuestionSchema from "../validators/QuestionSchema.js";
import { hasExamAccess, isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";
import { uploadQuestionImages, uploadExcelFile } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/create", isAuthenticated, isAdmin, validate(QuestionSchema.createQuestionSchema), questionController.create);
router.patch("/update/:id", isAuthenticated, isAdmin, validate(QuestionSchema.updateQuestionSchema), questionController.update);
router.delete("/delete/:id", isAuthenticated, isAdmin, questionController.delete);
router.get("/all", isAuthenticated, isAdmin, questionController.getAll);
router.get("/by-exam/:examId", isAuthenticated, hasExamAccess, questionController.getByExamId);
router.get("/exam/:examId", isAuthenticated, hasExamAccess, questionController.getByExamId); // Alias for frontend compatibility
router.get("/module/:moduleId", isAuthenticated, questionController.getByModuleId); // Get all questions from module
router.get("/:id", isAuthenticated, questionController.getById); // Direct ID access
router.get("/all/:id", isAuthenticated, questionController.getById); // Legacy route

// New filtered and bulk endpoints
router.get("/filtered", isAuthenticated, questionController.getFiltered);
router.post("/bulk-delete", isAuthenticated, isAdmin, questionController.bulkDelete);
router.get("/export", isAuthenticated, isAdmin, questionController.exportToExcel);

// Image upload endpoints
router.post("/upload-images", isAuthenticated, isAdmin, uploadQuestionImages, questionController.uploadImages);
router.post("/attach-images", isAuthenticated, isAdmin, questionController.attachImagesToQuestions);

// Import from Excel
router.post("/import", isAuthenticated, isAdmin, uploadExcelFile, questionController.importFromExcel);

// Sub-module assignment
router.post("/assign-submodules", isAuthenticated, isAdmin, questionController.assignSubModules);

// Community voting endpoints
router.post("/community-vote/:questionId", isAuthenticated, questionController.submitCommunityVote);
router.get("/community-votes/:questionId", isAuthenticated, questionController.getCommunityVotes);

// Answer verification and persistence endpoints
router.post("/verify-answer", isAuthenticated, hasExamAccess, questionController.verifyAnswer);
router.post("/save-answer", isAuthenticated, hasExamAccess, questionController.saveAnswer);
router.get("/user-answers/:examId", isAuthenticated, hasExamAccess, questionController.getUserAnswers);

export default router;


