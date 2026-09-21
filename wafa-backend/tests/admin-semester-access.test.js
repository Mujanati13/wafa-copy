import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSemesterAccess } from "../utils/semesterAccess.js";

test("admin semester access preserves multiple valid selections", () => {
  assert.deepEqual(
    normalizeSemesterAccess(["S7", "s1", "S7", " S10 "]),
    ["S1", "S7", "S10"],
  );
});

test("admin semester access rejects non-array and unsupported values", () => {
  assert.equal(normalizeSemesterAccess("S1"), null);
  assert.equal(normalizeSemesterAccess(["S1", "S11"]), null);
});
