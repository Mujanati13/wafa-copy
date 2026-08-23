import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BookOpen, CalendarDays, ChevronRight, FileQuestion,
  HelpCircle, Library, LockKeyhole, Play, Search, SlidersHorizontal,
} from "lucide-react";
import { moduleService } from "@/services/moduleService";
import { api, cn } from "@/lib/utils";
import { useSemester } from "@/context/SemesterContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const labels = {
  year: { title: "Examens par année", description: "Entraînez-vous avec des sessions complètes.", icon: CalendarDays },
  course: { title: "Examens par cours", description: "Ciblez un chapitre ou une notion précise.", icon: BookOpen },
  qcm: { title: "Banque de QCM", description: "Révisez librement avec des questions variées.", icon: Library },
};

const normalizeModule = (module) => ({
  id: module?._id || module?.id,
  name: module?.name || "Module sans titre",
  semester: module?.semester || "—",
  color: module?.color || "#0891b2",
  description: module?.description || module?.infoText || "Préparez vos examens et suivez votre progression.",
  questions: module?.totalQuestions || module?.questionCount || 0,
  progress: Math.min(100, Math.max(0, Number(module?.progress ?? module?.percentage) || 0)),
  questionsAnswered: Math.max(0, Number(module?.questionsAnswered) || 0),
});

const isPremiumPlan = (plan) => String(plan || "Free").toLowerCase().includes("premium");

const getThemeTextColor = (color) => {
  const hex = String(color || "").trim().replace("#", "");
  const normalized = hex.length === 3
    ? hex.split("").map((character) => character + character).join("")
    : hex;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#ffffff";
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return ((red * 299) + (green * 587) + (blue * 114)) / 1000 >= 165
    ? "#0f172a"
    : "#ffffff";
};

function ModuleCard({ module, locked, onOpen }) {
  return <Card className="group overflow-hidden border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="h-1.5" style={{ backgroundColor: module.color }} />
    <CardContent className="p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: module.color }}>
          <BookOpen className="h-6 w-6" />
        </div>
        {locked ? <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"><LockKeyhole className="h-3 w-3" />Premium</Badge> : <Badge variant="outline" className="border-cyan-600/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">{module.semester}</Badge>}
      </div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">{module.semester}</p>
      <h2 className="line-clamp-2 text-lg font-bold tracking-tight text-foreground">{module.name}</h2>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{module.description}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><FileQuestion className="h-4 w-4" />{module.questions ? `${module.questions} questions` : "Examens disponibles"}</span>
        <Button onClick={onOpen} size="sm" className="gap-1.5"><span>{locked ? "Voir l’accès" : "Étudier"}</span><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </CardContent>
  </Card>;
}

function ExamCard({ exam, type, moduleColor, onStart, onHelp }) {
  const Icon = labels[type].icon;
  const totalQuestions = Math.max(0, Number(exam.questions) || 0);
  const providedProgress = Math.min(100, Math.max(0, Number(exam.progress) || 0));
  const answeredQuestions = Math.min(
    totalQuestions,
    Math.max(
      0,
      Number(exam.answeredQuestions ?? exam.questionsAttempted)
        || Math.round((providedProgress / 100) * totalQuestions),
    ),
  );
  const progress = totalQuestions > 0
    ? Math.round((answeredQuestions / totalQuestions) * 100)
    : providedProgress;
  const isStarted = progress > 0;
  const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "");
  const imageUrl = exam.imageUrl
    ? (exam.imageUrl.startsWith("http") || exam.imageUrl.startsWith("data:")
      ? exam.imageUrl
      : `${apiOrigin}${exam.imageUrl}`)
    : "";

  if (type === "year") {
    return (
      <Card
        className="group min-h-[210px] cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-950"
        onClick={() => onStart(exam.id, type)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onStart(exam.id, type);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Commencer ${exam.name}`}
      >
        <CardContent className="flex min-h-[210px] flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-sky-50 text-blue-700 dark:bg-sky-950/60 dark:text-sky-300">
              <BookOpen className="h-10 w-10" strokeWidth={1.6} aria-hidden="true" />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={exam.name}
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-300 dark:hover:bg-sky-950"
                onClick={(event) => {
                  event.stopPropagation();
                  onHelp(exam);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                aria-label={`Informations sur ${exam.name}`}
              >
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
              </Button>
              {exam.year && (
                <Badge variant="outline" className="rounded-full border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                  {exam.year}
                </Badge>
              )}
            </div>
          </div>

          <h2 className="my-5 line-clamp-2 flex min-h-12 flex-1 items-center justify-center text-center text-base font-bold text-slate-950 dark:text-white">
            {exam.name}
          </h2>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                <span className="grid h-6 w-9 place-items-center rounded-full bg-cyan-50 text-cyan-500 dark:bg-cyan-950/60 dark:text-cyan-300">
                  <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {answeredQuestions} / {totalQuestions}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{progress}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              role="progressbar"
              aria-label={`Progression de ${exam.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <Card className="group overflow-hidden border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: moduleColor }}><Icon className="h-5 w-5" /></div>
        <div className="flex items-center gap-1">
          {exam.helpText && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onHelp(exam)} aria-label={`Informations sur ${exam.name}`}><HelpCircle className="h-4 w-4 text-muted-foreground" /></Button>}
          {exam.year && <Badge variant="outline">{exam.year}</Badge>}
        </div>
      </div>
      <h2 className="mt-4 line-clamp-2 min-h-12 text-base font-bold text-foreground">{exam.name}</h2>
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><FileQuestion className="h-4 w-4" />{exam.questions || "—"} questions</span><span className="font-semibold text-foreground">{progress}%</span></div>
      <Progress value={progress} className="mt-2 h-1.5" />
      <Button onClick={() => onStart(exam.id, type)} className="mt-5 w-full gap-2" variant={isStarted ? "default" : "outline"}><Play className="h-4 w-4" />{isStarted ? "Reprendre" : "Commencer"}</Button>
    </CardContent>
  </Card>;
}

function LoadingLibrary() {
  return <div className="space-y-6"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div><Skeleton className="h-10 w-36" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}</div></div>;
}

export default function SubjectsPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { selectedSemester, userSemesters, setSelectedSemester } = useSemester();
  const [modules, setModules] = useState([]);
  const [module, setModule] = useState(null);
  const [examsByType, setExamsByType] = useState({ year: [], course: [], qcm: [] });
  const [activeType, setActiveType] = useState("year");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [helpExam, setHelpExam] = useState(null);
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("userProfile") || localStorage.getItem("user") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    let cancelled = false;
    const loadModules = async () => {
      if (courseId) return;
      setLoading(true); setError("");
      try {
        const response = await moduleService.getAllmodules();
        if (!cancelled) setModules((response.data?.data || response.data || []).map(normalizeModule));
      } catch {
        if (!cancelled) setError("Impossible de charger les modules. Vérifiez votre connexion puis réessayez.");
      } finally { if (!cancelled) setLoading(false); }
    };
    loadModules();
    return () => { cancelled = true; };
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    const loadModule = async () => {
      if (!courseId) return;
      setLoading(true); setError("");
      try {
        const [moduleResponse, coursesResponse, examsResponse, qcmResponse, statsResponse] = await Promise.all([
          moduleService.getModuleById(courseId),
          api.get(`/exam-courses/module/${courseId}`).catch(() => ({ data: { data: [] } })),
          api.get(`/exams/module/${courseId}`).catch(() => ({ data: { data: [] } })),
          api.get(`/qcm-banque/module/${courseId}`).catch(() => ({ data: { data: [] } })),
          api.get(`/modules/${courseId}/stats`).catch(() => ({ data: { data: null } })),
        ]);
        if (cancelled) return;
        const moduleStats = statsResponse.data?.data;
        const selectedModule = normalizeModule({
          ...moduleResponse.data?.data,
          progress: moduleStats?.percentage,
          questionsAnswered: moduleStats?.questionsAnswered,
          totalQuestions: moduleStats?.totalQuestions ?? moduleResponse.data?.data?.totalQuestions,
        });
        setModule(selectedModule);
        const maps = (items, type) => items.map((item) => ({
          id: item._id || item.id, name: item.name || item.title || "Examen sans titre", questions: item.totalQuestions || item.questionCount || 0,
          progress: item.progress || item.completionRate || 0,
          answeredQuestions: item.answeredQuestions ?? item.questionsAttempted ?? 0,
          year: item.year, category: item.category || "Général", imageUrl: item.imageUrl,
          helpText: item.infoText || item.helpText || item.description || "",
          type,
        }));
        const courses = coursesResponse.data?.data || [];
        const moduleExams = examsResponse.data?.data || [];
        const moduleQcm = qcmResponse.data?.data || [];
        const years = maps(moduleExams.length ? moduleExams : courses.filter((item) => item.category === "Exam par years"), "year").sort((a, b) => (b.year || 0) - (a.year || 0));
        const qcm = maps(moduleQcm.length ? moduleQcm : courses.filter((item) => item.category === "QCM banque"), "qcm").sort((a, b) => a.name.localeCompare(b.name));
        const course = maps(courses.filter((item) => item.category !== "Exam par years" && item.category !== "QCM banque"), "course").sort((a, b) => a.name.localeCompare(b.name));
        setExamsByType({ year: years, course, qcm });
      } catch {
        if (!cancelled) setError("Ce module est indisponible pour le moment. Réessayez dans quelques instants.");
      } finally { if (!cancelled) setLoading(false); }
    };
    loadModule();
    return () => { cancelled = true; };
  }, [courseId]);

  const availableSemesters = userSemesters.length ? userSemesters : [...new Set(modules.map((item) => item.semester).filter(Boolean))];
  const filteredModules = useMemo(() => modules.filter((item) => {
    const matchesSemester = !selectedSemester || item.semester === selectedSemester;
    return matchesSemester && `${item.name} ${item.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }), [modules, query, selectedSemester]);
  const categories = useMemo(() => ["all", ...new Set(examsByType.course.map((item) => item.category).filter(Boolean))], [examsByType.course]);
  const currentExams = (examsByType[activeType] || []).filter((item) => activeType !== "course" || category === "all" || item.category === category);
  const moduleThemeColor = module?.color || "#0e2854";
  const activeThemeStyle = {
    backgroundColor: moduleThemeColor,
    borderColor: moduleThemeColor,
    color: getThemeTextColor(moduleThemeColor),
  };
  const locked = (item) => !isPremiumPlan(user.plan) && Array.isArray(user.freeModules) && user.freeModules.length > 0 && !user.freeModules.some((name) => item.name.toLowerCase().includes(String(name).toLowerCase()));
  const startExam = (id, type) => navigate(`/exam/${id}?type=${type === "year" ? "exam" : type}`);

  if (loading) return <LoadingLibrary />;
  if (error) return <div className="imrs-surface mx-auto max-w-xl p-8 text-center"><BookOpen className="mx-auto h-10 w-10 text-destructive" /><h1 className="mt-4 text-xl font-bold">Contenu indisponible</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => window.location.reload()}>Réessayer</Button></div>;

  if (!courseId) return <section className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="imrs-eyebrow">Bibliothèque d’étude</p><h1 className="imrs-page-title">Choisissez un module</h1><p className="imrs-page-copy">Retrouvez vos cours, examens et banques de QCM au même endroit.</p></div><div className="flex flex-wrap items-center gap-2">{availableSemesters.map((semester) => <Button key={semester} size="sm" variant={semester === selectedSemester ? "default" : "outline"} onClick={() => setSelectedSemester(semester)}>{semester}</Button>)}</div></div>
    <div className="imrs-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un module" className="pl-9" /></div><span className="flex items-center gap-2 px-2 text-sm text-muted-foreground"><SlidersHorizontal className="h-4 w-4" />{filteredModules.length} module{filteredModules.length > 1 ? "s" : ""}</span></div>
    {filteredModules.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredModules.map((item) => <ModuleCard key={item.id} module={item} locked={locked(item)} onOpen={() => navigate(`/dashboard/subjects/${item.id}`)} />)}</div> : <div className="imrs-surface p-10 text-center"><Search className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-4 font-bold">Aucun module trouvé</h2><p className="mt-1 text-sm text-muted-foreground">Essayez un autre semestre ou une autre recherche.</p></div>}
  </section>;

  const TypeIcon = labels[activeType].icon;
  return <section className="space-y-6">
    <div
      className="overflow-hidden rounded-3xl bg-primary px-4 py-4 text-primary-foreground shadow-lg sm:px-6 sm:py-5"
      style={{ background: `linear-gradient(135deg, ${moduleThemeColor}, #0e2854)` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg bg-white/95 text-slate-800 shadow-sm hover:bg-white hover:text-slate-950"
          onClick={() => navigate("/dashboard/subjects")}
          aria-label="Retour à tous les modules"
          title="Tous les modules"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/65 sm:text-xs">{module?.semester}</p>
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{module?.name}</h1>
        </div>
      </div>

      <p className="mt-2 max-w-3xl text-sm leading-5 text-white/80 sm:text-base">
        Choisissez un format d’entraînement puis avancez à votre rythme. Chaque réponse est sauvegardée pendant votre session.
      </p>

      <div className="mt-3 max-w-3xl">
        <div className="mb-1.5 flex items-center justify-between text-xs text-white/75">
          <span>{module?.questionsAnswered || 0} / {module?.questions || 0} questions</span>
          <span className="font-semibold text-white">{module?.progress || 0}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-black/20"
          role="progressbar"
          aria-label={`Progression du module ${module?.name || ""}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={module?.progress || 0}
        >
          <div
            className="h-full rounded-full bg-white/80 transition-[width] duration-500"
            style={{ width: `${module?.progress || 0}%` }}
          />
        </div>
      </div>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {Object.entries(labels).map(([type, config]) => {
        const Icon = config.icon;
        const isActive = activeType === type;
        return (
          <Button
            key={type}
            variant="outline"
            style={isActive ? activeThemeStyle : undefined}
            className={cn(
              "h-auto min-w-48 justify-start gap-3 px-4 py-3",
              isActive && "shadow-md hover:brightness-90",
            )}
            onClick={() => { setActiveType(type); setCategory("all"); }}
            aria-pressed={isActive}
          >
            <Icon className="h-5 w-5" />
            <span className="text-left">
              <span className="block font-semibold">{config.title}</span>
              <span className="block text-xs opacity-75">
                {examsByType[type].length} disponible{examsByType[type].length > 1 ? "s" : ""}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-2">
          <TypeIcon className="h-5 w-5" style={{ color: moduleThemeColor }} />
          <h2 className="text-xl font-bold">{labels[activeType].title}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{labels[activeType].description}</p>
      </div>
      {activeType === "course" && categories.length > 1 && (
        <div className="flex max-w-full gap-2 overflow-x-auto">
          {categories.map((item) => {
            const isActive = category === item;
            return (
              <Button
                key={item}
                size="sm"
                variant="outline"
                style={isActive ? activeThemeStyle : undefined}
                className={cn(isActive && "shadow-sm hover:brightness-90")}
                onClick={() => setCategory(item)}
                aria-pressed={isActive}
              >
                {item === "all" ? "Toutes catégories" : item}
              </Button>
            );
          })}
        </div>
      )}
    </div>
    {currentExams.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{currentExams.map((exam) => <ExamCard key={exam.id} exam={exam} type={activeType} moduleColor={module?.color || "#0891b2"} onStart={startExam} onHelp={setHelpExam} />)}</div> : <div className="imrs-surface p-10 text-center"><TypeIcon className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 font-bold">Aucun contenu disponible</h2><p className="mt-1 text-sm text-muted-foreground">Les examens ajoutés à ce module apparaîtront ici.</p></div>}
    <Dialog open={Boolean(helpExam)} onOpenChange={(open) => !open && setHelpExam(null)}><DialogContent><DialogHeader><DialogTitle>{helpExam?.name}</DialogTitle><DialogDescription>Informations avant de commencer l’examen</DialogDescription></DialogHeader><p className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-6 text-foreground">{helpExam?.helpText || "Aucune information supplémentaire n’est disponible pour cet examen."}</p></DialogContent></Dialog>
  </section>;
}
