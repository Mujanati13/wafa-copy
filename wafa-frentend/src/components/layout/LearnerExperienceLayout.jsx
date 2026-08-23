import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, BookOpen, ChevronLeft, CircleHelp, CreditCard, Crown,
  FileText, GraduationCap, Home, Library, LogOut, Menu, NotebookPen,
  Settings, Trophy, UserRound, X,
} from "lucide-react";
import { SemesterProvider } from "@/context/SemesterContext";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/authService";

const navGroups = [
  { label: "Accueil", items: [{ to: "/dashboard/home", label: "Vue d'ensemble", icon: Home, exact: true }] },
  { label: "Étudier", items: [{ to: "/dashboard/subjects", label: "Mes modules", icon: BookOpen }, { to: "/dashboard/exams", label: "Examens", icon: GraduationCap }] },
  { label: "Progression", items: [{ to: "/dashboard/progress", label: "Mes progrès", icon: BarChart3 }, { to: "/dashboard/statistics", label: "Statistiques", icon: Trophy, premium: true }, { to: "/dashboard/leaderboard", label: "Classement", icon: Trophy, premium: true }] },
  { label: "Bibliothèque", items: [{ to: "/dashboard/playlist", label: "Playlists", icon: Library, premiumPro: true }, { to: "/dashboard/note", label: "Mes notes", icon: NotebookPen, premiumPro: true }] },
];

const bottomItems = [
  { to: "/dashboard/home", label: "Accueil", icon: Home },
  { to: "/dashboard/subjects", label: "Étudier", icon: BookOpen },
  { to: "/dashboard/progress", label: "Progrès", icon: BarChart3 },
  { to: "/dashboard/profile", label: "Profil", icon: UserRound },
];

const parseUser = () => {
  try { return JSON.parse(localStorage.getItem("userProfile") || localStorage.getItem("user") || "{}"); } catch { return {}; }
};

const planAllows = (user, item) => {
  const plan = String(user?.plan || "Free").toLowerCase();
  const premium = plan.includes("premium");
  const premiumPro = plan.includes("premium pro") || plan.includes("annuel");
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

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Étudiant";
  const initials = useMemo(() => String(user?.name || `${user?.firstName || ""} ${user?.lastName || ""}` || "IM").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [user]);
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
          <Link to="/dashboard/home" className="imrs-focus-ring flex min-w-0 items-center gap-2 rounded-lg"><img src={logo} alt="Atlas QCM" className="h-9 w-9 rounded-lg object-contain" /><span className="hidden text-base font-bold text-primary xs:inline">Atlas QCM</span></Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <p className="hidden truncate text-sm text-muted-foreground sm:block">Bonjour, <span className="font-semibold text-foreground">{firstName}</span></p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden lg:block"><LanguageSwitcher /></div>
          <ThemeToggle />
          <NotificationDropdown />
          <NavLink to="/dashboard/profile" className="imrs-focus-ring grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-label="Profil">{initials || "AQ"}</NavLink>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {drawerOpen && <button aria-label="Fermer la navigation" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" />}
        <aside className={cn("fixed inset-y-16 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0", drawerOpen ? "translate-x-0" : "-translate-x-full", collapsed && "lg:w-20")}>
          <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4"><span className={cn("text-xs font-semibold tracking-[.14em] text-cyan-200 uppercase", collapsed && "lg:hidden")}>Espace étudiant</span><Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false); else setCollapsed((value) => !value); }} aria-label="Réduire la navigation">{drawerOpen ? <X className="lg:hidden" /> : <ChevronLeft className={cn("hidden lg:block transition-transform", collapsed && "rotate-180")} />}</Button></div>
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation étudiant">
            {navGroups.map((group) => <div key={group.label} className="mb-5"><p className={cn("mb-2 px-2 text-[10px] font-bold tracking-[.14em] text-cyan-100/55 uppercase", collapsed && "lg:sr-only")}>{group.label}</p><div className="space-y-1">{group.items.map((item) => <NavigationItem key={item.to} item={item} active={isActive(item.to)} collapsed={collapsed} locked={!planAllows(user, item)} />)}</div></div>)}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <NavLink to="/dashboard/subscription" className={cn("mb-2 flex items-center gap-3 rounded-xl bg-cyan-300/12 p-3 text-sm text-cyan-50 transition hover:bg-cyan-300/20", collapsed && "lg:justify-center lg:px-2")}><Crown className="h-5 w-5 shrink-0 text-cyan-300" /><span className={cn("min-w-0", collapsed && "lg:hidden")}><span className="block font-semibold">{user?.plan || "Plan gratuit"}</span><span className="block text-xs text-cyan-100/70">Voir mon abonnement</span></span></NavLink>
            <NavLink to="/dashboard/support" className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "lg:justify-center lg:px-2")}><CircleHelp className="h-5 w-5 shrink-0" /><span className={collapsed ? "lg:hidden" : ""}>Support</span></NavLink>
            <button onClick={logout} className={cn("mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "lg:justify-center lg:px-2")}><LogOut className="h-5 w-5 shrink-0" /><span className={collapsed ? "lg:hidden" : ""}>Déconnexion</span></button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-8"><div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8"><Outlet /></div></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card/95 px-2 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Navigation rapide">{bottomItems.map((item) => { const Icon = item.icon; const active = isActive(item.to); return <NavLink key={item.to} to={item.to} className={cn("imrs-focus-ring flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}><Icon className="h-5 w-5" /><span>{item.label}</span></NavLink>; })}</nav>
    </div>
  </SemesterProvider>;
}

function NavigationItem({ item, active, collapsed, locked }) {
  const Icon = item.icon;
  return <NavLink to={item.to} title={collapsed ? item.label : undefined} className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "lg:justify-center lg:px-2")}><Icon className="h-5 w-5 shrink-0" /><span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>{locked && <Crown className={cn("ml-auto h-3.5 w-3.5 text-cyan-200", collapsed && "lg:absolute lg:-right-1 lg:-top-1")} aria-label="Fonctionnalité premium" />}</NavLink>;
}
