import express from "express";
import AdminAnalyticsController from "../controllers/adminAnalyticsController.js";
import { getOverviewStats, getOverviewActivity } from '../controllers/adminOverviewController.js';
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(isAuthenticated);
router.use(isAdmin);

// Analytics routes
router.get("/dashboard-stats", getOverviewStats);
router.get("/user-growth", AdminAnalyticsController.getUserGrowth);
router.get("/recent-activity", getOverviewActivity);
router.get("/subscriptions", AdminAnalyticsController.getSubscriptionAnalytics);
router.get("/demographics", AdminAnalyticsController.getUserDemographics);
router.get("/leaderboard", AdminAnalyticsController.getLeaderboard);
router.post("/reset-monthly-revenue", AdminAnalyticsController.resetMonthlyRevenue);
router.post("/reset-all-transactions", AdminAnalyticsController.resetAllTransactions);

export default router;
