import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Medal, Trophy, Loader, Zap, Star, TrendingUp, Award, Settings } from "lucide-react";
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
  if (ratio >= 0.9) return "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (ratio >= 0.75) return "bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800";
  if (ratio >= 0.6) return "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
  if (ratio >= 0.45) return "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
  return "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
}

function getPodiumStyles(rank) {
  if (rank === 1) {
    return {
      wrapper: "bg-gradient-to-b from-yellow-50 to-amber-100 dark:from-yellow-950/30 dark:to-amber-950/40 border-amber-200 dark:border-amber-800/40",
      accent: "text-amber-600 dark:text-amber-400",
      ring: "ring-amber-300 dark:ring-amber-600/50",
      icon: <Crown className="h-5 w-5" />,
    };
  }
  if (rank === 2) {
    return {
      wrapper: "bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/40 border-border",
      accent: "text-muted-foreground",
      ring: "ring-slate-300 dark:ring-slate-700",
      icon: <Medal className="h-5 w-5" />,
    };
  }
  return {
    wrapper: "bg-gradient-to-b from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/40 border-amber-200 dark:border-amber-800/40",
    accent: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-700/50",
    icon: <Trophy className="h-5 w-5" />,
  };
}

// Calculate user level: 1 level = 50 points
function getUserLevel(points) {
  const level = Math.floor((points || 0) / 50);
  if (level >= 200) return { level, name: "Maître Suprême", color: "bg-purple-600" };
  if (level >= 150) return { level, name: "Maître", color: "bg-purple-500" };
  if (level >= 100) return { level, name: "Expert", color: "bg-indigo-500" };
  if (level >= 75) return { level, name: "Avancé", color: "bg-blue-500" };
  if (level >= 50) return { level, name: "Confirmé", color: "bg-cyan-500" };
  if (level >= 30) return { level, name: "Intermédiaire", color: "bg-teal-500" };
  if (level >= 20) return { level, name: "Apprenti", color: "bg-green-500" };
  if (level >= 10) return { level, name: "Novice", color: "bg-lime-500" };
  if (level >= 5) return { level, name: "Débutant", color: "bg-yellow-500" };
  return { level, name: "Nouveau", color: "bg-slate-400" };
}

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

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8 animate-spin text-primary" />
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
    <div className="p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 min-h-screen bg-background text-foreground space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t('dashboard:leaderboard')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard:top_10_students_by_points')}
        </p>
      </div>

      {/* Info / Year Prompt Banner */}
      {requiresAcademicYear || !academicYear ? (
        <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Award className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Année académique non renseignée
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Veuillez renseigner votre année d'études ou vos semestres dans vos paramètres pour voir le classement spécifique à votre promotion.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/dashboard/settings")}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs gap-1.5 shadow-sm"
          >
            <Settings className="h-3.5 w-3.5" />
            Définir mon année
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 rounded-xl flex items-start gap-3 shadow-sm">
          <Award className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Classement de votre promotion{academicYear ? ` (${academicYear}ème année)` : ''}. Vous visualisez les étudiants de votre promotion.
            </p>
          </div>
        </div>
      )}

      {/* Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {topThree.map((userItem, index) => {
            const rank = index + 1;
            const styles = getPodiumStyles(rank);
            const badge = getScoreBadgeClasses(userItem.totalPoints, maxScore);
            const levelInfo = getUserLevel(userItem.totalPoints);

            return (
              <Card key={userItem._id || userItem.odUserId} className={`border ${styles.wrapper}`}>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${styles.ring} bg-background font-semibold`}
                    >
                      #{rank}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 ${styles.accent}`}
                    >
                      {styles.icon}
                      {rank === 1
                        ? t('dashboard:champion')
                        : rank === 2
                        ? t('dashboard:second')
                        : t('dashboard:third')}
                    </span>
                  </CardTitle>
                  <span className={`text-xs px-2 py-1 rounded-md border font-medium ${badge}`}>
                    {userItem.totalPoints} pts
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-2 ring-border">
                      <AvatarImage 
                        src={userItem.profilePicture?.startsWith('http') 
                          ? userItem.profilePicture 
                          : userItem.profilePicture 
                            ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${userItem.profilePicture}` 
                            : undefined
                        } 
                        alt={userItem.name} 
                      />
                      <AvatarFallback delayMs={0} className="text-lg font-semibold bg-primary text-primary-foreground">
                        {getInitials(userItem.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-foreground">{userItem.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Zap className="h-3 w-3" /> {userItem.bluePoints}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Star className="h-3 w-3" /> {userItem.greenPoints}
                        </span>
                        <Badge className={`${levelInfo.color} text-white text-[10px]`}>
                          Nv.{levelInfo.level}
                        </Badge>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{
                            width: `${Math.round((userItem.totalPoints / maxScore) * 100)}%`,
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

      {/* All Users List */}
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Classement Complet</h2>
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-base font-semibold text-foreground">Aucun étudiant classé pour le moment</p>
            <p className="text-xs text-muted-foreground mt-1">Commencez à répondre à des QCM pour gagner des points !</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-4 font-medium text-muted-foreground w-16">
                    Rang
                  </th>
                  <th className="py-3 px-4 font-medium text-muted-foreground min-w-[240px]">
                    Étudiant
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    Points
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Bleus
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Verts
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    Niveau
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    %
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground min-w-[140px]">
                    Progression
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {remainingUsers.map((userData, idx) => {
                  const rank = userData.rank;
                  if (!rank) return null;
                  
                  const badge = getScoreBadgeClasses(userData.totalPoints, maxScore);
                  const levelInfo = getUserLevel(userData.totalPoints);
                  const isCurrentUser = user && (userData.odUserIdStr === user._id || userData.email === user.email);
                  
                  return (
                    <tr
                      key={userData._id || userData.odUserId || idx}
                      className={`hover:bg-muted/40 transition-colors align-middle ${
                        isCurrentUser ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold">
                        <span className="w-7 h-7 flex items-center justify-center text-muted-foreground text-sm">
                          #{rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarImage 
                              src={userData.profilePicture?.startsWith('http') 
                                ? userData.profilePicture 
                                : userData.profilePicture 
                                  ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${userData.profilePicture}` 
                                  : undefined
                              } 
                              alt={userData.name} 
                            />
                            <AvatarFallback delayMs={0} className="bg-primary text-primary-foreground text-xs font-semibold">
                              {getInitials(userData.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className={`font-semibold text-sm truncate ${isCurrentUser ? "text-primary font-bold" : "text-foreground"}`} title={userData.name}>
                              {userData.name}
                              {isCurrentUser && <span className="ml-1 text-xs font-normal text-primary">(vous)</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${badge}`}>
                          {userData.totalPoints} pts
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{userData.bluePoints}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{userData.greenPoints}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge className={`${levelInfo.color} text-white text-xs`}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {levelInfo.level}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-medium text-cyan-600 dark:text-cyan-400 text-sm">
                          {userData.percentageAnswered || 0}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            style={{
                              width: `${Math.min(userData.percentageAnswered || 0, 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Show current user if they're outside top 20 */}
                {currentUserData && (
                  <>
                    <tr>
                      <td colSpan={8} className="py-3 px-4">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-dashed border-border" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-card px-3 text-xs font-medium text-muted-foreground">
                              Votre Position
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-950/40 transition-colors align-middle">
                      <td className="py-3.5 px-4">
                        <span className="w-7 h-7 flex items-center justify-center font-bold text-primary text-sm bg-primary/10 rounded-md">
                          #{currentUserData.rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 flex-shrink-0">
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
                            <span className="font-semibold text-primary text-sm truncate" title={currentUserData.name}>
                              {currentUserData.name}
                              <span className="ml-1 text-xs font-normal text-primary">(vous)</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${getScoreBadgeClasses(currentUserData.totalPoints, maxScore)}`}>
                          {currentUserData.totalPoints} pts
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{currentUserData.bluePoints}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{currentUserData.greenPoints}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge className={`${getUserLevel(currentUserData.totalPoints).color} text-white text-xs`}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {getUserLevel(currentUserData.totalPoints).level}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-medium text-cyan-600 dark:text-cyan-400 text-sm">
                          {currentUserData.percentageAnswered || 0}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            style={{
                              width: `${Math.min(currentUserData.percentageAnswered || 0, 100)}%`,
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

      {/* Points System Info */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold text-foreground">Système de points</CardTitle>
        </CardHeader>
        <CardContent className="text-xs sm:text-sm text-muted-foreground space-y-2">
          <p>• Réponse correcte : <span className="font-semibold text-emerald-600 dark:text-emerald-400">+1 point</span></p>
          <p>• Réponse incorrecte : <span className="font-semibold text-muted-foreground">+0 point</span></p>
          <p>• Report approuvé : <span className="font-semibold text-emerald-600 dark:text-emerald-400">+1 point vert (= 30 pts)</span></p>
          <p>• Explication approuvée : <span className="font-semibold text-blue-600 dark:text-blue-400">+1 point bleu (= 40 pts)</span></p>
          <p>• 1 niveau = 50 points</p>
          <p>• Pourcentage = questions répondues / total questions ({totalQuestionsInSystem})</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardClient;
