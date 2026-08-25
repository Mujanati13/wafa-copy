import express from "express";
import {
  getAllPlans,
  getAvailablePlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} from "../controllers/subscriptionPlanController.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllPlans);
router.get("/available", getAvailablePlans);
router.get("/:id", getPlanById);

// Admin routes
router.post("/", isAuthenticated, isAdmin, createPlan);
router.patch("/:id", isAuthenticated, isAdmin, updatePlan);
router.delete("/:id", isAuthenticated, isAdmin, deletePlan);

export default router;
