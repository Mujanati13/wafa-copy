import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, BarChart3, BookOpen, CircleAlert, Clock3, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardService } from "@/services/dashboardService";
import { useSemester } from "@/context/SemesterContext";

const dayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

const statValue = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export default function ProgressPage() {
  const { selectedSemester, setSelectedSemester, userSemesters, loading: semestersLoading } = useSemester();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let current = true;
    setLoading(true); setError(false);
    dashboardService.getUserStats(selectedSemester)
      .then((response) => { if (current) setStats(response?.data?.stats || response?.stats || {}); })
      .catch(() => { if (current) setError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [selectedSemester]);

  const overview = useMemo(() => {
    const attempted = statValue(stats?.totalQuestionsAttempted || stats?.questionsAnswered);
    const correct = statValue(stats?.totalCorrectAnswers || stats?.correctAnswers);
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : Math.round(statValue(stats?.averageScore));
    const studyMinutes = Math.round(statValue(stats?.studyHours) * 60);
    return { attempted, correct, accuracy, studyMinutes, exams: statValue(stats?.examsCompleted) };
  }, [stats]);

  const modules = useMemo(() => (stats?.moduleProgress || []).map((module) => {
    const attempted = statValue(module.questionsAttempted);
    const correct = statValue(module.correctAnswers);
    return { id: module.moduleId || module.moduleName, name: module.moduleName || "Module", attempted, correct, score: attempted ? Math.round((correct / attempted) * 100) : statValue(module.averageScore), lastAttempted: module.lastAttempted };
  }).sort((a, b) => b.attempted - a.attempted), [stats]);

  const activity = useMemo(() => (stats?.weeklyActivity || []).slice(-7).map((entry) => ({
    label: entry.date ? dayFormatter.format(new Date(entry.date)).replace(".", "") : "—",
    questions: statValue(entry.questionsAttempted), correct: statValue(entry.correctAnswers), minutes: statValue(entry.timeSpent),
  })), [stats]);
  const maxActivity = Math.max(1, ...activity.map((entry) => entry.questions));

  if (loading) return <ProgressSkeleton />;

  return <section className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="imrs-eyebrow">Progression</p><h1 className="imrs-page-title">Apprenez de chaque session</h1><p className="imrs-page-copy">Suivez vos réponses vérifiées et identifiez les modules à reprendre.</p></div><SemesterPicker semesters={userSemesters} current={selectedSemester} onChange={setSelectedSemester} disabled={semestersLoading} /></div>
    {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-400/50 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Vos statistiques ne sont pas disponibles pour le moment.</strong><p className="mt-1">La dernière progression enregistrée réapparaîtra dès que la connexion sera rétablie.</p></div></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<Target />} label="Taux de réussite" value={`${overview.accuracy}%`} copy="Réponses correctes" tone="cyan" /><Metric icon={<BookOpen />} label="Questions vérifiées" value={overview.attempted} copy={`${overview.correct} bonnes réponses`} tone="blue" /><Metric icon={<Clock3 />} label="Temps d’étude" value={formatMinutes(overview.studyMinutes)} copy="Dans ce semestre" tone="violet" /><Metric icon={<Trophy />} label="Examens terminés" value={overview.exams} copy="Sessions complétées" tone="amber" /></div>
    {overview.attempted === 0 && !error ? <EmptyProgress /> : <>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="imrs-surface p-5 sm:p-6"><header className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Par module</h2><p className="mt-1 text-sm text-muted-foreground">Votre réussite sur les questions vérifiées.</p></div><BarChart3 className="h-5 w-5 text-cyan-600" /></header><div className="mt-6 space-y-5">{modules.length ? modules.map((module) => <ModuleProgress key={module.id} module={module} />) : <p className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">Aucune progression de module n’a encore été enregistrée.</p>}</div></section>
        <section className="imrs-surface p-5 sm:p-6"><header className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Votre activité</h2><p className="mt-1 text-sm text-muted-foreground">Questions vérifiées sur les 7 derniers jours.</p></div><Activity className="h-5 w-5 text-cyan-600" /></header><div className="mt-8 flex h-48 items-end justify-between gap-2" aria-label="Activité des sept derniers jours">{activity.length ? activity.map((entry, index) => <div key={`${entry.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">{entry.questions || ""}</span><div className="flex h-32 w-full max-w-10 items-end rounded-t-xl bg-muted"><div className="w-full rounded-t-xl bg-gradient-to-t from-primary to-cyan-400 transition-all" style={{ height: `${Math.max(entry.questions ? 12 : 0, (entry.questions / maxActivity) * 100)}%` }} /></div><span className="text-xs capitalize text-muted-foreground">{entry.label}</span></div>) : <p className="w-full self-center text-center text-sm text-muted-foreground">Votre activité apparaîtra ici après vos premières réponses vérifiées.</p>}</div></section>
      </div>
      <section className="rounded-2xl border border-cyan-400/25 bg-cyan-50/70 p-5 dark:bg-cyan-950/20 sm:flex sm:items-center sm:justify-between sm:p-6"><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Target className="h-5 w-5" /></div><div><h2 className="font-bold">Prochaine meilleure action</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Reprenez le module avec votre taux le plus faible pour consolider vos connaissances.</p></div></div><Button asChild className="mt-4 gap-2 sm:mt-0"><Link to="/dashboard/subjects">Étudier maintenant <ArrowRight className="h-4 w-4" /></Link></Button></section>
    </>}
  </section>;
}

function SemesterPicker({ semesters, current, onChange, disabled }) { const choices = semesters.length ? semesters : current ? [current] : []; return <div className="flex flex-wrap gap-2" aria-label="Choisir un semestre">{choices.map((semester) => <button key={semester} disabled={disabled} onClick={() => onChange(semester)} className={`imrs-focus-ring rounded-xl px-4 py-2 text-sm font-semibold transition ${semester === current ? "bg-primary text-primary-foreground shadow-md" : "border border-border bg-card text-muted-foreground hover:text-primary"}`}>{semester}</button>)}</div>; }
function Metric({ icon, label, value, copy, tone }) { const colors = { cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200", blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200", violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200", amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200" }; return <article className="imrs-surface p-5"><div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}>{icon}</div><p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{copy}</p></article>; }
function ModuleProgress({ module }) { return <article><div className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate font-semibold">{module.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{module.attempted} question{module.attempted > 1 ? "s" : ""} vérifiée{module.attempted > 1 ? "s" : ""}</p></div><span className="font-bold text-primary">{module.score}%</span></div><Progress value={module.score} className="mt-2 h-2" /></article>; }
function EmptyProgress() { return <section className="imrs-surface p-10 text-center sm:p-14"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200"><Target className="h-7 w-7" /></div><h2 className="mt-5 text-xl font-bold">Votre progression commence ici</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Répondez à vos premières questions pour voir votre réussite, activité et progression par module.</p><Button asChild className="mt-6 gap-2"><Link to="/dashboard/subjects">Choisir un module <ArrowRight className="h-4 w-4" /></Link></Button></section>; }
function ProgressSkeleton() { return <div className="space-y-6"><div className="flex justify-between"><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-72" /></div><Skeleton className="h-10 w-36" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-40 rounded-2xl" />)}</div><div className="grid gap-5 xl:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></div>; }
function formatMinutes(value) { if (!value) return "0 min"; if (value < 60) return `${value} min`; return `${Math.floor(value / 60)} h${value % 60 ? ` ${value % 60} min` : ""}`; }
