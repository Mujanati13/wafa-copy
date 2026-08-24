import test from "node:test";
import assert from "node:assert/strict";

import {
    isAllowedResumeFile,
    MAX_RESUME_FILE_SIZE,
    sanitizeResumeFilename,
} from "../utils/resumeUpload.js";

test("accepts supported résumé documents and Windows octet-stream PDFs", () => {
    assert.equal(isAllowedResumeFile({ originalname: "cours.pdf", mimetype: "application/pdf" }), true);
    assert.equal(isAllowedResumeFile({ originalname: "cours.pdf", mimetype: "application/octet-stream" }), true);
    assert.equal(isAllowedResumeFile({ originalname: "fiche.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), true);
});

test("rejects unsupported extensions even when their MIME looks harmless", () => {
    assert.equal(isAllowedResumeFile({ originalname: "script.exe", mimetype: "application/octet-stream" }), false);
    assert.equal(isAllowedResumeFile({ originalname: "fake.pdf.exe", mimetype: "application/pdf" }), false);
});

test("generates a safe filename and exposes the 50 MB boundary", () => {
    const filename = sanitizeResumeFilename("anatomie globale oculaire 2.pdf");
    assert.match(filename, /^resume-\d+-\d+-anatomie_globale_oculaire_2\.pdf$/);
    assert.equal(MAX_RESUME_FILE_SIZE, 50 * 1024 * 1024);
});
