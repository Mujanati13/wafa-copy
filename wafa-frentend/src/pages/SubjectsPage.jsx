import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BookOpen, CalendarDays, FileQuestion,
  HelpCircle, Library, Lock, Play, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { moduleService } from "@/services/moduleService";
import { api, cn } from "@/lib/utils";
import { useSemester } from "@/context/SemesterContext";
import { isPremiumPlan, isPremiumProPlan } from "@/utils/subscriptionDisplay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import {
  EXAM_PROGRESS_UPDATED_EVENT,
  getSessionExamCompletedCount,
} from "@/utils/examProgress";

const labels = {
  year: { title: "Examens par année", description: "Entraînez-vous avec des sessions complètes.", icon: CalendarDays },
  course: { title: "Examens par cours", description: "Ciblez un chapitre ou une notion précise.", icon: BookOpen },
  qcm: { title: "Banque de QCM", description: "Révisez librement avec des questions variées.", icon: Library },
};

const categoryLabelKeys = {
  year: "examByYears",
  course: "examByCourses",
  qcm: "qcmBank",
};

const categoryButtonClassName =
  "h-auto min-h-[76px] min-w-[190px] flex-1 justify-start gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-w-[210px]";

const getSectionTitle = (module, type) => (
  module?.categoryLabels?.[categoryLabelKeys[type]]?.trim() || labels[type].title
);

const normalizeModule = (module) => ({
  id: module?._id || module?.id,
  name: module?.name || "Module sans titre",
  semester: module?.semester || "—",
  color: module?.color || "#0891b2",
  description: module?.description || module?.infoText || "Préparez vos examens et suivez votre progression.",
  questions: module?.totalQuestions || module?.questionCount || 0,
  progress: Math.min(100, Math.max(0, Number(module?.progress ?? module?.percentage) || 0)),
  questionsAnswered: Math.max(0, Number(module?.questionsAnswered) || 0),
  categoryLabels: module?.categoryLabels || {},
});

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

const formatSemesterLabel = (semester) => {
  const value = String(semester || "").trim();
  if (!value || value === "—") return "";
  if (/^s\d+$/i.test(value)) return value.toUpperCase();
  if (/^\d+$/.test(value)) return `S${value}`;
  return value;
};

const getExamDisplayName = (examName, moduleName) => {
  const title = String(examName || "Examen sans titre").trim();
  const moduleTitle = String(moduleName || "").trim();
  if (!moduleTitle || !title.toLocaleLowerCase().startsWith(moduleTitle.toLocaleLowerCase())) return title;

  const remainder = title.slice(moduleTitle.length);
  const separator = remainder.match(/^\s*(?:—|–|-|:)\s*/);
  if (!separator) return title;

  return remainder.slice(separator[0].length).trim() || title;
};


const isTpTd = (type, title) => {
  const normTitle = String(title || "").trim().toLowerCase();
  return type === "tp" || normTitle === "tp/td" || normTitle === "tp" || normTitle === "td" || normTitle.includes("tp/td") || /\b(tp|td)\b/i.test(normTitle);
};

function ExamCard({ exam, type, moduleColor, moduleName, isLocked = false, lockLabel = "Premium", isFreeUser = false, onStart, onHelp }) {
  const Icon = labels[type].icon;
  const displayName = type === "year" ? getExamDisplayName(exam.name, moduleName) : exam.name;
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
  const imageUrl = exam.imageUrl
    ? resolveMediaUrl(exam.imageUrl, {
      folder: type === "year" ? "exams" : type === "course" ? "courses" : "qcm",
    })
    : "";

  if (type === "year") {
    return (
      <Card
        className="group mx-auto w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-950"
        onClick={() => onStart(exam.id, type)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onStart(exam.id, type);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Commencer ${displayName}`}
      >
        <div className="h-1 w-full shrink-0" style={{ backgroundColor: moduleColor }} aria-hidden="true" />
        <CardContent className="flex flex-col px-4 pb-4 pt-3.5 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="relative grid h-13 w-13 shrink-0 place-items-center overflow-hidden rounded-xl bg-transparent text-blue-700 dark:text-sky-300">
              {!imageUrl && <BookOpen className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={displayName}
                  className="absolute inset-0 h-full w-full bg-transparent object-contain"
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              )}
            </div>

            <div className="mr-1 flex items-center gap-1.5 sm:mr-2">
              {isLocked ? (
                <Badge variant="outline" className="flex items-center gap-1 rounded-full border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300">
                  <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  {lockLabel}
                </Badge>
              ) : isFreeUser ? (
                <Badge variant="outline" className="flex items-center gap-1 rounded-full border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  Inclus
                </Badge>
              ) : (
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
                  aria-label={`Informations sur ${displayName}`}
                >
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              {exam.year && (
                <Badge variant="outline" className="rounded-full border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                  {exam.year}
                </Badge>
              )}
            </div>
          </div>

          <h2 className="mb-3 mt-3 line-clamp-2 text-left text-base font-bold leading-snug text-slate-950 dark:text-white">
            {displayName}
          </h2>

          {isLocked ? (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-200/90 bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-900 transition group-hover:border-amber-300 group-hover:bg-amber-100/90 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                Débloquer cet examen
              </span>
              <span className="font-bold text-blue-600 group-hover:underline dark:text-blue-400">
                S'abonner →
              </span>
            </div>
          ) : (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <span className="grid h-6 w-9 place-items-center rounded-full bg-cyan-50 text-cyan-500 dark:bg-cyan-950/60 dark:text-cyan-300">
                    <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span
                    aria-label={`${answeredQuestions} questions complétées sur ${totalQuestions}`}
                    title="Questions terminées / total des questions"
                  >
                    {answeredQuestions} / {totalQuestions} terminées
                  </span>
                </span>
                <span className="mr-1 font-semibold text-slate-800 dark:text-slate-100 sm:mr-2">{progress}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="progressbar"
                aria-label={`Progression de ${displayName}`}
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
          )}
        </CardContent>
      </Card>
    );
  }

  return <Card className="group overflow-hidden border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-transparent" style={{ color: moduleColor }}>
          {!imageUrl && <Icon className="h-5 w-5" />}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={exam.name}
              className="absolute inset-0 h-full w-full bg-transparent object-contain"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLocked ? (
            <Badge variant="outline" className="flex items-center gap-1 rounded-full border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300">
              <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              {lockLabel}
            </Badge>
          ) : isFreeUser ? (
            <Badge variant="outline" className="flex items-center gap-1 rounded-full border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Inclus
            </Badge>
          ) : null}
          {exam.helpText && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onHelp(exam)} aria-label={`Informations sur ${exam.name}`}><HelpCircle className="h-4 w-4 text-muted-foreground" /></Button>}
          {exam.year && <Badge variant="outline">{exam.year}</Badge>}
        </div>
      </div>
      <h2 className="mt-4 line-clamp-2 min-h-12 text-base font-bold text-foreground">{exam.name}</h2>
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><FileQuestion className="h-4 w-4" />{exam.questions || "—"} questions</span><span className="font-semibold text-foreground">{progress}%</span></div>
      <Progress value={progress} className="mt-2 h-1.5" />
      {isLocked ? (
        <Button onClick={() => onStart(exam.id, type)} className="mt-5 w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-sm">
          <Lock className="h-4 w-4" />
          {lockLabel === "Pro" ? "Débloquer avec Premium Pro" : "Débloquer avec Premium"}
        </Button>
      ) : (
        <Button onClick={() => onStart(exam.id, type)} className="mt-5 w-full gap-2" variant={isStarted ? "default" : "outline"}>
          <Play className="h-4 w-4" />
          {isStarted ? "Reprendre" : "Commencer"}
        </Button>
      )}
    </CardContent>
  </Card>;
}

function LoadingLibrary() {
  return <div className="space-y-6"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div><Skeleton className="h-10 w-36" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}</div></div>;
}

const getCachedUser = () => {
  try { return JSON.parse(localStorage.getItem("userProfile") || localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export default function SubjectsPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { selectedSemester } = useSemester();
  const [user, setUser] = useState(getCachedUser);
  const [module, setModule] = useState(null);
  const [examsByType, setExamsByType] = useState({ year: [], course: [], qcm: [] });
  const [activeType, setActiveType] = useState("year");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [helpExam, setHelpExam] = useState(null);

  useEffect(() => {
    const syncUser = () => setUser(getCachedUser());
    window.addEventListener("auth-state-changed", syncUser);
    return () => window.removeEventListener("auth-state-changed", syncUser);
  }, []);

  const isFreeUser = !isPremiumPlan(user?.plan);
  const hasPremiumProAccess = isPremiumProPlan(user?.plan);
  const freeModuleId = String(user?.freeModule?._id || user?.freeModule || "");
  const freeExamId = String(user?.freeExam?._id || user?.freeExam || "");

  const visibleExamsByType = useMemo(() => {
    if (!isFreeUser) return examsByType;
    if (!freeExamId) return { year: [], course: [], qcm: [] };
    return {
      year: (examsByType.year || []).filter((item) => String(item.id) === freeExamId),
      course: (examsByType.course || []).filter((item) => String(item.id) === freeExamId),
      qcm: (examsByType.qcm || []).filter((item) => String(item.id) === freeExamId),
    };
  }, [isFreeUser, freeExamId, examsByType]);

  // For free users, ensure active tab matches the one containing their free exam
  useEffect(() => {
    if (isFreeUser && freeExamId) {
      for (const [type, list] of Object.entries(examsByType)) {
        if (list.some((item) => String(item.id) === freeExamId)) {
          setActiveType(type);
          break;
        }
      }
    }
  }, [isFreeUser, freeExamId, examsByType]);

  // If a non-pro user lands on a TP/TD active tab, switch away to year
  useEffect(() => {
    const activeTitle = getSectionTitle(module, activeType);
    if (!hasPremiumProAccess && isTpTd(activeType, activeTitle)) {
      setActiveType("year");
    }
  }, [hasPremiumProAccess, activeType, module]);

  // If a free user directly navigates to a locked module, redirect to subscription
  useEffect(() => {
    if (isFreeUser && freeModuleId && courseId && String(courseId) !== freeModuleId) {
      toast.info("Ce module est réservé aux abonnés Premium.");
      navigate("/dashboard/subscription", { replace: true });
    }
  }, [isFreeUser, freeModuleId, courseId, navigate]);

  useEffect(() => {
    const syncCompletedCount = (event) => {
      const examId = event.detail?.examId;
      const completedQuestions = Math.max(0, Number(event.detail?.completedQuestions) || 0);
      if (!examId) return;

      setExamsByType((current) => Object.fromEntries(
        Object.entries(current).map(([type, exams]) => [
          type,
          exams.map((exam) => (
            String(exam.id) === String(examId)
              ? { ...exam, answeredQuestions: Math.min(Number(exam.questions) || 0, completedQuestions) }
              : exam
          )),
        ]),
      ));
    };

    window.addEventListener(EXAM_PROGRESS_UPDATED_EVENT, syncCompletedCount);
    return () => window.removeEventListener(EXAM_PROGRESS_UPDATED_EVENT, syncCompletedCount);
  }, []);

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
          answeredQuestions: Math.max(
            Number(item.answeredQuestions ?? item.questionsAttempted) || 0,
            getSessionExamCompletedCount(item._id || item.id),
          ),
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

  const categories = useMemo(() => ["all", ...new Set(visibleExamsByType.course.map((item) => item.category).filter(Boolean))], [visibleExamsByType.course]);
  const currentExams = (visibleExamsByType[activeType] || []).filter((item) => activeType !== "course" || category === "all" || item.category === category);
  const moduleThemeColor = module?.color || "#0e2854";
  const moduleSemesterLabel = formatSemesterLabel(module?.semester || selectedSemester);
  const activeThemeStyle = {
    backgroundColor: moduleThemeColor,
    borderColor: moduleThemeColor,
    color: getThemeTextColor(moduleThemeColor),
  };
  const startExam = (id, type) => {
    const isExamLocked = isFreeUser && (!freeExamId || String(id) !== freeExamId);
    if (isExamLocked) {
      toast.info("Abonnez-vous pour débloquer cet examen.");
      navigate("/dashboard/subscription");
      return;
    }

    const currentExamItem = (examsByType[type] || []).find((e) => String(e.id) === String(id));
    const isExamTpTd = isTpTd(type, getSectionTitle(module, type))
      || (currentExamItem && isTpTd(type, currentExamItem.category || currentExamItem.name));

    if (isExamTpTd && !hasPremiumProAccess) {
      toast.info("Les examens TP/TD sont réservés aux abonnés Premium Pro.");
      navigate("/dashboard/subscription");
      return;
    }

    navigate(`/exam/${id}?type=${type === "year" ? "exam" : type}`);
  };

  if (loading) return <LoadingLibrary />;
  if (error) return <div className="imrs-surface mx-auto max-w-xl p-8 text-center"><BookOpen className="mx-auto h-10 w-10 text-destructive" /><h1 className="mt-4 text-xl font-bold">Contenu indisponible</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => window.location.reload()}>Réessayer</Button></div>;

  const TypeIcon = labels[activeType].icon;
  return <section className="space-y-6">
    <div
      className="imrs-module-hero overflow-hidden rounded-3xl px-4 py-4 shadow-lg sm:px-6 sm:py-5"
      style={{ "--module-color": moduleThemeColor }}
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-5 sm:gap-x-7">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl bg-white/95 text-slate-800 shadow-sm hover:bg-white hover:text-slate-950"
          onClick={() => navigate("/dashboard/home#modules")}
          aria-label="Retour au tableau de bord"
          title="Tableau de bord"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="min-w-0 pt-0.5">
          {moduleSemesterLabel && (
            <p
              className="mb-0.5 text-[10px] font-bold uppercase tracking-[.16em] text-blue-600/80 sm:text-xs dark:text-white/75"
              aria-label={`Semestre ${moduleSemesterLabel}`}
            >
              {moduleSemesterLabel}
            </p>
          )}
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{module?.name}</h1>
          <div className="mt-3 max-w-3xl">
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-white/75">
              <span>{module?.questionsAnswered || 0} / {module?.questions || 0} questions</span>
              <span className="font-semibold text-slate-800 dark:text-white">{module?.progress || 0}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-black/20"
              role="progressbar"
              aria-label={`Progression du module ${module?.name || ""}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={module?.progress || 0}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 dark:bg-white/80"
                style={{ width: `${module?.progress || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {Object.entries(labels).map(([type, config]) => {
        const Icon = config.icon;
        const isActive = activeType === type;
        const sectionTitle = getSectionTitle(module, type);
        const isSectionTpTd = isTpTd(type, sectionTitle);
        const isTpTdLocked = isSectionTpTd && !hasPremiumProAccess;
        const count = visibleExamsByType[type]?.length || 0;

        return (
          <Button
            key={type}
            variant="outline"
            style={isActive ? activeThemeStyle : undefined}
            className={cn(
              categoryButtonClassName,
              isActive && "border-transparent shadow-md hover:border-transparent hover:brightness-95",
            )}
            onClick={() => {
              if (isTpTdLocked) {
                toast.info("La section TP/TD est réservée aux abonnés Premium Pro.");
                navigate("/dashboard/subscription");
                return;
              }
              setActiveType(type);
              setCategory("all");
            }}
            aria-pressed={isActive}
          >
            <Icon className="h-5 w-5" />
            <span className="text-left flex-1 min-w-0">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="truncate">{sectionTitle}</span>
                {isTpTdLocked && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.2 shrink-0">
                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                    Pro
                  </Badge>
                )}
              </span>
              <span className="block text-xs opacity-75">
                {count} disponible{count > 1 ? "s" : ""}
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
          <h2 className="text-xl font-bold">{getSectionTitle(module, activeType)}</h2>
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
                onClick={() => {
                  if (isTpTd('course', item) && !hasPremiumProAccess) {
                    toast.info("Cette catégorie TP/TD est réservée aux abonnés Premium Pro.");
                    navigate("/dashboard/subscription");
                    return;
                  }
                  setCategory(item);
                }}
                aria-pressed={isActive}
              >
                {item === "all" ? "Toutes catégories" : item}
                {isTpTd('course', item) && !hasPremiumProAccess && (
                  <Lock className="h-3 w-3 ml-1 text-amber-500" />
                )}
              </Button>
            );
          })}
        </div>
      )}
    </div>
    {currentExams.length ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {currentExams.map((exam) => {
          const isExamTpTd = isTpTd(activeType, getSectionTitle(module, activeType))
            || isTpTd(activeType, exam.category || exam.name);
          const isExamLocked = (isFreeUser && (!freeExamId || String(exam.id) !== freeExamId))
            || (isExamTpTd && !hasPremiumProAccess);
          const lockLabel = isExamTpTd && !hasPremiumProAccess ? "Pro" : "Premium";

          return (
            <ExamCard
              key={exam.id}
              exam={exam}
              type={activeType}
              moduleColor={module?.color || "#0891b2"}
              moduleName={module?.name}
              isLocked={isExamLocked}
              lockLabel={lockLabel}
              isFreeUser={isFreeUser}
              onStart={startExam}
              onHelp={setHelpExam}
            />
          );
        })}
      </div>
    ) : <div className="imrs-surface p-10 text-center"><TypeIcon className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 font-bold">Aucun contenu disponible</h2><p className="mt-1 text-sm text-muted-foreground">Les examens ajoutés à ce module apparaîtront ici.</p></div>}
    <Dialog open={Boolean(helpExam)} onOpenChange={(open) => !open && setHelpExam(null)}><DialogContent><DialogHeader><DialogTitle>{helpExam?.name}</DialogTitle><DialogDescription>Informations avant de commencer l’examen</DialogDescription></DialogHeader><p className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-6 text-foreground">{helpExam?.helpText || "Aucune information supplémentaire n’est disponible pour cet examen."}</p></DialogContent></Dialog>
  </section>;
}
