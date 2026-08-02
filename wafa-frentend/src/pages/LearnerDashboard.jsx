import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, ChevronRight, CircleAlert, Clock3, Crown, GraduationCap, Play, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSemester } from "@/context/SemesterContext";
import { moduleService } from "@/services/moduleService";
import { dashboardService } from "@/services/dashboardService";

const getCachedUser = () => {
  try { return JSON.parse(localStorage.getItem("userProfile") || localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const { selectedSemester, setSelectedSemester, userSemesters, loading: semesterLoading } = useSemester();
  const [user, setUser] = useState(getCachedUser);
  const [modules, setModules] = useState([]);
  const [stats, setStats] = useState(null);
  const [rank, setRank] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const syncUser = () => setUser(getCachedUser());
    window.addEventListener("auth-state-changed", syncUser);
    return () => window.removeEventListener("auth-state-changed", syncUser);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    Promise.allSettled([moduleService.getAllmodules(), dashboardService.getUserStats(selectedSemester), dashboardService.getLeaderboardRank(selectedSemester)])
      .then(([moduleResult, statsResult, rankResult]) => {
        if (!active) return;
        if (moduleResult.status === "fulfilled") {
          const list = moduleResult.value?.data?.data || [];
          setModules(list);
        }
        if (statsResult.status === "fulfilled") setStats(statsResult.value?.data?.stats || statsResult.value?.stats || null);
        if (rankResult.status === "fulfilled") setRank(rankResult.value?.rank || 0);
        if (moduleResult.status === "rejected") setError(true);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selectedSemester]);

  const semesterModules = useMemo(() => modules.filter((module) => module.availableInAllSemesters || !selectedSemester || module.semester === selectedSemester).slice(0, 4), [modules, selectedSemester]);
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "étudiant";
  const progress = Math.round(stats?.overallProgress || stats?.progress || 0);
  const completed = stats?.examsCompleted || stats?.totalExamsCompleted || 0;
  const average = Math.round(stats?.averageScore || stats?.average || 0);
  const studyMinutes = stats?.studyMinutes || stats?.totalStudyTime || stats?.studyHours ? Math.round((stats.studyMinutes || stats.totalStudyTime || (stats.studyHours || 0) * 60)) : 0;
  const plan = user?.plan || "Gratuit";

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#10265f] via-[#133f80] to-[#12718d] px-5 py-7 text-white shadow-xl shadow-blue-950/15 sm:px-8 sm:py-9">
      <div className="absolute right-0 top-0 h-48 w-48 -translate-y-1/3 translate-x-1/3 rounded-full bg-cyan-300/15 blur-2xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><span className="inline-flex rounded-full border border-cyan-200/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[.12em] text-cyan-100 uppercase">Espace de révision</span><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Bonjour, {firstName}.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Une petite session aujourd'hui construit de grands résultats demain.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row"><Button onClick={() => navigate("/dashboard/subjects")} className="bg-cyan-300 text-[#10265f] hover:bg-cyan-200"><Play className="mr-2 h-4 w-4 fill-current" />Continuer à réviser</Button><Button asChild variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link to="/dashboard/progress">Voir mes progrès</Link></Button></div>
      </div>
    </section>

    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="imrs-eyebrow">Mon semestre</p><h2 className="imrs-page-title mt-3">Votre progression en un coup d'œil</h2><p className="imrs-page-copy">Choisissez un semestre pour retrouver vos contenus et résultats.</p></div><SemesterPicker current={selectedSemester} semesters={userSemesters} onChange={setSelectedSemester} disabled={semesterLoading} /></section>

    {loading ? <DashboardSkeleton /> : <>
      {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Les derniers contenus ne sont pas disponibles.</strong><p className="mt-1">Réessayez dans un instant. Vos pages de révision restent accessibles.</p></div></div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={<Target />} label="Progression" value={`${progress}%`} description="Dans ce semestre" tone="cyan" /><StatCard icon={<GraduationCap />} label="Examens terminés" value={completed} description="Tentatives complétées" tone="blue" /><StatCard icon={<BarChart3 />} label="Score moyen" value={`${average}%`} description="Sur vos dernières sessions" tone="green" /><StatCard icon={<Trophy />} label="Classement" value={rank ? `#${rank}` : "—"} description="Dans votre promotion" tone="amber" /></section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="imrs-surface p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Reprendre votre révision</h2><p className="mt-1 text-sm text-muted-foreground">Les modules disponibles pour {selectedSemester || "votre parcours"}.</p></div><Button asChild variant="ghost" size="sm"><Link to="/dashboard/subjects">Tout voir <ChevronRight className="ml-1 h-4 w-4" /></Link></Button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{semesterModules.length ? semesterModules.map((module, index) => <ModuleRow key={module._id} module={module} index={index} onOpen={() => navigate(`/dashboard/subjects/${module._id}`)} />) : <EmptyModules />}</div></div>
        <aside className="imrs-surface flex flex-col p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Votre rythme</h2><p className="mt-1 text-sm text-muted-foreground">Un objectif simple pour aujourd'hui.</p></div><Clock3 className="h-5 w-5 text-cyan-600" /></div><div className="mt-7 rounded-2xl bg-muted p-5"><div className="flex items-end justify-between"><div><p className="text-sm font-medium">Temps de révision</p><p className="mt-1 text-3xl font-bold text-primary">{formatMinutes(studyMinutes)}</p></div><span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200">Cette période</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${Math.min(Math.max(progress, 6), 100)}%` }} /></div><p className="mt-3 text-xs text-muted-foreground">Votre progression est mise à jour après chaque session.</p></div><div className="mt-auto pt-5"><Button asChild variant="outline" className="w-full"><Link to="/dashboard/statistics">Explorer mes statistiques</Link></Button></div></aside>
      </section>

      <section className="rounded-2xl border border-cyan-300/30 bg-cyan-50/70 p-5 dark:bg-cyan-950/20 sm:flex sm:items-center sm:justify-between sm:p-6"><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white"><Crown className="h-5 w-5" /></div><div><h2 className="font-bold">Votre plan : {plan}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Accédez à davantage de modules, statistiques et outils de révision selon votre formule.</p></div></div><Button asChild className="mt-4 sm:mt-0"><Link to="/dashboard/subscription">Voir mon abonnement</Link></Button></section>
    </>}
  </div>;
}

function SemesterPicker({ current, semesters, onChange, disabled }) { return <div className="flex flex-wrap gap-2" aria-label="Choisir un semestre">{(semesters.length ? semesters : current ? [current] : []).map((semester) => <button key={semester} disabled={disabled} onClick={() => onChange(semester)} className={`imrs-focus-ring rounded-xl px-4 py-2 text-sm font-semibold transition ${current === semester ? "bg-primary text-primary-foreground shadow-md" : "border border-border bg-card text-muted-foreground hover:text-primary"}`}>{semester}</button>)}</div>; }
function StatCard({ icon, label, value, description, tone }) { const colors = { cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200", blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200", green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200", amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200" }; return <article className="imrs-surface p-5"><div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}>{icon}</div><p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></article>; }
function ModuleRow({ module, index, onOpen }) { const progress = Math.round(module.progress || 0); const colors = ["from-cyan-500 to-blue-600", "from-blue-600 to-indigo-700", "from-teal-500 to-cyan-600", "from-violet-500 to-indigo-600"]; return <button onClick={onOpen} className="imrs-focus-ring group flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50/60 dark:hover:bg-cyan-950/20"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${colors[index % colors.length]} text-white`}><BookOpen className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{module.name}</p><span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${progress}%` }} /></div></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" /></button>; }
function EmptyModules() { return <div className="col-span-full rounded-xl border border-dashed border-border p-7 text-center"><BookOpen className="mx-auto h-7 w-7 text-cyan-600" /><p className="mt-3 font-semibold">Aucun module pour ce semestre</p><p className="mt-1 text-sm text-muted-foreground">Sélectionnez un autre semestre ou consultez votre abonnement.</p></div>; }
function DashboardSkeleton() { return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-40 rounded-2xl" />)}</div><div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div></div>; }
function formatMinutes(value) { if (!value) return "0 min"; if (value < 60) return `${value} min`; return `${Math.floor(value / 60)} h ${value % 60 ? `${value % 60} min` : ""}`; }
