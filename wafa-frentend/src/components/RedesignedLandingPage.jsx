import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  AlertCircle, ArrowRight, BookOpenCheck, Brain, Check, CheckCircle2,
  ChevronDown, CircleHelp, Clock3, Facebook, GraduationCap, Instagram,
  LoaderCircle, Mail, MapPin, Menu, MessageCircle, Phone, Play, Send, Shield,
  ShieldCheck, Sparkles, Star, Target, TrendingUp, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  siteName: "IMRS",
  heroTitle: "Révisez avec méthode. Réussissez avec confiance.",
  heroSubtitle: "La plateforme de préparation médicale pensée pour votre rythme.",
  heroDescription: "QCM ciblés, examens corrigés, statistiques et ressources dans un seul espace.",
  pricingTitle: "Choisissez votre rythme de révision",
  pricingSubtitle: "Commencez gratuitement, passez à l'illimité quand vous êtes prêt.",
  faqTitle: "Questions fréquentes",
  faqItems: [],
  contactEmail: "contact@atlas-qcm.online",
  contactPhone: "+212 6 00 00 00 00",
  whatsappNumber: "",
};

const copy = {
  fr: {
    login: "Se connecter", create: "Créer mon compte", discover: "Découvrir IMRS",
    navigation: ["Fonctionnement", "Avantages", "Abonnements", "FAQ", "Contact"],
    eyebrow: "Préparation médicale, sans dispersion", continue: "Commencer gratuitement",
    seePlans: "Voir les abonnements", trusted: "Pensé pour les étudiants en médecine au Maroc",
    dashboard: "Votre espace de révision", ready: "Prêt à apprendre", qcm: "QCM du jour",
    score: "Score moyen", focus: "À réviser", next: "Continuer", how: "Une méthode simple, des progrès mesurables",
    howCopy: "Un parcours clair de votre premier module à votre prochain examen.",
    steps: [["Choisissez", "votre semestre et vos modules."], ["Entraînez-vous", "avec des QCM adaptés à votre niveau."], ["Progressez", "grâce à des résultats et explications utiles."]],
    benefits: "Tout ce qu'il faut pour réviser avec régularité", benefitsCopy: "Moins d'onglets, plus de clarté sur ce qui compte aujourd'hui.",
    features: [["QCM et examens", "Entraînez-vous sur les thèmes importants."], ["Explications utiles", "Comprenez chaque réponse, pas seulement votre score."], ["Progression visible", "Identifiez vos acquis et vos priorités."], ["Révision organisée", "Notes et playlists au même endroit."]],
    plans: "Abonnements", popular: "Le plus choisi", perMonth: "/ mois", choose: "Choisir ce plan", includes: "Ce qui est inclus", faq: "Réponses claires avant de commencer",
    contact: "Besoin d'aide ?", contactCopy: "Notre équipe vous accompagne dans votre parcours de révision.", write: "Nous écrire", footer: "Révisez avec intention. Progressez avec IMRS.",
    testimonialsEyebrow: "Témoignages", testimonialsTitle: "Ce que disent nos étudiants", testimonialsCopy: "Rejoignez des centaines d'étudiants qui préparent leurs examens avec IMRS.",
    feedbackEyebrow: "Votre avis compte", feedbackTitle: "Nous voulons vos retours", feedbackCopy: "Aidez-nous à améliorer IMRS en partageant vos idées, suggestions ou problèmes.",
    name: "Nom complet", email: "E-mail", subject: "Sujet", message: "Message", send: "Envoyer votre avis", sending: "Envoi en cours...", important: "Important", feedbackWarning: "Envoyez un message clair et approprié. Les contenus offensants ou le spam seront rejetés.",
    sentTitle: "Merci pour votre retour !", sentCopy: "Votre message a été envoyé avec succès.", replyTime: "Réponse sous 24 h", confidential: "Confidentiel et sécurisé", community: "Communauté étudiante", product: "Produit", support: "Support", social: "Suivez-nous", privacy: "Confidentialité", terms: "Conditions",
    results: "résultats", learners: "étudiants accompagnés", subjects: "modules disponibles", menu: "Ouvrir le menu",
  },
  en: {
    login: "Log in", create: "Create my account", discover: "Explore IMRS",
    navigation: ["How it works", "Benefits", "Plans", "FAQ", "Contact"],
    eyebrow: "Medical preparation, without the noise", continue: "Start for free",
    seePlans: "View plans", trusted: "Built for medical students in Morocco",
    dashboard: "Your study space", ready: "Ready to learn", qcm: "Today's QCM",
    score: "Average score", focus: "To review", next: "Continue", how: "A simple method, measurable progress",
    howCopy: "A clear journey from your first module to your next examination.",
    steps: [["Choose", "your semester and modules."], ["Practise", "with QCMs suited to your level."], ["Improve", "with useful results and explanations."]],
    benefits: "Everything you need to study consistently", benefitsCopy: "Fewer tabs, more clarity on what matters today.",
    features: [["QCMs and exams", "Practise the topics that matter."], ["Useful explanations", "Understand every answer, not only your score."], ["Visible progress", "Identify strengths and priorities."], ["Organised study", "Keep notes and playlists in one place."]],
    plans: "Plans", popular: "Most popular", perMonth: "/ month", choose: "Choose this plan", includes: "What's included", faq: "Clear answers before you begin",
    contact: "Need help?", contactCopy: "Our team supports your study journey.", write: "Contact us", footer: "Study with intention. Progress with IMRS.",
    testimonialsEyebrow: "Testimonials", testimonialsTitle: "What our students say", testimonialsCopy: "Join hundreds of students preparing for their exams with IMRS.",
    feedbackEyebrow: "Your opinion matters", feedbackTitle: "We want your feedback", feedbackCopy: "Help us improve IMRS by sharing your ideas, suggestions, or problems.",
    name: "Full name", email: "Email", subject: "Subject", message: "Message", send: "Send your feedback", sending: "Sending...", important: "Important", feedbackWarning: "Please send a clear and appropriate message. Offensive content or spam will be rejected.",
    sentTitle: "Thank you for your feedback!", sentCopy: "Your message was sent successfully.", replyTime: "Reply within 24 hours", confidential: "Private and secure", community: "Student community", product: "Product", support: "Support", social: "Follow us", privacy: "Privacy", terms: "Terms",
    results: "results", learners: "students supported", subjects: "available modules", menu: "Open menu",
  },
};

const defaultFaqs = [
  ["Pour quelle faculté sont destinés ces QCMs ?", "Les QCMs sont spécifiquement conçus pour les étudiants de la FMPR (Faculté de Médecine et de Pharmacie de Rabat)."],
  ["Dois-je créer un compte ?", "Oui, la création d'un compte gratuit est nécessaire pour accéder aux QCMs et sauvegarder votre progression."],
  ["Puis-je suivre ma progression ?", "Oui, votre progression est automatiquement sauvegardée et vous pouvez la consulter à tout moment."],
  ["Mes informations bancaires sont-elles sécurisées ?", "Absolument. Nous ne conservons aucune information concernant votre carte bancaire. Tous les paiements sont traités par PayPal."],
  ["Puis-je être remboursé ?", "Les remboursements ne sont accordés que dans des cas exceptionnels. Pour toute demande, contactez-nous sur WhatsApp."],
  ["Puis-je personnaliser mon parcours d'études ?", "Oui. Vous pouvez créer des playlists, des examens et des exercices spécifiques pour personnaliser votre apprentissage."],
];

const defaultFaqsEn = [
  ["Which faculty are these QCMs for?", "The QCMs are specifically designed for students at the Faculty of Medicine and Pharmacy of Rabat."],
  ["Do I need to create an account?", "Yes. A free account is required to access QCMs and save your progress."],
  ["Can I track my progress?", "Yes. Your progress is saved automatically and is available from your dashboard."],
  ["Is my payment information secure?", "Yes. We do not store card information, and payments are processed securely by PayPal."],
  ["Can I request a refund?", "Refunds are granted only in exceptional circumstances. Contact us on WhatsApp for assistance."],
  ["Can I customise my study journey?", "Yes. Create playlists, exams, and focused exercises to personalise your learning experience."],
];

const unwrap = (value) => value?.data?.data || value?.data || value || [];

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
  const [testimonials, setTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ name: "", email: "", subject: "", message: "" });
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
      .then(([settingsResult, plansResult, testimonialsResult]) => {
        if (!active) return;
        if (settingsResult.status === "fulfilled") {
          const data = unwrap(settingsResult.value);
          if (data && !Array.isArray(data)) setSettings((previous) => ({ ...previous, ...data }));
        }
        if (plansResult.status === "fulfilled") {
          const data = unwrap(plansResult.value);
          setPlans(Array.isArray(data) ? data.sort((a, b) => (a.order || 0) - (b.order || 0)) : []);
        }
        if (testimonialsResult.status === "fulfilled") {
          const data = unwrap(testimonialsResult.value);
          setTestimonials(Array.isArray(data) ? data : []);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPlans(false);
          setLoadingTestimonials(false);
        }
      });
    return () => { active = false; };
  }, []);

  const text = copy[language] || copy.fr;
  const faqs = settings.faqItems?.length ? settings.faqItems.map((faq) => [faq.question, faq.answer]) : language === "fr" ? defaultFaqs : defaultFaqsEn;
  const displayedPlans = useMemo(() => plans.slice(0, 3), [plans]);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const updateFeedback = (event) => setFeedback((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submitFeedback = async (event) => {
    event.preventDefault();
    setSubmittingFeedback(true);
    try {
      const response = await api.post("/contact", feedback);
      if (response.data?.success === false) throw new Error(response.data?.message || "Unable to send message");
      setFeedbackSubmitted(true);
      setFeedback({ name: "", email: "", subject: "", message: "" });
      toast.success(language === "fr" ? "Message envoyé avec succès !" : "Message sent successfully!");
    } catch (error) {
      toast.error(language === "fr" ? "Impossible d'envoyer le message." : "Unable to send the message.", {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {settings.promotionEnabled && settings.promotionText && (
        <a href={settings.promotionLink || "#pricing"} className="block bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
          {settings.promotionText} <span className="ml-2 underline">{text.seePlans}</span>
        </a>
      )}

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="imrs-focus-ring flex items-center gap-3 rounded-lg" aria-label="IMRS">
            <img src={settings.logoUrl || logo} alt="IMRS" className="h-10 w-10 rounded-xl object-contain" />
            <span className="text-lg font-bold tracking-tight text-primary">{settings.siteName || "IMRS"}</span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Navigation principale">
            {[["how", text.navigation[0]], ["benefits", text.navigation[1]], ["pricing", text.navigation[2]], ["faq", text.navigation[3]], ["contact", text.navigation[4]]].map(([id, label]) => (
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
        {menuOpen && <div className="border-t border-border bg-card px-4 py-4 sm:hidden">
          <div className="grid gap-1">
            {[["how", text.navigation[0]], ["benefits", text.navigation[1]], ["pricing", text.navigation[2]], ["faq", text.navigation[3]], ["contact", text.navigation[4]]].map(([id, label]) => <button key={id} onClick={() => { setMenuOpen(false); scrollTo(id); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted">{label}</button>)}
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
                <Button size="lg" variant="outline" className="h-12 px-6" onClick={() => scrollTo("how")}><Play className="mr-2 h-4 w-4 fill-current" />{text.discover}</Button>
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

        <section className="border-y border-border bg-card/70 py-8"><div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-border px-4 text-center sm:px-6"><Metric value="10k+" label={text.learners} /><Metric value="1M+" label={text.results} /><Metric value="40+" label={text.subjects} /></div></section>

        <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"><SectionHeading eyebrow="01 — Méthode" title={text.how} copy={text.howCopy} /><div className="mt-12 grid gap-5 md:grid-cols-3">{text.steps.map(([title, description], index) => <div key={title} className="imrs-surface relative p-6"><span className="text-4xl font-bold text-cyan-600/25">0{index + 1}</span><h3 className="mt-7 text-xl font-semibold">{title}</h3><p className="mt-2 leading-6 text-muted-foreground">{description}</p><div className="absolute right-6 top-6 rounded-xl bg-cyan-100 p-3 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200">{[<BookOpenCheck />, <Brain />, <TrendingUp />][index]}</div></div>)}</div></section>

        <section id="benefits" className="scroll-mt-24 bg-muted/55 py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><SectionHeading eyebrow="02 — IMRS" title={text.benefits} copy={text.benefitsCopy} /><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{text.features.map(([title, description], index) => <div key={title} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">{[<BookOpenCheck className="h-5 w-5" />, <CircleHelp className="h-5 w-5" />, <Target className="h-5 w-5" />, <Star className="h-5 w-5" />][index]}</div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>)}</div></div></section>

        <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"><SectionHeading eyebrow={`03 — ${text.plans}`} title={settings.pricingTitle || text.plans} copy={settings.pricingSubtitle || text.plans} centered /><div className="mt-12 grid gap-5 lg:grid-cols-3">{loadingPlans ? <PricingSkeleton /> : displayedPlans.length ? displayedPlans.map((plan, index) => <PricingCard key={plan._id || plan.name} plan={plan} popular={plan.isPopular || index === 1} text={text} onChoose={() => navigate(hasActiveLogin ? dashboardPath : "/register")} />) : <DefaultPlans text={text} onChoose={() => navigate(hasActiveLogin ? dashboardPath : "/register")} />}</div></section>

        <QuickContact settings={settings} text={text} />

        <TestimonialsSection testimonials={testimonials} loading={loadingTestimonials} text={text} />

        <section id="faq" className="scroll-mt-24 bg-muted/55 py-20"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8"><div><span className="imrs-eyebrow">05 — FAQ</span><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{settings.faqTitle || text.faq}</h2><p className="mt-4 leading-7 text-muted-foreground">{text.faq}</p></div><div className="space-y-3">{faqs.map(([question, answer], index) => <details key={`${question}-${index}`} className="group rounded-2xl border border-border bg-card p-5"><summary className="imrs-focus-ring flex cursor-pointer list-none items-center justify-between gap-4 font-semibold"><span>{question}</span><ChevronDown className="h-5 w-5 shrink-0 text-cyan-600 transition group-open:rotate-180" /></summary><p className="pt-4 leading-7 text-muted-foreground">{answer}</p></details>)}</div></div></section>

        <FeedbackSection settings={settings} text={text} feedback={feedback} submitted={feedbackSubmitted} submitting={submittingFeedback} onChange={updateFeedback} onSubmit={submitFeedback} />
      </main>
      <LandingFooter settings={settings} text={text} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy: description, centered = false }) { return <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}><span className="imrs-eyebrow">{eyebrow}</span><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 leading-7 text-muted-foreground">{description}</p></div>; }
function MiniStat({ label, value }) { return <div className="rounded-xl bg-white/10 p-3"><p className="text-[11px] text-blue-100">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
function Metric({ value, label }) { return <div className="px-3 py-1"><p className="text-xl font-bold text-primary sm:text-2xl">{value}</p><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p></div>; }

function QuickContact({ settings, text }) {
  const phone = settings.contactPhone || FALLBACK_SETTINGS.contactPhone;
  const whatsapp = settings.whatsappNumber || FALLBACK_SETTINGS.whatsappNumber;
  const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}` : "";

  return (
    <section aria-label={text.contact} className="border-y border-border bg-card/70 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
        <a href={`tel:${phone}`} className="imrs-focus-ring flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-5 py-3 font-semibold transition hover:border-cyan-400 sm:w-auto">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary"><Phone className="h-4 w-4" /></span>
          {phone}
        </a>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="imrs-focus-ring flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 px-5 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 sm:w-auto">
            <MessageCircle className="h-5 w-5" />WhatsApp
          </a>
        )}
        <a href={`mailto:${settings.contactEmail || FALLBACK_SETTINGS.contactEmail}`} className="imrs-focus-ring flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-5 py-3 font-semibold transition hover:border-cyan-400 sm:w-auto">
          <Mail className="h-5 w-5 text-primary" />{settings.contactEmail || FALLBACK_SETTINGS.contactEmail}
        </a>
      </div>
    </section>
  );
}

function TestimonialsSection({ testimonials, loading, text }) {
  if (!loading && testimonials.length === 0) return null;
  const apiOrigin = api.defaults.baseURL?.replace(/\/api\/v1\/?$/, "") || "";

  return (
    <section id="testimonials" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={`04 — ${text.testimonialsEyebrow}`} title={text.testimonialsTitle} copy={text.testimonialsCopy} centered />
        {loading ? (
          <div className="flex justify-center py-14"><LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-label="Loading" /></div>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => {
              const imageUrl = testimonial.imageUrl?.startsWith("http") ? testimonial.imageUrl : testimonial.imageUrl ? `${apiOrigin}${testimonial.imageUrl}` : "";
              return (
                <Motion.article key={testimonial._id || `${testimonial.name}-${index}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} className="imrs-surface flex h-full flex-col p-6">
                  <div className="flex items-center gap-3">
                    {imageUrl ? <img src={imageUrl} alt={testimonial.name || ""} className="h-12 w-12 rounded-full border border-border object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan-500 font-bold text-white">{testimonial.name?.charAt(0) || "I"}</div>}
                    <div><h3 className="font-semibold">{testimonial.name}</h3><p className="text-sm text-muted-foreground">{testimonial.role}</p></div>
                  </div>
                  <div className="mt-5 flex gap-1" aria-label={`${testimonial.rating || 5}/5`}>{Array.from({ length: Math.min(5, Math.max(1, testimonial.rating || 5)) }, (_, star) => <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{testimonial.message}</p>
                </Motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function FeedbackSection({ settings, text, feedback, submitted, submitting, onChange, onSubmit }) {
  return (
    <section id="contact" className="scroll-mt-24 bg-gradient-to-br from-primary/5 via-background to-cyan-500/10 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={`06 — ${text.feedbackEyebrow}`} title={text.feedbackTitle} copy={text.feedbackCopy} centered />
        <div className="mt-12 grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
          <aside className="imrs-surface space-y-6 p-6 sm:p-8">
            <ContactItem icon={<Mail />} label={text.email} value={settings.contactEmail || FALLBACK_SETTINGS.contactEmail} href={`mailto:${settings.contactEmail || FALLBACK_SETTINGS.contactEmail}`} />
            <ContactItem icon={<Phone />} label={languageLabel(text, "phone")} value={settings.contactPhone || FALLBACK_SETTINGS.contactPhone} href={`tel:${settings.contactPhone || FALLBACK_SETTINGS.contactPhone}`} />
            <ContactItem icon={<MapPin />} label={languageLabel(text, "address")} value={settings.contactAddress || "Rabat, Maroc"} />
            <div className="rounded-xl border border-border bg-muted/45 p-4 text-sm leading-6 text-muted-foreground"><Shield className="mb-3 h-5 w-5 text-primary" />{text.feedbackWarning}</div>
          </aside>
          <div className="imrs-surface p-6 sm:p-8">
            {submitted ? (
              <div className="grid min-h-80 place-items-center text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><CheckCircle2 className="h-8 w-8" /></div><h3 className="mt-5 text-2xl font-bold">{text.sentTitle}</h3><p className="mt-2 text-muted-foreground">{text.sentCopy}</p></div></div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2"><Field label={text.name}><Input name="name" value={feedback.name} onChange={onChange} required disabled={submitting} /></Field><Field label={text.email}><Input name="email" type="email" value={feedback.email} onChange={onChange} required disabled={submitting} /></Field></div>
                <Field label={text.subject}><Input name="subject" value={feedback.subject} onChange={onChange} required disabled={submitting} /></Field>
                <Field label={text.message}><Textarea name="message" value={feedback.message} onChange={onChange} rows={6} required disabled={submitting} className="resize-none" /></Field>
                <div className="flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>{text.important}</strong><p className="mt-1 leading-6">{text.feedbackWarning}</p></div></div>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}><Send className="mr-2 h-5 w-5" />{submitting ? text.sending : text.send}</Button>
              </form>
            )}
          </div>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" />{text.replyTime}</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />{text.confidential}</span><span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{text.community}</span></div>
      </div>
    </section>
  );
}

function ContactItem({ icon, label, value, href }) {
  const content = <><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><span><span className="block text-sm text-muted-foreground">{label}</span><span className="mt-1 block font-semibold">{value}</span></span></>;
  return href ? <a href={href} className="imrs-focus-ring flex items-center gap-4 rounded-xl">{content}</a> : <div className="flex items-center gap-4">{content}</div>;
}

function Field({ label, children }) { return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>; }
function languageLabel(text, type) { return type === "phone" ? (text.login === "Se connecter" ? "Téléphone" : "Phone") : (text.login === "Se connecter" ? "Adresse" : "Address"); }

function LandingFooter({ settings, text }) {
  const socialLinks = [{ href: settings.facebookUrl, label: "Facebook", icon: <Facebook className="h-5 w-5" /> }, { href: settings.instagramUrl, label: "Instagram", icon: <Instagram className="h-5 w-5" /> }].filter((item) => item.href && item.href !== "#");
  return (
    <footer className="border-t border-border bg-card" role="contentinfo">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div><div className="flex items-center gap-3"><img src={settings.logoUrl || logo} alt="" className="h-10 w-10 rounded-xl object-contain" /><span className="text-lg font-bold text-primary">{settings.siteName || "IMRS"}</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">{text.footer}</p></div>
        <FooterLinks title={text.product} links={[["#benefits", text.navigation[1]], ["#pricing", text.navigation[2]]]} />
        <FooterLinks title={text.support} links={[["#faq", "FAQ"], ["#contact", text.navigation[4]]]} />
        <div><h3 className="font-semibold">{text.social}</h3><div className="mt-4 flex gap-3">{socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} className="imrs-focus-ring grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary">{item.icon}</a>)}</div></div>
      </div>
      <div className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>© {new Date().getFullYear()} IMRS. Tous droits réservés.</p><div className="flex gap-5"><Link className="hover:text-primary" to="/privacy-policy">{text.privacy}</Link><Link className="hover:text-primary" to="/terms-of-use">{text.terms}</Link></div></div></div>
    </footer>
  );
}

function FooterLinks({ title, links }) { return <div><h3 className="font-semibold">{title}</h3><ul className="mt-4 space-y-3 text-sm text-muted-foreground">{links.map(([href, label]) => <li key={href}><a href={href} className="hover:text-primary">{label}</a></li>)}</ul></div>; }
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
      <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{plan.name || "IMRS Premium"}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{plan.price ?? plan.monthlyPrice ?? "—"}</span>
        {plan.price && <span className="text-sm text-muted-foreground">MAD {text.perMonth}</span>}
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
function DefaultPlans({ text, onChoose }) { return ["Découverte", "Premium", "Premium annuel"].map((name, index) => <PricingCard key={name} popular={index === 1} onChoose={onChoose} text={text} plan={{ name, price: index === 0 ? 0 : index === 1 ? 49 : 399, description: index === 0 ? "Pour découvrir votre premier semestre." : "Pour réviser sans interruption.", features: ["Accès aux QCM", "Suivi de progression", "Ressources de révision"] }} />); }
