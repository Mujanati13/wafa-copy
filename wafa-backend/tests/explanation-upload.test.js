import test from "node:test";
import assert from "node:assert/strict";

import {
    isAllowedExplanationFile,
    MAX_EXPLANATION_FILE_SIZE,
} from "../utils/explanationUpload.js";

test("accepts supported explanation images and documents", () => {
    assert.equal(isAllowedExplanationFile({ fieldname: "images", originalname: "schema.webp", mimetype: "image/webp" }), true);
    assert.equal(isAllowedExplanationFile({ fieldname: "pdf", originalname: "cours.pdf", mimetype: "application/pdf" }), true);
    assert.equal(isAllowedExplanationFile({ fieldname: "pdf", originalname: "cours.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), true);
});

test("accepts generic browser MIME only for a supported extension", () => {
    assert.equal(isAllowedExplanationFile({ fieldname: "pdf", originalname: "cours.pptx", mimetype: "application/octet-stream" }), true);
    assert.equal(isAllowedExplanationFile({ fieldname: "pdf", originalname: "cours.doc", mimetype: "" }), true);
    assert.equal(isAllowedExplanationFile({ fieldname: "pdf", originalname: "script.exe", mimetype: "application/octet-stream" }), false);
});

test("rejects a mismatched field and exposes the 100 MiB boundary", () => {
    assert.equal(isAllowedExplanationFile({ fieldname: "images", originalname: "cours.pdf", mimetype: "application/pdf" }), false);
    assert.equal(MAX_EXPLANATION_FILE_SIZE, 100 * 1024 * 1024);
});
