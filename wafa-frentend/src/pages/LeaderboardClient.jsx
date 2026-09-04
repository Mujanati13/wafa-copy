import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { 
  Crown, 
  Medal, 
  Trophy, 
  Loader2, 
  Zap, 
  Star, 
  TrendingUp, 
  Award, 
  Settings, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  Target,
  ArrowUpRight,
  ShieldAlert,
  GraduationCap,
  MessageSquareWarning,
  Lightbulb
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userService } from "@/services/userService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

function ScoreBadge({ points = 0, maxScore }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 min-w-[76px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold leading-none tabular-nums",
        getScoreBadgeClasses(points, maxScore),
      )}
    >
      <span>{points}</span>
      <span className="ml-1">pts</span>
    </span>
  );
}

function getPodiumStyles(rank) {
  if (rank === 1) {
    return {
      card: "bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-card border-amber-500/50 dark:border-amber-500/40 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30 order-1 md:order-2 md:-translate-y-3",
      badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40",
      accent: "text-amber-600 dark:text-amber-400",
      avatarRing: "ring-4 ring-amber-400/90 dark:ring-amber-400/70 shadow-xl shadow-amber-500/30",
      rankBadge: "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/40",
      icon: <Crown className="h-6 w-6 text-amber-500 fill-amber-500" />,
      label: "Champion de promotion",
    };
  }
  if (rank === 2) {
    return {
      card: "bg-gradient-to-b from-slate-400/20 via-slate-400/5 to-card border-slate-300 dark:border-slate-700 shadow-lg order-2 md:order-1",
      badge: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/40",
      accent: "text-slate-600 dark:text-slate-300",
      avatarRing: "ring-3 ring-slate-400/90 dark:ring-slate-400/70 shadow-lg",
      rankBadge: "bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-md",
      icon: <Medal className="h-5 w-5 text-slate-400 fill-slate-400/30" />,
      label: "2ème Place",
    };
  }
  return {
    card: "bg-gradient-to-b from-orange-500/20 via-orange-500/5 to-card border-orange-500/40 dark:border-orange-500/30 shadow-lg order-3 md:order-3",
    badge: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40",
    accent: "text-orange-600 dark:text-orange-400",
    avatarRing: "ring-3 ring-orange-400/90 dark:ring-orange-400/70 shadow-lg shadow-orange-500/20",
    rankBadge: "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/30",
    icon: <Trophy className="h-5 w-5 text-orange-500 fill-orange-500/30" />,
    label: "3ème Place",
  };
}

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

const POINT_RULES = [
  {
    points: 1,
    label: "Répondre correctement",
    description: "Pour chaque question à laquelle vous répondez correctement.",
    icon: CheckCircle2,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    points: 40,
    label: "Soumettre une explication",
    description: "Pour une explication de question approuvée.",
    icon: Lightbulb,
    iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    points: 30,
    label: "Signaler un problème",
    description: "Pour un problème ou une erreur signalé et approuvé.",
    icon: MessageSquareWarning,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
];

const LeaderboardClient = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("totalPoints");
  const [academicYear, setAcademicYear] = useState(null);
  const [requiresAcademicYear, setRequiresAcademicYear] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userService.getLeaderboard(100, sortBy);
      if (res?.success) {
        const payload = res.data;
        const list = Array.isArray(payload?.leaderboard)
          ? payload.leaderboard
          : Array.isArray(payload)
            ? payload
            : [];
        setLeaderboardData(list);
        setUserRank(payload?.userRank || null);
        setAcademicYear(payload?.academicYear || null);
        setRequiresAcademicYear(payload?.requiresAcademicYear || false);
      } else {
        setLeaderboardData([]);
      }
    } catch (error) {
      if (error?.response?.data?.code === 'ACADEMIC_YEAR_REQUIRED') {
        setRequiresAcademicYear(true);
        setLeaderboardData([]);
      } else {
        console.error("Error fetching leaderboard:", error);
        toast.error("Erreur de chargement du classement");
        setLeaderboardData([]);
      }
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await userService.getUserProfile();
        setUser(userData);

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
  }, [fetchLeaderboard, user]);

  const sorted = Array.isArray(leaderboardData) ? [...leaderboardData] : [];
  const topThreeRaw = sorted.slice(0, 3);
  const remainingUsers = sorted.slice(3);
  const maxScore = sorted.length > 0 ? Math.max(...sorted.map((u) => u.totalPoints || 0), 1) : 1;

  // Ensure rank is attached to podium items
  const topThree = topThreeRaw.map((u, idx) => ({
    ...u,
    rank: u.rank || (idx + 1)
  }));

  // Podium reordering for desktop visual hierarchy: [2nd, 1st, 3rd]
  const podiumDisplay = topThree.length === 3 
    ? [topThree[1], topThree[0], topThree[2]]
    : topThree;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Calcul du classement de promotion...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Top Hero Banner */}
        <Motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-amber-500/15 via-card to-card p-6 sm:p-8 shadow-sm"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-semibold">
                <Crown className="h-3.5 w-3.5" />
                <span>Tableau d'honneur et compétition</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Classement Général
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Comparez vos performances avec les étudiants de votre promotion et montez au sommet du podium.
              </p>

              {academicYear && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background/80 border border-border text-xs font-semibold backdrop-blur-sm">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>Promotion : {academicYear}ème Année</span>
                  </div>
                  {userRank && (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary backdrop-blur-sm">
                      <Award className="h-4 w-4" />
                      <span>Votre Rang : #{userRank}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Criteria Sorter */}
            <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block md:mb-1">
                Trier par :
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = sortBy === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSortBy(option.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left",
                        active
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold"
                          : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Motion.div>

        {/* Academic Year Warning If Missing */}
        {requiresAcademicYear ? (
          <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Année d'études non configurée
                </p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed max-w-xl">
                  Pour afficher le classement pertinent de votre promotion, veuillez spécifier votre année académique ou vos semestres dans vos paramètres.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/dashboard/settings")}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs gap-1.5 shrink-0 h-10 px-4"
            >
              <Settings className="h-4 w-4" />
              <span>Configurer mon profil</span>
            </Button>
          </div>
        ) : (
          <>
            {/* Top 3 Podium Cards */}
            {topThree.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Le Podium des Champions
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                  {podiumDisplay.map((userItem) => {
                    const rank = userItem.rank;
                    const styles = getPodiumStyles(rank);
                    const levelInfo = getUserLevel(userItem.totalPoints);
                    const isMe = user && (userItem.odUserIdStr === user._id || userItem.email === user.email);

                    return (
                      <Motion.div
                        key={userItem._id || userItem.odUserId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: (rank === 1 ? 0.1 : rank === 2 ? 0.2 : 0.3) }}
                        className={styles.card}
                      >
                        <Card className="bg-transparent border-0 shadow-none rounded-3xl p-5 flex flex-col justify-between">
                          {/* Header of podium card */}
                          <div className="flex items-center justify-between pb-3">
                            <div className="flex items-center gap-2">
                              <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold", styles.rankBadge)}>
                                #{rank}
                              </span>
                              <span className={cn("inline-flex items-center gap-1 text-xs font-bold", styles.accent)}>
                                {styles.icon}
                                <span>{styles.label}</span>
                              </span>
                            </div>
                            <ScoreBadge points={userItem.totalPoints} maxScore={maxScore} />
                          </div>

                          {/* Profile Body */}
                          <div className="flex items-center gap-4 py-2">
                            <Avatar className={cn("h-16 w-16 shrink-0", styles.avatarRing)}>
                              <AvatarImage 
                                src={userItem.profilePicture?.startsWith('http') 
                                  ? userItem.profilePicture 
                                  : userItem.profilePicture 
                                    ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${userItem.profilePicture}` 
                                    : undefined
                                } 
                                alt={userItem.name} 
                              />
                              <AvatarFallback delayMs={0} className="text-lg font-bold bg-primary/20 text-primary">
                                {getInitials(userItem.name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <p className={cn("font-bold text-base truncate", isMe ? "text-primary" : "text-foreground")}>
                                  {userItem.name}
                                </p>
                                {isMe && (
                                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0">
                                    VOUS
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                                  <Zap className="h-3 w-3" /> {userItem.bluePoints}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <Star className="h-3 w-3" /> {userItem.greenPoints}
                                </span>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", levelInfo.badgeClass)}>
                                  Nv.{levelInfo.level}
                                </Badge>
                              </div>

                              {/* Progress bar */}
                              <div className="pt-1.5">
                                <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500"
                                    style={{
                                      width: `${Math.max(8, Math.round((userItem.totalPoints / maxScore) * 100))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Tableau Général de Promotion</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Top 100 des étudiants les plus assidus</p>
                </div>
                <Badge variant="outline" className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-xl">
                  {sorted.length} étudiants
                </Badge>
              </div>

              {sorted.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-base font-semibold text-foreground">Aucun classement disponible</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Répondez à des questions et participez aux examens pour figurer au tableau d'honneur !
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground text-[11px] font-bold uppercase tracking-wider text-left border-b border-border">
                        <th className="py-4 px-6 w-20">Rang</th>
                        <th className="py-4 px-4 min-w-[220px]">Étudiant</th>
                        <th className="min-w-[112px] px-4 py-4 text-center">Score Total</th>
                        <th className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="h-3 w-3 text-blue-500" />
                            Bleus
                          </div>
                        </th>
                        <th className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-emerald-500" />
                            Verts
                          </div>
                        </th>
                        <th className="py-4 px-4 text-center">Niveau</th>
                        <th className="py-4 px-6 min-w-[140px]">Progression</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(remainingUsers.length > 0 ? remainingUsers : sorted).map((userData, idx) => {
                        const rank = userData.rank || (remainingUsers.length > 0 ? idx + 4 : idx + 1);
                        const levelInfo = getUserLevel(userData.totalPoints);
                        const isCurrentUser = user && (userData.odUserIdStr === user._id || userData.email === user.email);
                        
                        return (
                          <tr
                            key={userData._id || userData.odUserId || idx}
                            className={cn(
                              "transition-colors align-middle",
                              isCurrentUser 
                                ? "bg-primary/10 dark:bg-primary/15 hover:bg-primary/20 font-semibold" 
                                : "hover:bg-muted/40"
                            )}
                          >
                            <td className="py-3.5 px-6 font-bold">
                              <span className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold",
                                isCurrentUser 
                                  ? "bg-primary text-primary-foreground shadow-sm" 
                                  : "text-muted-foreground bg-muted/70"
                              )}>
                                #{rank}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-10 w-10 ring-1 ring-border shrink-0">
                                  <AvatarImage 
                                    src={userData.profilePicture?.startsWith('http') 
                                      ? userData.profilePicture 
                                      : userData.profilePicture 
                                        ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${userData.profilePicture}` 
                                        : undefined
                                    } 
                                    alt={userData.name} 
                                  />
                                  <AvatarFallback delayMs={0} className="bg-muted text-foreground text-xs font-bold">
                                    {getInitials(userData.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn("font-bold text-sm truncate", isCurrentUser ? "text-primary" : "text-foreground")}>
                                      {userData.name}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-md font-bold">
                                        VOUS
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {userData.currentYear ? `${userData.currentYear}ème année` : "Médecine"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <ScoreBadge points={userData.totalPoints} maxScore={maxScore} />
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                                {userData.bluePoints}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                {userData.greenPoints}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 font-medium rounded-lg", levelInfo.badgeClass)}>
                                Nv.{levelInfo.level}
                              </Badge>
                            </td>

                            <td className="py-3.5 px-6">
                              <div className="w-full">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                  <span>{Math.round((userData.totalPoints / maxScore) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500"
                                    style={{
                                      width: `${Math.max(4, Math.round((userData.totalPoints / maxScore) * 100))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <section
          aria-labelledby="points-system-title"
          className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7"
        >
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Award className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="points-system-title" className="text-lg font-bold text-foreground sm:text-xl">
                Système de points
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Gagnez des points en participant activement à la communauté YourQCM.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {POINT_RULES.map((rule) => {
              const Icon = rule.icon;
              return (
                <article
                  key={rule.points}
                  className="flex min-w-0 items-start gap-3 rounded-2xl border border-border/80 bg-muted/25 p-4"
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", rule.iconClass)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">
                      <span className="text-primary">+{rule.points} point{rule.points > 1 ? "s" : ""}</span>
                      <span className="mx-1.5 text-muted-foreground" aria-hidden="true">·</span>
                      {rule.label}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{rule.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};

export default LeaderboardClient;
