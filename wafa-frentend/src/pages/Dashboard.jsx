import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { moduleService } from "@/services/moduleService";
import { dashboardService } from "@/services/dashboardService";
import { userService } from "@/services/userService";
import { useSemester } from "@/context/SemesterContext";
import { Lock, Sparkles, TrendingUp, Award, Clock, HelpCircle, ChevronDown, ChevronLeft, ChevronRight, GraduationCap, UserPlus, BarChart3, Shield, RefreshCcw, Settings2, LineChart as LineChartIcon, Activity, BookOpen, FileText, Image as ImageIcon, Download, Book } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import ModuleCard from "@/components/Dashboard/ModuleCard";
import ModulePreviewModal from "@/components/Dashboard/ModulePreviewModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, StatCard } from "@/components/shared";
import { toast } from "sonner";
import { displaySubscriptionPlanName } from "@/utils/subscriptionDisplay";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const WHATSAPP_NUMBER = "0699204386";

  // Use shared semester context instead of local state
  const { selectedSemester: semester, setSelectedSemester: setSemester, userSemesters } = useSemester();

  const [coursesData, setCoursesData] = useState(null);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [stats, setStats] = useState({
    examsCompleted: 0,
    averageScore: 0,
    studyHours: 0,
    rank: 0,
  });
  const [moduleProgress, setModuleProgress] = useState([]);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [completionData, setCompletionData] = useState([]);
  const [semesterPage, setSemesterPage] = useState(0); // For paginating semesters (2 at a time)

  const normalizedPlan = (user?.plan || 'Free').toLowerCase();
  const isFreeUser = normalizedPlan === 'free' || normalizedPlan === 'gratuit';

  // Load user from localStorage immediately on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('userProfile') || localStorage.getItem('user');
    console.log('Loading user from localStorage:', storedUser);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Parsed user:', parsedUser);
        console.log('User name field:', parsedUser.name, 'fullName:', parsedUser.fullName, 'username:', parsedUser.username);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }
  }, []);

  // Only show subscribed semesters instead of all semesters
  const semestersPerPage = 2;
  const totalSemesterPages = Math.max(1, Math.ceil(userSemesters.length / semestersPerPage));
  const visibleSemesters = userSemesters.slice(semesterPage * semestersPerPage, (semesterPage + 1) * semestersPerPage);

  // Check if user needs to select free semester on first load
  useEffect(() => {
    const checkFreeSemester = async () => {
      try {
        const response = await userService.checkFreeSemesterStatus();
        if (response.data?.needsToSelectSemester) {
          navigate('/select-semester');
          return;
        }
        
        // Also check if user has no semesters at all (new Google sign-up users)
        const userProfile = await userService.getUserProfile();
        if (!userProfile.semesters || userProfile.semesters.length === 0) {
          // New user with no semesters - redirect to semester selection
          navigate('/select-semester');
        }
      } catch (error) {
        console.error('Error checking free semester status:', error);
      }
    };
    checkFreeSemester();
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Try to show cached data immediately for instant display
        const cachedModules = localStorage.getItem("modules");
        const cachedUser = localStorage.getItem("userProfile");
        
        if (cachedModules) {
          setCoursesData(JSON.parse(cachedModules));
        }
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }

        // Fetch modules and user profile in parallel
        // Force refresh user profile to get latest data from server
        const [modulesResponse, profileData] = await Promise.all([
          moduleService.getAllmodules(),
          dashboardService.getUserProfile()
        ]);

        const modulesData = modulesResponse.data;
        let modules = modulesData.data;

        const userData = profileData.data?.user || profileData.data;
        console.log('User profile data from API:', userData);
        console.log('User name:', userData?.name, 'fullName:', userData?.fullName, 'username:', userData?.username);
        setUser(userData);
        
        // Also update localStorage to persist
        if (userData) {
          localStorage.setItem('userProfile', JSON.stringify(userData));
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        // Fetch user stats to calculate module progress
        try {
          const userStats = await userService.getMyStats();
          
          if (userStats && userStats.moduleProgress && userStats.moduleProgress.length > 0) {
            // Map progress data from userStats to modules
            modules = modules.map(module => {
              const moduleProgressData = userStats.moduleProgress.find(
                mp => mp.moduleId?.toString() === module._id?.toString()
              );
              
              if (moduleProgressData) {
                const totalQuestions = module.totalQuestions || 0;
                const questionsAttempted = moduleProgressData.questionsAttempted || 0;
                const correctAnswers = moduleProgressData.correctAnswers || 0;
                const progress = totalQuestions > 0 
                  ? Math.round((questionsAttempted / totalQuestions) * 100)
                  : 0;
                
                return {
                  ...module,
                  progress,
                  questionsAttempted,
                  correctAnswers
                };
              }
              
              return {
                ...module,
                progress: 0,
                questionsAttempted: 0,
                correctAnswers: 0
              };
            });
          }
        } catch (statsError) {
          console.error('Error fetching user stats for module progress:', statsError);
          // Continue without progress data
        }

        setCoursesData(modules);
        
        // Update both localStorage keys for consistency
        localStorage.setItem("userProfile", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));

        // Note: userSemesters and semester are now managed by SemesterContext
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error(t('dashboard:error_loading_dashboard'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch semester-specific stats when semester changes
  useEffect(() => {
    const fetchSemesterData = async () => {
      if (!semester) {
        // No semester selected yet - clear stats data
        setStats({
          examsCompleted: 0,
          averageScore: 0,
          studyHours: 0,
          rank: 0,
        });
        setModuleProgress([]);
        setWeeklyActivity([]);
        setPerformanceTrend([]);
        setCompletionData([]);
        return;
      }

      try {
        // Fetch stats and leaderboard in parallel for faster loading
        const [statsData, leaderboardData] = await Promise.all([
          dashboardService.getUserStats(semester),
          dashboardService.getLeaderboardRank(semester)
        ]);

        const { rank } = leaderboardData;

        // Transform module progress data from backend
        if (statsData.data.stats.moduleProgress && statsData.data.stats.moduleProgress.length > 0) {
          const progressByModule = statsData.data.stats.moduleProgress.slice(0, 6).map(mp => ({
            name: mp.moduleName.substring(0, 12),
            completed: mp.correctAnswers || 0,
            pending: (mp.questionsAttempted || 0) - (mp.correctAnswers || 0)
          }));
          setModuleProgress(progressByModule);
        } else {
          // Fallback to empty progress if no stats yet
          setModuleProgress([]);
        }

        // Transform weekly activity for study time chart
        if (statsData.data.stats.weeklyActivity && statsData.data.stats.weeklyActivity.length > 0) {
          const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
          const last7Days = statsData.data.stats.weeklyActivity.slice(-7);
          const studyTimeData = last7Days.map(activity => {
            const date = new Date(activity.date);
            return {
              day: days[date.getDay()],
              hours: Math.round((activity.timeSpent || 0) / 60 * 10) / 10
            };
          });
          setWeeklyActivity(studyTimeData);
        } else {
          setWeeklyActivity([
            { day: 'Lun', hours: 0 },
            { day: 'Mar', hours: 0 },
            { day: 'Mer', hours: 0 },
            { day: 'Jeu', hours: 0 },
            { day: 'Ven', hours: 0 },
            { day: 'Sam', hours: 0 },
            { day: 'Dim', hours: 0 }
          ]);
        }

        // Calculate performance trend (last 6 months)
        if (statsData.data.stats.weeklyActivity && statsData.data.stats.weeklyActivity.length > 0) {
          const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          const monthlyData = {};

          statsData.data.stats.weeklyActivity.forEach(activity => {
            const date = new Date(activity.date);
            const monthKey = `${months[date.getMonth()]}`;

            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { total: 0, correct: 0 };
            }

            monthlyData[monthKey].total += activity.questionsAttempted || 0;
            monthlyData[monthKey].correct += activity.correctAnswers || 0;
          });

          const trendData = Object.keys(monthlyData).slice(-6).map(month => ({
            month,
            score: monthlyData[month].total > 0
              ? Math.round((monthlyData[month].correct / monthlyData[month].total) * 100)
              : 0
          }));
          setPerformanceTrend(trendData.length > 0 ? trendData : [
            { month: 'Jan', score: 0 },
            { month: 'Fév', score: 0 },
            { month: 'Mar', score: 0 },
            { month: 'Avr', score: 0 },
            { month: 'Mai', score: 0 },
            { month: 'Juin', score: 0 }
          ]);
        } else {
          setPerformanceTrend([
            { month: 'Jan', score: 0 },
            { month: 'Fév', score: 0 },
            { month: 'Mar', score: 0 },
            { month: 'Avr', score: 0 },
            { month: 'Mai', score: 0 },
            { month: 'Juin', score: 0 }
          ]);
        }

        // Calculate completion rate from stats
        const totalQuestions = statsData.data.stats?.totalQuestionsAttempted || 0;
        const correctAnswers = statsData.data.stats?.totalCorrectAnswers || 0;
        const incorrectAnswers = statsData.data.stats?.totalIncorrectAnswers || 0;

        if (totalQuestions > 0) {
          setCompletionData([
            { name: 'Correct', value: correctAnswers, fill: '#4ade80' },
            { name: 'Incorrect', value: incorrectAnswers, fill: '#f87171' }
          ]);
        } else {
          setCompletionData([
            { name: 'Aucune donnée', value: 1, fill: '#94a3b8' }
          ]);
        }

        setStats({
          examsCompleted: statsData.data.stats?.examsCompleted || 0,
          averageScore: statsData.data.stats?.averageScore || 0,
          studyHours: statsData.data.stats?.studyHours || 0,
          rank: rank || 0,
        });
      } catch (error) {
        console.error("Error fetching semester data:", error);
      }
    };

    fetchSemesterData();
  }, [semester]);

  // Filter courses based on selected semester and user's subscription
  useEffect(() => {
    if (coursesData && semester && userSemesters.length > 0) {
      // Filter modules: show selected semester modules OR modules available in all semesters
      let filtered = coursesData.filter(course =>
        (course.semester === semester && userSemesters.includes(course.semester)) ||
        course.availableInAllSemesters === true
      );
      
      // Free users: Show only 1 module total (not per semester)
      const userPlan = user?.plan || 'Free';
      if (userPlan === 'Free') {
        // Get all modules across all subscribed semesters
        const allSubscribedModules = coursesData.filter(course =>
          userSemesters.includes(course.semester)
        );
        
        // If we already have 1 or more modules in any semester, limit to first one overall
        if (allSubscribedModules.length > 0) {
          // Check if current filtered semester contains the first module
          const firstModule = allSubscribedModules[0];
          if (firstModule.semester === semester) {
            filtered = [firstModule];
          } else {
            // Current semester doesn't have the free module
            filtered = [];
          }
        }
      }
      
      setFilteredCourses(filtered);
    } else if (coursesData && userSemesters.length === 0) {
      // No subscription - show empty
      setFilteredCourses([]);
    } else {
      setFilteredCourses([]);
    }
  }, [coursesData, semester, userSemesters, user]);

  const handleCourseClick = (courseId) => {
    // Navigate directly to the module without showing intermediate popup
    navigate(`/dashboard/subjects/${courseId}`);
  };

  const handleStartModule = () => {
    if (selectedModule) {
      setShowModuleDialog(false);
      navigate(`/dashboard/subjects/${selectedModule._id}`);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedModule) return;

    try {
      // Create a PDF-like document with module information
      const pdfContent = `
MODULE: ${selectedModule.name}
SEMESTER: ${selectedModule.semester}
PROGRESS: ${selectedModule.progress || 0}%
TOTAL QUESTIONS: ${selectedModule.totalQuestions || 0}

${selectedModule.infoText ? `DESCRIPTION:\n${selectedModule.infoText}` : ''}

${selectedModule.helpContent ? `HELP CONTENT:\n${selectedModule.helpContent}` : ''}

EXAMS:
${selectedModule.exams?.map((exam, i) => `${i + 1}. ${exam.name || exam.year || 'Exam'}`).join('\n') || 'No exams available'}
      `.trim();

      // Create a blob and download
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedModule.name.replace(/\s+/g, '_')}_module.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Module téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading module:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleViewText = () => {
    if (!selectedModule) return;

    // Create a formatted text view
    const textContent = `
📚 ${selectedModule.name}
${'='.repeat(50)}

📅 Semestre: ${selectedModule.semester}
📊 Progression: ${selectedModule.progress || 0}%
❓ Questions totales: ${selectedModule.totalQuestions || 0}

${selectedModule.infoText ? `\n📝 Description:\n${selectedModule.infoText}\n` : ''}

${selectedModule.helpContent ? `\n💡 Aide:\n${selectedModule.helpContent}\n` : ''}

${selectedModule.exams?.length ? `\n📋 Examens disponibles:\n${selectedModule.exams.map((exam, i) => `  ${i + 1}. ${exam.name || exam.year || 'Exam'}`).join('\n')}` : ''}
    `.trim();

    // Copy to clipboard and show notification
    navigator.clipboard.writeText(textContent).then(() => {
      toast.success('Contenu copié dans le presse-papiers');
    }).catch(() => {
      // Fallback: show in alert
      alert(textContent);
      toast.info('Contenu affiché');
    });
  };

  const handleContactWhatsApp = () => {
    const message = encodeURIComponent("Bonjour, je souhaite activer mon abonnement pour accéder a tous les modules.");
    const whatsappUrl = `https://wa.me/212${WHATSAPP_NUMBER.replace(/^0/, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card p-4 md:p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-100/30 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-purple-100/20 rounded-full opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-100/15 rounded-full opacity-10 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="relative overflow-hidden border-0 bg-[linear-gradient(115deg,#2563eb_0%,#4f46e5_52%,#7e22ce_100%)] shadow-2xl">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4)_0%,transparent_50%)]" />
              <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.3)_0%,transparent_50%)]" />
            </div>

            <CardContent className="relative z-10 p-3 xs:p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-6 sm:gap-8">
                {/* Top Row - Welcome & Support */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                  {/* Welcome Section */}
                  <div className="flex items-start gap-2 sm:gap-3 flex-1">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="flex-shrink-0 rounded-xl border border-white/15 bg-blue-400/35 p-2 shadow-lg shadow-blue-950/15 backdrop-blur-sm sm:rounded-2xl sm:p-2.5"
                    >
                      <Sparkles className="h-6 w-6 text-yellow-300 sm:h-7 sm:w-7 md:h-8 md:w-8" aria-hidden="true" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight">
                        Bienvenue, {user?.name || user?.fullName || 'Étudiant'} !
                      </h1>
                      <p className="text-blue-100 text-xs xs:text-sm mt-1">
                        {isFreeUser
                          ? "Vous etes sur le plan Free. Activez votre abonnement pour debloquer tous les modules."
                          : "Pret a exceller dans vos etudes ?"
                        }
                      </p>
                    </div>
                  </div>

                  {/* Support Link */}
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0">
                    <p className="text-blue-100">{isFreeUser ? "Besoin d'aide pour l'activation ?" : "Besoin d'aide ?"}</p>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-white font-semibold hover:text-yellow-300 underline underline-offset-4 text-xs sm:text-sm"
                      onClick={() => navigate('/dashboard/support')}
                    >
                      Contactez-nous
                    </Button>
                  </div>
                </div>

                {/* Bottom Row - Plan & Semesters */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Subscription Card */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xl cursor-pointer group h-full"
                    onClick={() => navigate('/dashboard/subscription')}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-background/10 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16" />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="text-white min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium opacity-90">Mon Abonnement</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1 truncate">
                          {isFreeUser ? 'Free' : displaySubscriptionPlanName(user?.plan, 'Gratuit')}
                        </p>
                        <p className="text-[10px] xs:text-xs opacity-80 mt-2 group-hover:underline">
                          {isFreeUser ? 'Voir les options de paiement →' : 'Voir les details →'}
                        </p>
                      </div>
                      <div className="bg-background/20 p-2 sm:p-3 rounded-lg sm:rounded-xl backdrop-blur-sm flex-shrink-0">
                        <Award className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Semester Selector Card */}
                  <div className="bg-background/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg border border-white/50 h-full">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <p className="text-sm sm:text-base font-bold text-foreground">Mes Semestres</p>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] xs:text-xs">
                        {userSemesters.length} actif{userSemesters.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 hover:bg-muted"
                        onClick={() => setSemesterPage(p => Math.max(0, p - 1))}
                        disabled={semesterPage === 0}
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      </Button>
                      
                      <div className="flex gap-1 sm:gap-2 flex-1 justify-center">
                        {visibleSemesters.length > 0 ? visibleSemesters.map((sem) => {
                          const isSelected = semester === sem;
                          return (
                            <Button
                              key={sem}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSemester(sem)}
                              className={`min-w-[50px] xs:min-w-[58px] sm:min-w-[65px] text-xs sm:text-sm font-semibold transition-all ${
                                isSelected
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md scale-105'
                                  : 'hover:bg-blue-50 hover:border-blue-300 text-muted-foreground'
                              }`}
                            >
                              {sem}
                            </Button>
                          );
                        }) : (
                          <p className="text-xs text-muted-foreground py-2">Aucun semestre souscrit</p>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 hover:bg-muted"
                        onClick={() => setSemesterPage(p => Math.min(totalSemesterPages - 1, p + 1))}
                        disabled={semesterPage >= totalSemesterPages - 1}
                      >
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    
                    <p className="text-[10px] xs:text-xs text-center text-muted-foreground mt-3">
                      Page {semesterPage + 1} sur {totalSemesterPages}
                    </p>
                  </div>
                </div>

                {isFreeUser && (
                  <div className="rounded-xl sm:rounded-2xl border-2 border-amber-200 bg-amber-50/95 p-4 sm:p-6 shadow-lg">
                    <div className="text-center space-y-3 sm:space-y-4">
                      <p className="text-lg sm:text-2xl font-bold text-amber-900 leading-snug">
                        Vous souhaitez acceder a tous les modules ?
                      </p>
                      <p className="text-sm sm:text-base text-amber-800">
                        Consultez les methodes de paiement ou discutez directement avec notre equipe sur WhatsApp.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-1">
                        <Button
                          onClick={() => navigate('/dashboard/subscription')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          Voir les paiements
                        </Button>
                        <Button
                          onClick={handleContactWhatsApp}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                          Cliquez ici (WhatsApp)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Right Column - For future content if needed */}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Modules Section - Moved above Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-teal-600" />
                {t('dashboard:modules')}
                <Badge variant="outline" className="ml-2 bg-teal-50 text-teal-700 border-teal-200">
                  {semester || "Sélectionner"}
                </Badge>
              </h2>
              <div className="h-1 w-16 bg-gradient-to-r from-teal-600 to-emerald-500 mt-2 rounded-full" />
            </div>
            {!loading && filteredCourses.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {filteredCourses.length} module{filteredCourses.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton className="h-28 xs:h-32 sm:h-36 md:h-40 w-full mb-4 rounded-lg" />
                    <Skeleton className="h-5 sm:h-6 w-3/4 mb-2" />
                    <Skeleton className="h-3 sm:h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course, index) => (
                  <ModuleCard
                    key={course._id || course.id || index}
                    course={course}
                    handleCourseClick={handleCourseClick}
                    index={index}
                  />
                ))
              ) : (
                <div className="col-span-full">
                  <Card className="border-2 border-dashed border-border bg-card/50">
                    <CardContent className="text-center py-16">
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                          {userSemesters.length === 0 ? (
                            <Lock className="h-8 w-8 text-slate-400" />
                          ) : (
                            <Book className="h-8 w-8 text-blue-400" />
                          )}
                        </div>
                        <h3 className="text-xl font-semibold text-muted-foreground">
                          {userSemesters.length === 0
                            ? "Aucun semestre souscrit"
                            : `Aucun module pour ${semester}`
                          }
                        </h3>
                        <p className="text-muted-foreground">
                          {userSemesters.length === 0
                            ? "Abonnez-vous pour accéder aux modules et commencer votre apprentissage"
                            : userSemesters.length > 1 
                              ? "Aucun module n'est encore disponible pour ce semestre. Essayez un autre semestre."
                              : "Aucun module n'est encore disponible pour ce semestre. Les modules seront ajoutés prochainement."
                          }
                        </p>
                        {userSemesters.length === 0 ? (
                          <Button
                            onClick={() => navigate('/dashboard/subscription')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Voir les abonnements
                          </Button>
                        ) : userSemesters.length > 1 && (
                          <p className="text-sm text-blue-600 font-medium">
                            Vos semestres: {userSemesters.join(', ')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Module Preview Modal */}
        <ModulePreviewModal
          isOpen={showModuleDialog}
          onClose={() => setShowModuleDialog(false)}
          module={selectedModule}
        />
      </div>
    </div>
  );
};

export default Dashboard;
