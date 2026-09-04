import test from "node:test";
import assert from "node:assert/strict";
import {
  displaySubscriptionCopy,
  displaySubscriptionPlanName,
  editableUserPlan,
  isPremiumProPlan,
} from "../src/utils/subscriptionDisplay.js";

test("legacy Premium Pro annual wording is shown as a semester plan", () => {
  assert.equal(displaySubscriptionPlanName("Premium Pro Annuel"), "Premium Pro Semestre");
  assert.equal(editableUserPlan("Premium Pro Annuel"), "Premium Pro");
  assert.equal(isPremiumProPlan("Premium Pro Annuel"), true);
});

test("legacy yearly descriptions no longer promise multi-semester access", () => {
  assert.equal(
    displaySubscriptionCopy("L'expérience intégrale pour toute votre année universitaire"),
    "L'expérience intégrale pour un semestre complet",
  );
  assert.equal(
    displaySubscriptionCopy("Accès à tous les semestres (S1 à S10)"),
    "Accès à tous les modules du semestre choisi",
  );
});
