import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  ArrowRight, BookOpenCheck, Brain, Check, ChevronDown, CircleHelp, Clock3,
  GraduationCap, Menu, Play, ShieldCheck, Sparkles, Star, Target, TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  contactEmail: "contact@imrs.ma",
};

const copy = {
  fr: {
    login: "Se connecter", create: "Créer mon compte", discover: "Découvrir IMRS",
    navigation: ["Fonctionnement", "Avantages", "Abonnements", "FAQ"],
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
    results: "résultats", learners: "étudiants accompagnés", subjects: "modules disponibles", menu: "Ouvrir le menu",
  },
  en: {
    login: "Log in", create: "Create my account", discover: "Explore IMRS",
    navigation: ["How it works", "Benefits", "Plans", "FAQ"],
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
    results: "results", learners: "students supported", subjects: "available modules", menu: "Open menu",
  },
};

const defaultFaqs = [
  ["Comment fonctionne IMRS ?", "Créez un compte gratuit, choisissez votre semestre puis accédez aux contenus disponibles selon votre abonnement."],
  ["Puis-je commencer gratuitement ?", "Oui. Vous pouvez découvrir la plateforme et sélectionner votre premier semestre avant de choisir un abonnement."],
  ["Mes progrès sont-ils sauvegardés ?", "Oui. Vos résultats et votre progression sont associés à votre compte pour vous permettre de reprendre simplement."],
];

const defaultFaqsEn = [
  ["How does IMRS work?", "Create a free account, choose your semester, then access the content available with your plan."],
  ["Can I start for free?", "Yes. You can explore the platform and select your first semester before choosing a plan."],
  ["Is my progress saved?", "Yes. Your results and progress are connected to your account so you can pick up where you left off."],
];

const unwrap = (value) => value?.data?.data || value?.data || value || [];

export default function RedesignedLandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [language, setLanguage] = useState("fr");

  useEffect(() => {
    const locale = localStorage.getItem("i18nextLng") || navigator.language || "fr";
    setLanguage(locale.startsWith("fr") ? "fr" : "en");
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getLandingPageSettings(), subscriptionPlanService.getAllPlans()])
      .then(([settingsResult, plansResult]) => {
        if (!active) return;
        if (settingsResult.status === "fulfilled") {
          const data = unwrap(settingsResult.value);
          if (data && !Array.isArray(data)) setSettings((previous) => ({ ...previous, ...data }));
        }
        if (plansResult.status === "fulfilled") {
          const data = unwrap(plansResult.value);
          setPlans(Array.isArray(data) ? data.sort((a, b) => (a.order || 0) - (b.order || 0)) : []);
        }
      })
      .finally(() => active && setLoadingPlans(false));
    return () => { active = false; };
  }, []);

  const text = copy[language] || copy.fr;
  const faqs = settings.faqItems?.length ? settings.faqItems.map((faq) => [faq.question, faq.answer]) : language === "fr" ? defaultFaqs : defaultFaqsEn;
  const displayedPlans = useMemo(() => plans.slice(0, 3), [plans]);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

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
            {[["how", text.navigation[0]], ["benefits", text.navigation[1]], ["pricing", text.navigation[2]], ["faq", text.navigation[3]]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="imrs-focus-ring rounded text-sm font-medium text-muted-foreground transition hover:text-primary">{label}</button>
            ))}
          </nav>
          <div className="hidden items-center gap-1 sm:flex">
            <ThemeToggle /><LanguageSwitcher />
            <Button asChild variant="ghost"><Link to="/login">{text.login}</Link></Button>
            <Button asChild className="bg-primary shadow-lg shadow-blue-950/15 hover:bg-primary/90"><Link to="/register">{text.create}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
          <button onClick={() => setMenuOpen((open) => !open)} className="imrs-focus-ring rounded-lg p-2 text-primary sm:hidden" aria-label={text.menu} aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && <div className="border-t border-border bg-card px-4 py-4 sm:hidden">
          <div className="grid gap-1">
            {[["how", text.navigation[0]], ["benefits", text.navigation[1]], ["pricing", text.navigation[2]], ["faq", text.navigation[3]]].map(([id, label]) => <button key={id} onClick={() => { setMenuOpen(false); scrollTo(id); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted">{label}</button>)}
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">{text.login}</Link>
            <Button asChild><Link to="/register">{text.create}</Link></Button>
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
                <Button size="lg" className="h-12 bg-primary px-6 shadow-xl shadow-blue-950/20 hover:bg-primary/90" onClick={() => navigate("/register")}>{text.continue}<ArrowRight className="ml-2 h-4 w-4" /></Button>
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
                  <div className="mt-6 rounded-xl bg-white/10 p-4"><div className="flex items-center justify-between text-sm"><span>Cardiologie</span><span className="font-semibold text-cyan-200">68%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[68%] rounded-full bg-cyan-300" /></div><button onClick={() => navigate("/register")} className="mt-4 flex items-center text-sm font-semibold text-cyan-100 hover:text-white">{text.next}<ArrowRight className="ml-1 h-4 w-4" /></button></div>
                </div>
                <div className="grid grid-cols-3 gap-2 px-2 py-4 text-center text-xs text-muted-foreground"><span><TrendingUp className="mx-auto mb-1 h-4 w-4 text-cyan-600" />+12% cette semaine</span><span><Target className="mx-auto mb-1 h-4 w-4 text-cyan-600" />Objectif en cours</span><span><Clock3 className="mx-auto mb-1 h-4 w-4 text-cyan-600" />18 min aujourd'hui</span></div>
              </div>
            </Motion.div>
          </div>
        </section>

        <section className="border-y border-border bg-card/70 py-8"><div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-border px-4 text-center sm:px-6"><Metric value="10k+" label={text.learners} /><Metric value="1M+" label={text.results} /><Metric value="40+" label={text.subjects} /></div></section>

        <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"><SectionHeading eyebrow="01 — Méthode" title={text.how} copy={text.howCopy} /><div className="mt-12 grid gap-5 md:grid-cols-3">{text.steps.map(([title, description], index) => <div key={title} className="imrs-surface relative p-6"><span className="text-4xl font-bold text-cyan-600/25">0{index + 1}</span><h3 className="mt-7 text-xl font-semibold">{title}</h3><p className="mt-2 leading-6 text-muted-foreground">{description}</p><div className="absolute right-6 top-6 rounded-xl bg-cyan-100 p-3 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200">{[<BookOpenCheck />, <Brain />, <TrendingUp />][index]}</div></div>)}</div></section>

        <section id="benefits" className="scroll-mt-24 bg-muted/55 py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><SectionHeading eyebrow="02 — IMRS" title={text.benefits} copy={text.benefitsCopy} /><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{text.features.map(([title, description], index) => <div key={title} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">{[<BookOpenCheck className="h-5 w-5" />, <CircleHelp className="h-5 w-5" />, <Target className="h-5 w-5" />, <Star className="h-5 w-5" />][index]}</div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>)}</div></div></section>

        <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"><SectionHeading eyebrow={`03 — ${text.plans}`} title={settings.pricingTitle || text.plans} copy={settings.pricingSubtitle || text.plans} centered /><div className="mt-12 grid gap-5 lg:grid-cols-3">{loadingPlans ? <PricingSkeleton /> : displayedPlans.length ? displayedPlans.map((plan, index) => <PricingCard key={plan._id || plan.name} plan={plan} popular={plan.isPopular || index === 1} text={text} onChoose={() => navigate("/register")} />) : <DefaultPlans text={text} onChoose={() => navigate("/register")} />}</div></section>

        <section id="faq" className="scroll-mt-24 bg-muted/55 py-20"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8"><div><span className="imrs-eyebrow">04 — FAQ</span><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{settings.faqTitle || text.faq}</h2><p className="mt-4 leading-7 text-muted-foreground">{text.faq}</p></div><div className="space-y-3">{faqs.map(([question, answer], index) => <details key={`${question}-${index}`} className="group rounded-2xl border border-border bg-card p-5"><summary className="imrs-focus-ring flex cursor-pointer list-none items-center justify-between gap-4 font-semibold"><span>{question}</span><ChevronDown className="h-5 w-5 shrink-0 text-cyan-600 transition group-open:rotate-180" /></summary><p className="pt-4 leading-7 text-muted-foreground">{answer}</p></details>)}</div></div></section>

        <section className="px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#10265f] via-[#133f80] to-[#12718d] px-6 py-10 text-white shadow-xl shadow-blue-950/15 dark:from-[#07152d] dark:via-[#0a2542] dark:to-[#0e5060] sm:px-10 sm:py-14"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><span className="inline-flex rounded-full border border-cyan-200/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[.12em] text-cyan-100 uppercase">IMRS</span><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{text.contact}</h2><p className="mt-3 max-w-2xl text-white/75">{text.contactCopy}</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="bg-cyan-300 text-[#10235c] hover:bg-cyan-200"><a href={`mailto:${settings.contactEmail || FALLBACK_SETTINGS.contactEmail}`}>{text.write}</a></Button><Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to="/register">{text.continue}</Link></Button></div></div></div></section>
      </main>
      <footer className="border-t border-border bg-card"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><div className="flex items-center gap-3"><img src={settings.logoUrl || logo} alt="" className="h-8 w-8 rounded-lg object-contain" /><span>{text.footer}</span></div><div className="flex gap-4"><Link className="hover:text-primary" to="/privacy-policy">{language === "fr" ? "Confidentialité" : "Privacy"}</Link><Link className="hover:text-primary" to="/terms-of-use">{language === "fr" ? "Conditions" : "Terms"}</Link></div></div></footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy: description, centered = false }) { return <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}><span className="imrs-eyebrow">{eyebrow}</span><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 leading-7 text-muted-foreground">{description}</p></div>; }
function MiniStat({ label, value }) { return <div className="rounded-xl bg-white/10 p-3"><p className="text-[11px] text-blue-100">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
function Metric({ value, label }) { return <div className="px-3 py-1"><p className="text-xl font-bold text-primary sm:text-2xl">{value}</p><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p></div>; }
function PricingSkeleton() { return <>{[1, 2, 3].map((item) => <div key={item} className="h-96 animate-pulse rounded-2xl border border-border bg-muted" />)}</>; }
function PricingCard({ plan, popular, text, onChoose }) { const features = (plan.features || plan.featureList || []).map((feature) => typeof feature === "string" ? feature : feature.text).filter(Boolean); return <article className={`relative rounded-2xl border bg-card p-6 ${popular ? "border-cyan-400 shadow-xl shadow-cyan-950/10" : "border-border"}`}>{popular && <span className="absolute -top-3 left-6 rounded-full bg-cyan-500 px-3 py-1 text-xs font-bold text-white">{text.popular}</span>}<p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{plan.name || "IMRS Premium"}</p><div className="mt-5 flex items-baseline gap-1"><span className="text-4xl font-bold">{plan.price ?? plan.monthlyPrice ?? "—"}</span>{plan.price && <span className="text-sm text-muted-foreground">MAD {text.perMonth}</span>}</div><p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description || text.includes}</p><Button onClick={onChoose} className="mt-6 w-full" variant={popular ? "default" : "outline"}>{text.choose}</Button><ul className="mt-6 space-y-3 border-t border-border pt-5 text-sm">{features.slice(0, 6).map((feature, index) => <li key={`${feature}-${index}`} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />{feature}</li>)}</ul></article>; }
function DefaultPlans({ text, onChoose }) { return ["Découverte", "Premium", "Premium annuel"].map((name, index) => <PricingCard key={name} popular={index === 1} onChoose={onChoose} text={text} plan={{ name, price: index === 0 ? 0 : index === 1 ? 49 : 399, description: index === 0 ? "Pour découvrir votre premier semestre." : "Pour réviser sans interruption.", features: ["Accès aux QCM", "Suivi de progression", "Ressources de révision"] }} />); }
