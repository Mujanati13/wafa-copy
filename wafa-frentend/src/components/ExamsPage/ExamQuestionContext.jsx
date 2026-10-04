import { BookOpen } from "lucide-react";

export default function ExamQuestionContext({ exam, question }) {
  const moduleName = exam?.moduleName || exam?.moduleId?.name || "Module";
  const year = String(exam?.year || "").trim();
  const examName = String(exam?.name || exam?.title || "").trim();
  const sessionName = String(question?.sessionLabel || "").trim();
  const parts = [moduleName];

  if (year) parts.push(year);
  if (examName && examName !== year && examName !== moduleName) parts.push(examName);
  if (sessionName && sessionName !== "Session principale" && sessionName !== examName) {
    parts.push(sessionName);
  }

  return (
    <div className="border-b border-border bg-muted/40 px-3 py-3 sm:px-4 md:px-6">
      <div
        aria-label="Contexte de la question"
        className="flex min-w-0 items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-sm sm:text-sm"
      >
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="min-w-0 break-words font-medium leading-relaxed">{parts.join(" > ")}</p>
      </div>
    </div>
  );
}
