import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { GraduationCap, BookOpen, Sparkles, ChevronRight, Loader2, Check, Gift, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { userService } from '@/services/userService';
import { moduleService } from '@/services/moduleService';
import logo from '@/assets/logo.png';

const getYearText = (semesterId) => {
  const semesterNum = parseInt(semesterId.replace('S', ''), 10);
  const yearNum = Math.ceil(semesterNum / 2);
  return `${yearNum}${yearNum === 1 ? 'ère' : 'ème'} année`;
};

const SelectFreeSemester = () => {
  const navigate = useNavigate();
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);

  useEffect(() => {
    // Fetch all available semesters from modules
    const fetchSemesters = async () => {
      try {
        setLoadingModules(true);
        const { data } = await moduleService.getAllmodules();
        const allModules = data.data || [];
        const semesterMap = new Map();

        allModules.forEach(module => {
          const semester = module.semester;
          if (!semester || !/^S\d+$/i.test(semester)) {
            return;
          }

          if (!semesterMap.has(semester)) {
            const semesterNum = parseInt(semester.replace('S', ''), 10);
            semesterMap.set(semester, {
              id: semester,
              name: `Semestre ${semesterNum}`,
              year: getYearText(semester),
              description: module.name || '',
              moduleCount: 1,
              modules: [module]
            });
          } else {
            const existing = semesterMap.get(semester);
            existing.moduleCount += 1;
            if (module.name) {
              existing.modules.push(module);
              if (!existing.description) {
                existing.description = module.name;
              }
            }
          }
        });
        
        // Convert to array and sort by semester number
        const semestersList = Array.from(semesterMap.values()).sort((a, b) => {
          const numA = parseInt(a.id.replace('S', ''));
          const numB = parseInt(b.id.replace('S', ''));
          return numA - numB;
        });
        
        console.log('Available semesters:', semestersList);
        setSemesters(semestersList);
      } catch (error) {
        console.error('Error fetching semesters:', error);
        toast.error('Erreur lors du chargement des semestres');
      } finally {
        setLoadingModules(false);
      }
    };

    fetchSemesters();
  }, []);

  useEffect(() => {
    // Check if user needs to select semester
    const checkStatus = async () => {
      try {
        const response = await userService.checkFreeSemesterStatus();
        if (!response.data?.needsToSelectSemester) {
          // User already has a semester or has used their free selection
          navigate('/dashboard/home');
        }
      } catch (error) {
        console.error('Error checking semester status:', error);
        // If error, still allow selection (fallback)
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [navigate]);

  const handleSelectSemester = async () => {
    if (!selectedSemester) {
      toast.error('Veuillez sélectionner un semestre');
      return;
    }

    if (!selectedModuleId || !selectedExamId) {
      toast.error('Veuillez sélectionner un module et un examen');
      return;
    }

    const availableSemesterIds = new Set(semesters.map((semester) => semester.id));
    if (!availableSemesterIds.has(selectedSemester)) {
      toast.error('Semestre invalide', {
        description: 'Veuillez choisir un semestre disponible.'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await userService.selectFreeSemester(selectedSemester, selectedModuleId, selectedExamId);

      if (response.success) {
        toast.success('Examen gratuit activé !', {
          description: 'Vous avez maintenant accès à l’examen sélectionné.',
          duration: 5000,
        });

        // Clear and refresh user profile cache
        userService.clearProfileCache();

        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate('/dashboard/home');
        }, 1500);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Une erreur est survenue';
      
      if (error.response?.data?.alreadyUsed) {
        toast.error('Semestre déjà utilisé', {
          description: 'Vous avez déjà sélectionné votre semestre gratuit. Passez à Premium pour plus d\'accès.',
          action: {
            label: 'Voir les abonnements',
            onClick: () => navigate('/dashboard/subscription')
          }
        });
        navigate('/dashboard/home');
      } else {
        toast.error('Erreur', { description: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking || loadingModules) {
    return (
      <div className="imrs-grid min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Chargement des semestres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="imrs-grid min-h-screen bg-background py-8 px-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full opacity-30 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-teal-100 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <img
            src={logo}
            alt="Imrs-Qcma Logo"
            className="h-16 w-auto mx-auto mb-6"
          />
          
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-4 py-2 rounded-full mb-4">
            <Gift className="h-5 w-5" />
            <span className="font-medium">Offre de bienvenue</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Choisissez votre examen gratuit
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Le plan gratuit donne accès à <span className="font-semibold text-blue-600">un examen dans un seul module</span>. Choisissez votre semestre, votre module, puis votre examen.
          </p>
        </Motion.div>

        {/* Semester Grid */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8"
        >
          {semesters.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-500">
              Aucun semestre disponible
            </div>
          ) : (
            semesters.map((semester, index) => (
              <Motion.div
                key={semester.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card
                  onClick={() => { setSelectedSemester(semester.id); setSelectedModuleId(null); setSelectedExamId(null); }}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    selectedSemester === semester.id
                      ? 'ring-2 ring-cyan-500 bg-cyan-50 border-cyan-300 dark:bg-cyan-950/30'
                      : 'hover:border-cyan-300'
                  }`}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${
                      selectedSemester === semester.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {selectedSemester === semester.id ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <BookOpen className="h-6 w-6" />
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">{semester.id}</h3>
                    <p className="text-xs text-slate-500 mt-1">{semester.year}</p>
                  </CardContent>
                </Card>
              </Motion.div>
            ))
          )}
        </Motion.div>

        {/* Selected Semester Details */}
        {selectedSemester && (
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-[#10265f] to-[#12718d] text-white border-0 shadow-xl">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {semesters.find(s => s.id === selectedSemester)?.name}
                    </h3>
                    <p className="text-blue-100">
                      {semesters.find(s => s.id === selectedSemester)?.year} • {semesters.find(s => s.id === selectedSemester)?.moduleCount || 0} module(s) disponible(s)
                    </p>
                  </div>
                </div>
                <Sparkles className="h-8 w-8 text-amber-300" />
              </CardContent>
            </Card>
          </Motion.div>
        )}

        {selectedSemester && (
          <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-5">
            <div>
              <h2 className="mb-3 text-lg font-bold text-foreground">1. Choisissez un module</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(semesters.find((item) => item.id === selectedSemester)?.modules || []).map((module) => (
                  <Card
                    key={module._id}
                    onClick={() => { setSelectedModuleId(module._id); setSelectedExamId(null); }}
                    className={`cursor-pointer transition ${selectedModuleId === module._id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500 dark:bg-cyan-950/30' : 'hover:border-cyan-300'}`}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <BookOpen className="h-5 w-5 text-cyan-600" />
                      <span className="font-semibold">{module.name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {selectedModuleId && (
              <div>
                <h2 className="mb-3 text-lg font-bold text-foreground">2. Choisissez un examen</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(semesters.find((item) => item.id === selectedSemester)?.modules.find((item) => item._id === selectedModuleId)?.exams || []).map((exam) => (
                    <Card
                      key={exam._id}
                      onClick={() => setSelectedExamId(exam._id)}
                      className={`cursor-pointer transition ${selectedExamId === exam._id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500 dark:bg-cyan-950/30' : 'hover:border-cyan-300'}`}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <FileQuestion className="h-5 w-5 text-cyan-600" />
                        <div><p className="font-semibold">{exam.name}</p>{exam.year && <p className="text-xs text-muted-foreground">{exam.year}</p>}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Motion.div>
        )}

        {/* Action Button */}
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Button
            onClick={handleSelectSemester}
            disabled={!selectedSemester || !selectedModuleId || !selectedExamId || isLoading}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Activation en cours...
              </>
            ) : (
              <>
                Activer mon examen gratuit
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-sm text-slate-500 mt-4">
            💡 Passez à Premium pour accéder aux autres examens et modules
          </p>
        </Motion.div>

        {/* Info Card */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="bg-muted border-border">
            <CardContent className="p-6">
              <h4 className="font-semibold text-slate-800 mb-3">Ce que vous obtenez avec votre compte gratuit :</h4>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Accès à un examen du module choisi
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Questions et exercices de cet examen
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Suivi de votre progression
                </li>
              </ul>
            </CardContent>
          </Card>
        </Motion.div>
      </div>
    </div>
  );
};

export default SelectFreeSemester;
