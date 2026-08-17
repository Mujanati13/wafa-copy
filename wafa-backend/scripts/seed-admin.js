import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../models/userModel.js";

dotenv.config({ path: process.env.ENV_FILE || undefined });

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set before running the admin seeder.`);
  }
  return value;
};

const seedAdmin = async () => {
  const mongoUrl = required("MONGO_URL");
  const email = required("ADMIN_SEED_EMAIL").toLowerCase();
  const password = required("ADMIN_SEED_PASSWORD");
  const name = process.env.ADMIN_SEED_NAME?.trim() || "Administrator";

  if (password.length < 12) {
    throw new Error("ADMIN_SEED_PASSWORD must be at least 12 characters long.");
  }

  await mongoose.connect(mongoUrl);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    let admin = await User.findOne({ email }).select("+activeSessionId +activeSessionExpiresAt");

    if (admin) {
      admin.name = name;
      admin.password = passwordHash;
      admin.isAdmin = true;
      admin.adminRole = "super_admin";
      admin.permissions = ["users", "content", "analytics", "payments", "notifications", "reports", "settings"];
      admin.isAactive = true;
      admin.isBlocked = false;
      admin.blockedAt = null;
      admin.blockedReason = null;
      admin.emailVerified = true;
      admin.activeSessionId = null;
      admin.activeSessionExpiresAt = null;
      await admin.save();
      console.log(`Updated administrator account: ${email}`);
    } else {
      const username = `admin_${email.split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 24) || "user"}`;
      admin = await User.create({
        username,
        name,
        email,
        password: passwordHash,
        isAdmin: true,
        adminRole: "super_admin",
        permissions: ["users", "content", "analytics", "payments", "notifications", "reports", "settings"],
        isAactive: true,
        isBlocked: false,
        emailVerified: true,
        plan: "Premium",
        planExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      console.log(`Created administrator account: ${admin.email}`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin().catch((error) => {
  console.error(`Admin seed failed: ${error.message}`);
  process.exitCode = 1;
});
