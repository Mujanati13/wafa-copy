import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Shield,
  TrendingUp,
  BadgeCheck,
  Highlighter,
  List,
  StickyNote,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Star,
  CheckCircle2,
  Zap,
  Users,
  Award,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Loader,
  ArrowRight,
  MessageCircle,
  Send,
  HelpCircle,
  UserPlus,
  BarChart3,
  RefreshCcw,
  Settings2,
  Timer,
  Home,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import Header from "./landingPage/Header";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { subscriptionPlanService } from "@/services/subscriptionPlanService";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const requestWithRetry = async (requestFn, maxRetries = 1, retryDelayMs = 500) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw lastError;
};

// Countdown Timer Component
const CountdownTimer = ({ settings }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!settings?.timerEnabled || !settings?.timerEndDate) {
      return;
    }

    const calculateTimeLeft = () => {
      const difference = +new Date(settings.timerEndDate) - +new Date();

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      } else {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [settings]);

  if (!settings?.timerEnabled || isExpired) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 py-4 sm:py-6 px-3 sm:px-4 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
            <span className="font-semibold text-sm sm:text-base md:text-lg text-center">{settings.timerTitle || "Offre se termine dans"}</span>
          </div>
          <div className="flex gap-2 sm:gap-3 md:gap-4">
            <div className="flex flex-col items-center bg-card text-card-foreground backdrop-blur-sm rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 min-w-[50px] sm:min-w-[60px] md:min-w-[70px] border border-border">
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{String(timeLeft.days).padStart(2, '0')}</span>
              <span className="text-[10px] sm:text-xs uppercase text-muted-foreground font-medium">Jours</span>
            </div>
            <div className="flex flex-col items-center bg-card text-card-foreground backdrop-blur-sm rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 min-w-[50px] sm:min-w-[60px] md:min-w-[70px] border border-border">
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[10px] sm:text-xs uppercase text-muted-foreground font-medium">Heures</span>
            </div>
            <div className="flex flex-col items-center bg-card text-card-foreground backdrop-blur-sm rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 min-w-[50px] sm:min-w-[60px] md:min-w-[70px] border border-border">
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] sm:text-xs uppercase text-muted-foreground font-medium">Min</span>
            </div>
            <div className="flex flex-col items-center bg-card text-card-foreground backdrop-blur-sm rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 min-w-[50px] sm:min-w-[60px] md:min-w-[70px] border border-border">
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] sm:text-xs uppercase text-muted-foreground font-medium">Sec</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const [landingSettings, setLandingSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLandingSettings = async () => {
      try {
        const response = await requestWithRetry(() => axios.get(`${API_URL}/landing-settings`));
        if (response.data.success) {
          setLandingSettings(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching landing settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLandingSettings();
  }, []);

  if (loading) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-background">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen" role="main">
      <Header settings={landingSettings} />
      <HeroSection settings={landingSettings} />
      <FeaturesSection />
      <PricingSection settings={landingSettings} />
      <QuickContact settings={landingSettings} />
      <TestimonialsSection />
      <FAQSection settings={landingSettings} />
      <FeedbackSection settings={landingSettings} />
      <Footer settings={landingSettings} />
    </div>
  );
};

// Hero Section
const HeroSection = ({ settings }) => {
  const { t } = useTranslation("landing");
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chartData, setChartData] = useState([
    { month: 'Jan', height: 45, color: 'from-blue-400 to-blue-500' },
    { month: 'Fév', height: 55, color: 'from-blue-400 to-blue-500' },
    { month: 'Mar', height: 65, color: 'from-blue-500 to-blue-600' },
    { month: 'Avr', height: 60, color: 'from-blue-500 to-blue-600' },
    { month: 'Mai', height: 75, color: 'from-blue-600 to-indigo-600' },
    { month: 'Juin', height: 85, color: 'from-green-500 to-emerald-500' },
  ]);
  const [stats, setStats] = useState({ average: 85, progress: 22, rank: 'Top 5%' });

  useEffect(() => {
    const syncAuthState = () => {
      // Check if user is logged in by checking for auth token
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    syncAuthState();
    window.addEventListener('storage', syncAuthState);
    window.addEventListener('auth-state-changed', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('auth-state-changed', syncAuthState);
    };
  }, []);

  // Update chart data every 3 seconds with animation
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prevData =>
        prevData.map(bar => ({
          ...bar,
          height: Math.min(95, Math.max(35, bar.height + (Math.random() - 0.5) * 15))
        }))
      );

      // Update stats randomly
      setStats(prevStats => ({
        average: Math.min(99, Math.max(75, prevStats.average + (Math.random() - 0.5) * 5)),
        progress: Math.min(50, Math.max(10, prevStats.progress + (Math.random() - 0.5) * 4)),
        rank: 'Top ' + Math.floor(Math.random() * 5 + 1) + '%'
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate('/dashboard/home');
    } else {
      navigate('/register');
    }
  };

  const handleStartMembership = () => {
    if (isLoggedIn) {
      navigate('/dashboard/subscription');
    } else {
      navigate('/register');
    }
  };

  return (
    <section id="accueil" className="relative h-screen flex items-center overflow-hidden bg-background" aria-label={t("hero_badge")}>
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 md:w-96 md:h-96 bg-blue-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 md:w-96 md:h-96 bg-purple-400/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center mt-10">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 md:space-y-6"
          >
            <Badge variant="secondary" className="gap-2 text-xs md:text-sm w-fit">
              <Sparkles className="h-3 w-3" />
              {settings?.heroSubtitle || t("hero_badge")}
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground tracking-tight">
              {settings?.heroTitle || (
                <>
                  {t("hero_title_part1")}{" "}
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {t("hero_title_highlight")}
                  </span>
                  <br />
                  {t("hero_title_part2")}
                </>
              )}
            </h1>

            <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-xl leading-relaxed">
              {settings?.heroDescription || t("hero_description")}
            </p>

            <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 md:gap-4 pt-2">
              {isLoggedIn ? (
                <>
                  <Button
                    size="lg"
                    onClick={handleGetStarted}
                    className="gap-2 text-sm xs:text-base md:text-lg px-4 xs:px-6 md:px-8 py-4 xs:py-5 md:py-6 bg-blue-600 hover:bg-blue-700 w-full xs:w-auto text-white"
                  >
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                    Dashboard
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleStartMembership}
                    className="gap-2 text-sm xs:text-base md:text-lg px-4 xs:px-6 md:px-8 py-4 xs:py-5 md:py-6 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white border-0 w-full xs:w-auto"
                  >
                    <Award className="h-4 w-4 md:h-5 md:w-5" />
                    Gérer l'Abonnement
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={handleGetStarted}
                    className="gap-2 text-sm xs:text-base md:text-lg px-4 xs:px-6 md:px-8 py-4 xs:py-5 md:py-6 bg-blue-600 hover:bg-blue-700 w-full xs:w-auto text-white"
                  >
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                    Commencer maintenant
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleStartMembership}
                    className="gap-2 text-sm xs:text-base md:text-lg px-4 xs:px-6 md:px-8 py-4 xs:py-5 md:py-6 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white border-0 w-full xs:w-auto"
                  >
                    <Award className="h-4 w-4 md:h-5 md:w-5" />
                    Commencer l'abonnement
                  </Button>
                </>
              )}
            </div>
          </motion.div>

          {/* Right: Medical Illustration + Statistics */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center items-center"
          >
            <div className="relative w-full max-w-md">
              {/* Medical Illustration */}
              <div className="absolute -top-10 -right-10 w-32 h-32 md:w-40 md:h-40 z-0 opacity-30">
                <img
                  src="https://img.icons8.com/3d-fluency/188/stethoscope.png"
                  alt="Medical Stethoscope"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 md:w-32 md:h-32 z-0 opacity-30">
                <img
                  src="https://img.icons8.com/3d-fluency/188/book.png"
                  alt="Study Book"
                  className="w-full h-full object-contain"
                />
              </div>
              {/* Statistics Card with Graph - Only visible when logged in */}
              {isLoggedIn ? (
                <div className="bg-card text-card-foreground border border-border rounded-3xl shadow-2xl p-5 md:p-6 transform hover:scale-105 transition-transform duration-300">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-foreground">Performance des Étudiants</h3>
                      <p className="text-xs text-muted-foreground mt-1">Progression mensuelle</p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-950/40 p-2 rounded-lg">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="flex items-end justify-between gap-1 md:gap-1.5 h-40 md:h-48 mb-4 px-1">
                    {chartData.map((bar, index) => (
                      <motion.div
                        key={index}
                        className="flex flex-col items-center flex-1 h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.div
                          className={`w-full bg-gradient-to-t ${bar.color} rounded-t-lg shadow-lg hover:shadow-xl transition-shadow`}
                          animate={{ height: `${bar.height}%` }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          style={{ minHeight: '8px' }}
                        />
                        <span className="text-xs text-muted-foreground mt-1.5 font-medium">{bar.month}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-3 md:pt-4 border-t border-border">
                    <motion.div
                      className="text-center"
                      key="avg"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                      <p className="text-xs text-muted-foreground mb-0.5">Moyenne</p>
                      <motion.p
                        className="text-base md:text-lg font-bold text-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {Math.round(stats.average)}%
                      </motion.p>
                    </motion.div>
                    <motion.div
                      className="text-center"
                      key="prog"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                      <p className="text-xs text-muted-foreground mb-0.5">Progression</p>
                      <motion.p
                        className="text-base md:text-lg font-bold text-green-600 dark:text-green-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        +{Math.round(stats.progress)}%
                      </motion.p>
                    </motion.div>
                    <motion.div
                      className="text-center"
                      key="rank"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                      <p className="text-xs text-muted-foreground mb-0.5">Classement</p>
                      <motion.p
                        className="text-base md:text-lg font-bold text-blue-600 dark:text-blue-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {stats.rank}
                      </motion.p>
                    </motion.div>
                  </div>

                  {/* Success Badge - hidden until real community stats are available */}
                </div>
              ) : (
                /* Welcome Card for visitors */
                <div className="bg-card text-card-foreground border border-border rounded-3xl shadow-2xl p-5 md:p-6 transform hover:scale-105 transition-transform duration-300">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Préparez vos examens</h3>
                    <p className="text-muted-foreground text-sm">
                      Accédez à des milliers de QCM médicaux, suivez votre progression et réussissez vos examens.
                    </p>
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>QCM par module et semestre</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Statistiques détaillées</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Classement et progression</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const { t } = useTranslation("landing");

  const features = [
    {
      icon: <Shield className="h-6 w-6 text-white" />,
      title: t("feature_1_title"),
      description: t("feature_1_desc"),
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      title: t("feature_2_title"),
      description: t("feature_2_desc"),
      color: "from-teal-500 to-teal-600"
    },
    {
      icon: <BadgeCheck className="h-6 w-6 text-white" />,
      title: t("feature_3_title"),
      description: t("feature_3_desc"),
      color: "from-indigo-500 to-indigo-600"
    },
    {
      icon: <Highlighter className="h-6 w-6 text-white" />,
      title: t("feature_4_title"),
      description: t("feature_4_desc"),
      color: "from-yellow-500 to-yellow-600"
    },
    {
      icon: <List className="h-6 w-6 text-white" />,
      title: t("feature_5_title"),
      description: t("feature_5_desc"),
      color: "from-pink-500 to-pink-600"
    },
    {
      icon: <StickyNote className="h-6 w-6 text-white" />,
      title: t("feature_6_title"),
      description: t("feature_6_desc"),
      color: "from-green-500 to-green-600"
    }
  ];

  return (
    <section id="features" className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8" aria-label={t("features_title")}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <Badge variant="secondary" className="mb-3 md:mb-4 text-xs md:text-sm">
            {t("features_badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4">
            {t("features_title")}
          </h2>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("features_subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Card className="h-full hover:shadow-xl hover:border-primary/50 transition-all duration-300 ease-out border-2 transform hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg md:text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Stats Section
// Pricing Section
const PricingSection = ({ settings }) => {
  const { t } = useTranslation("landing");
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isTimerExpired, setIsTimerExpired] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await subscriptionPlanService.getAllPlans();
        // Handle both nested (response.data) and array structures
        const plansData = Array.isArray(response.data) ? response.data : response.data?.data || [];
        
        if (plansData && plansData.length > 0) {
          // Sort plans by order if available, otherwise maintain order
          const sortedPlans = (plansData.sort((a, b) => (a.order || 0) - (b.order || 0))).map(plan => ({
            ...plan,
            isPopular: plan.isPopular || plan.name === "PREMIUM PRO" || plan.name === "Premium Pro"
          }));
          setPlans(sortedPlans);
        } else {
          setError("No subscription plans available");
          setPlans([]);
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
        setError("Error loading pricing plans");
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [t]);

  const handleSubscribe = (plan) => {
    // Check if user is logged in
    const token = localStorage.getItem('token');

    if (token) {
      // User is logged in - navigate to dashboard or subscription page
      if (plan.price === 0) {
        navigate('/dashboard');
        toast.success('Bienvenue! Vous utilisez le plan gratuit');
      } else {
        // For paid plans, navigate to subscription page with plan info
        navigate('/dashboard/subscription', { state: { selectedPlan: plan } });
      }
    } else {
      // User is not logged in - navigate to register with plan info
      navigate('/register', { state: { selectedPlan: plan } });
      toast.info('Veuillez créer un compte pour continuer');
    }
  };

  // Timer effect - uses admin settings
  useEffect(() => {
    if (!settings?.timerEnabled || !settings?.timerEndDate) {
      return;
    }

    const calculateTimeLeft = () => {
      const difference = +new Date(settings.timerEndDate) - +new Date();

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      } else {
        setIsTimerExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  return (
    <section id="pricing" className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-background" aria-label={t("pricing_title")}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <Badge variant="secondary" className="mb-3 md:mb-4 text-xs md:text-sm">
            {t("pricing_badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4">
            {settings?.pricingTitle || t("pricing_title")}
          </h2>
          <p className="text-base md:text-xl text-muted-foreground">
            {settings?.pricingSubtitle || t("pricing_subtitle")}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Countdown Timer - only show if enabled in admin */}
            {settings?.timerEnabled && !isTimerExpired && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="flex justify-center mb-8 sm:mb-12 px-2"
              >
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl sm:rounded-2xl px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 shadow-lg w-full max-w-xl">
                  <p className="text-center text-xs sm:text-sm md:text-base font-semibold mb-2 sm:mb-3 text-white">⏰ {settings?.timerTitle || "Offre limitée - Ne manquez pas cette opportunité !"}</p>
                  <div className="flex gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 justify-center items-center">
                    <div className="text-center bg-card text-card-foreground border border-border rounded-md sm:rounded-lg px-2 xs:px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 flex-1 max-w-[60px] xs:max-w-[70px] sm:max-w-none">
                      <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold text-foreground">{String(timeLeft.days).padStart(2, '0')}</div>
                      <div className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 text-muted-foreground font-semibold">Jours</div>
                    </div>
                    <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold text-white">:</div>
                    <div className="text-center bg-card text-card-foreground border border-border rounded-md sm:rounded-lg px-2 xs:px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 flex-1 max-w-[60px] xs:max-w-[70px] sm:max-w-none">
                      <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold text-foreground">{String(timeLeft.hours).padStart(2, '0')}</div>
                      <div className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 text-muted-foreground font-semibold">Heures</div>
                    </div>
                    <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold text-white">:</div>
                    <div className="text-center bg-card text-card-foreground border border-border rounded-md sm:rounded-lg px-2 xs:px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 flex-1 max-w-[60px] xs:max-w-[70px] sm:max-w-none">
                      <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold text-foreground">{String(timeLeft.minutes).padStart(2, '0')}</div>
                      <div className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 text-muted-foreground font-semibold">Min</div>
                    </div>
                    <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold text-white">:</div>
                    <div className="text-center bg-card text-card-foreground border border-border rounded-md sm:rounded-lg px-2 xs:px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 flex-1 max-w-[60px] xs:max-w-[70px] sm:max-w-none">
                      <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold text-foreground">{String(timeLeft.seconds).padStart(2, '0')}</div>
                      <div className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 text-muted-foreground font-semibold">Sec</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => {
                const isPopular = plan.isPopular;
                return (
                  <motion.div
                    key={plan._id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 text-xs">
                          ★ LE PLUS POPULAIRE
                        </Badge>
                      </div>
                    )}
                    <Card className={`h-full flex flex-col transition-all duration-300 transform hover:shadow-xl rounded-2xl ${isPopular ? 'border-blue-500 border-2 shadow-lg' : 'border-2 border-border'}`}>
                      <CardHeader className="text-center pb-4 pt-8">
                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${plan.price === 0 ? 'bg-muted' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                            {plan.price === 0 ? (
                              <Star className="h-6 w-6 text-muted-foreground" />
                            ) : (
                              <Zap className="h-6 w-6 text-white" />
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-xl md:text-2xl font-bold">{plan.name}</CardTitle>
                        <div className="pt-3 sm:pt-4">
                          <div className="flex items-baseline justify-center gap-1 flex-wrap">
                            <span className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold text-blue-600 dark:text-blue-400">{plan.price} dh</span>
                            {plan.oldPrice && (
                              <span className="text-base sm:text-lg md:text-xl text-muted-foreground line-through ml-1 sm:ml-2">{plan.oldPrice} dh</span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2 font-medium">par {plan.period === 'Annee' ? 'Semester' : plan.period}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow pt-4">
                        <div className="space-y-3">
                          {/* Render custom features based on plan name - EXACTLY matching Dashboard */}
                          {plan.name === 'GRATUIT' && (
                            <>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">1 module</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Questions triées (question par question, toutes les questions)</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Interface adaptée aux mobiles</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Accès aux classements</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Accès aux statistiques</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Explication des étudiants</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Explication de l'IA</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Accès à la communauté votes</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Création de playlists</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Notes personnalisées</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Assistance prioritaire</span>
                              </div>
                            </>
                          )}

                          {plan.name === 'PREMIUM' && (
                            <>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Tous les modules</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Questions triées (question par question, toutes les questions)</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Interface adaptée aux mobiles</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Accès aux classements</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Accès aux statistiques</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Explication des étudiants</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Explication de l'IA</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Accès à la communauté votes</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Création de playlists</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Notes personnalisées</span>
                              </div>
                              <div className="flex items-start gap-3 opacity-50">
                                <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                <span className="text-sm text-muted-foreground line-through">Assistance prioritaire</span>
                              </div>
                            </>
                          )}

                          {plan.name === 'PREMIUM PRO' && (
                            <>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Tous les modules</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Questions triées (question par question, toutes les questions)</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Interface adaptée aux mobiles</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Accès aux classements</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Accès aux statistiques</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Explication des étudiants</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Explication de l'IA</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Accès à la communauté votes</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Création de playlists</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Notes personnalisées</span>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                <span className="text-sm text-foreground">Assistance prioritaire</span>
                              </div>
                            </>
                          )}

                          {/* Fallback: if none of the above plan names match, show original features */}
                          {!['GRATUIT', 'PREMIUM', 'PREMIUM PRO'].includes(plan.name) && plan.features && plan.features.map((feature, idx) => {
                            const featureText = typeof feature === 'string' ? feature : feature.text;
                            const isIncluded = typeof feature === 'string' ? true : feature.included;

                            return (
                              <div key={idx} className={`flex items-start gap-3 ${!isIncluded ? 'opacity-50' : ''}`}>
                                <span className={`flex-shrink-0 mt-0.5 ${isIncluded ? 'text-green-500' : 'text-red-500'}`}>
                                  {isIncluded ? '✔️' : '❌'}
                                </span>
                                <span className={`text-sm ${isIncluded ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{featureText}</span>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          onClick={() => handleSubscribe(plan)}
                          className={`w-full mt-6 text-base font-semibold py-6 ${isPopular
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                            : 'bg-muted hover:bg-accent text-foreground'
                            }`}
                        >
                          {plan.price === 0 ? 'Commencer gratuitement' : 'Commencer maintenant'}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-10"
            >
              <Button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (token) {
                    navigate('/dashboard');
                  } else {
                    navigate('/register');
                  }
                }}
                variant="outline"
                size="lg"
                className="px-8"
              >
                Essayez maintenant
              </Button>
              <p className="text-sm text-muted-foreground mt-4 font-medium">
                Cette offre est valable pour une durée limitée, Profitez de cette opportunité avant qu'il ne soit trop tard
              </p>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
};

// Truncated testimonial message with expand toggle
const TestimonialMessage = ({ message }) => {
  const [expanded, setExpanded] = useState(false);
  const limit = 200;
  const isLong = message.length > limit;
  return (
    <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
      "{expanded || !isLong ? message : message.slice(0, limit) + '…'}"
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="ml-1 text-blue-600 hover:underline text-xs font-medium"
        >
          {expanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </p>
  );
};

// Testimonials Section
const TestimonialsSection = () => {
  const { t } = useTranslation("landing");
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await requestWithRetry(() => axios.get(`${API_URL}/feedbacks`));
        console.log('Testimonials API response:', response.data);
        if (response.data.success) {
          setTestimonials(response.data.data || []);
          console.log('Loaded testimonials:', response.data.data?.length || 0);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
        setTestimonials([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  // Don't show section if no testimonials
  if (!loading && testimonials.length === 0) {
    console.warn('TestimonialsSection: No approved testimonials found to display');
    return null;
  }

  // Debug info
  if (loading) {
    console.log('TestimonialsSection: Loading testimonials...');
  } else {
    console.log('TestimonialsSection: Displaying', testimonials.length, 'testimonials');
  }

  return (
    <section className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-background" aria-label="Témoignages">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <Badge variant="secondary" className="mb-3 md:mb-4 text-xs md:text-sm">
            Témoignages
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4">
            Ce que disent nos étudiants
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Rejoignez des centaines d'étudiants qui ont réussi leurs examens avec notre plateforme
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial._id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 transform hover:-translate-y-1">
                  <CardContent className="pt-6 h-full flex flex-col">
                    {/* Avatar + name at top */}
                    <div className="flex items-center gap-3 mb-4">
                      {testimonial.imageUrl ? (
                        <img
                          src={testimonial.imageUrl.startsWith('http') ? testimonial.imageUrl : `${API_URL?.replace('/api/v1', '')}${testimonial.imageUrl}`}
                          alt={testimonial.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {testimonial.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm md:text-base">{testimonial.name}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 md:h-5 w-4 md:w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <TestimonialMessage message={testimonial.message} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// FAQ Section
const FAQSection = ({ settings }) => {
  const { t } = useTranslation("landing");

  // Default FAQ items if none configured in admin
  const defaultFaqItems = [
    {
      question: "Pour quelle faculté sont destinés ces QCMs ?",
      answer: "Les QCMs sont spécifiquement conçus pour les étudiants de la FMPR (Faculté de Médecine et de Pharmacie de Rabat)."
    },
    {
      question: "Dois-je créer un compte ?",
      answer: "Oui, la création d'un compte gratuit est nécessaire pour accéder aux QCMs et sauvegarder votre progression."
    },
    {
      question: "Puis-je suivre ma progression ?",
      answer: "Oui, votre progression est automatiquement sauvegardée et vous pouvez la consulter à tout moment."
    },
    {
      question: "Mes informations bancaires sont-elles sécurisées ?",
      answer: "Absolument. Nous ne conservons aucune information concernant votre carte bancaire. Tous les paiements sont traités par PayPal qui garantit la sécurité de vos transactions."
    },
    {
      question: "Puis-je être remboursé ?",
      answer: "Les remboursements ne sont accordés que dans des cas exceptionnels. Pour toute demande, contactez-nous sur WhatsApp."
    },
    {
      question: "Puis-je personnaliser mon parcours d'études ?",
      answer: "Bien sûr ! Vous pouvez organiser votre plan d'études par création des playlists, des examens et des exercices spécifiques afin de personnaliser votre expérience d'apprentissage."
    }
  ];

  // Use admin-configured FAQ items if available, otherwise use defaults
  const faqItems = (settings?.faqItems && settings.faqItems.length > 0) ? settings.faqItems : defaultFaqItems;
  const faqTitle = settings?.faqTitle || "Réponses aux questions fréquentes";

  const iconColors = [
    { bg: "bg-blue-100 dark:bg-blue-950/40", hover: "bg-blue-200 dark:bg-blue-900/60", icon: "text-blue-600 dark:text-blue-400" },
    { bg: "bg-green-100 dark:bg-green-950/40", hover: "bg-green-200 dark:bg-green-900/60", icon: "text-green-600 dark:text-green-400" },
    { bg: "bg-purple-100 dark:bg-purple-950/40", hover: "bg-purple-200 dark:bg-purple-900/60", icon: "text-purple-600 dark:text-purple-400" },
    { bg: "bg-teal-100 dark:bg-teal-950/40", hover: "bg-teal-200 dark:bg-teal-900/60", icon: "text-teal-600 dark:text-teal-400" },
    { bg: "bg-orange-100 dark:bg-orange-950/40", hover: "bg-orange-200 dark:bg-orange-900/60", icon: "text-orange-600 dark:text-orange-400" },
    { bg: "bg-indigo-100 dark:bg-indigo-950/40", hover: "bg-indigo-200 dark:bg-indigo-900/60", icon: "text-indigo-600 dark:text-indigo-400" },
  ];

  return (
    <section id="faq" className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-background" aria-label={t("faq_title")}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <Badge variant="secondary" className="mb-3 md:mb-4 text-xs md:text-sm">
            {t("faq_badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4">
            {faqTitle}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            Trouvez les réponses à vos questions les plus courantes
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-card text-card-foreground rounded-2xl border-2 border-border shadow-lg overflow-hidden"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => {
              const colorScheme = iconColors[index % iconColors.length];
              return (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-border last:border-0">
                  <AccordionTrigger className="hover:no-underline py-4 sm:py-6 px-4 sm:px-6 md:px-8 group">
                    <div className="flex items-center gap-2 sm:gap-4 text-left flex-1">
                      <div className={`p-1.5 sm:p-2 ${colorScheme.bg} rounded-lg group-hover:${colorScheme.hover} transition-colors flex-shrink-0`}>
                        <HelpCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${colorScheme.icon}`} />
                      </div>
                      <span className="font-semibold text-foreground text-sm sm:text-base">{item.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 sm:pb-6 px-4 sm:px-6 md:px-8 pl-10 sm:pl-16 text-sm sm:text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

// Quick Contact Line
const QuickContact = ({ settings }) => {
  const contactPhone = settings?.contactPhone || "+1234567890";
  const whatsappNumber = settings?.whatsappNumber || "";
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`;

  return (
    <section className="relative py-6 md:py-8 px-4 sm:px-6 lg:px-8 border-y border-border bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-border bg-card text-card-foreground backdrop-blur-sm shadow-sm px-4 sm:px-6 py-4 md:py-5">
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 text-sm md:text-base">
            <a
              href={`tel:${contactPhone}`}
              className="group w-full md:w-auto flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-foreground hover:border-blue-500 hover:bg-accent transition-all"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 group-hover:bg-blue-200 transition-colors">
                <Phone className="h-4 w-4" />
              </span>
              <span className="font-semibold tracking-wide">{contactPhone}</span>
            </a>

            {whatsappNumber && (
              <>
                <div className="hidden md:flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground text-lg">•</div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full md:w-auto flex items-center justify-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 px-4 py-3 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 transition-all"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="font-semibold tracking-wide">WhatsApp</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// Contact Section
const ContactSection = () => {
  const { t } = useTranslation("landing");

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success(t("contact_success_message"));
  };

  return (
    <section className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-background" aria-label={t("contact_title")}>
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6 md:space-y-8"
          >
            <div>
              <Badge variant="secondary" className="mb-3 md:mb-4 text-xs md:text-sm">
                {t("contact_badge")}
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4">
                {t("contact_title")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                {t("contact_subtitle")}
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="flex items-start gap-4 md:gap-5">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="h-5 md:h-6 w-5 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm md:text-base">{t("contact_email_label")}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t("contact_email_value")}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 md:gap-5">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone className="h-5 md:h-6 w-5 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm md:text-base">{t("contact_phone_label")}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t("contact_phone_value")}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 md:gap-5">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="h-5 md:h-6 w-5 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm md:text-base">{t("contact_address_label")}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t("contact_address_value")}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="mt-8 lg:mt-0"
          >
            <Card className="border-2 border-border">
              <CardHeader className="space-y-3 pb-4">
                <CardTitle className="text-xl md:text-2xl">{t("contact_form_title")}</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  {t("contact_form_subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium">{t("contact_form_name")}</label>
                      <Input placeholder={t("contact_form_name_placeholder")} required className="text-sm border-border bg-background" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium">{t("contact_form_email")}</label>
                      <Input type="email" placeholder={t("contact_form_email_placeholder")} required className="text-sm border-border bg-background" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">{t("contact_form_subject")}</label>
                    <Input placeholder={t("contact_form_subject_placeholder")} required className="text-sm border-border bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">{t("contact_form_message")}</label>
                    <Textarea
                      placeholder={t("contact_form_message_placeholder")}
                      rows={4}
                      required
                      className="text-sm resize-none border-border bg-background"
                    />
                  </div>
                  <Button type="submit" className="w-full text-white" size="lg">
                    {t("contact_form_submit")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Feedback Section
const FeedbackSection = ({ settings }) => {
  const { t } = useTranslation("landing");
  const navigate = useNavigate();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setFeedbackSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        toast.success('Message envoyé avec succès!', {
          description: 'Nous vous répondrons sous 24h.'
        });
        setTimeout(() => setFeedbackSubmitted(false), 5000);
      } else {
        toast.error('Erreur', {
          description: data.message || 'Impossible d\'envoyer le message'
        });
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      toast.error('Erreur', {
        description: 'Impossible d\'envoyer le message. Veuillez réessayer.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="contact" className="py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-background border-t border-border">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Nous voulons vos <span className="text-blue-600 dark:text-blue-400">retours</span>
          </h2>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Aidez-nous à améliorer YourQCM en partageant vos pensées et suggestions.
            Votre contribution alimente notre innovation.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/dashboard/support?tab=contact')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-semibold py-6 px-8"
              size="lg"
            >
              <Send className="w-5 h-5 mr-2" />
              Nous envoyer un message
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="text-base font-semibold py-6 px-8"
              size="lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Retour à l'accueil
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-border shadow-xl overflow-hidden bg-card text-card-foreground">
            <CardContent className="p-4 sm:p-6 md:p-8">
              {feedbackSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Merci pour votre retour!</h3>
                  <p className="text-muted-foreground">Votre message a été envoyé avec succès.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-4 sm:space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Nom complet</label>
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Votre nom"
                        required
                        className="border-border bg-background text-foreground focus:border-blue-500"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="votre.email@exemple.com"
                        required
                        className="border-border bg-background text-foreground focus:border-blue-500"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Sujet</label>
                    <Input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="De quoi voulez-vous parler?"
                      required
                      className="border-border bg-background text-foreground focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Message</label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Partagez vos pensées, suggestions ou rapports de bugs..."
                      rows={6}
                      required
                      className="border-border bg-background text-foreground focus:border-blue-500 resize-none"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Warning Alert */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-1">Important</h4>
                        <p className="text-sm text-amber-800 dark:text-amber-400">
                          Veuillez envoyer un message clair et approprié. Les messages contenant du contenu offensant, des insultes ou du spam seront rejetés et votre compte pourrait être suspendu.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-semibold py-6"
                    size="lg"
                    disabled={isLoading}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    {isLoading ? 'Envoi en cours...' : 'Envoyer votre avis'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              <span>Réponse sous 24h</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              <span>Confidentiel et sécurisé</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              <span>Communauté de 500+ étudiants</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const Footer = ({ settings }) => {
  const { t } = useTranslation("landing");

  // Use admin settings for contact info and social links
  const contactEmail = settings?.contactEmail || t("contact_email_value");
  const contactPhone = settings?.contactPhone || t("contact_phone_value");
  const whatsappNumber = settings?.whatsappNumber || "";
  const facebookUrl = settings?.facebookUrl || "#";
  const instagramUrl = settings?.instagramUrl || "#";
  const youtubeUrl = settings?.youtubeUrl || "#";

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-white py-10 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-border" role="contentinfo">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-8">
          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 md:h-6 md:w-6" />
              {settings?.siteName || t("footer_brand")}
            </h3>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
              {t("footer_brand_description")}
            </p>
            {/* Contact info from admin settings */}
            <div className="mt-4 space-y-2 text-xs md:text-sm text-slate-400">
              {contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{contactPhone}</span>
                </div>
              )}
              {whatsappNumber && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-400" />
                  <a href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Produit</h4>
            <ul className="space-y-2 text-xs md:text-sm text-slate-400">
              <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Tarification</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Support</h4>
            <ul className="space-y-2 text-xs md:text-sm text-slate-400">
              <li><a href="#faq" className="hover:text-white transition-colors">Centre d'aide</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Nous Contacter</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">{t("footer_social_title")}</h4>
            <div className="flex gap-3">
              {facebookUrl && facebookUrl !== "#" && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors" aria-label="Facebook">
                  <Facebook className="h-4 md:h-5 w-4 md:w-5" />
                </a>
              )}
              {instagramUrl && instagramUrl !== "#" && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-pink-600 transition-colors" aria-label="Instagram">
                  <Instagram className="h-4 md:h-5 w-4 md:w-5" />
                </a>
              )}
              {youtubeUrl && youtubeUrl !== "#" && (
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-red-600 transition-colors" aria-label="YouTube">
                  <svg className="h-4 md:h-5 w-4 md:w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              )}
              {/* Show default placeholders if no social links configured */}
              {(!facebookUrl || facebookUrl === "#") && (!instagramUrl || instagramUrl === "#") && (!youtubeUrl || youtubeUrl === "#") && (
                <>
                  <a href="#" className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors" aria-label="Facebook">
                    <Facebook className="h-4 md:h-5 w-4 md:w-5" />
                  </a>
                  <a href="#" className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors" aria-label="Instagram">
                    <Instagram className="h-4 md:h-5 w-4 md:w-5" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-slate-800 mb-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs md:text-sm text-slate-400">
          <p>© 2026 YourQCM. Tous les droits réservés.</p>
          <div className="flex gap-4 md:gap-6">
            <a href="/privacy-policy" className="hover:text-white transition-colors">{t("footer_terms")}</a>
            <a href="/privacy-policy" className="hover:text-white transition-colors">{t("footer_privacy")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingPage;
