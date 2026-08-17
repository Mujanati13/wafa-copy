import { Router } from "express";
import { UserController } from "../controllers/userController.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";
import { uploadProfilePicture } from "../middleware/uploadMiddleware.js";

const router = Router();

// ========== Static routes (must come BEFORE :userId routes) ==========

// Get all users with pagination
router.get("/", UserController.getAllUsers);

// Get free users (plan: "Free")
router.get("/free", UserController.getFreeUsers);

// Get paying users (plan: not "Free")
router.get("/paying", UserController.getPayingUsers);

// Get user statistics
router.get("/stats", UserController.getUserStats);

// Admin create user endpoint
router.post("/admin/create", UserController.createAdminUser);

// User profile routes (authenticated)
router.get("/profile", isAuthenticated, UserController.getProfile);
router.put("/profile", isAuthenticated, UserController.updateProfile);
router.post("/upload-photo", isAuthenticated, uploadProfilePicture, UserController.uploadProfilePicture);

// User stats and achievements (authenticated)
router.get("/my-stats", isAuthenticated, UserController.getMyStats);
router.post("/study-time", isAuthenticated, UserController.recordStudyTime);

// Get user's subscription info (authenticated)
router.get("/subscription-info", isAuthenticated, UserController.getSubscriptionInfo);

// Free semester selection routes (authenticated)
router.get("/free-semester-status", isAuthenticated, UserController.checkFreeSemesterStatus);
router.post("/select-free-semester", isAuthenticated, UserController.selectFreeSemester);

// Get the authenticated user's academic-year leaderboard
router.get("/leaderboard", isAuthenticated, UserController.getLeaderboard);

// Unlock achievement and send notification
router.post("/unlock-achievement", isAuthenticated, UserController.unlockAchievement);

// ========== Dynamic routes (must come AFTER static routes) ==========

// Update user plan (admin only)
router.patch("/:userId/plan", isAuthenticated, isAdmin, UserController.updateUserPlan);

// Toggle user active status (admin only)
router.patch("/:userId/status", isAuthenticated, isAdmin, UserController.toggleUserStatus);

// Block/Unblock user (admin only)
router.patch("/:userId/block", isAuthenticated, isAdmin, UserController.toggleBlockUser);

// Update user (admin only - for role and permissions)
router.put("/:userId", isAuthenticated, isAdmin, UserController.updateUser);

// Delete user (admin only)
router.delete("/:userId", isAuthenticated, isAdmin, UserController.deleteUser);

export default router;
