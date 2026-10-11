export const buildQuestionsCsv = (questions) => {
  const optionCount = questions.reduce((count, question) => Math.max(count, question.options?.length || 0), 5);
  const headers = ["ID", "Question", ...Array.from({ length: optionCount }, (_, index) =>
    `Option ${String.fromCharCode(65 + index)}`), "Correct Answer"];
  const rows = questions.map(question => [
    question._id || question.id || "",
    question.text || "",
    ...Array.from({ length: optionCount }, (_, index) => question.options?.[index]?.text || ""),
    question.isAnnulled ? "Annulée" : (question.options || [])
      .filter(option => option.isCorrect).map(option => option.text).join(" | "),
  ]);
  const escapeCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  // Excel needs a UTF-8 BOM for accents and an explicit separator because
  // the OS list separator differs between French and English installations.
  return "\ufeffsep=,\r\n" + [headers, ...rows]
    .map(row => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
};
