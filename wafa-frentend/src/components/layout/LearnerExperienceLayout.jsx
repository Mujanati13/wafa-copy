import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, BookOpen, ChevronDown, ChevronLeft, CircleHelp, CreditCard, Crown,
  Home, Library, Loader2, LogOut, Menu, NotebookPen, Settings, Trophy, UserRound, X,
} from "lucide-react";
import { SemesterProvider } from "@/context/SemesterContext";
import { useSemester } from "@/context/SemesterContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import logo from "@/assets/yourqcm-logo.jpeg";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/authService";
import { moduleService } from "@/services/moduleService";
import { userService } from "@/services/userService";
import { toast } from "sonner";
import { displaySubscriptionPlanName, editableUserPlan, isPremiumPlan, isPremiumProPlan } from "@/utils/subscriptionDisplay";

const navGroups = [
  { label: "Accueil", items: [{ to: "/dashboard/home", label: "Vue d'ensemble", icon: Home, exact: true }] },
  { label: "Étudier", modules: true },
  { label: "Progression", items: [{ to: "/dashboard/progress", label: "Mes progrès", icon: BarChart3 }, { to: "/dashboard/statistics", label: "Statistiques", icon: Trophy, premium: true }, { to: "/dashboard/leaderboard", label: "Classement", icon: Trophy, premium: true }] },
  { label: "Bibliothèque", items: [{ to: "/dashboard/playlist", label: "Playlists", icon: Library, premiumPro: true }, { to: "/dashboard/note", label: "Mes notes", icon: NotebookPen, premiumPro: true }] },
];

const bottomItems = [
  { to: "/dashboard/home", label: "Accueil", icon: Home },
  { action: "modules", label: "Modules", icon: BookOpen },
  { to: "/dashboard/leaderboard", label: "Classement", icon: Trophy },
  { to: "/dashboard/profile", label: "Profil", icon: UserRound },
];

const parseUser = () => {
  try { return JSON.parse(localStorage.getItem("userProfile") || localStorage.getItem("user") || "{}"); } catch { return {}; }
};

const planAllows = (user, item) => {
  const premium = isPremiumPlan(user?.plan);
  const premiumPro = isPremiumProPlan(user?.plan);
  if (item.premiumPro) return premiumPro;
  if (item.premium) return premium;
  return true;
};

export default function LearnerExperienceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(parseUser);

  useEffect(() => {
    const sync = () => setUser(parseUser());
    window.addEventListener("storage", sync);
    window.addEventListener("auth-state-changed", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("auth-state-changed", sync); };
  }, []);

  useEffect(() => {
    let active = true;
    const proOnlyPaths = [
      "/dashboard/playlist",
      "/dashboard/playlists",
      "/dashboard/note",
      "/dashboard/notes",
    ];

    const syncAccountAccess = async () => {
      const latestUser = await userService.getUserProfile(true).catch(() => null);
      if (!active || !latestUser) return;

      const previousUser = parseUser();
      const previousAccess = JSON.stringify({
        plan: editableUserPlan(previousUser.plan),
        semesters: previousUser.semesters || [],
        freeModule: previousUser.freeModule || null,
        freeExam: previousUser.freeExam || null,
      });
      const latestAccess = JSON.stringify({
        plan: editableUserPlan(latestUser.plan),
        semesters: latestUser.semesters || [],
        freeModule: latestUser.freeModule || null,
        freeExam: latestUser.freeExam || null,
      });

      localStorage.setItem("user", JSON.stringify(latestUser));
      localStorage.setItem("userProfile", JSON.stringify(latestUser));
      setUser(latestUser);

      if (previousAccess !== latestAccess) {
        window.dispatchEvent(new Event("auth-state-changed"));
      }

      const isFree = editableUserPlan(latestUser.plan) === "Free";
      const isPro = isPremiumProPlan(latestUser.plan);

      if (!isPro && proOnlyPaths.some((path) => location.pathname.startsWith(path))) {
        toast.info("Cette fonctionnalité est réservée aux abonnés Premium Pro.");
        navigate("/dashboard/subscription", { replace: true });
        return;
      }

      if (isFree && location.pathname.startsWith("/dashboard/leaderboard")) {
        toast.info("Le classement est réservé aux abonnés.");
        navigate("/dashboard/subscription", { replace: true });
        return;
      }

      if (isFree && location.pathname.startsWith("/dashboard/statistics")) {
        navigate("/dashboard/home", { replace: true });
        return;
      }
    };

    syncAccountAccess();
    const accessSyncInterval = window.setInterval(syncAccountAccess, 15000);
    const handleFocus = () => syncAccountAccess();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncAccountAccess();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(accessSyncInterval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [location.pathname, navigate]);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Étudiant";
  const initials = useMemo(() => String(user?.name || `${user?.firstName || ""} ${user?.lastName || ""}` || "IM").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [user]);
  const profilePicture = user?.profilePicture?.startsWith("http")
    ? user.profilePicture
    : user?.profilePicture
      ? `${import.meta.env.VITE_API_URL?.replace("/api/v1", "")}${user.profilePicture}`
      : undefined;
  const isActive = (to) => location.pathname === to || (!to.endsWith("home") && location.pathname.startsWith(`${to}/`));

  const logout = async () => {
    await signOut();
    navigate("/");
  };

  return <SemesterProvider>
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Ouvrir la navigation"><Menu className="h-5 w-5" /></Button>
          <Link to="/dashboard/home" className="imrs-focus-ring flex min-w-0 items-center gap-2 rounded-lg"><img src={logo} alt="YourQcm" className="h-10 w-10 shrink-0 rounded-full object-contain" /><span className="hidden text-base font-bold xs:inline"><span className="text-[#1a237e] dark:text-blue-300">Your</span><span className="text-[#00b0d4]">Qcm</span></span></Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <p className="hidden truncate text-sm text-muted-foreground sm:block">Bienvenue, <span className="font-semibold text-foreground">{firstName}</span></p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden lg:block"><LanguageSwitcher /></div>
          <ThemeToggle />
          <NotificationDropdown />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="imrs-focus-ring relative h-10 w-10 rounded-full p-0" aria-label="Ouvrir le menu du profil">
                <Avatar className="h-9 w-9 ring-2 ring-primary/15">
                  <AvatarImage src={profilePicture} alt={user?.name || "Profil"} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-500 text-xs font-bold text-white">
                    {initials || "AQ"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-72 overflow-hidden rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-xl">
              <DropdownMenuLabel className="p-4 font-normal">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user?.name || "Utilisateur"}</p>
                  {user?.email && <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>}
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1" title="Reports approuvés"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />{user?.greenPoints || 0}</span>
                    <span className="flex items-center gap-1" title="Explications approuvées"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" />{user?.bluePoints || 0}</span>
                    <Badge variant="secondary" className="ml-auto shrink-0 bg-blue-100 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{user?.totalPoints || 0} pts</Badge>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs"><span className="font-medium">Niveau {Math.floor((user?.totalPoints || 0) / 50)}</span><span className="text-muted-foreground">{(user?.totalPoints || 0) % 50}/50 XP</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500" style={{ width: `${(((user?.totalPoints || 0) % 50) / 50) * 100}%` }} /></div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="m-0" />
              <DropdownMenuItem onSelect={() => navigate("/dashboard/profile")} className="cursor-pointer gap-3 rounded-none px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/dashboard/settings")} className="cursor-pointer gap-3 rounded-none px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"><Settings className="h-4 w-4" aria-hidden="true" /></span>
                <span>Paramètres</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/dashboard/subscription")} className="cursor-pointer gap-3 rounded-none px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"><CreditCard className="h-4 w-4" aria-hidden="true" /></span>
                <span>Abonnement</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="m-0" />
              <DropdownMenuItem onSelect={logout} className="cursor-pointer justify-center gap-2 rounded-none px-4 py-3 text-center font-medium text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40 dark:focus:text-red-300">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {drawerOpen && <button aria-label="Fermer la navigation" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" />}
        <aside className={cn("fixed inset-y-16 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0", drawerOpen ? "translate-x-0" : "-translate-x-full", collapsed && "lg:w-20")}>
          <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4"><span className={cn("text-xs font-semibold tracking-[.14em] text-indigo-700 uppercase dark:text-indigo-300", collapsed && "lg:hidden")}>Espace étudiant</span><Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false); else setCollapsed((value) => !value); }} aria-label="Réduire la navigation">{drawerOpen ? <X className="lg:hidden" /> : <ChevronLeft className={cn("hidden lg:block transition-transform", collapsed && "rotate-180")} />}</Button></div>
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation étudiant">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-5">
                <p className={cn("mb-2 px-2 text-[10px] font-bold tracking-[.14em] text-slate-500 uppercase dark:text-slate-400", collapsed && "lg:sr-only")}>{group.label}</p>
                {group.modules ? (
                  <ModuleNavigation collapsed={collapsed} setCollapsed={setCollapsed} user={user} />
                ) : (
                  <div className="space-y-1">
                    {group.items.map((item) => <NavigationItem key={item.to} item={item} active={isActive(item.to)} collapsed={collapsed} locked={!planAllows(user, item)} />)}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <NavLink to="/dashboard/subscription" className={cn("mb-2 flex items-center gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/80 p-3 text-sm text-indigo-950 transition hover:bg-indigo-100 dark:border-indigo-400/15 dark:bg-indigo-400/10 dark:text-indigo-100 dark:hover:bg-indigo-400/15", collapsed && "lg:justify-center lg:px-2")}><Crown className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-300" /><span className={cn("min-w-0", collapsed && "lg:hidden")}><span className="block font-semibold">{displaySubscriptionPlanName(user?.plan)}</span><span className="block text-xs text-indigo-700/75 dark:text-indigo-200/70">Voir mon abonnement</span></span></NavLink>
            <NavLink to="/dashboard/support" className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "lg:justify-center lg:px-2")}><CircleHelp className="h-5 w-5 shrink-0" /><span className={collapsed ? "lg:hidden" : ""}>Support</span></NavLink>
            <button onClick={logout} className={cn("mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "lg:justify-center lg:px-2")}><LogOut className="h-5 w-5 shrink-0" /><span className={collapsed ? "lg:hidden" : ""}>Déconnexion</span></button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-8"><div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8"><Outlet /></div></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card/95 px-2 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Navigation rapide">{bottomItems.map((item) => { const Icon = item.icon; const active = item.to ? isActive(item.to) : location.pathname.startsWith("/dashboard/subjects/"); return item.action === "modules" ? <button key={item.action} type="button" onClick={() => setDrawerOpen(true)} className={cn("imrs-focus-ring flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")} aria-label="Ouvrir mes modules"><Icon className="h-5 w-5" /><span>{item.label}</span></button> : <NavLink key={item.to} to={item.to} onClick={(event) => { if (item.to === "/dashboard/leaderboard" && !isPremiumPlan(user?.plan)) { event.preventDefault(); toast.info("Le classement est réservé aux abonnés."); navigate("/dashboard/subscription"); } }} className={cn("imrs-focus-ring flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}><Icon className="h-5 w-5" /><span>{item.label}</span></NavLink>; })}</nav>
    </div>
  </SemesterProvider>;
}

function NavigationItem({ item, active, collapsed, locked }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      onClick={(event) => {
        if (locked) {
          event.preventDefault();
          if (item.premiumPro) {
            toast.info("Cette fonctionnalité est réservée aux abonnés Premium Pro.");
          } else {
            toast.info("Cette fonctionnalité est réservée aux abonnés.");
          }
          navigate("/dashboard/subscription");
        }
      }}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-indigo-950/10"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "lg:justify-center lg:px-2"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
      {locked && (
        <Crown
          className={cn("ml-auto h-3.5 w-3.5 text-amber-500 dark:text-amber-300", collapsed && "lg:absolute lg:-right-1 lg:-top-1")}
          aria-label="Fonctionnalité premium"
        />
      )}
    </NavLink>
  );
}

function ModuleNavigation({ collapsed, setCollapsed, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedSemester, userSemesters } = useSemester();
  const isFree = !isPremiumPlan(user?.plan);
  const freeModuleId = String(user?.freeModule?._id || user?.freeModule || "");
  const moduleRouteActive = location.pathname.startsWith("/dashboard/subjects/");
  const [open, setOpen] = useState(moduleRouteActive);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (moduleRouteActive) setOpen(true);
  }, [location.pathname, moduleRouteActive]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    moduleService.getAllmodules(reloadKey > 0)
      .then((response) => {
        if (!active) return;
        setModules(response.data?.data || []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [reloadKey]);

  const visibleModules = useMemo(() => {
    if (isFree) {
      if (!freeModuleId) return [];
      return modules.filter((module) => String(module._id || module.id) === freeModuleId);
    }
    return modules
      .filter((module) => {
        if (module.availableInAllSemesters) return true;
        if (selectedSemester) return module.semester === selectedSemester;
        if (userSemesters.length) return userSemesters.includes(module.semester);
        return module.semester === "S1";
      })
      .sort((first, second) => {
        const orderDifference = (Number(first.order) || 0) - (Number(second.order) || 0);
        return orderDifference || String(first.name || "").localeCompare(String(second.name || ""), "fr");
      });
  }, [modules, selectedSemester, userSemesters, isFree, freeModuleId]);

  const toggleModules = () => {
    if (collapsed) {
      setCollapsed(false);
      setOpen(true);
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggleModules}
        className={cn(
          "imrs-focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
          moduleRouteActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-indigo-950/10"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed && "lg:justify-center lg:px-2",
        )}
        aria-expanded={open}
        aria-controls="learner-sidebar-modules"
        title={collapsed ? "Mes modules" : undefined}
      >
        <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 truncate text-left", collapsed && "lg:hidden")}>Mes modules</span>
        {!collapsed && !loading && (
          <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-300/15 dark:text-indigo-200" aria-label={`${visibleModules.length} modules`}>{visibleModules.length}</span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180", collapsed && "lg:hidden")} aria-hidden="true" />
      </button>

      <div id="learner-sidebar-modules" hidden={!open || collapsed} className="ml-5 mt-1 space-y-1 border-l border-indigo-200 pl-2 dark:border-indigo-300/20">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-sidebar-foreground/60"><Loader2 className="h-4 w-4 animate-spin" />Chargement des modules…</div>
        ) : error ? (
          <div className="px-3 py-3 text-xs text-sidebar-foreground/65">
            <p>Modules indisponibles.</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-1 font-semibold text-indigo-600 underline underline-offset-2 dark:text-indigo-300">Réessayer</button>
          </div>
        ) : visibleModules.length ? visibleModules.map((module) => {
          const isModuleLocked = isFree && (!freeModuleId || String(module._id || module.id) !== freeModuleId);
          return (
            <NavLink
              key={module._id || module.id}
              to={`/dashboard/subjects/${module._id || module.id}`}
              title={module.name}
              onClick={(event) => {
                if (isModuleLocked) {
                  event.preventDefault();
                  toast.info("Abonnez-vous pour accéder à tous les modules.");
                  navigate("/dashboard/subscription");
                }
              }}
              className={({ isActive }) => cn(
                "imrs-focus-ring flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition",
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-blue-200 dark:ring-white/10" style={{ backgroundColor: module.color || "#22d3ee" }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{module.name}</span>
              {isModuleLocked ? (
                <Crown className="shrink-0 h-3 w-3 text-amber-500" aria-label="Réservé aux abonnés" />
              ) : module.semester ? (
                <span className="shrink-0 text-[9px] font-bold text-indigo-600/70 dark:text-indigo-200/55">{module.semester}</span>
              ) : null}
            </NavLink>
          );
        }) : (
          <p className="px-3 py-3 text-xs leading-5 text-sidebar-foreground/60">Aucun module disponible pour {selectedSemester || "ce semestre"}.</p>
        )}
      </div>
    </div>
  );
}
