import Passport from "passport";
import { Strategy } from "passport-local";
import user from "../models/userModel.js";
import bcrypt from "bcrypt";

const shouldLogAuth = () => (
  process.env.AUTH_FAILURE_LOGGING === "true" || process.env.NODE_ENV !== "production"
);

Passport.serializeUser((authenticatedUser, done) => {
  done(null, authenticatedUser._id);
});

Passport.deserializeUser(async (id, done) => {
  try {
    const foundUser = await user.findById(id);
    if (!foundUser) {
      if (shouldLogAuth()) {
        console.log("Session user not found, clearing session");
      }
      return done(null, false);
    }

    done(null, foundUser);
  } catch (error) {
    done(error, null);
  }
});

export default Passport.use(
  new Strategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const normalizedEmail = typeof email === "string" ? email.trim() : email;
      if (shouldLogAuth()) {
        console.log("Login attempt:", normalizedEmail);
      }

      const foundUser = await user.findOne({ email: normalizedEmail });
      if (!foundUser) {
        throw new Error("User not found");
      }

      if (foundUser.isBlocked) {
        if (shouldLogAuth()) {
          console.log("User is blocked:", normalizedEmail);
        }
        const reason = foundUser.blockedReason ? ` Reason: ${foundUser.blockedReason}` : "";
        throw new Error(`Your account has been blocked.${reason} Please contact support.`);
      }

      if (!foundUser.password) {
        throw new Error("This account uses Google sign-in. Please sign in with Google.");
      }

      if (!password) {
        throw new Error("Password is required");
      }

      const comparePassword = await bcrypt.compare(password, foundUser.password);
      if (!comparePassword) {
        throw new Error("Invalid credentials");
      }

      return done(null, foundUser);
    } catch (error) {
      done(error, null);
    }
  })
);
