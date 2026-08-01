import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Search, Filter, ArrowUp, ArrowDown, Award, Users, TrendingUp, Download, Calendar, Trophy, Zap, MessageSquare, Star, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader, StatCard, TableFilters } from "@/components/shared";
import { adminAnalyticsService } from "@/services/adminAnalyticsService";
import { moduleService } from "@/services/moduleService";
import { toast } from "sonner";

const studentYears = [
  { value: "all", label: "student year (all-1-2-3-4-5)" },
  { value: "1", label: "1ère année" },
  { value: "2", label: "2ème année" },
  { value: "3", label: "3ème année" },
  { value: "4", label: "4ème année" },
  { value: "5", label: "5ème année" },
];

// Level calculation based on total points (1 level = 50 points)
const calculateLevel = (totalPoints) => {
  const level = Math.floor(totalPoints / 50);
  if (level >= 200) return { level, name: "Maître Suprême", color: "bg-purple-600" };
  if (level >= 150) return { level, name: "Maître", color: "bg-purple-500" };
  if (level >= 100) return { level, name: "Expert", color: "bg-indigo-500" };
  if (level >= 75) return { level, name: "Avancé", color: "bg-blue-500" };
  if (level >= 50) return { level, name: "Confirmé", color: "bg-cyan-500" };
  if (level >= 30) return { level, name: "Intermédiaire", color: "bg-teal-500" };
  if (level >= 20) return { level, name: "Apprenti", color: "bg-green-500" };
  if (level >= 10) return { level, name: "Initié", color: "bg-lime-500" };
  if (level >= 5) return { level, name: "Novice", color: "bg-yellow-500" };
  if (level >= 1) return { level, name: "Débutant", color: "bg-orange-500" };
  return { level: 0, name: "Nouveau", color: "bg-gray-400" };
};

const Leaderboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [studentYear, setStudentYear] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pointType, setPointType] = useState("normal"); // normal, report, explication
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [stats, setStats] = useState({
    totalUsers: 0,
    topPoints: 0,
    avgPoints: 0
  });

  useEffect(() => {
    fetchLeaderboard();
  }, [studentYear]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, studentYear, pointType]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await adminAnalyticsService.getLeaderboard({
        studentYear: studentYear !== 'all' ? studentYear : undefined,
        limit: 100
      });
      
      // Transform data to include all point types
      const transformedData = (response.data.leaderboard || []).map((user, index) => {
        // Calculate year from semesters if currentYear not set
        let year = user.currentYear;
        if (!year && user.semesters && user.semesters.length > 0) {
          // Extract year number from first semester (S1-S2 = 1, S3-S4 = 2, etc.)
          const firstSem = user.semesters[0];
          const semNum = parseInt(firstSem?.replace('S', '') || '0');
          year = Math.ceil(semNum / 2);
        }
        
        return {
          ...user,
          photoURL: user.photoURL || '',
          normalPoints: user.normalPoints || user.points || 0,
          bluePoints: user.bluePoints || 0,
          greenPoints: user.greenPoints || 0,
          totalPoints: user.totalPoints || ((user.normalPoints || user.points || 0) + (user.bluePoints || 0) + (user.greenPoints || 0)),
          currentYear: year,
          rank: user.rank || (index + 1) // Use provided rank or calculate from index
        };
      });
      
      console.log('Leaderboard API Response:', response.data);
      console.log('First user data:', transformedData[0]); 
      console.log('First user photoURL:', transformedData[0]?.photoURL);
      setLeaderboardData(transformedData);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger le classement.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      toast.loading('Génération du rapport...', { id: 'export' });

      // Create CSV content with new columns
      const csvData = [
        ['Rang', 'Utilisateur', 'Année', 'Points Normaux', 'Points Bleus', 'Points Verts', 'Niveau'],
        ...filteredData.map(user => {
          const levelInfo = calculateLevel(user.totalPoints);
          return [
            user.rank,
            user.name || user.username,
            user.currentYear || '-',
            user.normalPoints,
            user.bluePoints,
            user.greenPoints,
            `${levelInfo.level} - ${levelInfo.name}`
          ];
        })
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
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
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStudentYear("all");
    setPointType("normal");
  };

  const activeFilterCount = (searchTerm ? 1 : 0) + (studentYear !== "all" ? 1 : 0) + (pointType !== "normal" ? 1 : 0);

  // Filter + sort logic
  const filteredData = leaderboardData
    .filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear =
        studentYear === "all" || String(user.currentYear) === studentYear;
      return matchesSearch && matchesYear;
    })
    .sort((a, b) => {
      if (pointType === "report") return (b.greenPoints || 0) - (a.greenPoints || 0);
      if (pointType === "explication") return (b.bluePoints || 0) - (a.bluePoints || 0);
      return (b.normalPoints || 0) - (a.normalPoints || 0); // default: normal
    });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('dashboard:leaderboard')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard:view_top_students')}
            </p>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
            disabled={exporting || loading}
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Export...' : 'Exporter CSV'}
          </Button>
        </div>

        {/* Note Banner - Top 20 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <div className="text-blue-600 mt-1">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Note importante</p>
            <p className="text-sm text-blue-800 mt-1">
              Le classement affiche tous les étudiants de toutes les années confondues.
            </p>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="shadow-sm bg-card rounded-lg p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('dashboard:total_users')}</p>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="shadow-sm bg-card rounded-lg p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('dashboard:top_points')}</p>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.topPoints}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Award className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="shadow-sm bg-card rounded-lg p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('dashboard:avg_points')}</p>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.avgPoints}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="bg-card rounded-lg shadow-sm p-6 space-y-4">
          {/* Point Type Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Type de points:</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={pointType === "normal" ? "default" : "outline"}
                onClick={() => setPointType("normal")}
                className={`flex items-center gap-2 ${
                  pointType === "normal" ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-blue-50"
                }`}
              >
                <Star className="w-4 h-4" />
                Points Normaux
              </Button>
              <Button
                variant={pointType === "report" ? "default" : "outline"}
                onClick={() => setPointType("report")}
                className={`flex items-center gap-2 ${
                  pointType === "report" ? "bg-green-600 hover:bg-green-700" : "hover:bg-green-50"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Points Report
              </Button>
              <Button
                variant={pointType === "explication" ? "default" : "outline"}
                onClick={() => setPointType("explication")}
                className={`flex items-center gap-2 ${
                  pointType === "explication" ? "bg-yellow-600 hover:bg-yellow-700" : "hover:bg-yellow-50"
                }`}
              >
                <Zap className="w-4 h-4" />
                Points Explication
              </Button>
            </div>
          </div>

          <TableFilters
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Rechercher par nom ou username..."
            showDateFilter={false}
            additionalFilters={[
              {
                key: "studentYear",
                label: "Année d'étude",
                value: studentYear,
                onChange: setStudentYear,
                options: studentYears,
              }
            ]}
            onClearFilters={handleClearFilters}
            activeFilterCount={activeFilterCount}
          />
        </div>

        {/* Leaderboard Table Section */}
        <Card>
          <CardContent className="p-0 sm:p-0">
            {/* Table Header - Desktop only */}
            <div className="hidden lg:grid lg:grid-cols-7 items-center gap-4 px-4 border-b text-sm font-medium text-muted-foreground h-[52px]">
              <div className="col-span-2">Étudiant</div>
              <div className="text-center">
                <span className="flex items-center justify-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  Année
                </span>
              </div>
              <div className="text-center">{
                pointType === 'report' ? (
                  <span className="flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Verts</span>
                ) : pointType === 'explication' ? (
                  <span className="flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Bleus</span>
                ) : 'Points'
              }</div>
              <div className="text-center">
                <span className="flex items-center justify-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Bleus
                </span>
              </div>
              <div className="text-center">
                <span className="flex items-center justify-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Verts
                </span>
              </div>
              <div className="text-center">Niveau</div>
            </div>

            <div className="space-y-2 lg:space-y-0 lg:divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="hidden lg:grid lg:grid-cols-7 items-center gap-4 h-[52px] px-4">
                    <div className="col-span-2 flex items-center gap-4">
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                    <div className="flex justify-center"><div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div></div>
                    <div className="flex justify-center"><div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div></div>
                    <div className="flex justify-center"><div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div></div>
                    <div className="flex justify-center"><div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div></div>
                    <div className="flex justify-center"><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></div>
                  </div>
                ))
              ) : paginatedData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('dashboard:no_data_found')}
                </div>
              ) : (
                paginatedData.map((user) => {
                  const levelInfo = calculateLevel(user.totalPoints);
                  const rank = user.rank;
                  
                  const getScoreBadgeClasses = (score) => {
                    if (score >= 1000) return "bg-emerald-100 text-emerald-700 border-emerald-200";
                    if (score >= 500) return "bg-lime-100 text-lime-700 border-lime-200";
                    if (score >= 200) return "bg-yellow-100 text-yellow-800 border-yellow-200";
                    if (score >= 50) return "bg-orange-100 text-orange-700 border-orange-200";
                    return "bg-rose-100 text-rose-700 border-rose-200";
                  };
                  const activePoints =
                    pointType === 'report' ? user.greenPoints
                    : pointType === 'explication' ? user.bluePoints
                    : user.normalPoints;
                  const badge = getScoreBadgeClasses(activePoints);

                  return (
                    <div
                      key={user._id || user.rank}
                      className={`p-3 lg:p-0 rounded-lg lg:rounded-none bg-card lg:bg-transparent border lg:border-0 ${
                        rank === 1 ? "lg:bg-yellow-50/50" : rank === 2 ? "lg:bg-background/50" : rank === 3 ? "lg:bg-orange-50/50" : ""
                      }`}
                    >
                      {/* Mobile Layout */}
                      <div className="flex lg:hidden items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs bg-accent font-semibold flex-shrink-0 ${
                              rank === 1
                                ? "text-amber-700 border-amber-300 bg-amber-50"
                                : rank === 2
                                ? "text-foreground border-slate-300 bg-background"
                                : rank === 3
                                ? "text-amber-800 border-amber-200 bg-orange-50"
                                : "text-foreground/70 border-muted"
                            }`}
                          >
                            #{rank}
                          </span>
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarImage 
                              src={user.photoURL?.startsWith('http') 
                                ? user.photoURL 
                                : user.photoURL 
                                  ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${user.photoURL}` 
                                  : undefined
                              } 
                              alt={user.name || user.username} 
                            />
                            <AvatarFallback delayMs={0} className={`text-sm font-semibold ${
                              rank === 1
                                ? "bg-amber-100 text-amber-800"
                                : rank === 2
                                ? "bg-muted text-foreground"
                                : rank === 3
                                ? "bg-orange-100 text-orange-800"
                                : "bg-muted text-foreground/80"
                            }`}>
                              {(user.name || user.username)?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {user.name || user.username}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${badge}`}>
                                {activePoints} pts
                              </span>
                              <Badge className={`${levelInfo.color} text-white text-[10px] px-1.5 py-0`}>
                                Nv.{levelInfo.level}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden lg:grid lg:grid-cols-7 items-center gap-4 h-[52px] px-4">
                        {/* Rank and User Info */}
                        <div className="flex items-center gap-5 min-w-0 col-span-2">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm bg-accent font-semibold flex-shrink-0 ${
                              rank === 1
                                ? "text-amber-700 border-amber-300"
                                : rank === 2
                                ? "text-foreground border-slate-300"
                                : rank === 3
                                ? "text-amber-800 border-amber-200"
                                : "text-foreground/70 border-muted"
                            }`}
                          >
                            #{rank}
                          </span>
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarImage 
                              src={user.photoURL?.startsWith('http') 
                                ? user.photoURL 
                                : user.photoURL 
                                  ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${user.photoURL}` 
                                  : undefined
                              } 
                              alt={user.name || user.username} 
                            />
                            <AvatarFallback delayMs={0} className={`text-sm font-semibold ${
                              rank === 1
                                ? "bg-amber-100 text-amber-800"
                                : rank === 2
                                ? "bg-muted text-foreground"
                                : rank === 3
                                ? "bg-orange-100 text-orange-800"
                                : "bg-muted text-foreground/80"
                            }`}>
                              {(user.name || user.username)?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex flex-col">
                            <p className="font-medium truncate">
                              {user.name || user.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          </div>
                        </div>

                        {/* Year */}
                        <div className="flex justify-center">
                          <span className="text-sm text-foreground">
                            {user.currentYear ? `${user.currentYear}ème` : '-'}
                          </span>
                        </div>

                        {/* Points */}
                        <div className="flex justify-center">
                          <span className={`text-xs px-2 py-1 rounded-md border ${badge}`}>
                            {activePoints} pts
                          </span>
                        </div>

                        {/* Blue Points */}
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm font-semibold text-blue-600">{user.bluePoints}</span>
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        </div>

                        {/* Green Points */}
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm font-semibold text-green-600">{user.greenPoints}</span>
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>

                        {/* Level */}
                        <div className="flex justify-center">
                          <Badge className={`${levelInfo.color} text-white text-xs`}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {levelInfo.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Affichage {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} sur {filteredData.length} résultats
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ‹ Précédent
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, current and neighbors
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .reduce((acc, page, i, arr) => {
                      // Insert ellipsis between gaps
                      if (i > 0 && page - arr[i - 1] > 1) {
                        acc.push('...');
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(item)}
                          className="w-8 h-8 p-0"
                        >
                          {item}
                        </Button>
                      )
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant ›
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;
