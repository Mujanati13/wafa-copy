import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { GraduationCap, BookOpen, Sparkles, Loader2, Check, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { userService } from '@/services/userService';
import { moduleService } from '@/services/moduleService';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

const getYearText = (semesterId) => {
  const semesterNum = parseInt(semesterId.replace('S', ''), 10);
  const yearNum = Math.ceil(semesterNum / 2);
  return `${yearNum}${yearNum === 1 ? 'ère' : 'ème'} année`;
};

const SelectFreeSemester = () => {
  const navigate = useNavigate();
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
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
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [navigate]);

  const handleSelectModule = async (module) => {
    if (!selectedSemester) {
      toast.error('Veuillez sélectionner un semestre');
      return;
    }

    if (!module?._id) {
      toast.error('Veuillez sélectionner un module');
      return;
    }

    if (Array.isArray(module.exams) && module.exams.length === 0) {
      toast.error('Aucun examen disponible', {
        description: 'Choisissez un autre module pour continuer.'
      });
      return;
    }

    const availableSemesterIds = new Set(semesters.map((semester) => semester.id));
    if (!availableSemesterIds.has(selectedSemester)) {
      toast.error('Semestre invalide', {
        description: 'Veuillez choisir un semestre disponible.'
      });
      return;
    }

    setSelectedModuleId(module._id);
    setIsLoading(true);

    try {
      const response = await userService.selectFreeSemester(selectedSemester, module._id);

      if (response.success) {
        toast.success('Examen gratuit activé !', {
          description: 'L’examen le plus récent de ce module va s’ouvrir.',
          duration: 3000,
        });

        userService.clearProfileCache();
        const examId = response.data?.user?.freeExam;
        navigate(examId ? `/exam/${examId}?type=exam` : '/dashboard/home', { replace: true });
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground animate-pulse">Chargement des semestres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <img
            src={logo}
            alt="YourQCM Logo"
            className="h-16 w-auto mx-auto mb-5 drop-shadow-sm"
          />
          
          <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-4 py-1.5 rounded-full mb-4 text-sm font-semibold backdrop-blur-sm">
            <Gift className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Offre de bienvenue</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-3">
            Choisissez votre module gratuit
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Le plan gratuit donne accès à <span className="font-semibold text-primary">un examen dans un seul module</span>. Choisissez votre semestre et votre module : l’examen le plus récent s’ouvrira automatiquement.
          </p>
        </Motion.div>

        {/* Semester Grid */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
        >
          {semesters.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground bg-card border border-border rounded-2xl">
              Aucun semestre disponible pour le moment
            </div>
          ) : (
            semesters.map((semester, index) => {
              const isSelected = selectedSemester === semester.id;
              return (
                <Motion.div
                  key={semester.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 + index * 0.03 }}
                >
                  <Card
                    onClick={() => { if (!isLoading) { setSelectedSemester(semester.id); setSelectedModuleId(null); } }}
                    className={cn(
                      "cursor-pointer transition-all duration-200 rounded-2xl border text-card-foreground hover:shadow-md hover:-translate-y-0.5",
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/10"
                        : "bg-card border-border hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={cn(
                        "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isSelected ? (
                          <Check className="h-6 w-6" />
                        ) : (
                          <BookOpen className="h-6 w-6" />
                        )}
                      </div>
                      <h3 className="font-bold text-base sm:text-lg text-foreground">{semester.id}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{semester.year}</p>
                    </CardContent>
                  </Card>
                </Motion.div>
              );
            })
          )}
        </Motion.div>

        {/* Selected Semester Details Header */}
        {selectedSemester && (
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                    <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold">
                      {semesters.find(s => s.id === selectedSemester)?.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                      {semesters.find(s => s.id === selectedSemester)?.year} • {semesters.find(s => s.id === selectedSemester)?.moduleCount || 0} module(s) disponible(s)
                    </p>
                  </div>
                </div>
                <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-amber-300 shrink-0" />
              </CardContent>
            </Card>
          </Motion.div>
        )}

        {/* Module selection automatically activates and opens its newest exam. */}
        {selectedSemester && (
          <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <h2 className="mb-3 text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <span>Choisissez un module</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(semesters.find((item) => item.id === selectedSemester)?.modules || []).map((module) => {
                  const isModSelected = selectedModuleId === module._id;
                  return (
                    <Card
                      key={module._id}
                      onClick={() => { if (!isLoading) handleSelectModule(module); }}
                      className={cn(
                        "cursor-pointer transition-all duration-200 rounded-2xl border text-card-foreground hover:shadow-sm",
                        isModSelected
                          ? "border-primary bg-primary/10 dark:bg-primary/20 ring-2 ring-primary"
                          : "bg-card border-border hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        {isModSelected && isLoading ? (
                          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                        ) : (
                          <BookOpen className={cn("h-5 w-5 shrink-0", isModSelected ? "text-primary" : "text-muted-foreground")} />
                        )}
                        <span className="font-semibold text-sm sm:text-base truncate text-foreground">{module.name}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

          </Motion.div>
        )}

        {/* Free Plan Features Info Card */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4"
        >
          <Card className="bg-card border-border rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <h4 className="font-bold text-foreground mb-3 text-sm sm:text-base">
                Ce que vous obtenez avec votre compte gratuit :
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Accès complet à l’examen le plus récent du module choisi</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>QCMs corrigés et explications détaillées</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Suivi de votre progression et statistiques</span>
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
