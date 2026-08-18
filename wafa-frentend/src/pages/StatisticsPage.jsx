import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Trophy,
  MessageCircle,
  Lightbulb,
  HelpCircle,
  Target,
  Filter,
  Calendar,
  FileText,
  Database,
  X,
  Play,
  Clock,
  Activity,
  LineChart as LineChartIcon
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CircularProgress } from "@/components/ui/circular-progress";
import { StatCard } from "@/components/shared";
import { dashboardService } from "@/services/dashboardService";
import { moduleService } from "@/services/moduleService";
import { api } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useSemester } from "@/context/SemesterContext";

const StatisticsPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { selectedSemester: contextSemester } = useSemester();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [modules, setModules] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("modules");
  const [showIncorrectPopup, setShowIncorrectPopup] = useState(false);
  
  // Chart data states
  const [moduleProgressChart, setModuleProgressChart] = useState([]);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [completionData, setCompletionData] = useState([]);
  
  // Selected module state for showing exams
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleExamTab, setModuleExamTab] = useState("exam-years");
  const [moduleExams, setModuleExams] = useState({
    examYears: [],
    parCours: [],
    qcmBanque: []
  });
  const [loadingExams, setLoadingExams] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [profileData, statsData, modulesData] = await Promise.all([
          dashboardService.getUserProfile(),
          dashboardService.getUserStats(),
          moduleService.getAllmodules()
        ]);

        const user = profileData.data?.user || profileData.data;
        setUserProfile(user);
        
        // Check if user has premium access - redirect free users
        const userPlan = user?.plan || 'Free';
        if (userPlan === 'Free') {
          toast.error('Cette fonctionnalité est réservée aux abonnés Premium', {
            description: 'Mettez à niveau votre plan pour accéder aux statistiques détaillées.',
            action: {
              label: 'Voir les plans',
              onClick: () => navigate('/dashboard/subscription')
            },
            duration: 5000,
          });
          navigate('/dashboard/subscription');
          return;
        }
        
        setStats(statsData.data?.stats || statsData.data);
        
        // Transform module progress data for charts
        if (statsData.data?.stats?.moduleProgress && statsData.data.stats.moduleProgress.length > 0) {
          const progressByModule = statsData.data.stats.moduleProgress.slice(0, 6).map(mp => ({
            name: mp.moduleName.substring(0, 12),
            completed: mp.correctAnswers || 0,
            pending: (mp.questionsAttempted || 0) - (mp.correctAnswers || 0)
          }));
          setModuleProgressChart(progressByModule);
        } else {
          setModuleProgressChart([]);
        }
        
        // Transform weekly activity for study time chart
        if (statsData.data?.stats?.weeklyActivity && statsData.data.stats.weeklyActivity.length > 0) {
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
        if (statsData.data?.stats?.weeklyActivity && statsData.data.stats.weeklyActivity.length > 0) {
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
        const totalQuestions = statsData.data?.stats?.totalQuestionsAttempted || 0;
        const correctAnswers = statsData.data?.stats?.totalCorrectAnswers || 0;
        const incorrectAnswers = statsData.data?.stats?.totalIncorrectAnswers || 0;

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
        
        // Process modules data - API returns { success, count, data: [...modules] }
        const modulesList = modulesData.data?.data || modulesData.data || [];
        const moduleProgress = statsData.data?.stats?.moduleProgress || [];
        
        // Ensure modulesList is an array
        const modulesArray = Array.isArray(modulesList) ? modulesList : [];
        
        // Get user's subscribed semesters
        const userSemesters = user?.semesters || [];
        
        // Filter modules based on user's subscription
        const filteredModules = modulesArray.filter(module => {
          // If user has no subscription (Free plan with no semesters), show nothing or limited
          if (userPlan === 'Free' && userSemesters.length === 0) {
            return false; // Or return true for first module only, etc.
          }
          
          // Check if module's semester is in user's subscribed semesters
          if (userSemesters.length > 0) {
            return userSemesters.includes(module.semester);
          }
          
          return false;
        });
        
        // Merge module data with progress
        const modulesWithProgress = filteredModules.map(module => {
          const progress = moduleProgress.find(
            mp => mp.moduleId?.toString() === module._id?.toString()
          ) || {};
          
          return {
            ...module,
            questionsAnswered: progress.questionsAttempted || 0,
            correctAnswers: progress.correctAnswers || 0,
            incorrectAnswers: progress.incorrectAnswers || 0,
            totalQuestions: module.totalQuestions || 0
          };
        });
        
        setModules(modulesWithProgress);

      } catch (error) {
        console.error("Error fetching statistics:", error);
        toast.error("Impossible de charger les statistiques");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch exams when a module is selected
  const fetchModuleExams = async (moduleId) => {
    setLoadingExams(true);
    try {
      // Fetch all exam types for this module
      const [examYearsRes, examCoursesRes, qcmBanqueRes] = await Promise.all([
        api.get(`/exams/module/${moduleId}`).catch(() => ({ data: { data: [] } })),
        api.get(`/exam-courses/module/${moduleId}`).catch(() => ({ data: { data: [] } })),
        api.get(`/qcm-banque/module/${moduleId}`).catch(() => ({ data: { data: [] } }))
      ]);

      setModuleExams({
        examYears: examYearsRes.data?.data || [],
        parCours: examCoursesRes.data?.data || [],
        qcmBanque: qcmBanqueRes.data?.data || []
      });
    } catch (error) {
      console.error("Error fetching module exams:", error);
      toast.error("Impossible de charger les examens");
    } finally {
      setLoadingExams(false);
    }
  };

  // Handle module selection
  const handleModuleClick = (module) => {
    // Navigate to the module's questions page
    navigate(`/dashboard/subjects/${module._id}`);
  };

  // Close module detail
  const handleCloseModuleDetail = () => {
    setSelectedModule(null);
    setModuleExams({ examYears: [], parCours: [], qcmBanque: [] });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Module color palette
  const moduleColors = [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", 
    "#ec4899", "#06b6d4", "#6366f1", "#84cc16"
  ];

  const getModuleColor = (index) => moduleColors[index % moduleColors.length];

  // Filter and group modules by semester from context
  const filteredAndGroupedModules = useMemo(() => {
    let filtered = modules;
    
    // Filter by selected semester from context (not "all")
    if (contextSemester) {
      filtered = modules.filter(m => m.semester === contextSemester);
    }
    
    // Group by semester
    const grouped = {};
    filtered.forEach(module => {
      if (!grouped[module.semester]) {
        grouped[module.semester] = [];
      }
      grouped[module.semester].push(module);
    });
    
    return grouped;
  }, [modules, contextSemester]);

  // Calculate overall statistics based on filtered modules
  const overallStats = useMemo(() => {
    const modulesToCount = Object.values(filteredAndGroupedModules).flat();
    
    const totalQuestions = modulesToCount.reduce((sum, m) => sum + (m.questionsAnswered || 0), 0);
    const totalCorrect = modulesToCount.reduce((sum, m) => sum + (m.correctAnswers || 0), 0);
    const totalIncorrect = modulesToCount.reduce((sum, m) => sum + (m.incorrectAnswers || 0), 0);
    const totalModules = modulesToCount.length;
    const avgSuccess = totalQuestions > 0 ? (totalCorrect / totalQuestions * 100) : 0;
    
    return {
      totalQuestions,
      totalCorrect,
      totalIncorrect,
      totalModules,
      avgSuccess: Math.round(avgSuccess)
    };
  }, [filteredAndGroupedModules]);

  // Module Stats Card Component
  const ModuleStatsCard = ({ module, index, onClick, isSelected }) => {
    const percentage = module.totalQuestions > 0 
      ? Math.round((module.questionsAnswered / module.totalQuestions) * 100) 
      : 0;
    
    // Calculate percentages based on TOTAL questions, not just answered ones
    const correctPercent = module.totalQuestions > 0 
      ? (module.correctAnswers / module.totalQuestions) * 100 
      : 0;
    const incorrectPercent = module.totalQuestions > 0 
      ? (module.incorrectAnswers / module.totalQuestions) * 100 
      : 0;
    const color = module.color || getModuleColor(index);

    return (
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={`bg-card text-card-foreground rounded-xl p-4 cursor-pointer border transition-all duration-200 ${
          isSelected 
            ? "border-primary shadow-lg ring-2 ring-primary/20" 
            : "border-border hover:border-primary/40 hover:bg-muted/30 hover:shadow-md"
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Circular Progress */}
          <CircularProgress 
            value={percentage} 
            size={50} 
            strokeWidth={5}
            color={color}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Module Name */}
            <h3 className="font-semibold text-foreground text-sm mb-1 truncate">
              {module.name}
            </h3>

            {/* Question Count */}
            <p className="text-xs text-muted-foreground mb-2">
              {module.questionsAnswered} sur {module.totalQuestions}
            </p>

            {/* Progress Bar (Green for correct, Red for incorrect, gray for remaining) */}
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              {correctPercent > 0 && (
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${correctPercent}%` }}
                />
              )}
              {incorrectPercent > 0 && (
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${incorrectPercent}%` }}
                />
              )}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </motion.div>
    );
  };

  // Exam Card Component for displaying individual exams
  const ExamCard = ({ exam, type, moduleId }) => {
    const questionCount = exam.questions?.length || exam.questionCount || exam.linkedQuestions?.length || 0;
    
    // Calculate progress percentages
    const questionsAnswered = exam.questionsAnswered || 0;
    const correctAnswers = exam.correctAnswers || 0;
    const incorrectAnswers = exam.incorrectAnswers || 0;
    
    const correctPercent = questionCount > 0 ? (correctAnswers / questionCount) * 100 : 0;
    const incorrectPercent = questionCount > 0 ? (incorrectAnswers / questionCount) * 100 : 0;
    const percentage = questionCount > 0 ? Math.round((questionsAnswered / questionCount) * 100) : 0;
    
    // Get the appropriate route based on exam type
    const getExamRoute = () => {
      switch (type) {
        case "exam-years":
          return `/exam/${exam._id}`;
        case "par-cours":
          return `/exam/${exam._id}?type=course`;
        case "qcm-banque":
          return `/exam/${exam._id}?type=qcm`;
        default:
          return "#";
      }
    };

    const getExamTitle = () => {
      if (type === "exam-years") {
        return exam.year || exam.name || "Exam";
      }
      return exam.title || exam.name || "Exam";
    };

    return (
      <motion.div
        whileHover={{ scale: 1.01, x: 4 }}
        className="bg-background rounded-xl p-3 md:p-4 border border-border hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
        onClick={() => navigate(getExamRoute())}
      >
        {/* Mobile Layout */}
        <div className="flex flex-col sm:hidden gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {type === "exam-years" && <Calendar className="h-4 w-4 text-primary" />}
                {type === "par-cours" && <FileText className="h-4 w-4 text-primary" />}
                {type === "qcm-banque" && <Database className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm truncate">{getExamTitle()}</h4>
                <p className="text-xs text-muted-foreground">
                  {questionCount} question{questionCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate(getExamRoute());
              }}
            >
              <Play className="h-3 w-3" />
              <span>Start</span>
            </button>
          </div>

          {/* Progress */}
          {questionsAnswered > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progression: {percentage}%</span>
                <span className="text-muted-foreground">{questionsAnswered}/{questionCount}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                {correctPercent > 0 && (
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${correctPercent}%` }}
                  />
                )}
                {incorrectPercent > 0 && (
                  <div 
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${incorrectPercent}%` }}
                  />
                )}
              </div>
              {(correctAnswers > 0 || incorrectAnswers > 0) && (
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    {correctAnswers} correct
                  </span>
                  <span className="text-red-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    {incorrectAnswers} incorrect
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {type === "exam-years" && <Calendar className="h-5 w-5 text-primary" />}
              {type === "par-cours" && <FileText className="h-5 w-5 text-primary" />}
              {type === "qcm-banque" && <Database className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground">{getExamTitle()}</h4>
              <p className="text-sm text-muted-foreground">
                {questionCount} question{questionCount !== 1 ? 's' : ''}
              </p>
              
              {/* Progress for Desktop */}
              {questionsAnswered > 0 && (
                <div className="mt-2 max-w-xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progression: {percentage}%</span>
                    <span className="text-muted-foreground">{questionsAnswered}/{questionCount}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    {correctPercent > 0 && (
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${correctPercent}%` }}
                      />
                    )}
                    {incorrectPercent > 0 && (
                      <div 
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${incorrectPercent}%` }}
                      />
                    )}
                  </div>
                  {(correctAnswers > 0 || incorrectAnswers > 0) && (
                    <div className="flex items-center gap-4 mt-1 text-xs">
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        {correctAnswers} correct
                      </span>
                      <span className="text-red-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {incorrectAnswers} incorrect
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate(getExamRoute());
            }}
          >
            <Play className="h-4 w-4" />
            <span>Commencer</span>
          </button>
        </div>
      </motion.div>
    );
  };

  // Empty State Component for when no exams exist
  const EmptyExamState = ({ type }) => {
    const getEmptyMessage = () => {
      switch (type) {
        case "exam-years":
          return "Aucun examen par année disponible pour ce module";
        case "par-cours":
          return "Aucun cours disponible pour ce module";
        case "qcm-banque":
          return "Aucun QCM banque disponible pour ce module";
        default:
          return "Aucun contenu disponible";
      }
    };

    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          {type === "exam-years" && <Calendar className="h-8 w-8 text-slate-400" />}
          {type === "par-cours" && <FileText className="h-8 w-8 text-slate-400" />}
          {type === "qcm-banque" && <Database className="h-8 w-8 text-slate-400" />}
        </div>
        <p className="font-medium">{getEmptyMessage()}</p>
        <p className="text-sm mt-1 text-slate-400">Revenez bientôt pour du nouveau contenu</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card p-4 md:p-6">
      <motion.div 
        className="max-w-7xl mx-auto space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Card className="border-border bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <BarChart3 className="h-8 w-8" />
                    Statistiques
                  </h1>
                  <p className="text-blue-100">
                    Suivez votre progression par module
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <Badge className="bg-background/20 text-white border-white/30">
                    {userProfile?.plan === 'Premium Annuel' ? 'Premium Pro' : (userProfile?.plan || 'Gratuit')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid - Mes Statistiques */}
        <motion.div
          variants={itemVariants}
        >
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Mes Statistiques
            </h2>
            <div className="h-1 w-16 bg-gradient-to-r from-blue-600 to-teal-500 mt-2 rounded-full" />
          </div>

          {loading ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Questions répondues"
                value={stats?.totalQuestionsAttempted || 0}
                icon={<BookOpen className="h-4 w-4" />}
                description="Au total"
              />
              <StatCard
                title="Taux de réussite"
                value={`${Math.round(stats?.averageScore || 0)}%`}
                icon={<TrendingUp className="h-4 w-4" />}
                description={`${stats?.totalCorrectAnswers || 0}/${stats?.totalQuestionsAttempted || 0} correctes`}
              />
              <StatCard
                title="Heures d'étude"
                value={Math.round(stats?.studyHours || 0)}
                icon={<Clock className="h-4 w-4" />}
                description="Temps total"
              />
              <StatCard
                title="Modules actifs"
                value={stats?.moduleProgress?.length || 0}
                icon={<Award className="h-4 w-4" />}
                description="En progression"
              />
            </div>
          )}
        </motion.div>

        {/* Statistics Charts Section */}
        <motion.div variants={itemVariants}>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Analyse de Performance
            </h2>
            <div className="h-1 w-16 bg-gradient-to-r from-purple-600 to-pink-500 mt-2 rounded-full" />
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="detailed">Détails</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Module Progress Chart */}
                <Card className="border-border bg-card shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Progrès par Module
                    </CardTitle>
                    <CardDescription>Top 6 modules actifs</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    {moduleProgressChart.length > 0 ? (
                      <div className="w-full h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={moduleProgressChart} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" fontSize={11} angle={-45} textAnchor="end" height={70} stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)' }} />
                            <YAxis fontSize={11} stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)' }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--card-foreground)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar dataKey="completed" fill="#3b82f6" name="Complétées" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="pending" fill="#fbbf24" name="En attente" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-slate-400">
                        <p>Aucune donnée disponible</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Performance Trend Chart */}
                <Card className="border-border bg-card shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LineChartIcon className="h-5 w-5 text-green-600" />
                      Évolution du Score
                    </CardTitle>
                    <CardDescription>Progression sur 6 mois</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    {performanceTrend.length > 0 ? (
                      <div className="w-full h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={performanceTrend}
                            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" fontSize={11} stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)' }} />
                            <YAxis fontSize={11} domain={[0, 100]} stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)' }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--card-foreground)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                              cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#10b981"
                              strokeWidth={3}
                              dot={{ fill: '#10b981', r: 4 }}
                              activeDot={{ r: 6 }}
                              name="Score (%)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-slate-400">
                        <p>Aucune donnée historique</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Completion Rate Pie Chart */}
                <Card className="border-border bg-card shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Activity className="h-5 w-5 text-purple-600" />
                      Taux de Complétion
                    </CardTitle>
                    <CardDescription>Répartition QCM</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 flex items-center justify-center">
                    {completionData.length > 0 ? (
                      <div className="w-full h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={completionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {completionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--card-foreground)' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-slate-400">
                        <p>Aucune donnée disponible</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Study Time Distribution */}
                <Card className="border-border bg-card shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5 text-amber-600" />
                      Temps d'Étude
                    </CardTitle>
                    <CardDescription>Heures par jour (7 jours)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    {weeklyActivity.length > 0 ? (
                      <div className="w-full h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={weeklyActivity}
                            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="day" fontSize={11} stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)' }} />
                            <YAxis fontSize={11} stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)' }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--card-foreground)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                              formatter={(value) => `${value}h`}
                              cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
                            />
                            <Bar dataKey="hours" fill="#f59e0b" name="Heures" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-slate-400">
                        <p>Aucune donnée d'étude</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Overall Statistics Cards */}
        {activeTab === "modules" && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
          >
            <motion.div variants={itemVariants}>
              <Card className="border-border bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Questions</p>
                      <p className="text-xl md:text-3xl font-bold text-blue-600">{overallStats.totalQuestions}</p>
                    </div>
                    <BookOpen className="h-8 w-8 md:h-12 md:w-12 text-blue-500/20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-border bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">Correctes</p>
                      <p className="text-xl md:text-3xl font-bold text-green-600">{overallStats.totalCorrect}</p>
                    </div>
                    <Award className="h-8 w-8 md:h-12 md:w-12 text-emerald-500/20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card 
                className="border-border bg-card cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setShowIncorrectPopup(true)}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">Incorrectes</p>
                      <p className="text-xl md:text-3xl font-bold text-red-600">{overallStats.totalIncorrect}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 md:h-12 md:w-12 text-rose-500/20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-border bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">Taux Réussite</p>
                      <p className="text-xl md:text-3xl font-bold text-purple-600">{overallStats.avgSuccess}%</p>
                    </div>
                    <Award className="h-8 w-8 md:h-12 md:w-12 text-purple-500/20" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Module Statistics - No additional filters needed, uses context semester */}
        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0">
              <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:w-auto lg:inline-flex bg-muted border border-border shadow-sm">
                <TabsTrigger 
                  value="modules" 
                  className="flex-1 sm:flex-initial text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap"
                >
                  <BookOpen className="h-4 w-4 mr-1 sm:mr-2 hidden xs:block" />
                  MODULES
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Modules Tab Content */}
            <TabsContent value="modules" className="mt-6">
              {!contextSemester ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Aucun semestre sélectionné</p>
                  <p className="text-sm mt-2">
                    Sélectionnez un semestre dans le menu principal pour voir les statistiques
                  </p>
                </div>
              ) : Object.keys(filteredAndGroupedModules).length > 0 ? (
                Object.keys(filteredAndGroupedModules)
                  .sort()
                  .map((semester) => (
                    <div key={semester} className="mb-12">
                      {/* Semester Header */}
                      <motion.div 
                        variants={itemVariants}
                        className="flex items-center gap-3 mb-6"
                      >
                        <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base py-2 px-4">
                          {semester}
                        </Badge>
                        <p className="text-muted-foreground">
                          {filteredAndGroupedModules[semester].length} module{filteredAndGroupedModules[semester].length !== 1 ? 's' : ''}
                        </p>
                      </motion.div>

                      {/* Modules Grid */}
                      <motion.div 
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {filteredAndGroupedModules[semester].map((module, index) => (
                          <React.Fragment key={module._id || index}>
                            <ModuleStatsCard 
                              module={module}
                              index={index}
                              onClick={() => handleModuleClick(module)}
                              isSelected={selectedModule?._id === module._id}
                            />
                          </React.Fragment>
                        ))}
                      </motion.div>

                      {/* Module Detail Section - Shows inline below selected module */}
                      <AnimatePresence>
                        {selectedModule && selectedModule.semester === semester && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6"
                          >
                            <Card className="border-border bg-card shadow-lg">
                              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={handleCloseModuleDetail}
                                      className="p-2 hover:bg-background/20 rounded-lg transition-colors"
                                    >
                                      <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <div>
                                      <CardTitle className="text-lg">{selectedModule.name}</CardTitle>
                                      <CardDescription className="text-blue-100">
                                        {selectedModule.semester} • {selectedModule.totalQuestions || 0} questions
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <button
                                    onClick={handleCloseModuleDetail}
                                    className="p-2 hover:bg-background/20 rounded-lg transition-colors"
                                  >
                                    <X className="h-5 w-5" />
                                  </button>
                                </div>
                              </CardHeader>
                              <CardContent className="p-4">
                                {/* Exam Type Tabs */}
                                <Tabs value={moduleExamTab} onValueChange={setModuleExamTab} className="w-full">
                                  <TabsList className="w-full grid grid-cols-3 bg-muted">
                                    <TabsTrigger 
                                      value="exam-years"
                                      className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm"
                                    >
                                      <Calendar className="h-4 w-4" />
                                      <span className="hidden sm:inline">Exam par année</span>
                                      <span className="sm:hidden">Année</span>
                                    </TabsTrigger>
                                    <TabsTrigger 
                                      value="par-cours"
                                      className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm"
                                    >
                                      <FileText className="h-4 w-4" />
                                      <span className="hidden sm:inline">Par cours</span>
                                      <span className="sm:hidden">Cours</span>
                                    </TabsTrigger>
                                    <TabsTrigger 
                                      value="qcm-banque"
                                      className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm"
                                    >
                                      <Database className="h-4 w-4" />
                                      <span className="hidden sm:inline">QCM banque</span>
                                      <span className="sm:hidden">QCM</span>
                                    </TabsTrigger>
                                  </TabsList>

                                  {/* Loading State */}
                                  {loadingExams ? (
                                    <div className="mt-6 space-y-3">
                                      {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                                      ))}
                                    </div>
                                  ) : (
                                    <>
                                      {/* Exam Years Content */}
                                      <TabsContent value="exam-years" className="mt-4">
                                        {moduleExams.examYears.length > 0 ? (
                                          <div className="space-y-3">
                                            {moduleExams.examYears.map((exam) => (
                                              <ExamCard 
                                                key={exam._id} 
                                                exam={exam} 
                                                type="exam-years"
                                                moduleId={selectedModule._id}
                                              />
                                            ))}
                                          </div>
                                        ) : (
                                          <EmptyExamState type="exam-years" />
                                        )}
                                      </TabsContent>

                                      {/* Par Cours Content */}
                                      <TabsContent value="par-cours" className="mt-4">
                                        {moduleExams.parCours.length > 0 ? (
                                          <div className="space-y-3">
                                            {moduleExams.parCours.map((exam) => (
                                              <ExamCard 
                                                key={exam._id} 
                                                exam={exam} 
                                                type="par-cours"
                                                moduleId={selectedModule._id}
                                              />
                                            ))}
                                          </div>
                                        ) : (
                                          <EmptyExamState type="par-cours" />
                                        )}
                                      </TabsContent>

                                      {/* QCM Banque Content */}
                                      <TabsContent value="qcm-banque" className="mt-4">
                                        {moduleExams.qcmBanque.length > 0 ? (
                                          <div className="space-y-3">
                                            {moduleExams.qcmBanque.map((exam) => (
                                              <ExamCard 
                                                key={exam._id} 
                                                exam={exam} 
                                                type="qcm-banque"
                                                moduleId={selectedModule._id}
                                              />
                                            ))}
                                          </div>
                                        ) : (
                                          <EmptyExamState type="qcm-banque" />
                                        )}
                                      </TabsContent>
                                    </>
                                  )}
                                </Tabs>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Aucun module disponible</p>
                  <p className="text-sm mt-2">
                    {userProfile?.plan === 'Free' 
                      ? "Abonnez-vous pour accéder aux modules et voir vos statistiques"
                      : "Sélectionnez des semestres dans votre abonnement pour voir les modules"
                    }
                  </p>
                  <button 
                    onClick={() => navigate('/dashboard/subscription')}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Voir les abonnements
                  </button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Incorrect Answers Popup */}
        <AnimatePresence>
          {showIncorrectPopup && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={() => setShowIncorrectPopup(false)}
              >
                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                >
                  <div className="sticky top-0 bg-gradient-to-r from-red-600 to-rose-600 text-white p-6 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                          <TrendingUp className="h-6 w-6" />
                          Réponses Incorrectes
                        </h2>
                        <p className="text-red-100 mt-1">
                          Détails de vos erreurs par module
                        </p>
                      </div>
                      <button
                        onClick={() => setShowIncorrectPopup(false)}
                        className="p-2 hover:bg-background/20 rounded-lg transition-colors"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {/* Summary */}
                    <div className="mb-6 p-4 bg-rose-500/10 rounded-lg border border-rose-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total d'erreurs</p>
                          <p className="text-3xl font-bold text-red-600">{overallStats.totalIncorrect}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Taux d'erreur</p>
                          <p className="text-2xl font-bold text-red-600">
                            {overallStats.totalQuestions > 0 
                              ? Math.round((overallStats.totalIncorrect / overallStats.totalQuestions) * 100)
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Modules with incorrect answers */}
                    <div className="space-y-3">
                      {Object.values(filteredAndGroupedModules)
                        .flat()
                        .filter(m => m.incorrectAnswers > 0)
                        .sort((a, b) => b.incorrectAnswers - a.incorrectAnswers)
                        .map((module, index) => {
                          const errorRate = module.questionsAnswered > 0
                            ? Math.round((module.incorrectAnswers / module.questionsAnswered) * 100)
                            : 0;
                          
                          return (
                            <div 
                              key={module._id || index}
                              className="p-4 bg-muted/30 border border-border rounded-lg hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground">{module.name}</h3>
                                  <p className="text-xs text-muted-foreground mt-1">{module.semester}</p>
                                </div>
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">
                                  {module.incorrectAnswers} erreurs
                                </Badge>
                              </div>
                              
                              {/* Progress bar */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{module.correctAnswers} correctes</span>
                                  <span>{errorRate}% d'erreurs</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                                  <div 
                                    className="h-full bg-emerald-500"
                                    style={{ 
                                      width: `${module.questionsAnswered > 0 
                                        ? (module.correctAnswers / module.questionsAnswered) * 100 
                                        : 0}%` 
                                    }}
                                  />
                                  <div 
                                    className="h-full bg-red-500"
                                    style={{ 
                                      width: `${module.questionsAnswered > 0 
                                        ? (module.incorrectAnswers / module.questionsAnswered) * 100 
                                        : 0}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      
                      {Object.values(filteredAndGroupedModules).flat().filter(m => m.incorrectAnswers > 0).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Award className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
                          <p className="font-medium">Aucune erreur trouvée!</p>
                          <p className="text-sm mt-2">Vous n'avez pas encore de réponses incorrectes</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};

export default StatisticsPage;
