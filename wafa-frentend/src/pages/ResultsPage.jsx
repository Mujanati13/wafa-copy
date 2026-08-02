import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, Clock, Target, TrendingUp, Calendar, 
  Download, Filter, Search, Eye, Star, Award,
  BookOpen, CheckCircle, XCircle, Medal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataTable, StatCard, PageHeader } from '@/components/shared';

const ResultsPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [examResults, setExamResults] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedSubject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load exam results
  useEffect(() => {
    const savedResults = JSON.parse(localStorage.getItem('examResults') || '[]');
    if (savedResults.length === 0) {
      const sampleResults = [
        {
          examId: 1,
          subject: 'Anatomie Générale',
          score: '16.0',
          correctAnswers: 8,
          totalQuestions: 10,
          timeSpent: 2400,
          date: '2024-02-10',
          semester: 'S1',
        },
        {
          examId: 2,
          subject: 'Biologie Cellulaire',
          score: '14.5',
          correctAnswers: 7,
          totalQuestions: 10,
          timeSpent: 2700,
          date: '2024-02-08',
          semester: 'S1',
        },
        {
          examId: 3,
          subject: 'Physiologie Humaine',
          score: '17.5',
          correctAnswers: 9,
          totalQuestions: 10,
          timeSpent: 2100,
          date: '2024-02-05',
          semester: 'S1',
        },
        {
          examId: 4,
          subject: 'Pathologie Générale',
          score: '15.0',
          correctAnswers: 8,
          totalQuestions: 10,
          timeSpent: 2600,
          date: '2024-01-28',
          semester: 'S3',
        },
        {
          examId: 5,
          subject: 'Pharmacologie',
          score: '18.0',
          correctAnswers: 9,
          totalQuestions: 10,
          timeSpent: 1980,
          date: '2024-01-25',
          semester: 'S3',
        }
      ];
      setExamResults(sampleResults);
      localStorage.setItem('examResults', JSON.stringify(sampleResults));
    } else {
      setExamResults(savedResults);
    }
  }, []);

  // Calculate statistics
  const calculateStats = () => {
    if (examResults.length === 0) return {};

    const totalExams = examResults.length;
    const averageScore = examResults.reduce((sum, result) => sum + parseFloat(result.score), 0) / totalExams;
    const totalCorrect = examResults.reduce((sum, result) => sum + result.correctAnswers, 0);
    const totalQuestions = examResults.reduce((sum, result) => sum + result.totalQuestions, 0);
    const successRate = (totalCorrect / totalQuestions) * 100;
    const totalTimeSpent = examResults.reduce((sum, result) => sum + result.timeSpent, 0);

    const sortedByScore = [...examResults].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    const bestScore = sortedByScore[0];
    const worstScore = sortedByScore[sortedByScore.length - 1];

    return {
      totalExams,
      averageScore: averageScore.toFixed(1),
      successRate: successRate.toFixed(1),
      totalTimeSpent: Math.floor(totalTimeSpent / 3600),
      bestScore,
      worstScore
    };
  };

  // Filter results
  const filteredResults = examResults.filter(result => {
    const matchesSubject = selectedSubject === 'all' || result.subject === selectedSubject;
    const matchesSearch = result.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesPeriod = true;
    if (selectedPeriod !== 'all') {
      const resultDate = new Date(result.date);
      const now = new Date();
      const daysDiff = Math.floor((now - resultDate) / (1000 * 60 * 60 * 24));
      
      switch (selectedPeriod) {
        case 'week':
          matchesPeriod = daysDiff <= 7;
          break;
        case 'month':
          matchesPeriod = daysDiff <= 30;
          break;
        case 'semester':
          matchesPeriod = daysDiff <= 120;
          break;
      }
    }
    
    return matchesSubject && matchesSearch && matchesPeriod;
  });

  const getScoreBadgeVariant = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 16) return 'default';
    if (numScore >= 12) return 'secondary';
    return 'destructive';
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={t('dashboard:my_results')}
          description={t('dashboard:check_performance_track_progress')}
          actions={
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {t('common:export')}
            </Button>
          }
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('dashboard:exams_taken')}
            value={stats.totalExams || 0}
            icon={<Trophy className="h-5 w-5" />}
            trend={{ value: 0, isPositive: true }}
            loading={false}
          />
          
          <StatCard
            title={t('dashboard:overall_average')}
            value={`${stats.averageScore || '0.0'}/20`}
            icon={<Star className="h-5 w-5" />}
            trend={{ value: 0, isPositive: true }}
            loading={false}
          />
          
          <StatCard
            title={t('dashboard:success_rate')}
            value={`${stats.successRate || '0.0'}%`}
            icon={<Target className="h-5 w-5" />}
            trend={{ value: 0, isPositive: true }}
            loading={false}
          />
          
          <StatCard
            title={t('dashboard:total_time')}
            value={`${stats.totalTimeSpent || 0}h`}
            icon={<Clock className="h-5 w-5" />}
            trend={{ value: 0, isPositive: false }}
            loading={false}
          />
        </div>

        {/* Best and Worst Performance */}
        {stats.bestScore && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">{t('dashboard:best_performance')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold text-lg">{stats.bestScore.subject}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      {stats.bestScore.score}/20
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.bestScore.correctAnswers}/{stats.bestScore.totalQuestions} {t('dashboard:correct_answers_lower')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {stats.worstScore && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base">{t('dashboard:to_improve')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold text-lg">{stats.worstScore.subject}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {stats.worstScore.score}/20
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {stats.worstScore.correctAnswers}/{stats.worstScore.totalQuestions} {t('dashboard:correct_answers_lower')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Filters and Results */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>{t('dashboard:exam_history')}</CardTitle>
                <CardDescription>
                  {filteredResults.length} {t('dashboard:result')}{filteredResults.length > 1 ? 's' : ''}
                </CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('common:search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder={t('dashboard:period')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('dashboard:all_periods')}</SelectItem>
                    <SelectItem value="week">{t('dashboard:this_week')}</SelectItem>
                    <SelectItem value="month">{t('dashboard:this_month')}</SelectItem>
                    <SelectItem value="semester">{t('dashboard:this_semester')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('common:no_results')}</p>
                  </div>
                ) : (
                  filteredResults.map((result) => (
                    <Motion.div
                      key={result.examId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                  <BookOpen className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <p className="font-semibold">{result.subject}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(result.date).toLocaleDateString('fr-FR')}
                                    <Separator orientation="vertical" className="h-3" />
                                    <Clock className="h-3 w-3" />
                                    {formatTime(result.timeSpent)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right space-y-1">
                                <Badge variant={getScoreBadgeVariant(result.score)} className="text-base px-3">
                                  {result.score}/20
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  {result.correctAnswers}/{result.totalQuestions} {t('dashboard:correct_lower')}
                                </p>
                                <Progress 
                                  value={(result.correctAnswers / result.totalQuestions) * 100} 
                                  className="h-1 w-20"
                                />
                              </div>
                              
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate(`/dashboard/exam/${result.examId}/review`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsPage;
