import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle, ArrowRight, BadgeCheck, BookOpenCheck, Check, CheckCircle2,
  CircleHelp, Clock3, Facebook, GraduationCap, HelpCircle, Home, Instagram,
  Highlighter, Loader2, Menu, MessageCircle, Send, Shield, ShieldCheck,
  Sparkles, Star, Target, TrendingUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/utils";
import { toast } from "sonner";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import logo from "@/assets/logo.png";
import { getLandingPageSettings } from "@/services/landingPageService";
import { subscriptionPlanService } from "@/services/subscriptionPlanService";

const FALLBACK_SETTINGS = {
  siteName: "YourQCM",
  heroTitle: "Faciliter votre préparation avec YourQCM",
  heroSubtitle: "Révisez mieux. En moins de temps.",
  heroDescription: "Préparez-vous efficacement pour les examens avec notre plateforme d'exam, conçue pour les étudiants en médecine de FMPM.",
  pricingTitle: "Choisissez votre rythme de révision",
  pricingSubtitle: "Commencez gratuitement, passez à l'illimité quand vous êtes prêt.",
  faqTitle: "Questions fréquentes",
  faqItems: [],
  timerEnabled: false,
  timerEndDate: null,
  timerTitle: "Offre spéciale se termine dans",
};

const LANDING_SETTINGS_SYNC_KEY = "landing-settings-updated-at";

const calculateLandingCountdown = (enabled, endDate) => {
  if (!enabled || !endDate) return null;
  const remaining = new Date(endDate).getTime() - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

const copy = {
  fr: {
    login: "Se connecter", create: "Créer mon compte", subscriptionCta: "Voir l'abonnement",
    navigation: ["Avantages", "Abonnements", "FAQ"],
    eyebrow: "Préparation médicale, sans dispersion", continue: "Commencer gratuitement",
    seePlans: "Voir les abonnements", trusted: "Pensé pour les étudiants en médecine au Maroc",
    dashboard: "Votre espace de révision", ready: "Prêt à apprendre", qcm: "QCM du jour",
    score: "Score moyen", focus: "À réviser", next: "Continuer",
    previewKicker: "Cardiologie • QCM du jour", previewTitle: "Entraînement en cours",
    previewQuestion: "Quel signe clinique oriente vers une insuffisance cardiaque gauche ?",
    previewAnswers: ["Œdèmes des membres inférieurs", "Dyspnée d'effort", "Douleur abdominale"],
    previewCorrect: "Bonne réponse", previewProgress: "Progression du module", previewWeek: "+18% cette semaine", previewLive: "Session active",
    benefits: "Comment YourQCM vous aide à valider", benefitsCopy: "Des outils puissants pour optimiser votre apprentissage",
    features: [
      ["QCM et examens", "Entraînez-vous sur les thèmes importants."],
      ["Explications utiles", "Comprenez chaque réponse, pas seulement votre score."],
      ["Progression visible", "Identifiez vos acquis et vos priorités."],
      ["Révision organisée", "Notes et playlists au même endroit."],
      ["Plateforme stable", "Une plateforme sécurisée et fiable. Vos données restent privées."],
      ["Classement direct", "Suivez vos performances et évaluez votre niveau parmi les meilleurs."],
      ["Amélioration continue", "À l'écoute de nos utilisateurs pour constamment améliorer la plateforme."],
      ["Surligneur", "Mettez en évidence ce qui est important dans vos révisions."],
    ],
    plans: "Abonnements", popular: "Le plus choisi", perSemester: "/ semestre", choose: "Choisir ce plan", includes: "Ce qui est inclus", faq: "Réponses claires avant de commencer",
    footer: "Révisez avec intention. Progressez avec YourQCM.", product: "Produit", support: "Support", social: "Suivez-nous", privacy: "Confidentialité", terms: "Conditions",
    menu: "Ouvrir le menu",
  },
  en: {
    login: "Log in", create: "Create my account", subscriptionCta: "View subscription",
    navigation: ["Benefits", "Plans", "FAQ"],
    eyebrow: "Medical preparation, without the noise", continue: "Start for free",
    seePlans: "View plans", trusted: "Built for medical students in Morocco",
    dashboard: "Your study space", ready: "Ready to learn", qcm: "Today's QCM",
    score: "Average score", focus: "To review", next: "Continue",
    previewKicker: "Cardiology • QCM of the day", previewTitle: "Practice in progress",
    previewQuestion: "Which clinical sign suggests left-sided heart failure?",
    previewAnswers: ["Lower limb oedema", "Exertional dyspnoea", "Abdominal pain"],
    previewCorrect: "Correct answer", previewProgress: "Module progress", previewWeek: "+18% this week", previewLive: "Live session",
    benefits: "How YourQCM helps you succeed", benefitsCopy: "Powerful tools to optimise your learning",
    features: [
      ["QCMs and exams", "Practise the topics that matter."],
      ["Useful explanations", "Understand every answer, not only your score."],
      ["Visible progress", "Identify strengths and priorities."],
      ["Organised study", "Keep notes and playlists in one place."],
      ["Stable platform", "A secure and reliable platform. Your data stays private."],
      ["Live ranking", "Track your performance and assess your level among the best."],
      ["Continuous improvement", "We listen to our users to continuously improve the platform."],
      ["Highlighter", "Highlight what matters most in your revision."],
    ],
    plans: "Plans", popular: "Most popular", perSemester: "/ semester", choose: "Choose this plan", includes: "What's included", faq: "Clear answers before you begin",
    footer: "Study with intention. Progress with YourQCM.", product: "Product", support: "Support", social: "Follow us", privacy: "Privacy", terms: "Terms",
    menu: "Open menu",
  },
};

const defaultFaqs = [
  ["Pour quelle faculté sont destinés ces QCMs ?", "Les QCMs sont spécifiquement conçus pour les étudiants de la FMPM (Faculté de Médecine et de Pharmacie de Marrakech)."],
  ["Dois-je créer un compte ?", "Oui, la création d'un compte gratuit est nécessaire pour accéder aux QCMs et sauvegarder votre progression."],
  ["Puis-je suivre ma progression ?", "Oui, votre progression est automatiquement sauvegardée et vous pouvez la consulter à tout moment."],
  ["Puis-je être remboursé ?", "Les remboursements ne sont accordés que dans des cas exceptionnels. Pour toute demande, contactez-nous sur WhatsApp."],
  ["Puis-je personnaliser mon parcours d'études ?", "Bien sûr ! Vous pouvez organiser votre plan d'études par création des playlists, des examens et des exercices spécifiques afin de personnaliser votre expérience d'apprentissage."],
];

const defaultFaqsEn = [
  ["Which faculty are these QCMs for?", "The QCMs are specifically designed for FMPM students (Faculty of Medicine and Pharmacy of Marrakech)."],
  ["Do I need to create an account?", "Yes. A free account is required to access QCMs and save your progress."],
  ["Can I track my progress?", "Yes. Your progress is saved automatically and is available from your dashboard."],
  ["Can I request a refund?", "Refunds are granted only in exceptional circumstances. Contact us on WhatsApp for assistance."],
  ["Can I customise my study journey?", "Yes. Create playlists, exams, and focused exercises to personalise your learning experience."],
];

const REVIEW_SUBJECTS = [
  "Expérience générale",
  "Qualité de contenu",
  "Interface & navigation",
  "Idées d'amélioration",
];

const unwrap = (value) => value?.data?.data || value?.data || value || [];

const faqIconColors = [
  { background: "bg-blue-100", hover: "group-hover:bg-blue-200", icon: "text-blue-600" },
  { background: "bg-green-100", hover: "group-hover:bg-green-200", icon: "text-green-600" },
  { background: "bg-purple-100", hover: "group-hover:bg-purple-200", icon: "text-purple-600" },
  { background: "bg-teal-100", hover: "group-hover:bg-teal-200", icon: "text-teal-600" },
  { background: "bg-orange-100", hover: "group-hover:bg-orange-200", icon: "text-orange-600" },
  { background: "bg-indigo-100", hover: "group-hover:bg-indigo-200", icon: "text-indigo-600" },
];

const benefitVisuals = [
  {
    icon: BookOpenCheck,
    iconColor: "from-blue-500 to-blue-600",
    cardColor: "from-blue-50/90 to-white hover:border-blue-300 dark:from-blue-950/25 dark:to-card dark:hover:border-blue-700",
  },
  {
    icon: CircleHelp,
    iconColor: "from-teal-500 to-teal-600",
    cardColor: "from-teal-50/90 to-white hover:border-teal-300 dark:from-teal-950/25 dark:to-card dark:hover:border-teal-700",
  },
  {
    icon: Target,
    iconColor: "from-indigo-500 to-indigo-600",
    cardColor: "from-indigo-50/90 to-white hover:border-indigo-300 dark:from-indigo-950/25 dark:to-card dark:hover:border-indigo-700",
  },
  {
    icon: Star,
    iconColor: "from-amber-400 to-orange-500",
    cardColor: "from-amber-50/90 to-white hover:border-amber-300 dark:from-amber-950/25 dark:to-card dark:hover:border-amber-700",
  },
  {
    icon: Shield,
    iconColor: "from-blue-500 to-blue-600",
    cardColor: "from-blue-50/90 to-white hover:border-blue-300 dark:from-blue-950/25 dark:to-card dark:hover:border-blue-700",
  },
  {
    icon: TrendingUp,
    iconColor: "from-emerald-500 to-teal-500",
    cardColor: "from-emerald-50/90 to-white hover:border-emerald-300 dark:from-emerald-950/25 dark:to-card dark:hover:border-emerald-700",
  },
  {
    icon: BadgeCheck,
    iconColor: "from-violet-500 to-indigo-600",
    cardColor: "from-violet-50/90 to-white hover:border-violet-300 dark:from-violet-950/25 dark:to-card dark:hover:border-violet-700",
  },
  {
    icon: Highlighter,
    iconColor: "from-amber-400 to-yellow-500",
    cardColor: "from-amber-50/90 to-white hover:border-amber-300 dark:from-amber-950/25 dark:to-card dark:hover:border-amber-700",
  },
];

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

function HeroStudyPreview({ text, language }) {
  const reduceMotion = useReducedMotion();
  const floatTransition = reduceMotion ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" };
  const pulseTransition = reduceMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" };

  return (
    <div
      className="relative mx-auto w-full max-w-xl pb-7 pt-3 sm:px-3"
      role="img"
      aria-label={language === "fr" ? "Aperçu animé d'une session de révision YourQCM" : "Animated preview of a YourQCM study session"}
    >
      <div className="absolute -inset-7 -z-10 rounded-[3rem] bg-gradient-to-br from-cyan-300/35 via-blue-400/15 to-amber-200/20 blur-3xl" />

      <Motion.div
        animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
        transition={floatTransition}
        className="overflow-hidden rounded-[2rem] border border-white/90 bg-white shadow-2xl shadow-blue-950/20 ring-1 ring-blue-100 dark:border-white/10 dark:bg-slate-950 dark:ring-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">YourQCM</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{text.previewTitle}</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Motion.span
              animate={reduceMotion ? undefined : { opacity: [1, .35, 1], scale: [1, .8, 1] }}
              transition={pulseTransition}
              className="h-2 w-2 rounded-full bg-emerald-500"
            />
            {text.previewLive}
          </span>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[1fr_9.5rem]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-blue-600 dark:text-cyan-400">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              {text.previewKicker}
            </div>
            <p className="mt-4 text-base font-bold leading-6 text-slate-900 dark:text-white sm:text-lg">{text.previewQuestion}</p>
            <div className="mt-4 grid gap-2.5">
              {text.previewAnswers.map((answer, index) => {
                const correct = index === 1;
                return (
                  <Motion.div
                    key={answer}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: .3 + index * .12, duration: .35 }}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-medium sm:text-sm ${correct ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200" : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"}`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>{String.fromCharCode(65 + index)}</span>
                    <span className="min-w-0 flex-1">{answer}</span>
                    {correct && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label={text.previewCorrect} />}
                  </Motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 p-4 text-white shadow-lg shadow-blue-700/20">
            <div>
              <p className="text-[11px] font-medium text-blue-100">{text.previewProgress}</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-3xl font-bold">72</span><span className="pb-1 text-sm text-blue-100">%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                <Motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "72%" }}
                  transition={{ duration: reduceMotion ? 0 : 1.1, delay: .45, ease: "easeOut" }}
                  className="h-full rounded-full bg-cyan-300"
                />
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-white/12 p-3 backdrop-blur-sm">
              <TrendingUp className="h-5 w-5 text-cyan-200" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold">{text.previewWeek}</p>
            </div>
          </div>
        </div>
      </Motion.div>

      <Motion.div
        animate={reduceMotion ? undefined : { y: [0, 7, 0], rotate: [0, 1, 0] }}
        transition={reduceMotion ? undefined : { duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: .5 }}
        className="absolute -bottom-1 left-0 flex items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:-left-3"
      >
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Target className="h-4 w-4" aria-hidden="true" /></div>
        <div><p className="text-[10px] text-slate-500 dark:text-slate-400">{text.focus}</p><p className="text-xs font-bold text-slate-900 dark:text-white">Cardiologie</p></div>
      </Motion.div>
    </div>
  );
}

export default function RedesignedLandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [language, setLanguage] = useState("fr");
  const [currentUser, setCurrentUser] = useState(getStoredUser);

  useEffect(() => {
    const locale = localStorage.getItem("i18nextLng") || navigator.language || "fr";
    setLanguage(locale.startsWith("fr") ? "fr" : "en");
  }, []);

  useEffect(() => {
    const syncAuthenticatedUser = () => setCurrentUser(getStoredUser());
    syncAuthenticatedUser();
    window.addEventListener("storage", syncAuthenticatedUser);
    window.addEventListener("auth-state-changed", syncAuthenticatedUser);
    return () => {
      window.removeEventListener("storage", syncAuthenticatedUser);
      window.removeEventListener("auth-state-changed", syncAuthenticatedUser);
    };
  }, []);

  const hasActiveLogin = Boolean(currentUser && localStorage.getItem("token"));
  const dashboardPath = currentUser?.isAdmin ? "/admin/analytics" : "/dashboard/home";

  // Public landing requests do not pass through authenticated middleware, so
  // refresh the active account lease while a signed-in user stays on this page.
  useEffect(() => {
    if (!hasActiveLogin) return undefined;

    const refreshSession = () => api.get("/auth/check-auth").catch(() => undefined);
    refreshSession();
    const timer = window.setInterval(refreshSession, 4 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [hasActiveLogin]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getLandingPageSettings(),
      subscriptionPlanService.getAvailablePlans(),
      api.get("/feedbacks"),
    ])
      .then(([settingsResult, plansResult, reviewsResult]) => {
        if (!active) return;
        if (settingsResult.status === "fulfilled") {
          const data = unwrap(settingsResult.value);
          if (data && !Array.isArray(data)) setSettings((previous) => ({ ...previous, ...data }));
          setSettingsLoaded(true);
        }
        if (plansResult.status === "fulfilled") {
          const data = unwrap(plansResult.value);
          setPlans(Array.isArray(data) ? data.sort((a, b) => (a.order || 0) - (b.order || 0)) : []);
        }
        if (reviewsResult.status === "fulfilled") {
          const data = unwrap(reviewsResult.value);
          setApprovedReviews(Array.isArray(data) ? data : []);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPlans(false);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    const refreshSettings = async () => {
      try {
        const data = unwrap(await getLandingPageSettings());
        if (active && data && !Array.isArray(data)) {
          setSettings((previous) => ({ ...previous, ...data }));
          setSettingsLoaded(true);
        }
      } catch {
        // Keep the last successfully loaded settings when a background refresh fails.
      }
    };
    const handleStorage = (event) => {
      if (event.key === LANDING_SETTINGS_SYNC_KEY) refreshSettings();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshSettings();
    };

    window.addEventListener("landing-settings-changed", refreshSettings);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshSettings);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      window.removeEventListener("landing-settings-changed", refreshSettings);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshSettings);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const text = copy[language] || copy.fr;
  const savedFaqs = Array.isArray(settings.faqItems)
    ? settings.faqItems.filter((item) => item?.question?.trim() && item?.answer?.trim()).map((item) => [item.question, item.answer])
    : [];
  const faqs = settingsLoaded ? savedFaqs : language === "fr" ? defaultFaqs : defaultFaqsEn;
  const displayedPlans = plans;
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      {settings.promotionEnabled && settings.promotionText && (
        <a href={settings.promotionLink || "#pricing"} className="block bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
          {settings.promotionText} <span className="ml-2 underline">{text.seePlans}</span>
        </a>
      )}

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="imrs-focus-ring flex items-center gap-3 rounded-lg" aria-label="YourQCM">
            <img src={settings.logoUrl || logo} alt={settings.siteName || "YourQCM"} className="h-10 w-10 rounded-xl object-contain" />
            <span className="text-lg font-bold tracking-tight text-primary">{settings.siteName || "YourQCM"}</span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Navigation principale">
            {[["benefits", text.navigation[0]], ["pricing", text.navigation[1]], ["faq", text.navigation[2]]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="imrs-focus-ring rounded text-sm font-medium text-muted-foreground transition hover:text-primary">{label}</button>
            ))}
          </nav>
          <div className="hidden items-center gap-1 sm:flex">
            <ThemeToggle /><LanguageSwitcher />
            {hasActiveLogin ? (
              <Button asChild className="bg-primary shadow-lg shadow-blue-950/15 hover:bg-primary/90"><Link to={dashboardPath}>{language === "fr" ? "Mon espace" : "My dashboard"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            ) : (
              <><Button asChild variant="ghost"><Link to="/login">{text.login}</Link></Button><Button asChild className="bg-primary shadow-lg shadow-blue-950/15 hover:bg-primary/90"><Link to="/register">{text.create}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></>
            )}
          </div>
          <button onClick={() => setMenuOpen((open) => !open)} className="imrs-focus-ring rounded-lg p-2 text-primary sm:hidden" aria-label={text.menu} aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && <div className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-t border-border bg-card px-4 py-4 sm:hidden">
          <div className="grid gap-1">
            {[["benefits", text.navigation[0]], ["pricing", text.navigation[1]], ["faq", text.navigation[2]]].map(([id, label]) => <button key={id} onClick={() => { setMenuOpen(false); scrollTo(id); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted">{label}</button>)}
            {hasActiveLogin ? <Button asChild><Link to={dashboardPath}>{language === "fr" ? "Mon espace" : "My dashboard"}</Link></Button> : <><Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">{text.login}</Link><Button asChild><Link to="/register">{text.create}</Link></Button></>}
            <div className="flex items-center justify-between px-2 pt-2"><ThemeToggle /><LanguageSwitcher /></div>
          </div>
        </div>}
      </header>

      <main>
        <section className="imrs-grid relative isolate overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_16%_20%,rgba(34,211,238,.25),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(37,99,235,.20),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8">
            <Motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
              <span className="imrs-eyebrow"><Sparkles className="h-3.5 w-3.5" />{text.eyebrow}</span>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-primary sm:text-5xl lg:text-6xl">{settings.heroTitle}</h1>
              <p className="mt-5 max-w-2xl text-lg font-medium text-foreground sm:text-xl">{settings.heroSubtitle}</p>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">{settings.heroDescription}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 bg-primary px-6 shadow-xl shadow-blue-950/20 hover:bg-primary/90" onClick={() => navigate(hasActiveLogin ? dashboardPath : "/register")}>{hasActiveLogin ? (language === "fr" ? "Mon espace" : "My dashboard") : text.continue}<ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button size="lg" variant="outline" className="h-12 px-6" onClick={() => scrollTo("pricing")}>{text.subscriptionCta}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
              <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 text-cyan-600" />{text.trusted}</div>
            </Motion.div>
            <Motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55, delay: .08 }} className="relative mx-auto w-full max-w-xl">
              <HeroStudyPreview text={text} language={language} />
            </Motion.div>
          </div>
        </section>

        <LandingCountdown settings={settings} language={language} />

        <section id="benefits" className="scroll-mt-24 bg-muted/55 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow={language === "fr" ? "01 — Avantages" : "01 — Benefits"} title={text.benefits} copy={text.benefitsCopy} />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {text.features.map(([title, description], index) => {
                const visual = benefitVisuals[index % benefitVisuals.length];
                const FeatureIcon = visual.icon;

                return (
                  <article
                    key={title}
                    className={`group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${visual.cardColor}`}
                  >
                    <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-r text-white shadow-lg transition duration-300 group-hover:scale-105 ${visual.iconColor}`}>
                      <FeatureIcon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold tracking-tight">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"><SectionHeading eyebrow={`02 — ${text.plans}`} title={settings.pricingTitle || text.plans} copy={settings.pricingSubtitle || text.plans} centered /><div className="mt-12 grid gap-5 lg:grid-cols-3">{loadingPlans ? <PricingSkeleton /> : displayedPlans.length ? displayedPlans.map((plan) => <PricingCard key={plan._id || plan.name} plan={plan} popular={plan.isPopular} text={text} language={language} onChoose={() => navigate(hasActiveLogin ? "/dashboard/subscription" : "/register", hasActiveLogin ? { state: { selectedPlan: plan } } : undefined)} />) : <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground lg:col-span-3">{language === "fr" ? "Les offres sont temporairement indisponibles. Veuillez réessayer plus tard." : "Plans are temporarily unavailable. Please try again later."}</div>}</div></section>

        <ApprovedReviewsSection reviews={approvedReviews} language={language} />

        <section
          id="faq"
          className="scroll-mt-24 bg-gradient-to-br from-blue-50 to-white px-4 py-16 sm:px-6 md:py-20 lg:px-8 lg:py-24 dark:from-slate-950 dark:to-slate-900"
          aria-label={language === "fr" ? "Questions fréquemment posées" : "Frequently asked questions"}
        >
          <div className="mx-auto max-w-4xl">
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center md:mb-16"
            >
              <Badge variant="secondary" className="mb-3 text-xs md:mb-4 md:text-sm">FAQ</Badge>
              <h2 className="mb-3 text-3xl font-bold sm:text-4xl md:mb-4 md:text-5xl">
                {settings.faqTitle || (language === "fr" ? "Réponses aux questions fréquentes" : "Answers to frequently asked questions")}
              </h2>
              <p className="text-base text-muted-foreground md:text-lg">
                {language === "fr" ? "Trouvez les réponses à vos questions les plus courantes" : "Find answers to the most common questions"}
              </p>
            </Motion.div>

            <Motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="overflow-hidden rounded-2xl border-2 border-blue-100 bg-card text-card-foreground shadow-lg dark:border-blue-900 dark:bg-slate-900"
            >
              <Accordion type="single" collapsible className="w-full">
                {faqs.map(([question, answer], index) => {
                  const colors = faqIconColors[index % faqIconColors.length];

                  return (
                    <AccordionItem key={question} value={`faq-${index}`} className="border-b border-blue-100 last:border-0 dark:border-blue-900">
                      <AccordionTrigger className="group px-4 py-4 hover:no-underline sm:px-6 sm:py-6 md:px-8">
                        <div className="flex flex-1 items-center gap-2 text-left sm:gap-4">
                          <span className={`shrink-0 rounded-lg p-1.5 transition-colors sm:p-2 ${colors.background} ${colors.hover}`}>
                            <HelpCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${colors.icon}`} aria-hidden="true" />
                          </span>
                          <span className="text-sm font-semibold text-foreground sm:text-base">{question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pl-10 text-sm text-muted-foreground sm:px-6 sm:pb-6 sm:pl-16 sm:text-base md:px-8">
                        {answer}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </Motion.div>
          </div>
        </section>

        <ReviewInvitation language={language} />

      </main>
      <LandingFooter settings={settings} text={text} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy: description, centered = false }) { return <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}><span className="imrs-eyebrow">{eyebrow}</span><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 leading-7 text-muted-foreground">{description}</p></div>; }
function LandingCountdown({ settings, language }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateLandingCountdown(settings.timerEnabled, settings.timerEndDate));

  useEffect(() => {
    let interval;
    const update = () => {
      const next = calculateLandingCountdown(settings.timerEnabled, settings.timerEndDate);
      setTimeLeft(next);
      if (!next && interval) window.clearInterval(interval);
    };
    update();
    interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [settings.timerEnabled, settings.timerEndDate]);

  if (!timeLeft) return null;
  const labels = language === "fr" ? ["Jours", "Heures", "Minutes", "Secondes"] : ["Days", "Hours", "Minutes", "Seconds"];
  const values = [timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.seconds];

  return (
    <section className="border-y border-blue-200/70 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-4 py-7 text-white dark:border-blue-900 sm:px-6" aria-labelledby="landing-countdown-title">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 lg:flex-row">
        <div className="flex items-center gap-3 text-center lg:text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15"><Clock3 className="h-6 w-6" aria-hidden="true" /></span>
          <h2 id="landing-countdown-title" className="text-lg font-bold sm:text-xl">{settings.timerTitle || (language === "fr" ? "Offre spéciale se termine dans" : "Special offer ends in")}</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-label={language === "fr" ? "Temps restant" : "Time remaining"}>
          {values.map((value, index) => (
            <div key={labels[index]} className="min-w-16 rounded-xl border border-white/20 bg-white/10 px-2 py-2.5 text-center backdrop-blur-sm sm:min-w-20 sm:px-3">
              <span className="block text-xl font-extrabold tabular-nums sm:text-2xl">{String(value).padStart(2, "0")}</span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-wide text-blue-100 sm:text-[10px]">{labels[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function ApprovedReviewsSection({ reviews, language }) {
  if (!reviews.length) return null;
  const apiOrigin = api.defaults.baseURL?.replace(/\/api\/v1\/?$/, "") || "";

  return (
    <section className="bg-muted/40 px-4 py-20 sm:px-6 lg:px-8" aria-label={language === "fr" ? "Avis approuvés" : "Approved reviews"}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={language === "fr" ? "Avis vérifiés" : "Verified reviews"}
          title={language === "fr" ? "Ce que pensent nos étudiants" : "What our students think"}
          copy={language === "fr" ? "Des avis publiés après validation par notre équipe." : "Reviews published after approval by our team."}
          centered
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => {
            const imageUrl = review.imageUrl?.startsWith("http") ? review.imageUrl : review.imageUrl ? `${apiOrigin}${review.imageUrl}` : "";
            return (
              <Motion.article key={review._id || `${review.name}-${index}`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="imrs-surface p-6">
                <div className="flex items-center gap-3">
                  {imageUrl ? <img src={imageUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan-500 font-bold text-white">{review.name?.charAt(0) || "A"}</div>}
                  <div><h3 className="font-semibold">{review.name}</h3><p className="text-sm text-muted-foreground">{review.subject || review.role}</p></div>
                </div>
                <div className="mt-5 flex gap-1" aria-label={`${review.rating || 5} sur 5`}>
                  {Array.from({ length: 5 }, (_, star) => <Star key={star} className={`h-4 w-4 ${star < (review.rating || 5) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />)}
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{review.message}</p>
              </Motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReviewInvitation({ language }) {
  const user = getStoredUser();
  const initialName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const emptyForm = { name: initialName || "", email: user?.email || "", subject: REVIEW_SUBJECTS[0], message: "", rating: 0 };
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm);
  const isFrench = language === "fr";

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!form.rating) {
      setErrors((current) => ({ ...current, rating: isFrench ? "Choisissez une note." : "Choose a rating." }));
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await api.post("/feedbacks/submit", form);
      if (response.data?.success === false) throw new Error(response.data.message);
      setSubmitted(true);
      setForm({ ...emptyForm, message: "", rating: 0 });
      toast.success(isFrench ? "Avis envoyé pour validation." : "Review submitted for approval.");
    } catch (error) {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) setErrors(fieldErrors);
      toast.error(isFrench ? "Impossible d'envoyer votre avis." : "Unable to submit your review.", {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const changeOpen = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setHoveredRating(0);
      setErrors({});
      window.setTimeout(() => setSubmitted(false), 150);
    }
  };

  return (
    <section className="border-t border-border bg-gradient-to-br from-blue-50 via-indigo-50 to-white px-4 py-16 text-center dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-950 sm:px-6 md:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/20">
          <MessageCircle className="h-10 w-10" aria-hidden="true" />
        </div>
        <h2 className="mt-7 text-3xl font-bold tracking-tight text-primary sm:text-4xl md:text-5xl">
          {isFrench ? "On grandit ensemble" : "We grow together"}
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          {isFrench
            ? "YourQCM est né récemment. Et on veut le rendre meilleur grâce à VOUS. Vous avez des idées ? Des remarques ? Des souhaits ? Écrivez-nous. Votre voix est essentielle pour améliorer YourQCM."
            : "YourQCM was born recently, and we want to make it better with YOU. Have ideas, comments, or wishes? Write to us. Your voice is essential to improving YourQCM."}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => setOpen(true)} className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 px-7 text-base text-white hover:from-blue-700 hover:to-indigo-700">
            <MessageCircle className="mr-2 h-5 w-5" />
            {isFrench ? "Partager mon avis" : "Share my feedback"}
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 bg-background/80 px-7 text-base">
            <Link to="/"><Home className="mr-2 h-5 w-5" />{isFrench ? "Retourner à l'accueil" : "Return home"}</Link>
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto text-left">
          <DialogHeader>
            <DialogTitle>{isFrench ? "Donnez votre avis" : "Leave your review"}</DialogTitle>
            <DialogDescription>{isFrench ? "Votre avis sera vérifié par un administrateur avant sa publication." : "Your review will be checked by an administrator before publication."}</DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></div>
              <h3 className="mt-4 text-xl font-bold">{isFrench ? "Merci pour votre avis !" : "Thank you for your review!"}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{isFrench ? "Il est maintenant en attente de validation." : "It is now waiting for approval."}</p>
              <Button className="mt-6" onClick={() => changeOpen(false)}>{isFrench ? "Fermer" : "Close"}</Button>
            </div>
          ) : (
            <form onSubmit={submitReview} className="space-y-5" noValidate>
              <ReviewField label={isFrench ? "Nom complet" : "Full name"} error={errors.name}>
                <Input name="name" aria-label={isFrench ? "Nom complet" : "Full name"} value={form.name} onChange={updateField} minLength={2} maxLength={100} required disabled={submitting} />
              </ReviewField>
              <ReviewField label="E-mail" error={errors.email}>
                <Input name="email" aria-label="E-mail" type="email" value={form.email} onChange={updateField} maxLength={254} required disabled={submitting} />
              </ReviewField>
              <ReviewField label={isFrench ? "Sujet" : "Subject"} error={errors.subject}>
                <select name="subject" aria-label={isFrench ? "Sujet" : "Subject"} value={form.subject} onChange={updateField} disabled={submitting} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50">
                  {REVIEW_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </ReviewField>
              <ReviewField label={isFrench ? "Note globale" : "Overall rating"} error={errors.rating}>
                <div className="flex gap-1" role="radiogroup" aria-label={isFrench ? "Note globale sur cinq" : "Overall rating out of five"} onMouseLeave={() => setHoveredRating(0)}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button key={rating} type="button" role="radio" aria-checked={form.rating === rating} aria-label={`${rating} ${isFrench ? "étoile" : "star"}${rating > 1 ? "s" : ""}`} disabled={submitting} onMouseEnter={() => setHoveredRating(rating)} onFocus={() => setHoveredRating(rating)} onBlur={() => setHoveredRating(0)} onClick={() => { setForm((current) => ({ ...current, rating })); setErrors((current) => ({ ...current, rating: undefined })); }} className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Star className={`h-8 w-8 transition ${rating <= (hoveredRating || form.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                    </button>
                  ))}
                </div>
              </ReviewField>
              <ReviewField label={isFrench ? "Message" : "Message"} error={errors.message}>
                <Textarea name="message" aria-label="Message" value={form.message} onChange={updateField} minLength={10} maxLength={2000} rows={5} required disabled={submitting} className="resize-none" />
              </ReviewField>

              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div><strong>Important</strong><p className="mt-1 text-sm leading-6">Veuillez envoyer un message clair et approprié. Les messages contenant du contenu offensant, des insultes ou du spam seront rejetés et votre compte pourrait être suspendu.</p></div>
              </div>

              <Button type="submit" className="h-12 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                {submitting ? (isFrench ? "Envoi en cours..." : "Submitting...") : (isFrench ? "Envoyer votre avis" : "Submit review")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ReviewField({ label, error, children }) {
  return <div className="space-y-2"><span className="block text-sm font-medium">{label}</span>{children}{error && <span className="block text-xs text-destructive">{error}</span>}</div>;
}

function LandingFooter({ settings, text }) {
  const socialLinks = [
    { href: settings.facebookUrl, label: "Facebook", icon: <Facebook className="h-5 w-5" /> },
    { href: settings.instagramUrl, label: "Instagram", icon: <Instagram className="h-5 w-5" /> },
    {
      href: settings.youtubeUrl,
      label: "YouTube",
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
    },
  ].filter((item) => item.href && item.href !== "#");
  const supportLinks = [
    ["#faq", "FAQ"],
    settings.contactEmail && [`mailto:${settings.contactEmail}`, settings.contactEmail],
    settings.contactPhone && [`tel:${settings.contactPhone.replace(/[^+\d]/g, "")}`, settings.contactPhone],
    settings.whatsappNumber && [`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`, "WhatsApp"],
  ].filter(Boolean);

  return (
    <footer className="bg-slate-900 px-4 py-10 text-white sm:px-6 sm:py-12 md:py-16 lg:px-8" role="contentinfo">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid grid-cols-1 gap-8 xs:grid-cols-2 md:grid-cols-4 md:gap-12">
          <div className="xs:col-span-2 md:col-span-1">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
              {settings.siteName || "YourQCM"}
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">{text.footer}</p>
          </div>
          <DarkFooterLinks title={text.product} links={[["#benefits", text.navigation[0]], ["#pricing", text.navigation[1]]]} />
          <DarkFooterLinks title={text.support} links={supportLinks} />
          <div>
            <h3 className="mb-4 font-semibold">{text.social}</h3>
            <div className="flex gap-3">
              {socialLinks.map((item) => (
                <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} className="imrs-focus-ring grid h-10 w-10 place-items-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-blue-600 hover:text-white">
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-sm text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.siteName || "YourQCM"}. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link className="transition hover:text-white" to="/privacy-policy">{text.privacy}</Link>
            <Link className="transition hover:text-white" to="/terms-of-use">{text.terms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function DarkFooterLinks({ title, links }) { return <div><h3 className="mb-4 font-semibold">{title}</h3><ul className="space-y-3 text-sm text-slate-400">{links.map(([href, label]) => <li key={href}><a href={href} className="transition hover:text-white">{label}</a></li>)}</ul></div>; }
function PricingSkeleton() { return <>{[1, 2, 3].map((item) => <div key={item} className="h-96 animate-pulse rounded-2xl border border-border bg-muted" />)}</>; }
function PricingCard({ plan, popular, text, language, onChoose }) {
  const features = (plan.features || plan.featureList || [])
    .map((feature) => ({
      text: typeof feature === "string" ? feature : feature?.text,
      included: typeof feature === "string" || feature?.included !== false,
    }))
    .filter((feature) => feature.text);
  const periodLabels = language === "fr"
    ? { Gratuit: "", Semester: "/ semestre", Semestre: "/ semestre", Annee: "/ an", Annuel: "/ an", Monthly: "/ mois", Annual: "/ an" }
    : { Gratuit: "", Semester: "/ semester", Semestre: "/ semester", Annee: "/ year", Annuel: "/ year", Monthly: "/ month", Annual: "/ year" };
  const periodLabel = periodLabels[plan.period] || (plan.period ? `/ ${plan.period}` : "");

  return (
    <article className={`relative rounded-2xl border bg-card p-6 ${popular ? "border-cyan-400 shadow-xl shadow-cyan-950/10" : "border-border"}`}>
      {popular && <span className="absolute -top-3 left-6 rounded-full bg-cyan-500 px-3 py-1 text-xs font-bold text-white">{text.popular}</span>}
      <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{plan.name || "YourQCM Premium"}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{plan.price ?? plan.monthlyPrice ?? "—"}</span>
        {Number(plan.price) > 0 && <span className="text-sm text-muted-foreground">MAD {periodLabel}</span>}
        {Number(plan.oldPrice) > Number(plan.price) && <span className="ml-2 text-sm text-muted-foreground line-through">{plan.oldPrice} MAD</span>}
      </div>
      <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description || text.includes}</p>
      <Button onClick={onChoose} className="mt-6 w-full" variant={popular ? "default" : "outline"}>{text.choose}</Button>
      <ul className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
        {features.map((feature, index) => (
          <li key={`${feature.text}-${index}`} className={`flex gap-2 ${feature.included ? "" : "opacity-60"}`}>
            {feature.included
              ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
              : <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
            <span className={feature.included ? "" : "text-muted-foreground line-through"}>{feature.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
