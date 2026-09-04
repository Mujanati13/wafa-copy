/**
 * Authentication and Authorization Middleware
 */
import jwt from "jsonwebtoken";
import { refreshSingleSession } from "../services/singleSessionService.js";
import { normalizeUserPlan, userHasPremiumAccess } from "../utils/planAccess.js";

const shouldLogAuthFailures = () => (
  process.env.AUTH_FAILURE_LOGGING === "true" || process.env.NODE_ENV !== "production"
);

/**
 * Middleware to check if user is authenticated (supports both session and JWT)
 */
export const isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
      const user = await refreshSingleSession(decoded.id || decoded.userId, decoded.sid);
      if (user) {
        req.user = user;
        req.authSessionId = decoded.sid;
        return next();
      }
    } catch (error) {
      if (shouldLogAuthFailures()) {
        console.error('JWT/session verification failed:', error.message);
      }
    }
  } else if (req.isAuthenticated && req.isAuthenticated()) {
    const sessionId = req.session?.singleSessionId;
    const user = await refreshSingleSession(req.user?._id, sessionId);
    if (user) {
      req.user = user;
      req.authSessionId = sessionId;
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    code: "SESSION_INVALID",
    message: "This session is no longer active. Please login again.",
  });
};

/**
 * Middleware to check if user is an admin
 * Note: Should be used after isAuthenticated middleware
 */
export const isAdmin = (req, res, next) => {
  // Check if user exists (set by isAuthenticated or session)
  if (req.user) {
    if (req.user.isAdmin) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
  
  return res.status(401).json({
    success: false,
    message: "Authentication required. Please login to access this resource.",
  });
};

/**
 * Middleware to check if user's email is verified
 * Note: Should be used after isAuthenticated middleware
 */
export const isEmailVerified = (req, res, next) => {
  if (req.user) {
    if (req.user.emailVerified) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Email verification required. Please verify your email to access this resource.",
      emailVerified: false,
    });
  }
  
  return res.status(401).json({
    success: false,
    message: "Authentication required. Please login to access this resource.",
  });
};

/**
 * Middleware to check if user has active subscription
 * Note: Should be used after isAuthenticated middleware
 */
export const hasActiveSubscription = (req, res, next) => {
  if (req.user) {
    const user = req.user;
    
    // Free users can access
    if (user.plan === "Free") {
      return next();
    }
    
    // Both paid semester tiers need to have a valid expiry.
    if (normalizeUserPlan(user.plan) !== "Free") {
      if (userHasPremiumAccess(user)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: "Your premium subscription has expired. Please renew to continue.",
        subscriptionExpired: true,
      });
    }
    
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: "Authentication required. Please login to access this resource.",
  });
};

/**
 * Restrict free users to the single exam selected during onboarding.
 * Must run after isAuthenticated. Paid users and admins are unaffected.
 */
export const hasExamAccess = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  if (user.isAdmin || userHasPremiumAccess(user)) {
    return next();
  }

  if (normalizeUserPlan(user.plan) !== "Free") {
    return res.status(403).json({
      success: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "Your premium subscription has expired. Please renew to continue.",
    });
  }

  const requestedExamId = req.params.examId || req.params.id || req.body?.examId || req.body?.qcmBanqueId;
  const freeExamId = user.freeExam?.toString();

  if (requestedExamId && freeExamId && requestedExamId.toString() === freeExamId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    code: "FREE_PLAN_EXAM_LIMIT",
    message: "The free plan includes one exam from one module. Upgrade to access this exam.",
  });
};

/** Require a currently active paid plan for premium-only resources. */
export const requiresPremiumAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  if (userHasPremiumAccess(req.user)) return next();

  return res.status(403).json({
    success: false,
    code: "PREMIUM_REQUIRED",
    message: "This feature requires an active premium subscription.",
  });
};

/**
 * Optional authentication - doesn't block if not authenticated
 */
export const optionalAuth = (req, res, next) => {
  // Just continue whether authenticated or not
  next();
};

export default {
  isAuthenticated,
  isAdmin,
  isEmailVerified,
  hasActiveSubscription,
  hasExamAccess,
  requiresPremiumAccess,
  optionalAuth,
};
