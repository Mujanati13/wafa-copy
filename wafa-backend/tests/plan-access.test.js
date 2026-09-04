import test from "node:test";
import assert from "node:assert/strict";
import { applyAdminPlanTransition, normalizeUserPlan, userHasPremiumAccess } from "../utils/planAccess.js";

test("downgrading a premium user clears every content entitlement", () => {
    const { updates, downgradedToFree } = applyAdminPlanTransition("Premium", {
        plan: "Free",
        semesters: ["S1", "S2"],
    });

    assert.equal(downgradedToFree, true);
    assert.deepEqual(updates.semesters, []);
    assert.equal(updates.freeExam, null);
    assert.equal(updates.freeModule, null);
    assert.equal(updates.hasUsedFreeSemester, false);
    assert.equal(updates.planExpiry, null);
});

test("saving an existing free user does not erase their free entitlement", () => {
    const { updates, downgradedToFree } = applyAdminPlanTransition("Free", {
        plan: "Free",
        semesters: ["S1"],
    });

    assert.equal(downgradedToFree, false);
    assert.deepEqual(updates.semesters, ["S1"]);
    assert.equal(Object.hasOwn(updates, "freeExam"), false);
});

test("premium access rejects free and expired accounts", () => {
    const now = new Date("2026-09-01T12:00:00.000Z");
    assert.equal(userHasPremiumAccess({ plan: "Free" }, now), false);
    assert.equal(userHasPremiumAccess({ plan: "Premium", planExpiry: "2026-08-01T00:00:00.000Z" }, now), false);
    assert.equal(userHasPremiumAccess({ plan: "Premium", planExpiry: "2026-10-01T00:00:00.000Z" }, now), true);
    assert.equal(userHasPremiumAccess({ plan: "Premium Pro", planExpiry: "2026-10-01T00:00:00.000Z" }, now), true);
    assert.equal(userHasPremiumAccess({ plan: "Free", isAdmin: true }, now), true);
});

test("legacy paid plan names normalize without losing Premium Pro", () => {
    assert.equal(normalizeUserPlan("Premium Annuel"), "Premium");
    assert.equal(normalizeUserPlan("Premium Pro Annuel"), "Premium Pro");
    assert.equal(normalizeUserPlan("Premium Pro Semestre"), "Premium Pro");
});
