import assert from "node:assert/strict";
import test, { after } from "node:test";
import mongoose from "mongoose";
import { buildModulePayload, ModulePayloadError } from "../utils/modulePayload.js";
import Module from "../models/moduleModel.js";

after(() => mongoose.disconnect());

test("create preserves module appearance and custom form fields", () => {
    const payload = buildModulePayload({
        name: "Biophysique",
        semester: "S2",
        availableInAllSemesters: "false",
        color: "#22c55e",
        gradientColor: "#14b8a6",
        gradientDirection: "to-r",
        difficulty: "hard",
        contentType: "text",
        infoText: "Description personnalisée",
        helpContent: "Guide personnalisé",
        textContent: "Contenu personnalisé",
    });

    assert.equal(payload.color, "#22c55e");
    assert.equal(payload.gradientColor, "#14b8a6");
    assert.equal(payload.gradientDirection, "to-r");
    assert.equal(payload.difficulty, "hard");
    assert.equal(payload.infoText, "Description personnalisée");
    assert.equal(payload.helpContent, "Guide personnalisé");
    assert.equal(payload.textContent, "Contenu personnalisé");
});

test("partial update overwrites appearance fields without applying defaults", () => {
    const payload = buildModulePayload({
        color: "green",
        gradientColor: "",
        gradientDirection: "to-br",
        helpContent: "",
    }, { partial: true });

    assert.deepEqual(payload, {
        color: "green",
        gradientColor: "",
        gradientDirection: "to-br",
        helpContent: "",
    });
});

test("invalid colors return a field-specific validation error", () => {
    assert.throws(
        () => buildModulePayload({ color: "linear-gradient(red, blue)" }, { partial: true }),
        (error) => error instanceof ModulePayloadError && error.field === "color" && error.statusCode === 422,
    );
});

test("all-semester modules intentionally clear the semester", () => {
    const payload = buildModulePayload({
        name: "Médecine générale",
        semester: "S6",
        availableInAllSemesters: "true",
        color: "#3b82f6",
    });

    assert.equal(payload.availableInAllSemesters, true);
    assert.equal(payload.semester, "");
});

test("mongoose schema keeps create and update appearance values", async () => {
    const module = new Module(buildModulePayload({
        name: "Physiologie",
        semester: "S2",
        color: "#22c55e",
        gradientColor: "#14b8a6",
        gradientDirection: "to-r",
    }));

    await module.validate();
    assert.equal(module.color, "#22c55e");
    assert.equal(module.gradientColor, "#14b8a6");

    module.set(buildModulePayload({
        color: "#3b82f6",
        gradientColor: "",
        gradientDirection: "to-br",
    }, { partial: true }));
    await module.validate();

    assert.equal(module.color, "#3b82f6");
    assert.equal(module.gradientColor, "");
    assert.equal(module.gradientDirection, "to-br");
});
