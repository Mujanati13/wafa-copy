import express from "express";
import { examController } from "../controllers/examController.js";
import { hasExamAccess, isAuthenticated } from "../middleware/authMiddleware.js";
import ExamParYearSchema from "../validators/ExamParYearSchema.js"
import validate from "../middleware/validateSchema.js";
const router = express.Router();

router.post("/create", validate(ExamParYearSchema.examParYearSchema), examController.create);
router.patch("/update/:id", validate(ExamParYearSchema.updateExamParYearSchema), examController.update);
router.delete("/delete/:id", examController.delete);
router.get("/all", examController.getAll);
router.get("/all/:id", isAuthenticated, hasExamAccess, examController.getById);
router.get("/module/:moduleId", isAuthenticated, examController.getByModuleId);

// Route to record exam completion and send notification
router.post("/complete", isAuthenticated, examController.completeExam);

export default router;
