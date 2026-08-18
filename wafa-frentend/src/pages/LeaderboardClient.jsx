import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Crown, 
  Medal, 
  Trophy, 
  Loader, 
  Zap, 
  Star, 
  TrendingUp, 
  Award, 
  Settings, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  HelpCircle, 
  Target,
  ArrowUpRight,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userService } from "@/services/userService";
import { toast } from "sonner";

function getInitials(fullName) {
  if (!fullName) return "?";
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getScoreBadgeClasses(score, maxScore) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.85) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (ratio >= 0.65) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
  if (ratio >= 0.45) return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
  if (ratio >= 0.25) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
}

function getPodiumStyles(rank) {
  if (rank === 1) {
    return {
      card: "bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-card border-amber-500/40 dark:border-amber-500/30 shadow-md shadow-amber-500/5",
      badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40",
      accent: "text-amber-600 dark:text-amber-400",
      avatarRing: "ring-2 ring-amber-400/80 dark:ring-amber-400/60 shadow-lg shadow-amber-500/20",
      rankBadge: "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30",
      icon: <Crown className="h-5 w-5 text-amber-500 fill-amber-500/30" />,
      label: "Champion"
    };
  }
  if (rank === 2) {
    return {
      card: "bg-gradient-to-b from-slate-400/15 via-slate-400/5 to-card border-slate-300 dark:border-slate-700/80 shadow-md",
      badge: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/40",
      accent: "text-slate-600 dark:text-slate-300",
      avatarRing: "ring-2 ring-slate-400/80 dark:ring-slate-400/60 shadow-md",
      rankBadge: "bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-md",
      icon: <Medal className="h-5 w-5 text-slate-400 fill-slate-400/30" />,
      label: "2ème Place"
    };
  }
  return {
    card: "bg-gradient-to-b from-orange-500/15 via-orange-500/5 to-card border-orange-500/40 dark:border-orange-500/30 shadow-md shadow-orange-500/5",
    badge: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40",
    accent: "text-orange-600 dark:text-orange-400",
    avatarRing: "ring-2 ring-orange-400/80 dark:ring-orange-400/60 shadow-lg shadow-orange-500/20",
    rankBadge: "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/30",
    icon: <Trophy className="h-5 w-5 text-orange-500 fill-orange-500/30" />,
    label: "3ème Place"
  };
}

// Calculate user level: 1 level = 50 points
function getUserLevel(points) {
  const level = Math.floor((points || 0) / 50);
  if (level >= 200) return { level, name: "Maître Suprême", badgeClass: "bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30" };
  if (level >= 150) return { level, name: "Maître", badgeClass: "bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30" };
  if (level >= 100) return { level, name: "Expert", badgeClass: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30" };
  if (level >= 75) return { level, name: "Avancé", badgeClass: "bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30" };
  if (level >= 50) return { level, name: "Confirmé", badgeClass: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/30" };
  if (level >= 30) return { level, name: "Intermédiaire", badgeClass: "bg-teal-500/20 text-teal-600 dark:text-teal-300 border-teal-500/30" };
  if (level >= 20) return { level, name: "Apprenti", badgeClass: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" };
  if (level >= 10) return { level, name: "Novice", badgeClass: "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/30" };
  if (level >= 5) return { level, name: "Débutant", badgeClass: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-500/30" };
  return { level, name: "Nouveau", badgeClass: "bg-muted text-muted-foreground border-border" };
}

const SORT_OPTIONS = [
  { id: "totalPoints", label: "Points Totaux", icon: Flame },
  { id: "bluePoints", label: "Points Bleus", icon: Zap },
  { id: "greenPoints", label: "Points Verts", icon: Star },
  { id: "percentage", label: "Taux de Réponse", icon: Target },
];

const LeaderboardClient = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userContext, setUserContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("totalPoints");
  const [totalQuestionsInSystem, setTotalQuestionsInSystem] = useState(0);
  const [academicYear, setAcademicYear] = useState(null);
  const [requiresAcademicYear, setRequiresAcademicYear] = useState(false);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await userService.getUserProfile();
        setUser(userData);
        
        // Check if user has premium access - redirect free users
        const userPlan = userData?.plan || 'Free';
        if (userPlan === 'Free') {
          toast.error('Cette fonctionnalité est réservée aux abonnés Premium', {
            description: 'Mettez à niveau votre plan pour accéder au classement.',
            action: {
              label: 'Voir les plans',
              onClick: () => navigate('/dashboard/subscription')
            },
            duration: 5000,
          });
          navigate('/dashboard/subscription');
          return;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (user) fetchLeaderboard();
  }, [sortBy, user]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await userService.getLeaderboard(100, sortBy);
      const data = response.data || {};
      setLeaderboardData(data.leaderboard || []);
      setUserContext({ userRank: data.userRank });
      setTotalQuestionsInSystem(data.totalQuestionsInSystem || 0);
      setAcademicYear(data.academicYear || user?.currentYear || null);
      setRequiresAcademicYear(Boolean(data.requiresAcademicYear || !data.academicYear));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      if (error?.response?.data?.code === 'ACADEMIC_YEAR_REQUIRED') {
        setRequiresAcademicYear(true);
        setLeaderboardData([]);
      } else {
        toast.error('Erreur', {
          description: 'Impossible de charger le classement.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !leaderboardData.length) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  const sorted = leaderboardData;
  const topThree = sorted.slice(0, 3);
  
  // Get top 20 users (3 in podium + 17 in list)
  const top20 = sorted.slice(0, 20);
  const remainingUsers = sorted.slice(3, 20);
  
  // Check if current user is in top 20
  const currentUserInTop20 = user && top20.some(u => 
    (u.odUserIdStr === user._id || u.email === user.email)
  );
  
  // If current user is not in top 20, find them in the full list
  let currentUserData = null;
  if (user && !currentUserInTop20) {
    currentUserData = sorted.find(u => 
      (u.odUserIdStr === user._id || u.email === user.email)
    );
  }
  
  const maxScore = sorted[0]?.totalPoints || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 min-h-screen bg-background text-foreground space-y-6 max-w-7xl mx-auto">
      
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('dashboard:leaderboard')}
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5">
              Promotion
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Classement et progression des étudiants de votre promotion
          </p>
        </div>

        {/* Sort Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/80 overflow-x-auto">
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info / Missing Academic Year Prompt Banner */}
      {requiresAcademicYear || !academicYear ? (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Année académique non renseignée
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                Veuillez configurer votre année d'études ou vos semestres dans vos paramètres pour afficher le classement exclusif à votre promotion.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/dashboard/settings")}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs gap-1.5 shadow-sm rounded-xl font-medium"
          >
            <Settings className="h-3.5 w-3.5" />
            Définir mon année
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Promotion : <span className="font-semibold text-primary">{academicYear}ème année</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vous concourez avec les étudiants inscrits dans la même promotion.
              </p>
            </div>
          </div>
          {userContext?.userRank && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border">
              <span className="text-xs text-muted-foreground">Votre rang :</span>
              <span className="text-sm font-bold text-primary">#{userContext.userRank}</span>
            </div>
          )}
        </div>
      )}

      {/* Podium Top 3 */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {topThree.map((userItem, index) => {
            const rank = index + 1;
            const styles = getPodiumStyles(rank);
            const badge = getScoreBadgeClasses(userItem.totalPoints, maxScore);
            const levelInfo = getUserLevel(userItem.totalPoints);
            const isMe = user && (userItem.odUserIdStr === user._id || userItem.email === user.email);

            return (
              <Card 
                key={userItem._id || userItem.odUserId} 
                className={`relative overflow-hidden rounded-2xl transition-all hover:scale-[1.01] ${styles.card}`}
              >
                <CardHeader className="flex-row items-center justify-between pb-2 pt-4 px-5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${styles.rankBadge}`}>
                      #{rank}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${styles.accent}`}>
                      {styles.icon}
                      {styles.label}
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${badge}`}>
                    {userItem.totalPoints} pts
                  </span>
                </CardHeader>

                <CardContent className="px-5 pb-5 pt-2">
                  <div className="flex items-center gap-4">
                    <Avatar className={`h-14 w-14 ${styles.avatarRing}`}>
                      <AvatarImage 
                        src={userItem.profilePicture?.startsWith('http') 
                          ? userItem.profilePicture 
                          : userItem.profilePicture 
                            ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${userItem.profilePicture}` 
                            : undefined
                        } 
                        alt={userItem.name} 
                      />
                      <AvatarFallback delayMs={0} className="text-base font-bold bg-primary/20 text-primary">
                        {getInitials(userItem.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`font-bold text-sm truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                          {userItem.name}
                        </p>
                        {isMe && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-semibold">
                            VOUS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                          <Zap className="h-3 w-3" /> {userItem.bluePoints}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Star className="h-3 w-3" /> {userItem.greenPoints}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${levelInfo.badgeClass}`}>
                          Nv.{levelInfo.level}
                        </Badge>
                      </div>

                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500"
                          style={{
                            width: `${Math.max(5, Math.round((userItem.totalPoints / maxScore) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Classement Général</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Top 20 des étudiants les plus actifs</p>
          </div>
          <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
            {sorted.length} Étudiants classés
          </Badge>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-base font-semibold text-foreground">Aucun classement disponible</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Répondez à des questions et participez aux examens pour être le premier à figurer au tableau d'honneur !
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider text-left border-b border-border">
                  <th className="py-3.5 px-5 w-16">Rang</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Étudiant</th>
                  <th className="py-3.5 px-4 text-center">Score Total</th>
                  <th className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="h-3 w-3 text-blue-500" />
                      Bleus
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 text-emerald-500" />
                      Verts
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Niveau</th>
                  <th className="py-3.5 px-4 text-center">Réussite</th>
                  <th className="py-3.5 px-5 min-w-[130px]">Progression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {remainingUsers.map((userData, idx) => {
                  const rank = userData.rank;
                  if (!rank) return null;
                  
                  const badge = getScoreBadgeClasses(userData.totalPoints, maxScore);
                  const levelInfo = getUserLevel(userData.totalPoints);
                  const isCurrentUser = user && (userData.odUserIdStr === user._id || userData.email === user.email);
                  
                  return (
                    <tr
                      key={userData._id || userData.odUserId || idx}
                      className={`transition-colors align-middle ${
                        isCurrentUser 
                          ? "bg-primary/10 dark:bg-primary/15 hover:bg-primary/15" 
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="py-3.5 px-5 font-bold">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs ${
                          isCurrentUser 
                            ? "bg-primary text-primary-foreground font-bold" 
                            : "text-muted-foreground bg-muted/60"
                        }`}>
                          #{rank}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 ring-1 ring-border shrink-0">
                            <AvatarImage 
                              src={userData.profilePicture?.startsWith('http') 
                                ? userData.profilePicture 
                                : userData.profilePicture 
                                  ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${userData.profilePicture}` 
                                  : undefined
                              } 
                              alt={userData.name} 
                            />
                            <AvatarFallback delayMs={0} className="bg-muted text-foreground text-xs font-semibold">
                              {getInitials(userData.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-semibold text-sm truncate ${isCurrentUser ? "text-primary font-bold" : "text-foreground"}`}>
                                {userData.name}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-semibold">
                                  VOUS
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {userData.currentYear || "Médecine"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${badge}`}>
                          {userData.totalPoints} pts
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs">
                          {userData.bluePoints}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                          {userData.greenPoints}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${levelInfo.badgeClass}`}>
                          <TrendingUp className="h-2.5 w-2.5 mr-1" />
                          {levelInfo.level}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-foreground text-xs">
                          {userData.percentageAnswered || 0}%
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500"
                            style={{
                              width: `${Math.max(5, Math.min(userData.percentageAnswered || 0, 100))}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Show Current User Separator & Row if outside top 20 */}
                {currentUserData && (
                  <>
                    <tr>
                      <td colSpan={8} className="py-2.5 px-5 bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border/80" />
                          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                            Votre Position Actuelle
                          </span>
                          <div className="h-px flex-1 bg-border/80" />
                        </div>
                      </td>
                    </tr>

                    <tr className="bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 transition-colors align-middle">
                      <td className="py-3.5 px-5 font-bold">
                        <span className="w-7 h-7 flex items-center justify-center rounded-lg text-xs bg-primary text-primary-foreground font-bold">
                          #{currentUserData.rank}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 ring-2 ring-primary/40 shrink-0">
                            <AvatarImage 
                              src={currentUserData.profilePicture?.startsWith('http') 
                                ? currentUserData.profilePicture 
                                : currentUserData.profilePicture 
                                  ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${currentUserData.profilePicture}` 
                                  : undefined
                              } 
                              alt={currentUserData.name} 
                            />
                            <AvatarFallback delayMs={0} className="bg-primary text-primary-foreground text-xs font-semibold">
                              {getInitials(currentUserData.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-primary truncate">
                                {currentUserData.name}
                              </span>
                              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded font-semibold">
                                VOUS
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {currentUserData.currentYear || "Médecine"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getScoreBadgeClasses(currentUserData.totalPoints, maxScore)}`}>
                          {currentUserData.totalPoints} pts
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">{currentUserData.bluePoints}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{currentUserData.greenPoints}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${getUserLevel(currentUserData.totalPoints).badgeClass}`}>
                          <TrendingUp className="h-2.5 w-2.5 mr-1" />
                          {getUserLevel(currentUserData.totalPoints).level}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-foreground text-xs">
                          {currentUserData.percentageAnswered || 0}%
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500"
                            style={{
                              width: `${Math.max(5, Math.min(currentUserData.percentageAnswered || 0, 100))}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Points System Explanation Card */}
      <Card className="border border-border bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-border/50">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Comment fonctionne le système de points ?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Réponse Correcte</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+1 point standard</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Pour chaque QCM réussi</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Explication Validée</p>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">+1 Point Bleu (= 40 pts)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Par explication approuvée</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Star className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Signalement Validé</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+1 Point Vert (= 30 pts)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Par correction d'erreur</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Niveau & Titre</p>
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">1 Niveau = 50 pts</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Débloquez des badges exclusifs</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default LeaderboardClient;
