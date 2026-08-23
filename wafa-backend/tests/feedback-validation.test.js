import test from "node:test";
import assert from "node:assert/strict";
import { validatePublicReview } from "../controllers/feedbackController.js";

test("accepts a complete public review and normalizes its values", () => {
  const { review, errors } = validatePublicReview({
    name: "  Sara B. ",
    email: " SARA@EXAMPLE.COM ",
    subject: "Qualité de contenu",
    message: "  Les explications sont très utiles. ",
    rating: "5",
  });

  assert.deepEqual(errors, {});
  assert.equal(review.name, "Sara B.");
  assert.equal(review.email, "sara@example.com");
  assert.equal(review.rating, 5);
});

test("rejects invalid subjects, ratings, email addresses, and short messages", () => {
  const { errors } = validatePublicReview({
    name: "A",
    email: "invalid",
    subject: "Autre",
    message: "Court",
    rating: 6,
  });

  assert.deepEqual(Object.keys(errors).sort(), ["email", "message", "name", "rating", "subject"]);
});
