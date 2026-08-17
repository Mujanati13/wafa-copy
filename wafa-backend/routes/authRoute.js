import express from "express";
import "../strategies/local-strategy.js";
import "../strategies/google-strategy.js";
import passport from "passport";
import { AuthController } from "../controllers/auth.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import {
  ActiveSessionError,
  createSingleSessionToken,
  establishSingleSession,
} from "../services/singleSessionService.js";

const router = express.Router();

router.post("/login", (req, res, next) => {
  console.log("📨 Login request body:", req.body);
  console.log("📨 Email:", req.body.email);
  console.log("📨 Password:", req.body.password ? "Present (length: " + req.body.password.length + ")" : "Missing");
  
  passport.authenticate("local", async (err, user, info) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!user) return res.status(401).json({ message: info.message });

    try {
      const sessionId = await establishSingleSession(req, user);
      const token = createSingleSessionToken(user, sessionId);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          adminRole: user.adminRole,
          permissions: user.permissions || [],
          plan: user.plan,
        },
      });
    } catch (loginError) {
      if (loginError instanceof ActiveSessionError) {
        return res.status(409).json({
          success: false,
          code: loginError.code,
          message: loginError.message,
        });
      }
      console.error("Failed to establish login session:", loginError);
      return res.status(500).json({ message: "Failed to establish session" });
    }
  })(req, res, next);
});

router.post("/register", AuthController.register);
router.post("/logout", isAuthenticated, AuthController.logout);
router.get("/check-auth", isAuthenticated, AuthController.checkAuth);

// Email verification
router.get("/verify-email", AuthController.verifyEmail);
router.post("/resend-verification", AuthController.resendVerification);

// Password reset
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/change-password", AuthController.changePassword);

// Profile verification (requires auth)
router.post("/send-profile-verification", isAuthenticated, AuthController.sendProfileVerification);
router.post("/verify-profile-code", isAuthenticated, AuthController.verifyProfileCode);

// Firebase Authentication
router.post("/firebase", AuthController.firebaseAuth);
router.post("/check-email", AuthController.checkEmail);

// Google OAuth (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", session: false }),
    AuthController.googleCallback
  );
}

export default router;
// Example Express route
