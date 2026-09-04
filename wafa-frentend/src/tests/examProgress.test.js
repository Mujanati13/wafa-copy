import test from "node:test";
import assert from "node:assert/strict";
import {
  EXAM_PROGRESS_UPDATED_EVENT,
  getSessionExamCompletedCount,
  publishExamCompletedCount,
} from "../utils/examProgress.js";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

test("publishes and restores an exam's completed-question count", () => {
  const events = [];
  globalThis.window = {
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    dispatchEvent: (event) => events.push(event),
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  window.localStorage.setItem("user", JSON.stringify({ _id: "user-1" }));

  publishExamCompletedCount("exam-1", 2);

  assert.equal(getSessionExamCompletedCount("exam-1"), 2);
  assert.equal(events[0].type, EXAM_PROGRESS_UPDATED_EVENT);
  assert.deepEqual(events[0].detail, { examId: "exam-1", completedQuestions: 2 });
});

test("keeps cached progress isolated between users", () => {
  globalThis.window = {
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    dispatchEvent: () => {},
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  };

  window.localStorage.setItem("user", JSON.stringify({ _id: "user-1" }));
  publishExamCompletedCount("exam-1", 2);
  window.localStorage.setItem("user", JSON.stringify({ _id: "user-2" }));

  assert.equal(getSessionExamCompletedCount("exam-1"), 0);
});
