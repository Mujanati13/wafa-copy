import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  SubscrptionChart,
  UserGrowChart,
  SubjectPerformanceChart,
  ExamAttemptsChart,
  UserDemographicsChart,
} from "@/components/admin/Charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  GraduationCap,
  CreditCard,
  Plus,
  Calendar,
  Download,
  BarChart3,
  Clock,
  Target,
  Award,
  Activity,
  RefreshCw,
  Bell,
  FileText,
  Settings,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { adminAnalyticsService } from "@/services/adminAnalyticsService";
import { toast } from "sonner";

const AnalyticsPage = () => {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh(true);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, activityResponse] = await Promise.all([
        adminAnalyticsService.getDashboardStats(),
        adminAnalyticsService.getRecentActivity(5)
      ]);
      
      setDashboardData(statsResponse.data);
      setRecentActivity(activityResponse.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger les données du tableau de bord.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        adminAnalyticsService.getDashboardStats(),
        adminAnalyticsService.getRecentActivity(5)
      ]);
      
      setDashboardData(statsResponse.data);
      setRecentActivity(activityResponse.data);
      setLastRefresh(new Date());
      
      if (!silent) {
        toast.success('Données actualisées', {
          description: 'Le tableau de bord a été mis à jour.'
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (!silent) {
        toast.error('Erreur lors de l\'actualisation');
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleExport = async () => {
    try {
      toast.loading('Génération du rapport...', { id: 'export' });
      
      // Create CSV content
      const csvData = [
        ['Métrique', 'Valeur', 'Croissance'],
        ['Utilisateurs totaux', dashboardData?.totalUsers?.value || 0, dashboardData?.totalUsers?.growth || '0%'],
        ['Abonnements actifs', dashboardData?.activeSubscriptions?.value || 0, dashboardData?.activeSubscriptions?.growth || '0%'],
        ['Tentatives d\'examen', dashboardData?.examAttempts?.value || 0, dashboardData?.examAttempts?.growth || '0%'],
        ['Revenus mensuels', `${dashboardData?.monthlyRevenue?.value || 0} ${dashboardData?.monthlyRevenue?.currency || 'MAD'}`, ''],
        ['', '', ''],
        ['Métriques de performance', '', ''],
        ['Score moyen', `${dashboardData?.performanceMetrics?.averageScore || 0}%`, ''],
        ['Heures d\'étude totales', dashboardData?.performanceMetrics?.totalStudyHours || 0, ''],
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Rapport exporté', { 
        id: 'export',
        description: 'Le fichier CSV a été téléchargé.'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export', { id: 'export' });
    }
  };

  const handleResetMonthlyRevenue = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir réinitialiser les revenus mensuels ? Cette action ne peut pas être annulée.')) {
      return;
    }

    try {
      toast.loading('Réinitialisation en cours...', { id: 'reset' });
      const response = await adminAnalyticsService.resetMonthlyRevenue();
      
      toast.success('Revenus mensuels réinitialisés', { 
        id: 'reset',
        description: `${response.deletedCount} transactions supprimées.`
      });

      // Wait a moment to ensure backend processing is complete, then refresh with visible loading
      setTimeout(() => {
        handleRefresh(false);
      }, 1000);
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Erreur lors de la réinitialisation', { 
        id: 'reset',
        description: error.response?.data?.message || 'Une erreur est survenue'
      });
    }
  };

  const handleResetAllTransactions = async () => {
    if (!window.confirm('⚠️ ATTENTION: Êtes-vous absolument sûr de vouloir SUPPRIMER TOUTES les transactions ? Cette action ne peut pas être annulée et affectera tous les revenus !')) {
      return;
    }

    if (!window.confirm('🚨 Dernier avertissement: Ceci supprimera TOUTES les transactions du système. Êtes-vous certain ?')) {
      return;
    }

    try {
      toast.loading('Suppression de toutes les transactions...', { id: 'reset-all' });
      const response = await adminAnalyticsService.resetAllTransactions();
      
      toast.success('Toutes les transactions supprimées', { 
        id: 'reset-all',
        description: `${response.deletedCount} transactions supprimées.`
      });

      // Wait a moment to ensure backend processing is complete, then refresh with visible loading
      setTimeout(() => {
        handleRefresh(false);
      }, 1000);
    } catch (error) {
      console.error('Reset all error:', error);
      toast.error('Erreur lors de la suppression', { 
        id: 'reset-all',
        description: error.response?.data?.message || 'Une erreur est survenue'
      });
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "user":
        return <Users className="w-4 h-4 text-blue-500" />;
      case "exam":
        return <GraduationCap className="w-4 h-4 text-green-500" />;
      case "subscription":
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      case "payment":
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case "admin":
        return <Plus className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} secondes`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} heures`;
    return `${Math.floor(diffInSeconds / 86400)} jours`;
  };

  // Stats Cards Data (use real data when available)
  const stats = dashboardData ? [
  {
    label: t('admin:total_users'),
    value: dashboardData.totalUsers?.value?.toLocaleString() || "0",
    change: dashboardData.totalUsers?.growth || "+0%",
    changeText: t('admin:from_last_month'),
    icon: <Users className="w-6 h-6 text-gray-400" />,
  },
  {
    label: t('admin:active_subscriptions'),
    value: dashboardData.activeSubscriptions?.value?.toLocaleString() || "0",
    change: dashboardData.activeSubscriptions?.growth || "+0%",
    changeText: t('admin:from_last_month'),
    icon: <CreditCard className="w-6 h-6 text-gray-400" />,
  },
  {
    label: t('admin:exam_attempts'),
    value: dashboardData.examAttempts?.value?.toLocaleString() || "0",
    change: dashboardData.examAttempts?.growth || "+0%",
    changeText: t('admin:from_last_month'),
    icon: <GraduationCap className="w-6 h-6 text-gray-400" />,
  },
  {
    label: t('admin:monthly_revenue'),
    value: `${dashboardData.monthlyRevenue?.value?.toLocaleString() || "0"} ${dashboardData.monthlyRevenue?.currency || "MAD"}`,
    change: "+0%",
    changeText: t('admin:from_last_month'),
    icon: <TrendingUp className="w-6 h-6 text-gray-400" />,
  },
  ] : [];

  // Performance Metrics Data
  const performanceMetrics = dashboardData ? [
  {
    label: t('admin:average_score'),
    value: `${dashboardData.performanceMetrics?.averageScore || "0"}%`,
    change: "+0%",
    icon: <Target className="w-5 h-5 text-blue-500" />,
  },
  {
    label: t('admin:completion_rate'),
    value: "N/A",
    change: "+0%",
    icon: <Award className="w-5 h-5 text-green-500" />,
  },
  {
    label: t('admin:study_time'),
    value: `${dashboardData.performanceMetrics?.totalStudyHours || "0"}h`,
    change: "+0h",
    icon: <Clock className="w-5 h-5 text-purple-500" />,
  },
  {
    label: t('admin:active_sessions'),
    value: dashboardData.totalUsers?.value?.toLocaleString() || "0",
    change: "+0%",
    icon: <Activity className="w-5 h-5 text-orange-500" />,
  },
  ] : [];

  // Subject Performance Data
  const subjectPerformance = [
    { subject: "Mathematics", score: 85, attempts: 1247, growth: "+12.3%" },
    { subject: "Physics", score: 78, attempts: 892, growth: "+8.7%" },
    { subject: "Chemistry", score: 82, attempts: 756, growth: "+15.2%" },
    { subject: "Biology", score: 79, attempts: 634, growth: "+6.8%" },
    { subject: "English", score: 88, attempts: 445, growth: "+9.1%" },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-5 space-y-4 sm:space-y-6 flex flex-col">
      {/* Header with Filters and Export */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('admin:analytics_dashboard')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('admin:monitor_platform_performance')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-card border border-border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs sm:text-sm border-none outline-none bg-transparent"
            >
              <option value="7d">{t('admin:last_7_days')}</option>
              <option value="30d">{t('admin:last_30_days')}</option>
              <option value="90d">{t('admin:last_90_days')}</option>
              <option value="1y">{t('admin:last_year')}</option>
            </select>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{t('common:export')}</span>
          </Button>
          <Button
            onClick={handleResetMonthlyRevenue}
            variant="destructive"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
          >
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Réinitialiser revenus</span>
          </Button>
          <Button
            onClick={handleResetAllTransactions}
            variant="destructive"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 bg-red-700 hover:bg-red-800"
          >
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Réinitialiser tout</span>
          </Button>
          <Button
            onClick={() => handleRefresh(false)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
          </Button>
        </div>
      </div>

      {/* Last Refresh Indicator */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        <span>Mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}</span>
        <span className="text-green-500 hidden sm:inline">• Auto-refresh 60s</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-row justify-between items-center bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-sm min-h-[100px] sm:min-h-[120px] md:min-h-[140px] animate-pulse"
            >
              <div className="flex flex-col gap-1.5 sm:gap-2 flex-1">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2.5 sm:h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : (
          stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-row justify-between items-center bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 min-h-[100px] sm:min-h-[120px] md:min-h-[140px]"
            >
              <div className="flex flex-col gap-1 sm:gap-2">
                <span className="text-xs sm:text-sm text-foreground font-medium">{stat.label}</span>
                <span className="text-lg sm:text-2xl md:text-3xl font-bold text-black">
                  {stat.value}
                </span>
              <span className="text-[10px] sm:text-xs md:text-sm text-green-600 font-semibold">
                {stat.change}{" "}
                <span className="text-gray-400 font-normal hidden sm:inline">
                  {stat.changeText}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-center ml-2 sm:ml-4">
              <div className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6">
                {stat.icon}
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {performanceMetrics.map((metric) => (
          <Card
            key={metric.label}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-2.5 sm:p-3 md:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">{metric.label}</p>
                  <p className="text-base sm:text-xl md:text-2xl font-bold">{metric.value}</p>
                  <p className="text-[10px] sm:text-xs text-green-600 font-medium">
                    {metric.change}
                  </p>
                </div>
                <div className="p-1.5 sm:p-2 bg-background rounded-lg shrink-0 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5">{metric.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <UserGrowChart />
        <SubscrptionChart />
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <SubjectPerformanceChart />
        <ExamAttemptsChart />
      </div>

      {/* User Demographics Chart */}
      <div className="grid grid-cols-1 gap-4">
        <UserDemographicsChart />
      </div>

      {/* Subject Performance and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t('admin:subject_performance')}
            </CardTitle>
            <CardDescription>
              {t('admin:avg_scores_attempts_by_subject')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectPerformance.map((subject) => (
                <div
                  key={subject.subject}
                  className="flex items-center justify-between p-3 bg-background rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {subject.subject}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{t('admin:score')}: {subject.score}%</span>
                      <span>{t('admin:attempts')}: {subject.attempts}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-green-600">
                      {subject.growth}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('admin:recent_activity')}
            </CardTitle>
            <CardDescription>{t('admin:latest_platform_activities')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 hover:bg-background rounded-lg transition-colors"
                  >
                    <div className="mt-1">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user} • {formatTimeAgo(activity.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune activité récente
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin:quick_actions')}</CardTitle>
          <CardDescription>{t('admin:common_admin_tasks')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            <Button
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 h-auto p-2 sm:p-3 md:p-4 flex-col hover:bg-blue-50 hover:border-blue-300"
              onClick={() => navigate('/admin/users')}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
              <span className="text-[10px] sm:text-xs md:text-sm text-center">{t('admin:manage_users')}</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 h-auto p-2 sm:p-3 md:p-4 flex-col hover:bg-green-50 hover:border-green-300"
              onClick={() => navigate('/admin/addQuestions')}
            >
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
              <span className="text-[10px] sm:text-xs md:text-sm text-center">{t('admin:add_exam')}</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 h-auto p-2 sm:p-3 md:p-4 flex-col hover:bg-purple-50 hover:border-purple-300"
              onClick={() => navigate('/admin/subscription')}
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600" />
              <span className="text-[10px] sm:text-xs md:text-sm text-center">{t('admin:view_subscriptions')}</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 h-auto p-2 sm:p-3 md:p-4 flex-col hover:bg-orange-50 hover:border-orange-300"
              onClick={() => navigate('/admin/report-questions')}
            >
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-orange-600" />
              <span className="text-[10px] sm:text-xs md:text-sm text-center">Reports</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 h-auto p-2 sm:p-3 md:p-4 flex-col hover:bg-pink-50 hover:border-pink-300"
              onClick={() => navigate('/admin/notifications')}
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-pink-600" />
              <span className="text-[10px] sm:text-xs md:text-sm text-center">Notifications</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 h-auto p-2 sm:p-3 md:p-4 flex-col hover:bg-teal-50 hover:border-teal-300"
              onClick={() => navigate('/admin/leaderboard')}
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-teal-600" />
              <span className="text-[10px] sm:text-xs md:text-sm text-center">Leaderboard</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
