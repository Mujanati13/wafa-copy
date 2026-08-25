import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/userModel.js";

dotenv.config();

const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run session:clear -- user@example.com");
  process.exit(1);
}

if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is not configured.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URL);
  const result = await User.updateOne(
    { email },
    {
      $unset: {
        activeSessionId: 1,
        activeSessionExpiresAt: 1,
        activeSessionIp: 1,
        activeSessionDevice: 1,
        activeSessionLocation: 1,
        activeSessionStartedAt: 1,
        activeSessionClientId: 1,
      },
    }
  );

  if (result.matchedCount === 0) {
    console.error("No user was found for that email address.");
    process.exitCode = 2;
  } else {
    console.log("The account session lease was cleared successfully.");
  }
} finally {
  await mongoose.disconnect();
}
