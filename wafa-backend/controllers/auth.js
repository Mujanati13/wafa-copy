import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../utils/emailService.js";
import { 
  verifyFirebaseToken, 
  generatePasswordResetLink,
  getFirebaseUserByEmail,
  isFirebaseInitialized 
} from "../config/firebase.js";
import { validateEmailAddress } from "../utils/emailValidator.js";
import {
  ActiveSessionError,
  createSingleSessionToken,
  establishSingleSession,
  releaseSingleSession,
} from "../services/singleSessionService.js";

const completeSessionLogin = async (req, user) => {
  const sessionId = await establishSingleSession(req, user);
  return createSingleSessionToken(user, sessionId);
};

const sendSessionError = (res, error) => {
  if (error instanceof ActiveSessionError) {
    return res.status(409).json({
      success: false,
      code: error.code,
      message: error.message,
      activeSession: error.activeSession,
    });
  }

  console.error("Failed to establish session:", error);
  return res.status(500).json({
    success: false,
    message: "Failed to create session",
  });
};


export const AuthController = {
 
  login: (req, res) => {
    res.status(200).json({
      message: "Login successful",
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
      },
    });
  },


  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Validate email address (format, disposable domains, DNS check)
      const emailValidation = await validateEmailAddress(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
          field: 'email'
        });
      }

      // Check if user already exists in database
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      // Check if email exists in Firebase
      if (isFirebaseInitialized()) {
        try {
          const firebaseUser = await getFirebaseUserByEmail(email);
          if (firebaseUser) {
            return res.status(400).json({
              message: "This email is already registered with Google. Please sign in with Google.",
              authProvider: "firebase"
            });
          }
        } catch (firebaseError) {
          // User not found in Firebase, continue with normal registration
          console.log('Email not found in Firebase, proceeding with normal registration');
        }
      }

      const hashPassword = await bcrypt.hash(password, 10);
      
      // Email verification disabled - users can log in immediately
      const newUser = await User.create({
        username,
        name: username, // Set name to username if not provided
        email,
        password: hashPassword,
        emailVerified: true, // Auto-verified - no email verification required
      });

      // Registration successful - user can log in immediately
      res.status(201).json({
        success: true,
        message: "Registration successful! You can now log in with your credentials.",
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          emailVerified: newUser.emailVerified,
        },
        requiresVerification: false,
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error.code === 11000) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }
      res.status(500).json({
        message: "Registration failed",
        error: error.message,
      });
    }
  },

  /**
   * Verify user email with token
   */
  verifyEmail: async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Verification token is required",
        });
      }

      // First check if token exists with any user (expired or not)
      const userWithToken = await User.findOne({
        emailVerificationToken: token,
      });

      if (!userWithToken) {
        // Token doesn't exist at all - either invalid or already used
        const alreadyVerified = await User.findOne({
          emailVerificationToken: { $exists: false },
          email: { $exists: true }
        }).limit(1);
        
        return res.status(400).json({
          success: false,
          message: "Invalid verification link or email already verified",
          alreadyVerified: false,
        });
      }

      // Check if already verified
      if (userWithToken.emailVerified) {
        return res.status(200).json({
          success: true,
          message: "Your email is already verified! You can log in now.",
          emailVerified: true,
          alreadyVerified: true,
        });
      }

      // Check if token is expired
      if (userWithToken.emailVerificationExpires < Date.now()) {
        return res.status(400).json({
          success: false,
          message: "Verification link has expired. Please request a new one.",
          expired: true,
          email: userWithToken.email,
        });
      }

      // Token is valid and not expired - verify the email
      userWithToken.emailVerified = true;
      userWithToken.emailVerificationToken = undefined;
      userWithToken.emailVerificationExpires = undefined;
      userWithToken.lastLogin = new Date();
      await userWithToken.save();

      // Send welcome email
      try {
        await sendWelcomeEmail(userWithToken.email, userWithToken.username);
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
      }

      res.status(200).json({
        success: true,
        message: "✅ Email verified successfully! Your account is now active. You can log in now.",
        emailVerified: true,
        user: {
          id: userWithToken._id,
          email: userWithToken.email,
          username: userWithToken.username,
        }
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({
        success: false,
        message: "Email verification failed",
        error: error.message,
      });
    }
  },

  /**
   * Resend verification email
   */
  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = verificationExpires;
      await user.save();

      await sendVerificationEmail(user.email, user.username, verificationToken);

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resend verification email",
        error: error.message,
      });
    }
  },

  /**
   * Request password reset
   */
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal that user doesn't exist for security
        return res.status(200).json({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent.",
        });
      }

      // Check if user has Firebase account
      if (user.firebaseUid && isFirebaseInitialized()) {
        try {
          // Generate Firebase password reset link
          const firebaseResetLink = await generatePasswordResetLink(email);
          
          // Send Firebase reset email (you can customize this to use your email service)
          await sendPasswordResetEmail(user.email, user.username, null, firebaseResetLink);
          
          return res.status(200).json({
            success: true,
            message: "If an account exists with this email, a password reset link has been sent.",
            authProvider: "firebase",
          });
        } catch (firebaseError) {
          console.error("Firebase password reset error:", firebaseError);
          // Fall back to traditional reset if Firebase fails
        }
      }

      // Traditional password reset for non-Firebase users
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await user.save();

      await sendPasswordResetEmail(user.email, user.username, resetToken);

      res.status(200).json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
        authProvider: "local",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process password reset request",
        error: error.message,
      });
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      const hashPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password reset successfully! You can now login with your new password.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
        error: error.message,
      });
    }
  },

  /**
   * Change password (for logged-in users)
   */
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash and save new password
      const hashPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to change password",
        error: error.message,
      });
    }
  },

  /**
   * Handles user logout.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  logout: async (req, res) => {
    // Authentication already proved ownership of the account. Clear every
    // lease field instead of depending on a potentially stale session ID.
    await releaseSingleSession(req.user?._id);

    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          message: "Logout failed",
        });
      }

      req.session.destroy((destroyError) => {
        if (destroyError) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({ message: "Logout successful" });
      });
    });
  },
  /**
  * Handles user logout.
  * @param {Request} req - Express request object
  * @param {Response} res - Express response object
  */
  checkAuth: (req, res) => {
    return res.status(200).json({
      loggedIn: true,
    });
  },

  googleCallback: async (req, res) => {
    try {
      await establishSingleSession(req, req.user);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/home`);
    } catch (error) {
      if (error instanceof ActiveSessionError) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=account_active`);
      }
      console.error("Google login session error:", error);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_failed`);
    }
  },

  /**
   * Firebase Authentication - Verify Firebase token and login/register user
   */
  firebaseAuth: async (req, res) => {
    try {
      const { idToken, firstName, lastName } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "Firebase ID token is required",
        });
      }

      // Verify the Firebase token
      let decodedToken;
      try {
        decodedToken = await verifyFirebaseToken(idToken);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired Firebase token",
          error: error.message,
        });
      }

      const { uid, email, name, picture, email_verified } = decodedToken;

      // Check if user exists with Firebase UID
      let user = await User.findOne({ firebaseUid: uid });

      if (user) {
        // Check if user is blocked
        if (user.isBlocked) {
          const reason = user.blockedReason ? ` Reason: ${user.blockedReason}` : "";
          return res.status(403).json({
            success: false,
            message: `Your account has been blocked.${reason} Please contact support.`,
            isBlocked: true,
          });
        }

        // Update email verification status from Firebase
        if (email_verified && !user.emailVerified) {
          user.emailVerified = true;
          user.emailVerificationToken = undefined;
          user.emailVerificationExpires = undefined;
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();

        try {
          const token = await completeSessionLogin(req, user);
          return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
              id: user._id,
              username: user.username,
              email: user.email,
              name: user.name,
              profilePicture: user.profilePicture,
              emailVerified: user.emailVerified,
              isAdmin: user.isAdmin,
              adminRole: user.adminRole,
              permissions: user.permissions || [],
              plan: user.plan,
              role: user.role,
            },
          });
        } catch (error) {
          return sendSessionError(res, error);
        }
      }

      // Check if user exists with this email
      user = await User.findOne({ email });

      if (user) {
        // Check if user is blocked
        if (user.isBlocked) {
          const reason = user.blockedReason ? ` Reason: ${user.blockedReason}` : "";
          return res.status(403).json({
            success: false,
            message: `Your account has been blocked.${reason} Please contact support.`,
            isBlocked: true,
          });
        }

        // Link Firebase account to existing user
        user.firebaseUid = uid;
        
        // Update email verification from Firebase
        if (email_verified) {
          user.emailVerified = true;
          user.emailVerificationToken = undefined;
          user.emailVerificationExpires = undefined;
        }
        
        if (!user.profilePicture && picture) {
          user.profilePicture = picture;
        }
        // Update name if firstName/lastName provided and user has no name
        if (!user.name || user.name === user.username) {
          if (firstName && lastName) {
            user.name = `${firstName} ${lastName}`;
          } else if (firstName) {
            user.name = firstName;
          } else if (lastName) {
            user.name = lastName;
          } else if (name) {
            user.name = name;
          }
        }
        user.lastLogin = new Date();
        await user.save();

        try {
          const token = await completeSessionLogin(req, user);
          return res.status(200).json({
            success: true,
            message: "Account linked and login successful",
            token,
            user: {
              id: user._id,
              username: user.username,
              email: user.email,
              name: user.name,
              profilePicture: user.profilePicture,
              emailVerified: user.emailVerified,
              isAdmin: user.isAdmin,
              adminRole: user.adminRole,
              permissions: user.permissions || [],
              plan: user.plan,
              role: user.role,
            },
          });
        } catch (error) {
          return sendSessionError(res, error);
        }
      }

      // Create new user with Firebase authentication
      const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
      
      // Build full name from firstName and lastName if provided, otherwise use Firebase name or username
      let fullName = name || username;
      if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
      } else if (firstName) {
        fullName = firstName;
      } else if (lastName) {
        fullName = lastName;
      }
      
      const newUser = await User.create({
        firebaseUid: uid,
        email,
        username,
        name: fullName,
        emailVerified: email_verified || false,
        profilePicture: picture || null,
        lastLogin: new Date(),
      });

      // Send welcome email
      try {
        await sendWelcomeEmail(email, fullName);
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
      }

      try {
        const token = await completeSessionLogin(req, newUser);
        return res.status(201).json({
          success: true,
          message: "User registered and logged in successfully",
          token,
          user: {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            name: newUser.name,
            profilePicture: newUser.profilePicture,
            emailVerified: newUser.emailVerified,
            isAdmin: newUser.isAdmin || false,
            adminRole: newUser.adminRole || null,
            permissions: newUser.permissions || [],
            plan: newUser.plan || "Free",
            role: newUser.role,
          },
        });
      } catch (error) {
        return sendSessionError(res, error);
      }
    } catch (error) {
      console.error("Firebase authentication error:", error);
      res.status(500).json({
        success: false,
        message: "Firebase authentication failed",
        error: error.message,
      });
    }
  },

  /**
   * Check if email exists and which auth provider it uses
   */
  checkEmail: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Check in database
      const user = await User.findOne({ email });

      if (user) {
        // Determine auth provider
        const authProvider = user.firebaseUid ? 'firebase' : user.googleId ? 'google' : 'local';
        
        return res.status(200).json({
          exists: true,
          authProvider,
          message: authProvider === 'firebase' || authProvider === 'google' 
            ? 'Email registered with Google/Firebase' 
            : 'Email registered with password'
        });
      }

      // Check Firebase if initialized
      if (isFirebaseInitialized()) {
        try {
          const firebaseUser = await getFirebaseUserByEmail(email);
          if (firebaseUser) {
            return res.status(200).json({
              exists: true,
              authProvider: 'firebase',
              message: 'Email exists in Firebase'
            });
          }
        } catch (firebaseError) {
          // User not found in Firebase
        }
      }

      res.status(200).json({
        exists: false,
        message: 'Email available'
      });
    } catch (error) {
      console.error("Check email error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check email",
        error: error.message,
      });
    }
  },

  /**
   * Send profile verification code to user's email
   */
  sendProfileVerification: async (req, res) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé",
        });
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store the code in the user document (using resetCode field temporarily)
      user.resetCode = verificationCode;
      user.resetPasswordExpires = codeExpires;
      await user.save();

      // Send email with verification code
      const { sendProfileVerificationEmail } = await import("../utils/emailService.js");
      await sendProfileVerificationEmail(user.email, user.name || user.username, verificationCode);

      res.status(200).json({
        success: true,
        message: "Code de vérification envoyé",
      });
    } catch (error) {
      console.error("Send profile verification error:", error);
      res.status(500).json({
        success: false,
        message: "Échec de l'envoi du code de vérification",
        error: error.message,
      });
    }
  },

  /**
   * Verify profile code
   */
  verifyProfileCode: async (req, res) => {
    try {
      const userId = req.user._id;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Code de vérification requis",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé",
        });
      }

      // Check if code matches and not expired
      if (user.resetCode !== code) {
        return res.status(400).json({
          success: false,
          message: "Code de vérification invalide",
        });
      }

      if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Le code de vérification a expiré",
        });
      }

      // Clear the verification code
      user.resetCode = null;
      user.resetPasswordExpires = null;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Code vérifié avec succès",
      });
    } catch (error) {
      console.error("Verify profile code error:", error);
      res.status(500).json({
        success: false,
        message: "Échec de la vérification du code",
        error: error.message,
      });
    }
  },
};
