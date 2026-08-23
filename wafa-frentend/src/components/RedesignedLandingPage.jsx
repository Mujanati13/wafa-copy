import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  AlertCircle, ArrowRight, BookOpenCheck, Check, CheckCircle2,
  CircleHelp, Clock3, Facebook, GraduationCap, HelpCircle, Instagram,
  Loader2, Menu, MessageCircle, Play, Send, ShieldCheck, Sparkles, Star, Target, TrendingUp, X,
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
  siteName: "Atlas QCM",
  heroTitle: "Révisez avec méthode. Réussissez avec confiance.",
  heroSubtitle: "La plateforme de préparation médicale pensée pour votre rythme.",
  heroDescription: "QCM ciblés, examens corrigés, statistiques et ressources dans un seul espace.",
  pricingTitle: "Choisissez votre rythme de révision",
  pricingSubtitle: "Commencez gratuitement, passez à l'illimité quand vous êtes prêt.",
  faqTitle: "Questions fréquentes",
  faqItems: [],
};

const copy = {
  fr: {
    login: "Se connecter", create: "Créer mon compte", discover: "Découvrir Atlas QCM",
    navigation: ["Avantages", "Abonnements", "FAQ"],
    eyebrow: "Préparation médicale, sans dispersion", continue: "Commencer gratuitement",
    seePlans: "Voir les abonnements", trusted: "Pensé pour les étudiants en médecine au Maroc",
    dashboard: "Votre espace de révision", ready: "Prêt à apprendre", qcm: "QCM du jour",
    score: "Score moyen", focus: "À réviser", next: "Continuer",
    benefits: "Tout ce qu'il faut pour réviser avec régularité", benefitsCopy: "Moins d'onglets, plus de clarté sur ce qui compte aujourd'hui.",
    features: [["QCM et examens", "Entraînez-vous sur les thèmes importants."], ["Explications utiles", "Comprenez chaque réponse, pas seulement votre score."], ["Progression visible", "Identifiez vos acquis et vos priorités."], ["Révision organisée", "Notes et playlists au même endroit."]],
    plans: "Abonnements", popular: "Le plus choisi", perSemester: "/ semestre", choose: "Choisir ce plan", includes: "Ce qui est inclus", faq: "Réponses claires avant de commencer",
    footer: "Révisez avec intention. Progressez avec Atlas QCM.", product: "Produit", support: "Support", social: "Suivez-nous", privacy: "Confidentialité", terms: "Conditions",
    menu: "Ouvrir le menu",
  },
  en: {
    login: "Log in", create: "Create my account", discover: "Explore Atlas QCM",
    navigation: ["Benefits", "Plans", "FAQ"],
    eyebrow: "Medical preparation, without the noise", continue: "Start for free",
    seePlans: "View plans", trusted: "Built for medical students in Morocco",
    dashboard: "Your study space", ready: "Ready to learn", qcm: "Today's QCM",
    score: "Average score", focus: "To review", next: "Continue",
    benefits: "Everything you need to study consistently", benefitsCopy: "Fewer tabs, more clarity on what matters today.",
    features: [["QCMs and exams", "Practise the topics that matter."], ["Useful explanations", "Understand every answer, not only your score."], ["Visible progress", "Identify strengths and priorities."], ["Organised study", "Keep notes and playlists in one place."]],
    plans: "Plans", popular: "Most popular", perSemester: "/ semester", choose: "Choose this plan", includes: "What's included", faq: "Clear answers before you begin",
    footer: "Study with intention. Progress with Atlas QCM.", product: "Product", support: "Support", social: "Follow us", privacy: "Privacy", terms: "Terms",
    menu: "Open menu",
  },
};

const defaultFaqs = [
  ["Pour quelle faculté sont destinés ces QCMs ?", "Les QCMs sont spécifiquement conçus pour les étudiants de la FMPR (Faculté de Médecine et de Pharmacie de Rabat)."],
  ["Dois-je créer un compte ?", "Oui, la création d'un compte gratuit est nécessaire pour accéder aux QCMs et sauvegarder votre progression."],
  ["Puis-je suivre ma progression ?", "Oui, votre progression est automatiquement sauvegardée et vous pouvez la consulter à tout moment."],
  ["Mes informations bancaires sont-elles sécurisées ?", "Absolument. Nous ne conservons aucune information concernant votre carte bancaire. Tous les paiements sont traités par PayPal qui garantit la sécurité de vos transactions."],
  ["Puis-je être remboursé ?", "Les remboursements ne sont accordés que dans des cas exceptionnels. Pour toute demande, contactez-nous sur WhatsApp."],
  ["Puis-je personnaliser mon parcours d'études ?", "Bien sûr ! Vous pouvez organiser votre plan d'études par création des playlists, des examens et des exercices spécifiques afin de personnaliser votre expérience d'apprentissage."],
];

const defaultFaqsEn = [
  ["Which faculty are these QCMs for?", "The QCMs are specifically designed for students at the Faculty of Medicine and Pharmacy of Rabat."],
  ["Do I need to create an account?", "Yes. A free account is required to access QCMs and save your progress."],
  ["Can I track my progress?", "Yes. Your progress is saved automatically and is available from your dashboard."],
  ["Is my payment information secure?", "Yes. We do not store card information, and payments are processed securely by PayPal."],
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
];

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function RedesignedLandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
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
      subscriptionPlanService.getAllPlans(),
      api.get("/feedbacks"),
    ])
      .then(([settingsResult, plansResult, reviewsResult]) => {
        if (!active) return;
        if (settingsResult.status === "fulfilled") {
          const data = unwrap(settingsResult.value);
          if (data && !Array.isArray(data)) setSettings((previous) => ({ ...previous, ...data }));
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

  const text = copy[language] || copy.fr;
  const faqs = language === "fr" ? defaultFaqs : defaultFaqsEn;
  const displayedPlans = useMemo(() => {
    const labels = language === "fr"
      ? ["Plan Gratuit", "Premium", "Premium Pro"]
      : ["Free Plan", "Premium", "Premium Pro"];
    const paidDescriptions = language === "fr"
      ? ["Accès Premium pendant un semestre.", "Accès Premium Pro pendant un semestre."]
      : ["Premium access for one semester.", "Premium Pro access for one semester."];

    return plans.slice(0, 3).map((plan, index) => ({
      ...plan,
      name: labels[index] || plan.name,
      description: index === 0 ? plan.description : paidDescriptions[index - 1],
    }));
  }, [language, plans]);
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
          <Link to="/" className="imrs-focus-ring flex items-center gap-3 rounded-lg" aria-label="Atlas QCM">
            <img src={settings.logoUrl || logo} alt="Atlas QCM" className="h-10 w-10 rounded-xl object-contain" />
            <span className="text-lg font-bold tracking-tight text-primary">Atlas QCM</span>
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
                <Button size="lg" variant="outline" className="h-12 px-6" onClick={() => scrollTo("benefits")}><Play className="mr-2 h-4 w-4 fill-current" />{text.discover}</Button>
              </div>
              <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 text-cyan-600" />{text.trusted}</div>
            </Motion.div>
            <Motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55, delay: .08 }} className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-cyan-300/30 via-blue-400/10 to-transparent blur-2xl" />
              <div className="imrs-surface overflow-hidden border-white/70 bg-card/95 p-3 shadow-2xl shadow-blue-950/15 dark:border-white/10">
                <div className="rounded-xl bg-gradient-to-br from-[#10235c] to-[#164f93] p-5 text-white sm:p-7">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-semibold tracking-[.16em] text-cyan-200 uppercase">{text.dashboard}</p><h2 className="mt-1 text-xl font-semibold">Bonjour, Sara</h2></div><div className="rounded-xl bg-white/10 p-2"><GraduationCap className="h-6 w-6 text-cyan-200" /></div></div>
                  <div className="mt-7 grid grid-cols-3 gap-3"><MiniStat label={text.qcm} value="24" /><MiniStat label={text.score} value="78%" /><MiniStat label={text.focus} value="3" /></div>
                  <div className="mt-6 rounded-xl bg-white/10 p-4"><div className="flex items-center justify-between text-sm"><span>Cardiologie</span><span className="font-semibold text-cyan-200">68%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[68%] rounded-full bg-cyan-300" /></div><button onClick={() => navigate(hasActiveLogin ? dashboardPath : "/register")} className="mt-4 flex items-center text-sm font-semibold text-cyan-100 hover:text-white">{text.next}<ArrowRight className="ml-1 h-4 w-4" /></button></div>
                </div>
                <div className="grid grid-cols-3 gap-2 px-2 py-4 text-center text-xs text-muted-foreground"><span><TrendingUp className="mx-auto mb-1 h-4 w-4 text-cyan-600" />+12% cette semaine</span><span><Target className="mx-auto mb-1 h-4 w-4 text-cyan-600" />Objectif en cours</span><span><Clock3 className="mx-auto mb-1 h-4 w-4 text-cyan-600" />18 min aujourd'hui</span></div>
              </div>
            </Motion.div>
          </div>
        </section>

        <section id="benefits" className="scroll-mt-24 bg-muted/55 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="01 — Atlas QCM" title={text.benefits} copy={text.benefitsCopy} />
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

        <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"><SectionHeading eyebrow={`02 — ${text.plans}`} title={settings.pricingTitle || text.plans} copy={settings.pricingSubtitle || text.plans} centered /><div className="mt-12 grid gap-5 lg:grid-cols-3">{loadingPlans ? <PricingSkeleton /> : displayedPlans.length ? displayedPlans.map((plan, index) => <PricingCard key={plan._id || plan.name} plan={plan} popular={plan.isPopular || index === 1} text={text} onChoose={() => navigate(hasActiveLogin ? dashboardPath : "/register")} />) : <DefaultPlans text={text} onChoose={() => navigate(hasActiveLogin ? dashboardPath : "/register")} />}</div></section>

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
function MiniStat({ label, value }) { return <div className="rounded-xl bg-white/10 p-3"><p className="text-[11px] text-blue-100">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }

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
    <section className="border-t border-border bg-background px-4 py-10 text-center sm:px-6">
      <Button size="lg" onClick={() => setOpen(true)} className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 px-7 text-base text-white hover:from-blue-700 hover:to-indigo-700">
        <MessageCircle className="mr-2 h-5 w-5" />
        {isFrench ? "Donner mon avis" : "Leave a review"}
      </Button>

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

  return (
    <footer className="bg-slate-900 px-4 py-10 text-white sm:px-6 sm:py-12 md:py-16 lg:px-8" role="contentinfo">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid grid-cols-1 gap-8 xs:grid-cols-2 md:grid-cols-4 md:gap-12">
          <div className="xs:col-span-2 md:col-span-1">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
              Atlas QCM
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">{text.footer}</p>
          </div>
          <DarkFooterLinks title={text.product} links={[["#benefits", text.navigation[0]], ["#pricing", text.navigation[1]]]} />
          <DarkFooterLinks title={text.support} links={[["#faq", "FAQ"]]} />
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
          <p>© {new Date().getFullYear()} Atlas QCM. Tous droits réservés.</p>
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
function PricingCard({ plan, popular, text, onChoose }) {
  const features = (plan.features || plan.featureList || [])
    .map((feature) => ({
      text: typeof feature === "string" ? feature : feature?.text,
      included: typeof feature === "string" || feature?.included !== false,
    }))
    .filter((feature) => feature.text);

  return (
    <article className={`relative rounded-2xl border bg-card p-6 ${popular ? "border-cyan-400 shadow-xl shadow-cyan-950/10" : "border-border"}`}>
      {popular && <span className="absolute -top-3 left-6 rounded-full bg-cyan-500 px-3 py-1 text-xs font-bold text-white">{text.popular}</span>}
      <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{plan.name || "Atlas QCM Premium"}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{plan.price ?? plan.monthlyPrice ?? "—"}</span>
        {Number(plan.price) > 0 && <span className="text-sm text-muted-foreground">MAD {text.perSemester}</span>}
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
function DefaultPlans({ text, onChoose }) {
  const isFrench = text.login === "Se connecter";
  const plans = isFrench
    ? [
        { name: "Plan Gratuit", price: 0, description: "Découvrez la plateforme avec un semestre gratuit au choix." },
        { name: "Premium", price: 49, description: "Accès Premium pendant un semestre." },
        { name: "Premium Pro", price: 399, description: "Accès Premium Pro pendant un semestre." },
      ]
    : [
        { name: "Free Plan", price: 0, description: "Explore the platform with one free semester of your choice." },
        { name: "Premium", price: 49, description: "Premium access for one semester." },
        { name: "Premium Pro", price: 399, description: "Premium Pro access for one semester." },
      ];

  return plans.map((plan, index) => (
    <PricingCard
      key={plan.name}
      popular={index === 1}
      onChoose={onChoose}
      text={text}
      plan={{ ...plan, features: ["Accès aux QCM", "Suivi de progression", "Ressources de révision"] }}
    />
  ));
}
