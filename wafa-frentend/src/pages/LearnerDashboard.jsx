import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, ChevronDown, CircleAlert, Crown, Lock, Medal, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ModuleCard from "@/components/Dashboard/ModuleCard";
import PromotionalUpgradeBanner from "@/components/Dashboard/PromotionalUpgradeBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSemester } from "@/context/SemesterContext";
import { moduleService } from "@/services/moduleService";
import { dashboardService } from "@/services/dashboardService";
import { displaySubscriptionPlanName, isPremiumPlan } from "@/utils/subscriptionDisplay";
import { cn } from "@/lib/utils";

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
      .filter((module) => Boolean(selectedSemester) && module.semester === selectedSemester)
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
  const isFreeUser = !isPremiumPlan(user?.plan);
  const freeModuleId = String(user?.freeModule?._id || user?.freeModule || "");

  const displayedModules = useMemo(() => {
    if (isFreeUser) {
      if (!freeModuleId) return [];
      return modules
        .filter((module) => String(module._id || module.id) === freeModuleId)
        .map((module) => {
          const moduleProgress = stats?.moduleProgress || [];
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
    }
    return semesterModules;
  }, [isFreeUser, freeModuleId, modules, stats, semesterModules]);

  const availableSemesters = useMemo(() => {
    const fromModules = Array.from(new Set(modules.map((m) => m.semester).filter(Boolean)));
    if (fromModules.length) {
      return fromModules.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });
    }
    return userSemesters.length ? userSemesters : ["S1", "S2", "S3", "S4", "S5", "S6"];
  }, [modules, userSemesters]);

  const freeModuleSemester = useMemo(() => {
    if (!isFreeUser || !freeModuleId) return null;
    const found = modules.find((m) => String(m._id || m.id) === freeModuleId);
    return found?.semester || null;
  }, [isFreeUser, freeModuleId, modules]);

  const displayedSemesters = isFreeUser
    ? (freeModuleSemester ? [freeModuleSemester] : availableSemesters)
    : (userSemesters.length ? userSemesters : availableSemesters);

  useEffect(() => {
    if (isFreeUser && freeModuleSemester && selectedSemester !== freeModuleSemester) {
      setSelectedSemester(freeModuleSemester);
    } else if (!selectedSemester && displayedSemesters.length) {
      setSelectedSemester(displayedSemesters[0]);
    }
  }, [isFreeUser, freeModuleSemester, selectedSemester, displayedSemesters, setSelectedSemester]);

  const handleCourseClick = (module) => {
    const moduleId = module._id || module.id;
    const isModuleLocked = isFreeUser && (!freeModuleId || String(moduleId) !== freeModuleId);
    if (isModuleLocked) {
      toast.info("Abonnez-vous pour débloquer ce module et accéder à tous les cours.");
      navigate("/dashboard/subscription");
      return;
    }
    navigate(`/dashboard/subjects/${moduleId}`);
  };

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "étudiant";
  const semesterProgress = useMemo(() => {
    const modulesWithQuestionTotals = displayedModules.filter((module) => Number(module.totalQuestions) > 0);
    if (modulesWithQuestionTotals.length) {
      const totals = modulesWithQuestionTotals.reduce((result, module) => ({
        questions: result.questions + Number(module.totalQuestions),
        attempted: result.attempted + Math.min(Number(module.totalQuestions), Number(module.questionsAttempted) || 0),
      }), { questions: 0, attempted: 0 });
      return totals.questions ? Math.round((totals.attempted / totals.questions) * 100) : 0;
    }

    if (!displayedModules.length) return 0;
    return Math.round(displayedModules.reduce((sum, module) => sum + (Number(module.progress) || 0), 0) / displayedModules.length);
  }, [displayedModules]);
  const totalPoints = Math.max(0, Number(stats?.totalPoints ?? user?.totalPoints) || 0);
  const progress = Math.round(Number(stats?.overallProgress ?? stats?.progress ?? semesterProgress) || 0);
  const completed = Math.max(0, Number(stats?.examsCompleted ?? stats?.totalExamsCompleted) || 0);
  const average = Math.round(Number(stats?.averageScore ?? stats?.average) || 0);
  const handleLeaderboardClick = () => {
    if (isFreeUser) {
      toast.info("Le classement est réservé aux abonnés.");
      navigate("/dashboard/subscription");
    } else {
      navigate("/dashboard/leaderboard");
    }
  };

  const plan = displaySubscriptionPlanName(user?.plan, "Gratuit");

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 px-5 py-7 text-slate-900 shadow-xl shadow-blue-200/40 dark:from-[#10265f] dark:via-[#133f80] dark:to-[#12718d] dark:text-white dark:shadow-blue-950/15 lg:hidden">
      <div className="absolute right-0 top-0 h-48 w-48 -translate-y-1/3 translate-x-1/3 rounded-full bg-blue-300/25 blur-2xl dark:bg-cyan-300/15" />
      <div className="relative">
        <h1 className="text-3xl font-bold tracking-tight">Bienvenue, {firstName}.</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-blue-100">Une petite session aujourd'hui construit de grands résultats demain.</p>
      </div>
      <div className="relative mt-6 grid grid-cols-3 border-t border-white/70 pt-5 dark:border-white/15">
        <DashboardStat icon={<Medal className="h-6 w-6" aria-hidden="true" />} label="Classement" value={loading ? "…" : rank ? `#${rank}` : "—"} tone="amber" onClick={handleLeaderboardClick} />
        <DashboardStat icon={<TrendingUp className="h-6 w-6" aria-hidden="true" />} label="Progression" value={loading ? "…" : `${semesterProgress}%`} tone="emerald" />
        <DashboardStat icon={<Star className="h-6 w-6" aria-hidden="true" />} label="Points" value={loading ? "…" : totalPoints.toLocaleString("fr-FR")} tone="gold" />
      </div>
    </section>

    <section className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 px-10 py-10 text-slate-900 shadow-xl shadow-blue-200/40 dark:from-[#10265f] dark:via-[#133f80] dark:to-[#12718d] dark:text-white dark:shadow-blue-950/15 lg:block">
      <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-blue-300/25 blur-3xl dark:bg-cyan-300/15" />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Bienvenue, {firstName}.</h1>
          <p className="mt-2 max-w-xl text-base leading-6 text-slate-600 dark:text-blue-100">Une petite session aujourd'hui construit de grands résultats demain.</p>
        </div>
        <Button asChild variant="outline" className="border-blue-300 bg-white/70 text-blue-700 hover:bg-white hover:text-blue-800 dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"><Link to="/dashboard/progress">Voir mes progrès</Link></Button>
      </div>
    </section>

    {isFreeUser && (
      <PromotionalUpgradeBanner className="my-2" />
    )}

    <section className="hidden items-end justify-between gap-6 lg:flex">
      <div>
        <p className="imrs-eyebrow">Mon semestre</p>
        <h2 className="imrs-page-title mt-3">Votre progression en un coup d'œil</h2>
        <p className="imrs-page-copy">Choisissez un semestre pour retrouver vos contenus et résultats.</p>
      </div>
      <DesktopSemesterPicker
        current={selectedSemester}
        semesters={displayedSemesters}
        userSemesters={userSemesters}
        isFreeUser={isFreeUser}
        onChange={setSelectedSemester}
        disabled={semesterLoading}
      />
    </section>

    {loading ? <DashboardSkeleton /> : <>
      {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Les derniers contenus ne sont pas disponibles.</strong><p className="mt-1">Réessayez dans un instant. Vos pages de révision restent accessibles.</p></div></div>}

      <section className="hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Progression" value={`${progress}%`} description="Dans ce semestre" tone="cyan" />
        <StatCard label="Examens terminés" value={completed} description="Tentatives complétées" tone="blue" />
        <StatCard label="Score moyen" value={`${average}%`} description="Sur vos dernières sessions" tone="green" />
        <StatCard label="Classement" value={rank ? `#${rank}` : "—"} description="Dans votre promotion" tone="amber" onClick={handleLeaderboardClick} />
      </section>

      <section id="modules" aria-label={`Modules ${selectedSemester || "disponibles"}`}>
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-3 lg:hidden">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Modules</h2>
              <span className="text-xs font-semibold text-muted-foreground sm:text-sm">{displayedModules.length} module{displayedModules.length > 1 ? "s" : ""}</span>
            </div>
            <div className="mt-2 h-1 w-14 rounded-full bg-emerald-500" aria-hidden="true" />
          </div>
          <MobileSemesterPicker
            current={selectedSemester}
            semesters={displayedSemesters}
            userSemesters={userSemesters}
            isFreeUser={isFreeUser}
            onChange={setSelectedSemester}
            disabled={semesterLoading}
          />
        </div>
        {displayedModules.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayedModules.map((module, index) => {
              const isModuleLocked = isFreeUser && (!freeModuleId || String(module._id || module.id) !== freeModuleId);
              return (
                <ModuleCard
                  key={module._id || module.id}
                  course={module}
                  isLocked={isModuleLocked}
                  isFreeUser={isFreeUser}
                  handleCourseClick={() => handleCourseClick(module)}
                  index={index}
                />
              );
            })}
          </div>
        ) : <EmptyModules />}
      </section>

      <section className="rounded-2xl border border-cyan-300/30 bg-cyan-50/70 p-5 dark:bg-cyan-950/20 sm:flex sm:items-center sm:justify-between sm:p-6"><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white"><Crown className="h-5 w-5" /></div><div><h2 className="font-bold">Votre plan : {plan}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Accédez à davantage de modules, statistiques et outils de révision selon votre formule.</p></div></div><Button asChild className="mt-4 sm:mt-0"><Link to="/dashboard/subscription">Voir mon abonnement</Link></Button></section>
    </>}
  </div>;
}

function MobileSemesterPicker({ current, semesters, userSemesters = [], isFreeUser = false, onChange, disabled }) {
  const options = semesters.length ? semesters : current ? [current] : [];
  return (
    <label className="relative shrink-0">
      <span className="sr-only">Choisir un semestre</span>
      <select
        value={current || ""}
        disabled={disabled || !options.length}
        onChange={(event) => onChange(event.target.value)}
        className="imrs-focus-ring h-10 appearance-none rounded-xl border border-blue-200 bg-primary py-0 pl-4 pr-9 text-sm font-bold text-primary-foreground shadow-md disabled:cursor-not-allowed disabled:opacity-60 [&>option]:bg-white [&>option]:text-slate-900"
      >
        {!options.length && <option value="">—</option>}
        {options.map((semester) => {
          const isSubscribed = !isFreeUser || userSemesters.includes(semester);
          return (
            <option key={semester} value={semester}>
              {semester}{isFreeUser && !isSubscribed ? " 🔒" : ""}
            </option>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground" aria-hidden="true" />
    </label>
  );
}

function DesktopSemesterPicker({ current, semesters, userSemesters = [], isFreeUser = false, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Choisir un semestre">
      {(semesters.length ? semesters : current ? [current] : []).map((semester) => {
        const isSubscribed = !isFreeUser || userSemesters.includes(semester);
        const isSelected = current === semester;
        return (
          <button
            type="button"
            key={semester}
            disabled={disabled}
            onClick={() => onChange(semester)}
            className={`imrs-focus-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "border border-border bg-card text-muted-foreground hover:text-primary"
            }`}
          >
            <span>{semester}</span>
            {isFreeUser && !isSubscribed && (
              <Lock className="h-3 w-3 opacity-60" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
function StatCard({ label, value, description, tone, onClick }) {
  const accents = { cyan: "bg-cyan-500", blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500" };
  return (
    <article
      onClick={onClick}
      className={cn(
        "imrs-surface p-5",
        onClick && "cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-md"
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`h-1 w-10 rounded-full ${accents[tone]}`} aria-hidden="true" />
      <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </article>
  );
}

function DashboardStat({ icon, label, value, tone, onClick }) {
  const colors = { amber: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-300", emerald: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300", gold: "border-yellow-400 bg-yellow-100 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950/70 dark:text-yellow-300" };
  return (
    <article
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col items-center px-1 text-center sm:px-5",
        onClick && "cursor-pointer active:scale-95"
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`grid h-12 w-12 place-items-center rounded-2xl border-2 shadow-sm sm:h-14 sm:w-14 ${colors[tone]}`}>{icon}</div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-blue-100 sm:text-xs">{label}</p>
      <p className="mt-0.5 max-w-full truncate text-base font-extrabold text-slate-900 dark:text-white sm:text-xl">{value}</p>
    </article>
  );
}
function EmptyModules() { return <div className="col-span-full rounded-xl border border-dashed border-border p-7 text-center"><BookOpen className="mx-auto h-7 w-7 text-cyan-600" /><p className="mt-3 font-semibold">Aucun module pour ce semestre</p><p className="mt-1 text-sm text-muted-foreground">Sélectionnez un autre semestre ou consultez votre abonnement.</p></div>; }
function DashboardSkeleton() { return <div className="space-y-5"><div className="flex items-center justify-between lg:hidden"><Skeleton className="h-10 w-36 rounded-xl" /><Skeleton className="h-10 w-16 rounded-xl" /></div><div className="hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={`stat-${item}`} className="h-40 rounded-2xl" />)}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[230px] rounded-2xl" />)}</div></div>; }
