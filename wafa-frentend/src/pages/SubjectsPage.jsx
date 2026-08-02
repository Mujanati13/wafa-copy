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
});

const isPremiumPlan = (plan) => String(plan || "Free").toLowerCase().includes("premium");

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
  const isStarted = exam.progress > 0;
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
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><FileQuestion className="h-4 w-4" />{exam.questions || "—"} questions</span><span className="font-semibold text-foreground">{exam.progress}%</span></div>
      <Progress value={exam.progress} className="mt-2 h-1.5" indicatorClassName="bg-primary" />
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
        const [moduleResponse, coursesResponse, examsResponse, qcmResponse] = await Promise.all([
          moduleService.getModuleById(courseId),
          api.get(`/exam-courses?moduleId=${courseId}`).catch(() => ({ data: { data: [] } })),
          api.get("/exams/all").catch(() => ({ data: { data: [] } })),
          api.get("/qcm-banque/all").catch(() => ({ data: { data: [] } })),
        ]);
        if (cancelled) return;
        const selectedModule = normalizeModule(moduleResponse.data?.data);
        setModule(selectedModule);
        const maps = (items, type) => items.map((item) => ({
          id: item._id || item.id, name: item.name || item.title || "Examen sans titre", questions: item.totalQuestions || item.questionCount || 0,
          progress: item.progress || 0, year: item.year, category: item.category || "Général", imageUrl: item.imageUrl,
          helpText: item.infoText || item.helpText || item.description || "",
          type,
        }));
        const courses = coursesResponse.data?.data || [];
        const moduleExams = (examsResponse.data?.data || []).filter((item) => String(item.moduleId?._id || item.moduleId || "") === String(courseId) || item.moduleName === selectedModule.name);
        const moduleQcm = (qcmResponse.data?.data || []).filter((item) => String(item.moduleId?._id || item.moduleId || "") === String(courseId) || item.moduleName === selectedModule.name);
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
    <Button variant="ghost" className="-ml-3 gap-2" onClick={() => navigate("/dashboard/subjects")}><ArrowLeft className="h-4 w-4" />Tous les modules</Button>
    <div className="overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg sm:p-8" style={{ background: `linear-gradient(135deg, ${module?.color || "#0e2854"}, #0e2854)` }}><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/65">{module?.semester}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{module?.name}</h1><p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">Choisissez un format d’entraînement puis avancez à votre rythme. Chaque réponse est sauvegardée pendant votre session.</p></div>
    <div className="flex gap-2 overflow-x-auto pb-1">{Object.entries(labels).map(([type, config]) => { const Icon = config.icon; return <Button key={type} variant={activeType === type ? "default" : "outline"} className={cn("h-auto min-w-48 justify-start gap-3 px-4 py-3", activeType === type && "shadow-md")} onClick={() => { setActiveType(type); setCategory("all"); }}><Icon className="h-5 w-5" /><span className="text-left"><span className="block font-semibold">{config.title}</span><span className="block text-xs opacity-75">{examsByType[type].length} disponible{examsByType[type].length > 1 ? "s" : ""}</span></span></Button>; })}</div>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><TypeIcon className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">{labels[activeType].title}</h2></div><p className="mt-1 text-sm text-muted-foreground">{labels[activeType].description}</p></div>{activeType === "course" && categories.length > 1 && <div className="flex max-w-full gap-2 overflow-x-auto">{categories.map((item) => <Button key={item} size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)}>{item === "all" ? "Toutes catégories" : item}</Button>)}</div>}</div>
    {currentExams.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{currentExams.map((exam) => <ExamCard key={exam.id} exam={exam} type={activeType} moduleColor={module?.color || "#0891b2"} onStart={startExam} onHelp={setHelpExam} />)}</div> : <div className="imrs-surface p-10 text-center"><TypeIcon className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 font-bold">Aucun contenu disponible</h2><p className="mt-1 text-sm text-muted-foreground">Les examens ajoutés à ce module apparaîtront ici.</p></div>}
    <Dialog open={Boolean(helpExam)} onOpenChange={(open) => !open && setHelpExam(null)}><DialogContent><DialogHeader><DialogTitle>{helpExam?.name}</DialogTitle><DialogDescription>Informations avant de commencer l’examen</DialogDescription></DialogHeader><p className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-6 text-foreground">{helpExam?.helpText || "Aucune information supplémentaire n’est disponible pour cet examen."}</p></DialogContent></Dialog>
  </section>;
}
