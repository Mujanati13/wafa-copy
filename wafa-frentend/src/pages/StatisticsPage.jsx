import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleGauge,
  Clock3,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/utils";
import { useSemester } from "@/context/SemesterContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXAM_PROGRESS_UPDATED_EVENT } from "@/utils/examProgress";

const EMPTY_SUMMARY = {
  moduleCount: 0,
  courseCount: 0,
  totalQuestions: 0,
  answeredQuestions: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  completionPercentage: 0,
  successRate: 0,
};

const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(value || 0);

const formatActivityDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date);
};

function AnswerBar({ correctPercentage = 0, incorrectPercentage = 0, completionPercentage = 0 }) {
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label={`Progression ${completionPercentage}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={completionPercentage}
    >
      <div className="flex h-full">
        <span className="h-full bg-emerald-500 transition-[width]" style={{ width: `${correctPercentage}%` }} />
        <span className="h-full bg-red-500 transition-[width]" style={{ width: `${incorrectPercentage}%` }} />
      </div>
    </div>
  );
}

function ProgressMetrics({ item, compact = false }) {
  const metrics = [
    {
      label: "Progression",
      count: `${formatNumber(item.answeredQuestions)}/${formatNumber(item.totalQuestions)}`,
      percentage: item.completionPercentage,
      className: "text-primary",
    },
    {
      label: "Correctes",
      count: formatNumber(item.correctAnswers),
      percentage: item.correctPercentage,
      className: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Incorrectes",
      count: formatNumber(item.incorrectAnswers),
      percentage: item.incorrectPercentage,
      className: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className={compact ? "grid grid-cols-3 gap-2" : "grid grid-cols-3 gap-3"}>
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{metric.label}</p>
          <p className={`mt-1 font-semibold tabular-nums ${compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"} ${metric.className}`}>
            {metric.count} <span className="font-normal opacity-80">({metric.percentage || 0}%)</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function ActivityBadge({ status }) {
  const variants = {
    completed: { label: "Terminé", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" },
    "in-progress": { label: "En cours", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300" },
    untouched: { label: "Non commencé", className: "border-border bg-muted text-muted-foreground" },
  };
  const variant = variants[status] || variants.untouched;
  return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
}

function CourseProgressRow({ course }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-medium text-foreground">{course.courseName}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {course.totalQuestions > 0 ? `${course.totalQuestions} questions` : "Aucune question liée"}
          </p>
        </div>
        <ActivityBadge status={course.activityStatus} />
      </div>
      <div className="mt-4"><ProgressMetrics item={course} compact /></div>
      <div className="mt-3"><AnswerBar {...course} /></div>
    </div>
  );
}

function ModuleProgressCard({ module, expanded, onToggle }) {
  const detailsId = `module-progress-${module.moduleId}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="w-full p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ backgroundColor: module.color || "#3b82f6" }}>
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground sm:text-lg">{module.moduleName}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{module.courseCount} cours · {module.semester || "Tous semestres"}</p>
              </div>
              <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
            <div className="mt-5"><ProgressMetrics item={module} /></div>
            <div className="mt-4"><AnswerBar {...module} /></div>
          </div>
        </div>
      </button>

      {expanded && (
        <div id={detailsId} className="border-t border-border bg-muted/30 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">Détail par cours</h4>
              <p className="mt-1 text-sm text-muted-foreground">Les mêmes indicateurs, cours par cours.</p>
            </div>
            <Badge variant="secondary">Taux de réussite {module.successRate || 0}%</Badge>
          </div>
          {module.courses?.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {module.courses.map((course) => <CourseProgressRow key={course.courseId} course={course} />)}
            </div>
          ) : <EmptyInline message="Aucun cours n’est encore associé à ce module." />}
        </div>
      )}
    </article>
  );
}

function HighlightItem({ icon, label, course, tone }) {
  const tones = {
    red: "border-red-200 bg-red-50/80 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
    green: "border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
    blue: "border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">{icon}{label}</div>
      {course ? (
        <div className="mt-3">
          <p className="font-semibold text-current">{course.courseName}</p>
          <p className="mt-1 text-xs opacity-80">
            {course.successRate}% de réussite · {course.answeredQuestions}/{course.totalQuestions} répondues
            {tone === "blue" && course.lastActivity ? ` · ${formatActivityDate(course.lastActivity)}` : ""}
          </p>
        </div>
      ) : <p className="mt-3 text-sm opacity-75">Aucune activité</p>}
    </div>
  );
}

function HighlightsCard({ module }) {
  const { highlights } = module;
  return (
    <Card className="overflow-hidden border-border">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0"><h3 className="font-semibold">{module.moduleName}</h3><p className="mt-1 text-xs text-muted-foreground">{module.courseCount} cours analysés</p></div>
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: module.color || "#3b82f6" }} />
        </div>
        <div className="grid gap-3 p-4 sm:p-5">
          <HighlightItem icon={<TrendingDown className="h-4 w-4" />} label="Score le plus faible" course={highlights.lowest} tone="red" />
          <HighlightItem icon={<TrendingUp className="h-4 w-4" />} label="Meilleur score" course={highlights.highest} tone="green" />
          <HighlightItem icon={<Clock3 className="h-4 w-4" />} label="En cours / récent" course={highlights.recent} tone="blue" />
          <div className="rounded-xl border border-dashed border-border bg-muted/35 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CircleGauge className="h-4 w-4" />Non commencés</div>
            {highlights.untouched?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {highlights.untouched.map((course) => <Badge key={course.courseId} variant="secondary" className="font-normal">{course.courseName}</Badge>)}
              </div>
            ) : <p className="mt-3 text-sm text-muted-foreground">Tous les cours ont une activité.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ icon, label, value, detail, tone }) {
  const tones = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  };
  return (
    <Card className="border-border"><CardContent className="flex items-center gap-4 p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>
  );
}

function LoadingState() {
  return <div className="space-y-8"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div><div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-48 rounded-2xl" />)}</div></div>;
}

function EmptyInline({ message }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{message}</div>;
}

function SemesterPicker({ semesters, current, onChange, disabled }) {
  const choices = semesters.length ? semesters : current ? [current] : [];

  return (
    <label className="relative shrink-0">
      <span className="sr-only">Choisir le semestre des statistiques</span>
      <select
        value={current || ""}
        disabled={disabled || !choices.length}
        onChange={(event) => onChange(event.target.value)}
        className="imrs-focus-ring h-10 min-w-24 appearance-none rounded-xl border border-border bg-card py-0 pl-4 pr-9 text-sm font-semibold text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!choices.length && <option value="">Semestre</option>}
        {choices.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </label>
  );
}

export default function StatisticsPage() {
  const {
    selectedSemester,
    setSelectedSemester,
    userSemesters,
    loading: semestersLoading,
  } = useSemester();
  const [data, setData] = useState({ summary: EMPTY_SUMMARY, modules: [] });
  const [expandedModules, setExpandedModules] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    const refreshProgress = () => setReloadKey((key) => key + 1);
    window.addEventListener(EXAM_PROGRESS_UPDATED_EVENT, refreshProgress);
    return () => window.removeEventListener(EXAM_PROGRESS_UPDATED_EVENT, refreshProgress);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadProgress = async () => {
      if (!selectedSemester) {
        setData({ summary: EMPTY_SUMMARY, modules: [] });
        setExpandedModules(new Set());
        setError(semestersLoading ? "" : "Sélectionnez un semestre pour afficher vos statistiques.");
        setLoading(semestersLoading);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await api.get("/users/progress", {
          params: { semester: selectedSemester },
          signal: controller.signal,
        });
        const responseData = response.data?.data || { summary: EMPTY_SUMMARY, modules: [] };
        setData({
          ...responseData,
          modules: (responseData.modules || []).filter(
            (module) => String(module.semester || "").toUpperCase() === selectedSemester,
          ),
        });
        setExpandedModules(new Set());
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setError(requestError.response?.data?.message || "Impossible de charger votre progression.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadProgress();
    return () => controller.abort();
  }, [reloadKey, selectedSemester, semestersLoading]);

  const toggleModule = (moduleId) => setExpandedModules((current) => {
    const next = new Set(current);
    if (next.has(moduleId)) next.delete(moduleId);
    else next.add(moduleId);
    return next;
  });

  const summary = data.summary || EMPTY_SUMMARY;
  const modules = data.modules || [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><BarChart3 className="h-5 w-5" />Statistiques personnelles</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Progression par module et cours</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Suivez les questions complétées, vos réponses correctes et les cours à renforcer pour {selectedSemester || "le semestre sélectionné"}.</p>
        </div>
        <div className="flex items-center gap-2">
          <SemesterPicker semesters={userSemesters} current={selectedSemester} onChange={setSelectedSemester} disabled={semestersLoading} />
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)} disabled={loading || !selectedSemester}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button>
        </div>
      </header>

      {loading ? <LoadingState /> : error ? (
        <Card className="border-red-200"><CardContent className="grid min-h-64 place-items-center p-8 text-center"><div><XCircle className="mx-auto h-10 w-10 text-red-500" /><h2 className="mt-4 text-lg font-semibold">Statistiques indisponibles</h2><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Réessayer</Button></div></CardContent></Card>
      ) : (
        <Tabs value={activeView} onValueChange={setActiveView} className="gap-7">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-border bg-muted/70 p-1.5 sm:max-w-xl">
            <TabsTrigger value="overview" className="min-h-11 rounded-xl px-3 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />Vue principale
            </TabsTrigger>
            <TabsTrigger value="quick-summary" className="min-h-11 rounded-xl px-3 text-xs sm:text-sm">
              <CircleGauge className="h-4 w-4" aria-hidden="true" />Résumé rapide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <section aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="sr-only">Résumé de {selectedSemester}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard icon={<BookOpen className="h-5 w-5" />} label="Modules et cours" value={summary.moduleCount} detail={`${summary.courseCount} cours · ${selectedSemester}`} tone="violet" />
                <SummaryCard icon={<Target className="h-5 w-5" />} label="Progression globale" value={`${summary.completionPercentage}%`} detail={`${formatNumber(summary.answeredQuestions)}/${formatNumber(summary.totalQuestions)} questions`} tone="blue" />
                <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Réponses correctes" value={formatNumber(summary.correctAnswers)} detail={`${summary.successRate}% de réussite`} tone="green" />
                <SummaryCard icon={<XCircle className="h-5 w-5" />} label="Réponses incorrectes" value={formatNumber(summary.incorrectAnswers)} detail="Questions à revoir" tone="red" />
              </div>
            </section>

            <section aria-labelledby="modules-heading" className="space-y-5">
              <div><h2 id="modules-heading" className="text-2xl font-bold">Progression par module</h2><p className="mt-2 text-sm text-muted-foreground">Modules de {selectedSemester}. Ouvrez un module pour afficher les mêmes statistiques pour chacun de ses cours.</p></div>
              {modules.length ? <div className="grid items-start gap-4 lg:grid-cols-2">{modules.map((module) => <ModuleProgressCard key={module.moduleId} module={module} expanded={expandedModules.has(module.moduleId)} onToggle={() => toggleModule(module.moduleId)} />)}</div> : <EmptyInline message={`Aucun module disponible pour ${selectedSemester}.`} />}
            </section>
          </TabsContent>

          <TabsContent value="quick-summary">
            <section aria-labelledby="highlights-heading" className="space-y-5">
              <div><h2 id="highlights-heading" className="text-2xl font-bold">Points forts et cours à renforcer</h2><p className="mt-2 text-sm text-muted-foreground">Résumé de {selectedSemester}. Le rouge signale le score le plus faible, le vert le meilleur score et le bleu votre activité la plus récente.</p></div>
              {modules.length ? <div className="grid items-start gap-5 lg:grid-cols-2">{modules.map((module) => <HighlightsCard key={module.moduleId} module={module} />)}</div> : <EmptyInline message={`Aucun résumé disponible pour ${selectedSemester}.`} />}
            </section>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
