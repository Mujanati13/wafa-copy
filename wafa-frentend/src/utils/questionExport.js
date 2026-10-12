export const QUESTIONS_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Keep the spreadsheet library out of the initial admin page bundle.
export const buildQuestionsXlsx = async (questions) => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "YourQcm";
  const sheet = workbook.addWorksheet("Questions", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  const optionCount = questions.reduce((count, question) => Math.max(count, question.options?.length || 0), 5);
  sheet.columns = [
    { header: "ID", width: 28 },
    { header: "Question", width: 65 },
    ...Array.from({ length: optionCount }, (_, index) => ({
      header: `Option ${String.fromCharCode(65 + index)}`, width: 32,
    })),
    { header: "Correct Answer", width: 45 },
  ];

  questions.forEach((question, index) => {
    const row = sheet.addRow([
      String(question._id || question.id || ""),
      question.text || "",
      ...Array.from({ length: optionCount }, (_, optionIndex) => question.options?.[optionIndex]?.text || ""),
      question.isAnnulled ? "Annulée" : (question.options || [])
        .filter(option => option.isCorrect).map(option => option.text).join("\n"),
    ]);
    let lineCount = 1;
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      // Strings remain text cells, including IDs and text starting with '='.
      cell.numFmt = "@";
      cell.font = { name: "Arial", size: 11, color: { argb: "FF1E293B" } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? "FFF1F5F9" : "FFFFFFFF" } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      // Excel does not auto-fit wrapped rows when opening a generated workbook.
      const charactersPerLine = Math.floor(sheet.getColumn(column).width * 0.85);
      const lines = String(cell.value ?? "").split(/\r\n|\r|\n/).reduce((total, paragraph) =>
        total + Math.max(1, Math.ceil(paragraph.length / charactersPerLine)), 0);
      lineCount = Math.max(lineCount, lines);
    });
    row.height = Math.min(409, Math.max(60, (lineCount + 1) * 15 + 12));
    const answer = row.getCell(optionCount + 3);
    answer.font = { name: "Arial", size: 11, bold: true, color: { argb: question.isAnnulled ? "FF92400E" : "FF166534" } };
  });

  const header = sheet.getRow(1);
  header.height = 30;
  header.eachCell(cell => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: sheet.columnCount } };
  return workbook.xlsx.writeBuffer();
};
