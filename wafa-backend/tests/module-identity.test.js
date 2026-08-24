import test from "node:test";
import assert from "node:assert/strict";

import {
    findEquivalentModules,
    moduleNamesAreEquivalent,
    normalizeModuleIdentity,
} from "../utils/moduleIdentity.js";

test("normalizes accents, punctuation, spacing, and Roman numerals", () => {
    assert.equal(normalizeModuleIdentity("  Anatomie-I  "), "anatomie 1");
    assert.equal(moduleNamesAreEquivalent("Anatomie I", "Anatomie 1"), true);
});

test("normalizes narrow French naming variants used by legacy imports", () => {
    assert.equal(
        moduleNamesAreEquivalent("Pathologies digestif", "Pathologie digestive"),
        true,
    );
});

test("does not merge different numbered modules", () => {
    assert.equal(moduleNamesAreEquivalent("Anatomie I", "Anatomie II"), false);
});

test("only returns equivalent modules in the selected semester", () => {
    const selected = { _id: "current", name: "Anatomie I", semester: "S1" };
    const candidates = [
        selected,
        { _id: "legacy", name: "Anatomie 1", semester: "S1" },
        { _id: "wrong-semester", name: "Anatomie 1", semester: "S2" },
        { _id: "other", name: "Anatomie II", semester: "S1" },
    ];

    assert.deepEqual(
        findEquivalentModules(selected, candidates).map((module) => module._id),
        ["current", "legacy"],
    );
});
