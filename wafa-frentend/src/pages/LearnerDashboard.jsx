import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, CircleAlert, Crown, GraduationCap, Play, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModuleCard from "@/components/Dashboard/ModuleCard";
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

  const semesterModules = useMemo(() => {
    const moduleProgress = stats?.moduleProgress || [];

    return modules
      .filter((module) => module.availableInAllSemesters || !selectedSemester || module.semester === selectedSemester)
      .map((module) => {
        const progressData = moduleProgress.find(
          (item) => String(item.moduleId || "") === String(module._id || module.id || ""),
        );
        const totalQuestions = Math.max(0, Number(module.totalQuestions) || 0);
        const questionsAttempted = Math.max(0, Number(progressData?.questionsAttempted) || 0);
        const progressPercentage = totalQuestions > 0
          ? Math.round((questionsAttempted / totalQuestions) * 100)
          : Math.round(Number(module.progress) || 0);

        return {
          ...module,
          progress: Math.min(100, Math.max(0, progressPercentage)),
          questionsAttempted,
          correctAnswers: Math.max(0, Number(progressData?.correctAnswers) || 0),
        };
      });
  }, [modules, selectedSemester, stats]);
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "étudiant";
  const progress = Math.round(stats?.overallProgress || stats?.progress || 0);
  const completed = stats?.examsCompleted || stats?.totalExamsCompleted || 0;
  const average = Math.round(stats?.averageScore || stats?.average || 0);
  const plan = user?.plan || "Gratuit";

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 px-5 py-7 text-slate-900 shadow-xl shadow-blue-200/40 sm:px-8 sm:py-9 dark:from-[#10265f] dark:via-[#133f80] dark:to-[#12718d] dark:text-white dark:shadow-blue-950/15">
      <div className="absolute right-0 top-0 h-48 w-48 -translate-y-1/3 translate-x-1/3 rounded-full bg-blue-300/25 blur-2xl dark:bg-cyan-300/15" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><span className="inline-flex rounded-full border border-blue-300/70 bg-white/70 px-3 py-1 text-xs font-semibold tracking-[.12em] text-blue-700 uppercase dark:border-cyan-200/25 dark:bg-white/10 dark:text-cyan-100">Espace de révision</span><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Bonjour, {firstName}.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base dark:text-blue-100">Une petite session aujourd'hui construit de grands résultats demain.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row"><Button onClick={() => navigate("/dashboard/subjects")} className="bg-primary text-primary-foreground hover:bg-primary/90"><Play className="mr-2 h-4 w-4 fill-current" />Continuer à réviser</Button><Button asChild variant="outline" className="border-blue-300 bg-white/70 text-blue-700 hover:bg-white hover:text-blue-800 dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"><Link to="/dashboard/progress">Voir mes progrès</Link></Button></div>
      </div>
    </section>

    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="imrs-eyebrow">Mon semestre</p><h2 className="imrs-page-title mt-3">Votre progression en un coup d'œil</h2><p className="imrs-page-copy">Choisissez un semestre pour retrouver vos contenus et résultats.</p></div><SemesterPicker current={selectedSemester} semesters={userSemesters} onChange={setSelectedSemester} disabled={semesterLoading} /></section>

    {loading ? <DashboardSkeleton /> : <>
      {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Les derniers contenus ne sont pas disponibles.</strong><p className="mt-1">Réessayez dans un instant. Vos pages de révision restent accessibles.</p></div></div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={<Target />} label="Progression" value={`${progress}%`} description="Dans ce semestre" tone="cyan" /><StatCard icon={<GraduationCap />} label="Examens terminés" value={completed} description="Tentatives complétées" tone="blue" /><StatCard icon={<BarChart3 />} label="Score moyen" value={`${average}%`} description="Sur vos dernières sessions" tone="green" /><StatCard icon={<Trophy />} label="Classement" value={rank ? `#${rank}` : "—"} description="Dans votre promotion" tone="amber" /></section>

      <section id="modules" aria-label={`Modules ${selectedSemester || "disponibles"}`}>
        {semesterModules.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {semesterModules.map((module, index) => (
              <ModuleCard
                key={module._id || module.id}
                course={module}
                handleCourseClick={(moduleId) => navigate(`/dashboard/subjects/${moduleId}`)}
                index={index}
              />
            ))}
          </div>
        ) : <EmptyModules />}
      </section>

      <section className="rounded-2xl border border-cyan-300/30 bg-cyan-50/70 p-5 dark:bg-cyan-950/20 sm:flex sm:items-center sm:justify-between sm:p-6"><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white"><Crown className="h-5 w-5" /></div><div><h2 className="font-bold">Votre plan : {plan}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Accédez à davantage de modules, statistiques et outils de révision selon votre formule.</p></div></div><Button asChild className="mt-4 sm:mt-0"><Link to="/dashboard/subscription">Voir mon abonnement</Link></Button></section>
    </>}
  </div>;
}

function SemesterPicker({ current, semesters, onChange, disabled }) { return <div className="flex flex-wrap gap-2" aria-label="Choisir un semestre">{(semesters.length ? semesters : current ? [current] : []).map((semester) => <button key={semester} disabled={disabled} onClick={() => onChange(semester)} className={`imrs-focus-ring rounded-xl px-4 py-2 text-sm font-semibold transition ${current === semester ? "bg-primary text-primary-foreground shadow-md" : "border border-border bg-card text-muted-foreground hover:text-primary"}`}>{semester}</button>)}</div>; }
function StatCard({ icon, label, value, description, tone }) { const colors = { cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200", blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200", green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200", amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200" }; return <article className="imrs-surface p-5"><div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}>{icon}</div><p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></article>; }
function EmptyModules() { return <div className="col-span-full rounded-xl border border-dashed border-border p-7 text-center"><BookOpen className="mx-auto h-7 w-7 text-cyan-600" /><p className="mt-3 font-semibold">Aucun module pour ce semestre</p><p className="mt-1 text-sm text-muted-foreground">Sélectionnez un autre semestre ou consultez votre abonnement.</p></div>; }
function DashboardSkeleton() { return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-40 rounded-2xl" />)}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[230px] rounded-2xl" />)}</div></div>; }
