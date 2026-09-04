import Passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/userModel.js";

// Configure Google OAuth Strategy only if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  Passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/v1/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with this email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.emailVerified = true; // Google accounts are pre-verified
          if (!user.profilePicture) {
            user.profilePicture = profile.photos[0]?.value;
          }
          await user.save();
          return done(null, user);
        }

        // Create new user
        const newUser = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          username: profile.displayName || profile.emails[0].value.split('@')[0],
          name: profile.displayName,
          university: "",
          emailVerified: true,
          profilePicture: profile.photos[0]?.value,
          // No password for OAuth users
        });

        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    }
    )
  );
} else {
  console.log('⚠️  Google OAuth is disabled. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable.');
}

export default Passport;
