import { Router } from "express";
import { playlistController } from "../controllers/playlistController.js";
import { isAuthenticated, requiresPremiumAccess } from "../middleware/authMiddleware.js";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);
router.use(requiresPremiumAccess);

router.post("/", playlistController.create);
router.get("/", playlistController.getAll);
router.get("/:id", playlistController.getById);
router.put("/:id", playlistController.update);
router.delete("/:id", playlistController.delete);

// Question management
router.post("/:id/questions", playlistController.addQuestion);
router.delete("/:id/questions/:questionId", playlistController.removeQuestion);

export default router;
