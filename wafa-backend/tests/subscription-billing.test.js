import test from "node:test";
import assert from "node:assert/strict";
import { getBillingConfig, validatePlanSemesters } from "../utils/subscriptionBilling.js";

test("Premium Pro is always billed for one semester even with legacy annual metadata", () => {
  assert.deepEqual(
    getBillingConfig({ name: "Premium Pro Annuel", period: "Annuel", price: 399 }),
    { duration: "6months", semesterCount: 1, transactionPlan: "Premium Pro" },
  );
});

test("a paid plan accepts exactly one valid semester", () => {
  assert.deepEqual(validatePlanSemesters(["S7"]), ["S7"]);
  assert.throws(() => validatePlanSemesters(["S7", "S8"]), /exactly 1 valid semester/);
  assert.throws(() => validatePlanSemesters([]), /exactly 1 valid semester/);
});
