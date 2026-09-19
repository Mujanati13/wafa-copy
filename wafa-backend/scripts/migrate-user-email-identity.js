import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/userModel.js";

dotenv.config();

const migrateUserEmailIdentity = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required to migrate user email identities.");
  }

  await mongoose.connect(process.env.MONGO_URL, { autoIndex: false });
  try {
    const duplicateGroups = await User.aggregate([
      {
        $project: {
          normalizedEmail: {
            $toLower: { $trim: { input: { $ifNull: ["$email", ""] } } },
          },
        },
      },
      { $group: { _id: "$normalizedEmail", count: { $sum: 1 } } },
      { $match: { _id: { $ne: "" }, count: { $gt: 1 } } },
      { $limit: 20 },
    ]);

    if (duplicateGroups.length > 0) {
      const duplicateEmails = duplicateGroups.map(({ _id }) => _id).join(", ");
      throw new Error(
        `Case-insensitive duplicate emails must be merged before migration: ${duplicateEmails}. No user records were changed.`,
      );
    }

    await User.collection.updateMany(
      { email: { $type: "string" } },
      [{ $set: { email: { $toLower: { $trim: { input: "$email" } } } } }],
    );
    await User.collection.createIndex({ email: 1 }, { unique: true, name: "email_1" });

    console.log("User emails are normalized and uniquely indexed case-insensitively.");
  } finally {
    await mongoose.disconnect();
  }
};

migrateUserEmailIdentity().catch((error) => {
  console.error("User email identity migration failed:", error.message);
  process.exitCode = 1;
});
