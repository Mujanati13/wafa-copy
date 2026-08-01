import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, TrendingUp, Calendar, Target, Award, Lock,
  ChevronRight, BookOpen, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, StatCard } from '@/components/shared';
import { motion } from 'framer-motion';

const ProgressPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const overallStats = [
    { label: t('dashboard:exams_completed'), value: '127', icon: <BookOpen className="w-6 h-6" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('dashboard:success_rate'), value: '87%', icon: <Target className="w-6 h-6" />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t('dashboard:study_hours'), value: '234h', icon: <Calendar className="w-6 h-6" />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: t('dashboard:monthly_goal'), value: '76%', icon: <TrendingUp className="w-6 h-6" />, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const subjectProgress = [
    { name: 'Anatomie', progress: 85, exams: 24, avgScore: 88, color: 'bg-blue-500' },
    { name: 'Physiologie', progress: 72, exams: 18, avgScore: 76, color: 'bg-green-500' },
    { name: 'Pharmacologie', progress: 90, exams: 21, avgScore: 91, color: 'bg-purple-500' },
    { name: 'Pathologie', progress: 65, exams: 15, avgScore: 70, color: 'bg-orange-500' },
    { name: 'Microbiologie', progress: 78, exams: 19, avgScore: 82, color: 'bg-pink-500' },
  ];

  const weeklyActivity = [
    { day: 'Lun', hours: 3.5, exams: 4 },
    { day: 'Mar', hours: 4.2, exams: 5 },
    { day: 'Mer', hours: 2.8, exams: 3 },
    { day: 'Jeu', hours: 5.1, exams: 6 },
    { day: 'Ven', hours: 3.9, exams: 4 },
    { day: 'Sam', hours: 6.2, exams: 8 },
    { day: 'Dim', hours: 4.5, exams: 5 },
  ];

  const achievements = [
    { 
      title: t('dashboard:achievement_first_100'), 
      description: t('dashboard:achievement_first_100_desc'),
      unlocked: true,
      icon: <Trophy className="h-6 w-6 text-white" />,
      color: 'from-yellow-400 to-orange-500'
    },
    { 
      title: t('dashboard:achievement_study_marathon'), 
      description: t('dashboard:achievement_study_marathon_desc'),
      unlocked: true,
      icon: <Calendar className="h-6 w-6 text-white" />,
      color: 'from-blue-400 to-purple-500'
    },
    { 
      title: t('dashboard:achievement_expert'), 
      description: t('dashboard:achievement_expert_desc'),
      unlocked: false,
      icon: <Award className="h-6 w-6 text-gray-400" />,
      color: 'from-green-400 to-teal-500'
    },
    { 
      title: t('dashboard:achievement_champion'), 
      description: t('dashboard:achievement_champion_desc'),
      unlocked: false,
      icon: <Target className="h-6 w-6 text-gray-400" />,
      color: 'from-pink-400 to-red-500'
    },
  ];

  const maxHours = Math.max(...weeklyActivity.map(d => d.hours));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <PageHeader
            title={t('dashboard:my_progress')}
            description={t('dashboard:track_your_evolution')}
          />
          
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">{t('dashboard:this_week')}</SelectItem>
                <SelectItem value="month">{t('dashboard:this_month')}</SelectItem>
                <SelectItem value="year">{t('dashboard:this_year')}</SelectItem>
                <SelectItem value="all">{t('common:all')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overallStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Subject Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('dashboard:progress_by_subject')}</CardTitle>
                <CardDescription>{t('dashboard:your_performance_each_module')}</CardDescription>
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('common:all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common:all')}</SelectItem>
                  <SelectItem value="anatomy">{t('dashboard:anatomy')}</SelectItem>
                  <SelectItem value="physiology">{t('dashboard:physiology')}</SelectItem>
                  <SelectItem value="pharmacology">{t('dashboard:pharmacology')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {subjectProgress.map((subject, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{subject.exams} {t('dashboard:exams')}</span>
                    <Badge variant="secondary">{subject.avgScore}% {t('dashboard:avg')}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={subject.progress} className="flex-1" />
                  <span className="text-sm font-medium w-12 text-right">{subject.progress}%</span>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly Activity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard:weekly_activity')}</CardTitle>
              <CardDescription>{t('dashboard:study_hours_per_day')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyActivity.map((day, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-12 text-sm font-medium text-muted-foreground">
                      {day.day}
                    </div>
                    <div className="flex-1">
                      <div className="h-10 bg-muted rounded-lg overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(day.hours / maxHours) * 100}%` }}
                          transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-end pr-3"
                        >
                          <span className="text-xs font-medium text-white">
                            {day.hours}h
                          </span>
                        </motion.div>
                      </div>
                    </div>
                    <Badge variant="outline" className="w-16 justify-center">
                      {day.exams} {t('dashboard:exams')}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard:achievements')}</CardTitle>
              <CardDescription>{t('dashboard:unlock_badges_progress')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all
                      ${achievement.unlocked 
                        ? 'bg-gradient-to-br ' + achievement.color + ' border-transparent shadow-lg' 
                        : 'bg-muted border-border opacity-60'
                      }
                    `}
                  >
                    {!achievement.unlocked && (
                      <div className="absolute top-2 right-2">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className={`
                      flex items-center justify-center h-12 w-12 rounded-full mb-3
                      ${achievement.unlocked ? 'bg-white dark:bg-slate-900/20' : 'bg-white dark:bg-slate-900'}
                    `}>
                      {achievement.icon}
                    </div>
                    <h4 className={`font-semibold text-sm mb-1 ${achievement.unlocked ? 'text-white' : 'text-muted-foreground'}`}>
                      {achievement.title}
                    </h4>
                    <p className={`text-xs ${achievement.unlocked ? 'text-white/90' : 'text-gray-500'}`}>
                      {achievement.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Study Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Objectifs d'étude</CardTitle>
            <CardDescription>Vos objectifs du mois en cours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Examens complétés (38/50)</span>
                  <span className="text-muted-foreground">76%</span>
                </div>
                <Progress value={76} className="h-3" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Heures d'étude (34/50h)</span>
                  <span className="text-muted-foreground">68%</span>
                </div>
                <Progress value={68} className="h-3" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Taux de réussite cible (87/90%)</span>
                  <span className="text-muted-foreground">97%</span>
                </div>
                <Progress value={97} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProgressPage;
