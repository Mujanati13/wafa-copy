import test from "node:test";
import assert from "node:assert/strict";
import User from "../models/userModel.js";
import { buildCaseInsensitiveEmailLookup, normalizeEmail } from "../utils/emailIdentity.js";

test("normalizes email identity before it is persisted", () => {
  const user = new User({
    username: "Test User",
    email: "  Kadrabinada@GMAIL.COM  ",
  });

  assert.equal(normalizeEmail(user.email), "kadrabinada@gmail.com");
  assert.equal(user.email, "kadrabinada@gmail.com");
  assert.equal(User.schema.path("email").options.lowercase, true);
});

test("builds a case-insensitive lookup for legacy mixed-case accounts", () => {
  assert.deepEqual(
    buildCaseInsensitiveEmailLookup("Kadrabinada@GMAIL.COM"),
    {
      email: {
        $regex: "^kadrabinada@gmail\\.com$",
        $options: "i",
      },
    },
  );
});
