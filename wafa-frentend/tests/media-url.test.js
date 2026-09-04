import test from "node:test";
import assert from "node:assert/strict";
import { resolveQuestionImageUrl } from "../src/lib/mediaUrl.js";

const publicOptions = {
  apiUrl: "/api/v1",
  browserOrigin: "https://yourqcm.online",
};

test("keeps canonical question upload paths on the public origin", () => {
  assert.equal(
    resolveQuestionImageUrl("/uploads/questions/question-1.jpg", publicOptions),
    "/uploads/questions/question-1.jpg",
  );
});

test("repairs legacy relative and filesystem-style question paths", () => {
  assert.equal(resolveQuestionImageUrl("uploads/questions/question-1.jpg", publicOptions), "/uploads/questions/question-1.jpg");
  assert.equal(resolveQuestionImageUrl("questions/question-1.jpg", publicOptions), "/uploads/questions/question-1.jpg");
  assert.equal(resolveQuestionImageUrl("C:\\app\\uploads\\questions\\question-1.jpg", publicOptions), "/uploads/questions/question-1.jpg");
});

test("rewrites internal absolute URLs so visitors never request localhost", () => {
  assert.equal(
    resolveQuestionImageUrl("http://localhost:5010/uploads/questions/question-1.jpg", publicOptions),
    "/uploads/questions/question-1.jpg",
  );
});

test("rewrites stale application upload domains to the current public origin", () => {
  assert.equal(
    resolveQuestionImageUrl("https://old.example.com/uploads/questions/question-1.jpg", publicOptions),
    "/uploads/questions/question-1.jpg",
  );
});

test("uses an absolute API origin without retaining the /api/v1 prefix", () => {
  assert.equal(
    resolveQuestionImageUrl("/uploads/questions/question-1.jpg", {
      apiUrl: "https://api.example.com/api/v1",
      browserOrigin: "https://app.example.com",
    }),
    "https://api.example.com/uploads/questions/question-1.jpg",
  );
});

test("preserves public external image URLs", () => {
  const url = "https://res.cloudinary.com/demo/image/upload/question-1.jpg";
  assert.equal(resolveQuestionImageUrl(url, publicOptions), url);
});
