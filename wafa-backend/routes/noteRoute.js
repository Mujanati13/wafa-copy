import { Router } from "express";
import { noteController } from "../controllers/noteController.js";
import { isAuthenticated, requiresPremiumAccess } from "../middleware/authMiddleware.js";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);
router.use(requiresPremiumAccess);

router.post("/", noteController.create);
router.get("/", noteController.getAll);
router.get("/:id", noteController.getById);
router.put("/:id", noteController.update);
router.patch("/:id/pin", noteController.togglePin);
router.delete("/:id", noteController.delete);

// Get notes by module or question
router.get("/module/:moduleId", noteController.getByModule);
router.get("/question/:questionId", noteController.getByQuestion);

export default router;
