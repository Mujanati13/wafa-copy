import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { publishExamCompletedCount } from "@/utils/examProgress";
import { dashboardService } from "@/services/dashboardService";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Flag,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  XCircle,
  NotebookPen,
  TriangleAlert,
  Lightbulb,
  Plus,
  Minus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Trophy,
  Target,
  Zap,
  Star,
  Timer,
  ListChecks,
  Keyboard,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  TrendingUp,
  CircleDot,
  CheckCircle,
  Circle,
  ArrowRight,
  Home,
  RefreshCcw,
  Share2,
  Download,
  Eye,
  EyeOff,
  Users,
  LayoutGrid,
  ListMusic,
  Image,
  Menu,
  Grid3X3,
  MoreVertical,
  Send,
  FileText,
  LogOut,
  User,
  Settings,
  CreditCard,
  Highlighter,
  Calendar,
  Cloud,
  CloudOff
} from "lucide-react";
import { userService } from "@/services/userService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { resolveQuestionImageUrl } from "@/lib/mediaUrl";
import { isPremiumPlan, isPremiumProPlan } from "@/utils/subscriptionDisplay";
import ExplicationModel from "@/components/ExamsPage/ExplicationModel";
import NoteModal from "@/components/ExamsPage/NoteModal";
import ReportModal from "@/components/ExamsPage/ReportModal";
import CommunityModal from "@/components/ExamsPage/CommunityModal";
import ResumesModal from "@/components/ExamsPage/ResumesModal";
import PlaylistModal from "@/components/ExamsPage/PlaylistModal";

// Confetti function (simple implementation without external library)
const triggerConfetti = () => {
  const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#10B981'];
  const confettiCount = 100;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: -10px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      pointer-events: none;
      z-index: 9999;
      animation: confetti-fall ${2 + Math.random() * 2}s linear forwards;
    `;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }
};

// Add confetti animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes confetti-fall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
`;
document.head.appendChild(style);

const ExamPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get exam type from query params (default: exam-years)
  const examType = searchParams.get('type') || 'exam'; // 'exam', 'course', 'qcm'

  // Safe back navigation that prevents going to login
  const handleGoBack = () => {
    // Check if there's a valid previous page in history
    if (location.key !== 'default' && window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to dashboard if no history or coming from external link
      navigate('/dashboard');
    }
  };

  // Helper function to darken/lighten color
  const adjustColor = (color, amount) => {
    if (!color) return null;
    
    const isDark = document.documentElement.classList.contains('dark');
    const finalAmount = isDark ? Math.abs(amount) * 1.5 : amount;

    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + finalAmount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + finalAmount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + finalAmount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Core state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showSidebar, setShowSidebar] = useState(false);

  // Modal states
  const [showExplanation, setShowExplanation] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showResumesModal, setShowResumesModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showVueEnsemble, setShowVueEnsemble] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSavingBeforeExit, setIsSavingBeforeExit] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);

  // Keep the page behind image overlays fixed while allowing the overlay's
  // own native scroll surface to handle mouse wheels and mobile touch panning.
  useEffect(() => {
    if (!showImageGallery && !showImageZoom) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showImageGallery, showImageZoom]);

  // Save status tracking
  const [isSaved, setIsSaved] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAnswers, setLastSavedAnswers] = useState({});

  // Extract module color from exam data
  const moduleColor = examData?.moduleColor || '#6366f1'; // Default indigo

  // Track visited questions (for orange color)
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));

  // Verification state - per question
  const [verifiedQuestions, setVerifiedQuestions] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [communityStats, setCommunityStats] = useState({}); // Store community voting stats per question
  const [isVerifying, setIsVerifying] = useState(false); // Prevent double-click on verify

  // UI preferences
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('examFontSize');
    return saved ? parseInt(saved) : 16;
  });
  const [collapsedSessions, setCollapsedSessions] = useState(new Set());
  const [isExamInfoCollapsed, setIsExamInfoCollapsed] = useState(true);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Animation states
  const [answerAnimation, setAnswerAnimation] = useState(null);
  const [questionTransition, setQuestionTransition] = useState('next');

  // Mobile-specific states
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileQuestionNav, setShowMobileQuestionNav] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const questionCardRef = useRef(null);
  const questionsLengthRef = useRef(0); // Track questions length for navigation
  const currentQuestionRef = useRef(0); // Track current question for debugging
  const timeElapsedRef = useRef(0);

  // User profile state for header
  const [userProfile, setUserProfile] = useState(null);
  const [userPlan, setUserPlan] = useState("Free");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showFontPopup, setShowFontPopup] = useState(false);
  const [showMobileProfileDropdown, setShowMobileProfileDropdown] = useState(false);

  // Swipe detection threshold
  const minSwipeDistance = 50;

  // Sound effects placeholder
  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    // Sound implementation would go here
  }, [soundEnabled]);

  // Timer
  useEffect(() => {
    if (showResults) return;
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showResults]);

  useEffect(() => {
    timeElapsedRef.current = timeElapsed;
  }, [timeElapsed]);

  // Fetch user profile for header
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await userService.getUserProfile();
        setUserProfile(profile);
        setUserPlan(profile.plan || "Free");
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Try to get from localStorage
        const cached = localStorage.getItem('user');
        if (cached) {
          const user = JSON.parse(cached);
          setUserProfile(user);
          setUserPlan(user.plan || "Free");
        }
      }
    };
    fetchUserProfile();
  }, []);

  // Calculate user level from points (1 level = 50 points)
  const calculateLevel = (totalPoints) => {
    const level = Math.floor(totalPoints / 50) + 1;
    const currentLevelPoints = (level - 1) * 50;
    const nextLevelPoints = level * 50;
    const progressToNextLevel = ((totalPoints - currentLevelPoints) / 50) * 100;

    // Level names based on ranges
    let name = "Nouveau";
    if (level >= 20) name = "Maître";
    else if (level >= 15) name = "Expert";
    else if (level >= 12) name = "Avancé";
    else if (level >= 10) name = "Confirmé";
    else if (level >= 8) name = "Intermédiaire";
    else if (level >= 6) name = "Apprenti";
    else if (level >= 4) name = "Initié";
    else if (level >= 3) name = "Novice";
    else if (level >= 2) name = "Débutant";

    return {
      level,
      name,
      nextLevel: nextLevelPoints,
      progress: Math.min(progressToNextLevel, 100)
    };
  };

  const userLevelInfo = userProfile ? calculateLevel(userProfile.totalPoints || 0) : null;

  // Check access levels for different features
  const hasPremiumAccess = isPremiumPlan(userPlan);
  const hasPremiumProAccess = isPremiumProPlan(userPlan);

  // Helper to handle feature access with upgrade prompt for PREMIUM PRO features
  const handlePremiumProFeature = (featureName, action) => {
    if (!hasPremiumProAccess) {
      toast.error('Fonctionnalité Premium Pro', {
        description: `${featureName} est disponible uniquement pour les abonnés Premium Pro.`,
        action: {
          label: 'Mettre à niveau',
          onClick: () => navigate('/dashboard/subscription')
        },
        duration: 5000,
      });
      return;
    }
    action();
  };

  // Helper to handle feature access for PREMIUM features (student explanations, stats, leaderboard)
  const handlePremiumFeature = (featureName, action) => {
    if (!hasPremiumAccess) {
      toast.error('Fonctionnalité Premium', {
        description: `${featureName} est disponible uniquement pour les abonnés Premium ou Premium Pro.`,
        action: {
          label: 'Mettre à niveau',
          onClick: () => navigate('/dashboard/subscription')
        },
        duration: 5000,
      });
      return;
    }
    action();
  };

  // Handle exit with save
  const handleExitWithSave = async () => {
    // Check if user has any answers (verified or unverified)
    const hasAnyAnswers = Object.keys(selectedAnswers).length > 0 || Object.keys(verifiedQuestions).length > 0;
    
    if (!hasAnyAnswers) {
      // No answers at all, exit immediately
      handleGoBack();
      return;
    }

    // Has answers, show confirmation modal to save before exit
    setShowExitConfirm(true);
  };

  // Save all data before exiting
  const saveBeforeExit = async () => {
    setIsSavingBeforeExit(true);
    try {
      const currentUserId = userProfile?._id;
      if (!currentUserId) {
        navigate(-1);
        return;
      }

      // Save to localStorage
      const storageKey = `exam_progress_${currentUserId}_${examType}_${examId}`;
      const progress = {
        userId: currentUserId,
        answers: selectedAnswers,
        currentQ: currentQuestion,
        timeSpent: timeElapsed,
        flags: Array.from(flaggedQuestions),
        verified: verifiedQuestions
      };
      localStorage.setItem(storageKey, JSON.stringify(progress));

      // Save verified answers to backend
      const verifiedAnswers = Object.keys(verifiedQuestions)
        .filter(qIndex => {
          const v = verifiedQuestions[qIndex];
          return v?.verified || v === true;
        })
        .map(qIndex => ({
          questionId: questions[qIndex]?._id,
          selectedAnswers: selectedAnswers[qIndex] || [],
          isVerified: true,
          isCorrect: verifiedQuestions[qIndex]?.isCorrect || false,
          examId: examData._id || examId,
          moduleId: examData.module?._id || examData.moduleId
        }))
        .filter(item => item.questionId);

      // Save unverified answers as well
      const unverifiedAnswers = Object.keys(selectedAnswers)
        .filter(qIndex => {
          const hasAnswer = selectedAnswers[qIndex]?.length > 0;
          const isVerified = verifiedQuestions[qIndex]?.verified || verifiedQuestions[qIndex] === true;
          return hasAnswer && !isVerified;
        })
        .map(qIndex => ({
          questionId: questions[qIndex]?._id,
          selectedAnswers: selectedAnswers[qIndex],
          isVerified: false,
          isCorrect: false,
          examId: examData._id || examId,
          moduleId: examData.module?._id || examData.moduleId
        }))
        .filter(item => item.questionId);

      const allAnswers = [...verifiedAnswers, ...unverifiedAnswers];

      if (allAnswers.length > 0) {
        await Promise.allSettled(
          allAnswers.map(answerData =>
            api.post('/questions/save-answer', answerData)
          )
        );
      }

      toast.success('Session enregistrée avec succès');
    } catch (error) {
      console.error('Error saving before exit:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSavingBeforeExit(false);
      setShowExitConfirm(false);
      handleGoBack();
    }
  };

  // Get the API endpoint based on exam type
  const getExamEndpoint = useCallback(() => {
    switch (examType) {
      case 'course':
        return `/exam-courses/${examId}`;
      case 'qcm':
        return `/qcm-banque/${examId}`;
      case 'playlist':
        return `/playlists/${examId}`;
      default:
        return `/exams/all/${examId}`;
    }
  }, [examId, examType]);

  // Transform data to unified format
  const transformExamData = useCallback((data, type) => {
    if (type === 'course') {
      // ExamCourse now returns questions grouped by session (same as exam-years)
      // Check if questions are already grouped or if they're in linkedQuestions array
      const questionsData = data.questions || {};

      // If questions is an object with sessions, use it directly
      // Otherwise, fall back to linkedQuestions array
      const questions = Object.keys(questionsData).length > 0
        ? questionsData
        : { "Session principale": data.linkedQuestions || [] };

      return {
        ...data,
        name: data.name,
        moduleId: data.moduleId?._id || data.moduleId,
        moduleName: data.moduleName || data.moduleId?.name,
        moduleColor: data.moduleColor || data.moduleId?.color || data.color || '#6366f1',
        totalQuestions: data.totalQuestions || Object.values(questions).flat().length,
        questions: questions
      };
    } else if (type === 'qcm') {
      // QCMBanque has questions array - group by session
      const questions = data.questions || [];

      // Group questions by sessionLabel (same logic as exam-years)
      const questionsBySession = {};
      questions.forEach(q => {
        const sessionName = q.sessionLabel || 'Session principale';
        if (!questionsBySession[sessionName]) {
          questionsBySession[sessionName] = [];
        }
        questionsBySession[sessionName].push(q);
      });

      return {
        ...data,
        name: data.name,
        moduleId: data.moduleId?._id || data.moduleId,
        moduleName: data.moduleId?.name || data.moduleName,
        moduleColor: data.moduleId?.color || '#6366f1',
        totalQuestions: questions.length,
        questions: questionsBySession
      };
    } else if (type === 'playlist') {
      // Playlist has questions array
      const questions = data.questions || [];
      return {
        ...data,
        name: data.name || data.title,
        moduleId: null,
        moduleName: 'Playlist',
        moduleColor: '#8b5cf6',
        totalQuestions: questions.length,
        questions: {
          "Session principale": questions
        }
      };
    }
    // Annual exams populate moduleId with module details. Normalize it before
    // answer verification/persistence, whose API contract requires the ID.
    return {
      ...data,
      moduleId: data.moduleId?._id || data.moduleId,
      moduleName: data.moduleName || data.moduleId?.name,
      moduleColor: data.moduleColor || data.moduleId?.color || '#6366f1',
    };
  }, []);

  // Track if we've already fetched exam data to prevent refetching
  const [examDataFetched, setExamDataFetched] = useState(false);
  const [progressRestored, setProgressRestored] = useState(false);

  // Fetch exam data - only once when component mounts
  useEffect(() => {
    if (examDataFetched) return; // Don't refetch if already fetched

    const fetchData = async () => {
      try {
        setLoading(true);
        const endpoint = getExamEndpoint();
        console.log('=== FETCHING EXAM DATA ===');
        console.log('Exam ID:', examId);
        console.log('Exam Type:', examType);
        console.log('Endpoint:', endpoint);

        const response = await api.get(endpoint);
        console.log('API Response:', response);
        console.log('Response data:', response.data);

        const transformedData = transformExamData(response.data.data, examType);
        console.log('Transformed data:', transformedData);
        setExamData(transformedData);
        setExamDataFetched(true);
        // Note: Keep loading true until progress is restored
      } catch (err) {
        if (err.response?.status === 403 && (err.response?.data?.code === 'FREE_PLAN_EXAM_LIMIT' || err.response?.data?.message?.includes('free plan'))) {
          setError('FREE_PLAN_EXAM_LIMIT');
          toast.error("Cet examen nécessite un abonnement Premium.");
        } else {
          setError(t('dashboard:failed_load_exam') || 'Failed to load exam');
          toast.error(t('dashboard:failed_load_exam') || 'Failed to load exam');
        }
        setLoading(false); // Only set loading false on error
      }
    };
    fetchData();
  }, [examId, examType, t, getExamEndpoint, transformExamData, examDataFetched]);

  // Clean up localStorage from other users when component mounts
  useEffect(() => {
    if (!userProfile?._id) return;

    const currentUserId = userProfile._id;
    const keysToRemove = [];

    // Check all localStorage keys for exam_progress items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('exam_progress_')) {
        // Extract userId from key format: exam_progress_{userId}_{examType}_{examId}
        const parts = key.split('_');
        if (parts.length >= 5) {
          const storedUserId = parts[2]; // index 2 after splitting by '_'
          
          // If this progress doesn't belong to current user, mark for removal
          if (storedUserId !== currentUserId) {
            keysToRemove.push(key);
          }
        }
      }
    }

    // Remove stale data
    if (keysToRemove.length > 0) {
      console.log(`🧹 Cleaning up ${keysToRemove.length} stale localStorage items from other users`);
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`  ✓ Removed: ${key}`);
      });
    }
  }, [userProfile]);

  // Restore progress - runs after both examData and userProfile are loaded
  // Also handles case when userProfile fails to load
  useEffect(() => {
    // If already restored, don't run again
    if (progressRestored) return;
    
    // Need examData to proceed
    if (!examData) return;
    
    // If no user profile after 3 seconds of having examData, proceed without restoration
    const timeoutId = setTimeout(() => {
      if (!progressRestored && examData && !userProfile?._id) {
        console.log('No user profile available, skipping progress restoration');
        setProgressRestored(true);
        setLoading(false);
      }
    }, 3000);
    
    // If we have both examData and userProfile, restore progress
    if (userProfile?._id) {
      clearTimeout(timeoutId);
      
      const restoreProgress = async () => {
        const currentUserId = userProfile._id;
        console.log('=== RESTORING PROGRESS FOR USER:', currentUserId, '===');

      // Build flat question list with indices for mapping
      const allQuestions = [];
      Object.values(examData.questions || {}).forEach(sessionQuestions => {
        sessionQuestions.forEach(q => allQuestions.push(q));
      });

      // RESTORE FROM BACKEND FIRST (source of truth)
      let restoredFromBackend = false;
      try {
        const serverAnswers = await api.get(`/questions/user-answers/${examId}`);
        console.log('Backend answers response:', serverAnswers.data);

        if (serverAnswers.data?.data && Object.keys(serverAnswers.data.data).length > 0) {
          const answersData = serverAnswers.data.data;
          const restoredAnswers = {};
          const restoredVerified = {};

          // Map question IDs to indices and restore ALL answers (verified and unverified)
          Object.entries(answersData).forEach(([qId, answerData]) => {
            const qIndex = allQuestions.findIndex(q => q._id === qId);
            if (qIndex !== -1 && answerData.selectedAnswers?.length > 0) {
              restoredAnswers[qIndex] = answerData.selectedAnswers;
              if (answerData.isVerified) {
                restoredVerified[qIndex] = {
                  verified: true,
                  isCorrect: answerData.isCorrect
                };
              }
            }
          });

          // Update state with backend data
          if (Object.keys(restoredAnswers).length > 0) {
            setSelectedAnswers(restoredAnswers);
            restoredFromBackend = true;
            console.log(`✓ Restored ${Object.keys(restoredAnswers).length} answers from backend`);
          }
          if (Object.keys(restoredVerified).length > 0) {
            setVerifiedQuestions(restoredVerified);
            console.log(`✓ Restored ${Object.keys(restoredVerified).length} verified questions from backend`);
          }
        } else {
          console.log('No backend answers found');
        }
      } catch (serverErr) {
        console.error('Could not fetch server answers:', serverErr);
      }

      // RESTORE FROM LOCALSTORAGE (for UI state like currentQ, timeSpent, flags)
      // Only use localStorage for answers if backend had none
      const storageKey = `exam_progress_${currentUserId}_${examType}_${examId}`;
      const savedProgress = localStorage.getItem(storageKey);
      console.log('LocalStorage key:', storageKey);
      console.log('LocalStorage data:', savedProgress);

      if (savedProgress) {
        try {
          const { answers, currentQ, timeSpent, flags, verified, userId: storedUserId } = JSON.parse(savedProgress);

          // Validate that stored data belongs to current user
          if (storedUserId === currentUserId) {
            // Always restore UI state
            if (currentQ !== undefined && currentQ !== null) {
              setCurrentQuestion(currentQ);
              setVisitedQuestions(prev => new Set([...prev, currentQ]));
            }
            if (timeSpent !== undefined && timeSpent !== null) {
              setTimeElapsed(timeSpent);
            }
            if (flags && Array.isArray(flags)) {
              setFlaggedQuestions(new Set(flags));
            }
            console.log(`✓ Restored UI state: question ${currentQ}, time ${timeSpent}s, ${flags?.length || 0} flags`);

            // Only use localStorage answers if backend didn't have any
            if (!restoredFromBackend && answers && Object.keys(answers).length > 0) {
              setSelectedAnswers(answers);
              console.log(`✓ Restored ${Object.keys(answers).length} answers from localStorage (fallback)`);
            }

            // Merge verified state (backend takes precedence)
            if (verified && Object.keys(verified).length > 0 && !restoredFromBackend) {
              setVerifiedQuestions(verified);
              console.log(`✓ Restored ${Object.keys(verified).length} verified from localStorage`);
            }
          } else {
            // Data belongs to different user, clear it
            console.log('⚠ Clearing stale localStorage data from different user');
            localStorage.removeItem(storageKey);
          }
        } catch (err) {
          console.error('Error parsing saved progress:', err);
          localStorage.removeItem(storageKey);
        }
      } else {
        console.log('No localStorage data found');
      }

      setProgressRestored(true);
      setLoading(false); // Now safe to show the exam
      console.log('=== PROGRESS RESTORATION COMPLETE ===');
    };

    restoreProgress();
    }
    
    return () => clearTimeout(timeoutId);
  }, [examData, userProfile, examId, examType, progressRestored]);

  // Get all questions in exam/session order, sorted by questionNumber within each group
  // MOVED HERE: Must be defined before effects that use it
  const questions = useMemo(() => {
    if (!examData?.questions) return [];
    const allQuestions = [];

    Object.entries(examData.questions).forEach(([sessionName, sessionQuestions]) => {
      // Keep each exam/session contiguous. A global questionNumber sort would
      // interleave Q1, Q2, etc. from different exams.
      const sortedSessionQuestions = sessionQuestions
        .map((question, originalIndex) => ({ question, originalIndex }))
        .sort((a, b) => {
          const hasNumA = a.question.questionNumber != null;
          const hasNumB = b.question.questionNumber != null;

          if (hasNumA && hasNumB) {
            return (a.question.questionNumber - b.question.questionNumber)
              || (a.originalIndex - b.originalIndex);
          }
          if (hasNumA) return -1;
          if (hasNumB) return 1;
          return a.originalIndex - b.originalIndex;
        })
        .map(({ question }) => question);

      sortedSessionQuestions.forEach(q => {
        allQuestions.push({ ...q, sessionLabel: sessionName });
      });
    });

    // Assign displayNumber to each question (1-indexed position)
    return allQuestions.map((q, idx) => ({
      ...q,
      displayNumber: q.questionNumber || (idx + 1)
    }));
  }, [examData]);

  // Keep the questions length ref updated for navigation functions
  useEffect(() => {
    questionsLengthRef.current = questions.length;
    console.log('Questions length updated:', questions.length);
  }, [questions.length]);

  // Keep track of current question for debugging
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
    console.log('Current question state changed to:', currentQuestion);
  }, [currentQuestion]);

  // Mark as unsaved when answers change
  useEffect(() => {
    if (examData && !showResults) {
      setHasUnsavedChanges(true);
    }
  }, [selectedAnswers, flaggedQuestions, verifiedQuestions]);

  // Auto-save progress (including verified state) - debounced
  useEffect(() => {
    // Guard: ensure all required data is ready
    if (!examData || showResults || !userProfile?._id || !questions || questions.length === 0) {
      console.log('Auto-save skipped:', { examData: !!examData, showResults, userProfile: !!userProfile, questions: questions?.length });
      return;
    }

    const saveProgress = async () => {
      console.log('=== AUTO-SAVE TRIGGERED ===');
      
      // Find only answers that changed since last save
      const changedAnswers = {};
      Object.keys(selectedAnswers).forEach(qIndex => {
        const current = JSON.stringify(selectedAnswers[qIndex]);
        const previous = JSON.stringify(lastSavedAnswers[qIndex]);
        if (current !== previous) {
          changedAnswers[qIndex] = selectedAnswers[qIndex];
        }
      });

      // Also check for removed answers
      Object.keys(lastSavedAnswers).forEach(qIndex => {
        if (!selectedAnswers[qIndex] && lastSavedAnswers[qIndex]) {
          changedAnswers[qIndex] = []; // Mark as removed
        }
      });

      console.log('Changed answers:', Object.keys(changedAnswers).length);
      console.log('Has unsaved changes:', hasUnsavedChanges);

      // If no changes, skip save
      if (Object.keys(changedAnswers).length === 0) {
        console.log('No changes to save');
        return;
      }

      setIsSaved(false);
      try {
        const currentUserId = userProfile._id;
        const progress = {
          userId: currentUserId,
          answers: selectedAnswers,
          currentQ: currentQuestion,
          timeSpent: timeElapsed,
          flags: Array.from(flaggedQuestions),
          verified: verifiedQuestions
        };

        // Save to localStorage first (fast, immediate)
        const storageKey = `exam_progress_${currentUserId}_${examType}_${examId}`;
        localStorage.setItem(storageKey, JSON.stringify(progress));
        console.log('✓ Saved to localStorage:', storageKey);

        // Save only CHANGED unverified answers to backend
        const answersToSave = Object.keys(changedAnswers)
          .filter(qIndex => {
            const hasAnswer = changedAnswers[qIndex]?.length > 0;
            const isVerified = verifiedQuestions[qIndex]?.verified || verifiedQuestions[qIndex] === true;
            return hasAnswer && !isVerified;
          })
          .map(qIndex => ({
            questionId: questions[qIndex]?._id,
            selectedAnswers: changedAnswers[qIndex],
            isVerified: false,
            isCorrect: false,
            examId: examData._id || examId,
            moduleId: examData.module?._id || examData.moduleId
          }))
          .filter(item => item.questionId);

        console.log('Answers to save to backend:', answersToSave.length);

        // Batch save changed answers to backend
        if (answersToSave.length > 0) {
          const results = await Promise.allSettled(
            answersToSave.map(answerData =>
              api.post('/questions/save-answer', answerData)
            )
          );

          const succeeded = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          console.log(`✓ Saved ${succeeded} answers to backend, ${failed} failed`);

          if (failed > 0) {
            results.forEach((r, i) => {
              if (r.status === 'rejected') {
                console.error('Failed to save answer:', answersToSave[i], r.reason);
              }
            });
          }
        }

        // Update lastSavedAnswers to current state
        setLastSavedAnswers(JSON.parse(JSON.stringify(selectedAnswers)));
        
        setIsSaved(true);
        setLastSaveTime(new Date());
        setHasUnsavedChanges(false);
        console.log('=== AUTO-SAVE COMPLETE ===');
      } catch (error) {
        console.error('Failed to save progress:', error);
        setIsSaved(false);
      }
    };

    const saveTimer = setTimeout(saveProgress, 1000); // Increased to 1s for stability
    return () => clearTimeout(saveTimer);
  }, [selectedAnswers, currentQuestion, flaggedQuestions, verifiedQuestions, examId, examData, showResults, examType, timeElapsed, userProfile, questions, hasUnsavedChanges, lastSavedAnswers]);

  // Persist the cumulative timer server-side. The API only adds the delta for
  // this study session, so repeated requests and cleanup requests are safe.
  useEffect(() => {
    if (!examData || showResults || !userProfile?._id) return;

    const currentUserId = userProfile._id;
    const storageKey = `exam_progress_${currentUserId}_${examType}_${examId}`;
    const sessionStorageKey = `exam_study_session_${currentUserId}_${examType}_${examId}`;
    let studySessionId;

    try {
      studySessionId = sessionStorage.getItem(sessionStorageKey);
      if (!studySessionId) {
        studySessionId = window.crypto?.randomUUID?.()
          || `study_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(sessionStorageKey, studySessionId);
      }
    } catch {
      studySessionId = `study_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    const persistElapsedTime = () => {
      const elapsedSeconds = Math.max(0, Math.floor(timeElapsedRef.current));

      try {
        const savedProgress = localStorage.getItem(storageKey);
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);
          // Validate user before updating
          if (progress.userId === currentUserId) {
            progress.timeSpent = timeElapsed;
            progress.currentQ = currentQuestionRef.current; // Also update current question
            localStorage.setItem(storageKey, JSON.stringify(progress));
          }
        }
      } catch (error) {
        console.error('Failed to save time:', error);
      }

      if (elapsedSeconds > 0) {
        api.post('/users/study-time', { sessionId: studySessionId, elapsedSeconds })
          .catch((error) => console.error('Failed to record study time:', error));
      }
    };

    const timeUpdateTimer = setInterval(persistElapsedTime, 30000);

    return () => {
      clearInterval(timeUpdateTimer);
      persistElapsedTime();
    };
  }, [examData, showResults, examType, examId, userProfile?._id]);

  // Warn before leaving - only if there are actual unsaved changes
  useEffect(() => {
    if (!examData || showResults) return;

    const handleBeforeUnload = (e) => {
      // Save all verified answers to backend before leaving
      if (Object.keys(verifiedQuestions).length > 0) {
        const verifiedAnswers = Object.keys(verifiedQuestions)
          .filter(qIndex => {
            const v = verifiedQuestions[qIndex];
            return v?.verified || v === true;
          })
          .map(qIndex => ({
            questionId: questions[qIndex]?._id,
            selectedAnswers: selectedAnswers[qIndex] || [],
            isVerified: true,
            isCorrect: verifiedQuestions[qIndex]?.isCorrect || false,
            examId: examData._id || examId,
            moduleId: examData.module?._id || examData.moduleId
          }))
          .filter(item => item.questionId);

        // Use sendBeacon for reliable data transmission even if tab closes
        if (verifiedAnswers.length > 0) {
          try {
            // Save to localStorage as fallback
            const currentUserId = userProfile?._id;
            if (currentUserId) {
              const storageKey = `exam_progress_${currentUserId}_${examType}_${examId}`;
              const progress = JSON.parse(localStorage.getItem(storageKey) || '{}');
              progress.verified = verifiedQuestions;
              localStorage.setItem(storageKey, JSON.stringify(progress));
            }
          } catch (error) {
            console.error('Failed to save verified answers:', error);
          }
        }
      }

      // Only warn if there are unsaved unverified answers
      if (hasUnsavedChanges && Object.keys(selectedAnswers).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, showResults, examData, selectedAnswers, verifiedQuestions, questions, userProfile, examType, examId]);

  const currentQuestionData = questions[currentQuestion];

  // Helper to check if we should show number in the colored box
  // If questionNumber exists from Excel, don't show it in box (it's already in Q-label)
  const shouldShowNumberInBox = (questionData) => {
    if (!questionData) return true;
    // If questionNumber exists from Excel import, don't show in box
    return !questionData.questionNumber;
  };

  // Format time with color states
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeElapsed > 3600) return 'text-red-600 bg-red-50 border-red-200';
    if (timeElapsed > 1800) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  // Handle answer selection - always allow multi-select
  const handleAnswerSelect = useCallback((questionIndex, optionIndex) => {
    const question = questions[questionIndex];
    if (!question || showResults) return;

    // Don't allow answering annulled questions
    if (question.isAnnulled) return;

    // Check if question is already verified - don't allow changes
    const verifiedData = verifiedQuestions[questionIndex];
    const isVerified = verifiedData?.verified || verifiedData === true;
    if (isVerified) return;

    setAnswerAnimation({ questionIndex, optionIndex });
    setTimeout(() => setAnswerAnimation(null), 300);

    // Use functional update to avoid stale closure issues
    setSelectedAnswers(prevAnswers => {
      const current = prevAnswers[questionIndex] || [];
      const updated = current.includes(optionIndex)
        ? current.filter(i => i !== optionIndex)
        : [...current, optionIndex];

      // Remove the key if no answers selected, otherwise update it
      const newAnswers = { ...prevAnswers };
      if (updated.length === 0) {
        delete newAnswers[questionIndex];
      } else {
        newAnswers[questionIndex] = updated;
      }
      return newAnswers;
    });

    playSound('select');
  }, [questions, showResults, verifiedQuestions, playSound]);

  // Toggle flag
  const toggleFlag = useCallback((index) => {
    const newFlags = new Set(flaggedQuestions);
    if (newFlags.has(index)) {
      newFlags.delete(index);
      toast.info(t('dashboard:flag_removed') || 'Flag removed');
    } else {
      newFlags.add(index);
      toast.warning(t('dashboard:question_flagged') || 'Question flagged for review');
    }
    setFlaggedQuestions(newFlags);
    playSound('flag');
  }, [flaggedQuestions, playSound, t]);

  // Verify current question - show answer and award points
  // Points: +2 for correct, +0 for wrong (no toast messages for points)
  const handleVerifyQuestion = useCallback(async (e) => {
    // Prevent default behavior and form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent double-click
    if (isVerifying) {
      console.log('Already verifying, ignoring click');
      return;
    }

    console.log('=== VERIFY BUTTON CLICKED ===');
    console.log('Current Question:', currentQuestion);
    console.log('Selected Answers:', selectedAnswers[currentQuestion]);
    console.log('Questions array:', questions.length);

    const questionData = questions[currentQuestion];
    console.log('Question Data:', questionData);

    // Check if user has selected an answer
    if (!selectedAnswers[currentQuestion] || selectedAnswers[currentQuestion].length === 0) {
      console.warn('No answer selected!');
      toast.warning('Veuillez sélectionner une réponse avant de vérifier');
      return;
    }

    // Check if already verified
    if (verifiedQuestions[currentQuestion]?.verified) {
      console.log('Question already verified');
      return;
    }

    // Annulled questions should not be verifiable
    if (questionData?.isAnnulled) {
      console.log('Question is annulled, skipping verification');
      return;
    }

    setIsVerifying(true);

    try {
      // Calculate if answer is correct locally for immediate visual feedback
      const userAnswers = selectedAnswers[currentQuestion] || [];
      const correctIndices = questionData.options
        .map((opt, idx) => opt.isCorrect ? idx : null)
        .filter(idx => idx !== null);
      const isCorrectAnswer = userAnswers.length === correctIndices.length &&
        userAnswers.every(ans => correctIndices.includes(ans));

      // Immediately mark as verified with isCorrect status for visual feedback
      playSound(isCorrectAnswer ? 'correct' : 'incorrect');

      setVerifiedQuestions(prev => {
        const updated = {
          ...prev,
          [currentQuestion]: {
            verified: true,
            isCorrect: isCorrectAnswer
          }
        };
        console.log('Updated verifiedQuestions:', updated);
        return updated;
      });

      console.log('Local verification complete:', isCorrectAnswer ? 'CORRECT' : 'INCORRECT');

      // Fetch community voting stats for this question (non-blocking)
      api.get(`questions/community-votes/${questionData._id}`)
        .then(statsResponse => {
          if (statsResponse.data.success) {
            setCommunityStats(prev => ({
              ...prev,
              [currentQuestion]: statsResponse.data.data.voteStats
            }));
          }
        })
        .catch(error => console.error('Failed to fetch community stats:', error));

      // Call backend to verify answer and award points (no toast messages)
      const response = await api.post('/questions/verify-answer', {
        questionId: questionData._id,
        selectedAnswers: userAnswers,
        examId: examId,
        moduleId: examData?.moduleId,
        isRetry: false
      });

      const { isCorrect, pointsAwarded, totalPoints } = response.data.data;
      console.log('Backend verification:', { isCorrect, pointsAwarded, totalPoints });

      // Update user profile points in state silently (no toast)
      if (totalPoints !== undefined) {
        setUserProfile(prev => prev ? ({
          ...prev,
          totalPoints: totalPoints
        }) : prev);
      }

      // Save answer for persistence
      const saveResponse = await api.post('/questions/save-answer', {
        questionId: questionData._id,
        selectedAnswers: userAnswers,
        isVerified: true,
        isCorrect,
        examId: examId,
        moduleId: examData?.moduleId
      });

      publishExamCompletedCount(
        examId,
        saveResponse.data?.data?.completedQuestions,
      );
      dashboardService.clearCache();

      console.log('=== VERIFICATION COMPLETE ===');

    } catch (error) {
      console.error('Error verifying answer:', error);
      toast.error('Erreur lors de la vérification');
      // Keep local verified state even if API fails
    } finally {
      setIsVerifying(false);
    }
  }, [currentQuestion, selectedAnswers, questions, examId, examData, playSound, isVerifying, verifiedQuestions]);

  // Reset current question verification (Ressayer) - costs 1 point
  const handleResetQuestion = useCallback(async (e) => {
    // Prevent default behavior and form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const questionData = questions[currentQuestion];

    // Call backend to deduct point for retry
    try {
      const response = await api.post('/questions/verify-answer', {
        questionId: questionData._id,
        selectedAnswers: [],
        examId: examId,
        moduleId: examData?.moduleId,
        isRetry: true
      });

      const { totalPoints } = response.data.data;

      // Update user profile points
      if (userProfile) {
        setUserProfile(prev => ({
          ...prev,
          totalPoints: totalPoints // Use totalPoints for consistency with TopBar
        }));
      }

      // Don't show -1 point message to user (hidden penalty)

    } catch (error) {
      console.error('Error recording retry:', error);
    }

    // Reset local state
    setSelectedAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[currentQuestion];
      return newAnswers;
    });
    setVerifiedQuestions(prev => {
      const newVerified = { ...prev };
      delete newVerified[currentQuestion];
      return newVerified;
    });
  }, [currentQuestion, questions, examId, examData, userProfile]);

  // Check if current question is verified (now verifiedQuestions stores object with verified and isCorrect)
  const isQuestionVerified = useMemo(() => {
    const verifiedData = verifiedQuestions[currentQuestion];
    const isVerified = verifiedData?.verified === true || verifiedData === true;
    console.log('isQuestionVerified check - question:', currentQuestion, 'verifiedData:', verifiedData, 'result:', isVerified);
    return isVerified;
  }, [verifiedQuestions, currentQuestion]);

  // Calculate current question position within its session (for counter display)
  const sessionQuestionInfo = useMemo(() => {
    const currentQData = questions[currentQuestion];
    if (!currentQData) return { position: 0, total: 0, sessionName: '' };
    
    const currentSession = currentQData.sessionLabel;
    const sessQuestions = questions.filter(q => q.sessionLabel === currentSession);
    const position = sessQuestions.findIndex(q => q._id === currentQData._id) + 1;
    
    return {
      position,
      total: sessQuestions.length,
      sessionName: currentSession
    };
  }, [questions, currentQuestion]);

  // Font size controls
  const adjustFontSize = useCallback((delta) => {
    const newSize = Math.min(24, Math.max(12, fontSize + delta));
    setFontSize(newSize);
    localStorage.setItem('examFontSize', newSize.toString());
  }, [fontSize]);

  // Navigation - Move through all questions
  const goToNext = useCallback(() => {
    const questionsLength = questionsLengthRef.current;
    const current = currentQuestionRef.current;
    console.log('goToNext called, questions.length:', questionsLength, 'current:', current);
    
    if (current < questionsLength - 1) {
      const nextQ = current + 1;
      console.log('goToNext: moving from', current, 'to', nextQ);
      setQuestionTransition('next');
      setCurrentQuestion(nextQ);
      setVisitedQuestions(prev => new Set([...prev, nextQ]));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.log('goToNext: already at last question');
    }
  }, []);

  const goToPrevious = useCallback(() => {
    const current = currentQuestionRef.current;
    console.log('goToPrevious called, current:', current);
    
    if (current > 0) {
      const prevQ = current - 1;
      console.log('goToPrevious: moving from', current, 'to', prevQ);
      setQuestionTransition('prev');
      setCurrentQuestion(prevQ);
      setVisitedQuestions(prev => new Set([...prev, prevQ]));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.log('goToPrevious: already at first question');
    }
  }, []);

  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      console.log('goToQuestion: jumping to', index);
      setCurrentQuestion(prevQuestion => {
        setQuestionTransition(index > prevQuestion ? 'next' : 'prev');
        setVisitedQuestions(prev => new Set([...prev, index]));
        return index;
      });
    }
    setShowSidebar(false);
    setShowMobileQuestionNav(false);
  }, [questions.length]);

  // Touch/Swipe handlers for mobile navigation
  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Use goToNext/goToPrevious which handle state updates properly
    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  }, [touchStart, touchEnd, goToNext, goToPrevious]);

  // Calculate score
  const calculateScore = useCallback(() => {
    let correct = 0;
    questions.forEach((question, index) => {
      const userAnswers = selectedAnswers[index] || [];
      const correctAnswers = question.options
        .map((opt, i) => opt.isCorrect ? i : -1)
        .filter(i => i !== -1);

      const isCorrect = userAnswers.length === correctAnswers.length &&
        userAnswers.every(ans => correctAnswers.includes(ans));

      if (isCorrect) correct++;
    });
    return { correct, total: questions.length };
  }, [questions, selectedAnswers]);

  // Submit exam
  const handleSubmit = useCallback(() => {
    setShowResults(true);
    setShowConfirmSubmit(false);

    // Clear user-specific localStorage
    const currentUserId = userProfile?._id;
    if (currentUserId) {
      const storageKey = `exam_progress_${currentUserId}_${examType}_${examId}`;
      localStorage.removeItem(storageKey);
    }

    const score = calculateScore();
    const percentage = Math.round((score.correct / score.total) * 100);

    // Trigger confetti for good scores
    if (percentage >= 70) {
      triggerConfetti();
    }

    playSound('complete');
    toast.success(t('dashboard:exam_completed') || 'Exam completed!', {
      icon: <Trophy className="h-4 w-4 text-yellow-500" />
    });
  }, [examId, examType, playSound, t, calculateScore]);

  // Retry exam
  const handleRetry = useCallback(() => {
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setTimeElapsed(0);
    setShowResults(false);
    setFlaggedQuestions(new Set());

    // Clear user-specific localStorage
    const currentUserId = userProfile?._id;
    if (currentUserId) {
      const storageKey = `exam_progress_${currentUserId}_${examType}_${examId}`;
      localStorage.removeItem(storageKey);
    }

    toast.info(t('dashboard:new_attempt_started') || 'New attempt started');
  }, [examId, examType, t, userProfile]);

  const score = useMemo(() => calculateScore(), [calculateScore]);

  // Convert selectedAnswers to a string for dependency tracking (ensures re-render on changes)
  const selectedAnswersString = useMemo(() => {
    return JSON.stringify(selectedAnswers);
  }, [selectedAnswers]);

  // Count only questions with actual answers (not empty arrays)
  const answeredCount = useMemo(() => {
    // Parse the stringified answers to ensure fresh calculation
    const answers = JSON.parse(selectedAnswersString);
    return Object.entries(answers).filter(([_, ans]) => ans && ans.length > 0).length;
  }, [selectedAnswersString]);

  const progress = useMemo(() => {
    const total = Math.max(questions.length, 1);
    return (answeredCount / total) * 100;
  }, [answeredCount, questions.length]);

  // Get question status with enhanced colors
  const getQuestionStatus = useCallback((index) => {
    const hasAnswer = selectedAnswers[index]?.length > 0;
    const verifiedData = verifiedQuestions[index];
    const isVerified = verifiedData?.verified || verifiedData === true;
    const isFlagged = flaggedQuestions.has(index);
    const isVisited = visitedQuestions.has(index);

    // Surligné (purple) - flagged questions (highest priority for display)
    if (isFlagged) {
      return { status: 'flagged', isFlagged: true, isVisited };
    }

    // Vérifié et correct (green)
    if (isVerified && verifiedData?.isCorrect) {
      return { status: 'correct', isFlagged, isVisited };
    }

    // Vérifié mais incorrect (red)
    if (isVerified && !verifiedData?.isCorrect) {
      return { status: 'incorrect', isFlagged, isVisited };
    }

    // Visité (orange) - visited but not verified
    if (isVisited || hasAnswer) {
      return { status: 'visited', isFlagged, isVisited: true };
    }

    // Non visité (gray)
    return { status: 'unanswered', isFlagged, isVisited: false };
    // Use selectedAnswersString for dependency tracking to ensure updates when answers change
  }, [selectedAnswers, selectedAnswersString, flaggedQuestions, questions, showResults, verifiedQuestions, visitedQuestions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
          if (!showResults) goToNext();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'f':
        case 'F':
          toggleFlag(currentQuestion);
          break;
        case 'Enter':
          const verifiedData = verifiedQuestions[currentQuestion];
          const isAlreadyVerified = verifiedData?.verified || verifiedData === true;
          if (!showResults && !isAlreadyVerified) {
            e.preventDefault();
            handleVerifyQuestion(e);
          }
          break;
        case '1': case '2': case '3': case '4': case '5':
          if (!showResults && currentQuestionData?.options[parseInt(e.key) - 1]) {
            handleAnswerSelect(currentQuestion, parseInt(e.key) - 1);
          }
          break;
        case '?':
          setShowKeyboardShortcuts(true);
          break;
        case 'Escape':
          setShowKeyboardShortcuts(false);
          setShowSidebar(false);
          setShowConfirmSubmit(false);
          setShowImageZoom(false);
          setShowImageGallery(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, goToNext, goToPrevious, toggleFlag, handleAnswerSelect, showResults, currentQuestionData, verifiedQuestions, handleVerifyQuestion]);

  // Auto-expand current question's session in sidebar when sidebar opens
  useEffect(() => {
    if (showSidebar && questions.length > 0) {
      const currentQ = questions[currentQuestion];
      if (currentQ?.sessionLabel) {
        // Expand the session containing the current question
        setCollapsedSessions(prev => {
          const newCollapsed = new Set(prev);
          newCollapsed.delete(currentQ.sessionLabel);
          return newCollapsed;
        });
        
        // Scroll to the current question item
        setTimeout(() => {
          const currentQuestionElement = document.querySelector(`[data-question-id="${currentQ._id}"]`);
          if (currentQuestionElement) {
            currentQuestionElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
    }
  }, [showSidebar, currentQuestion, questions]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-pulse mx-auto" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-800">{t('dashboard:exam_loading') || 'Loading exam...'}</h3>
            <p className="text-gray-500">{t('dashboard:preparing_questions') || 'Preparing your questions'}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !currentQuestionData) {
    if (error === 'FREE_PLAN_EXAM_LIMIT') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg"
          >
            <Card className="shadow-2xl border border-border bg-card text-card-foreground rounded-3xl overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Examen Réservé aux Membres Premium</h3>
                    <p className="text-white/90 text-xs">Accès limité avec le plan gratuit</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    Votre compte gratuit vous donne accès à <strong>un seul examen</strong> choisi lors de votre inscription. Pour débloquer l'ensemble des examens, modules, banques de QCM et explications détaillées, passez au plan Premium.
                  </p>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                    <p className="font-bold text-amber-800 dark:text-amber-300">Ce que débloque le plan Premium :</p>
                    <ul className="space-y-1 text-amber-900/80 dark:text-amber-200/80">
                      <li>• Accès illimité à tous les modules et examens</li>
                      <li>• Explications IA et communauté de vote</li>
                      <li>• Playlists personnalisées & notes illimitées</li>
                      <li>• Classement général & statistiques avancées</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <Button
                    onClick={() => navigate('/dashboard/subscription')}
                    size="lg"
                    className="w-full gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-orange-500/20"
                  >
                    <Zap className="h-4 w-4" />
                    Découvrir les offres Premium
                  </Button>

                  <Button
                    onClick={() => navigate('/select-semester')}
                    variant="outline"
                    className="w-full gap-2 rounded-xl border-border hover:bg-muted"
                  >
                    <BookOpen className="h-4 w-4" />
                    Changer mon examen gratuit
                  </Button>

                  <Button
                    onClick={handleGoBack}
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    Retour
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <Card className="shadow-2xl border-0 overflow-hidden">
            <div
              className="p-6 text-white"
              style={{
                background: `linear-gradient(to right, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t('dashboard:oops') || 'Oups !'}</h3>
                  <p className="text-white/80 text-sm">{t('dashboard:exam_unavailable') || 'Examen non disponible'}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <p className="text-foreground leading-relaxed">
                  {t('dashboard:exam_not_available_msg') || "Désolé, cet examen n'est pas disponible pour le moment. Cela peut arriver pour plusieurs raisons :"}
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5" style={{ color: moduleColor }}>•</span>
                    <span>{t('dashboard:exam_removed') || "L'examen a peut-être été supprimé ou déplacé"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5" style={{ color: moduleColor }}>•</span>
                    <span>{t('dashboard:exam_temp_unavailable') || "Le contenu est temporairement indisponible"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5" style={{ color: moduleColor }}>•</span>
                    <span>{t('dashboard:exam_access_issue') || "Vous n'avez peut-être pas accès à ce contenu"}</span>
                  </li>
                </ul>
              </div>

              <div
                className="border rounded-lg p-4"
                style={{
                  backgroundColor: `${moduleColor}10`,
                  borderColor: `${moduleColor}30`
                }}
              >
                <p className="text-sm flex items-start gap-2" style={{ color: adjustColor(moduleColor, -60) }}>
                  <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{t('dashboard:try_refresh') || "Essayez de rafraîchir la page ou retournez au tableau de bord pour explorer d'autres contenus."}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t('dashboard:refresh_page') || 'Actualiser'}
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/home')}
                  className="flex-1 gap-2 text-white"
                  style={{
                    background: `linear-gradient(to right, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
                  }}
                >
                  <Home className="h-4 w-4" />
                  {t('dashboard:back_to_dashboard') || 'Tableau de bord'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const isMultipleChoice = currentQuestionData.options.filter(opt => opt.isCorrect).length > 1;
  const flaggedCount = flaggedQuestions.size;

  // Calculate verified stats for mobile header
  const verifiedCount = Object.keys(verifiedQuestions).filter(key => {
    const v = verifiedQuestions[key];
    return v?.verified || v === true;
  }).length;
  const correctCount = questions.filter((_, i) => {
    const verifiedData = verifiedQuestions[i];
    const isVerified = verifiedData?.verified || verifiedData === true;
    if (!isVerified) return false;

    // Use stored isCorrect if available
    if (verifiedData?.isCorrect !== undefined) {
      return verifiedData.isCorrect;
    }

    // Fallback to calculation
    const selected = selectedAnswers[i] || [];
    const correctIndices = questions[i].options
      .map((opt, idx) => opt.isCorrect ? idx : null)
      .filter(idx => idx !== null);
    return selected.length === correctIndices.length &&
      selected.every(s => correctIndices.includes(s));
  }).length;

  return (
    <div className="exam-workspace min-h-screen bg-background pb-20 lg:pb-0">
      {/* ============== MOBILE RESULTS BANNER ============== */}
      {showResults && (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white safe-area-pt">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-white/70">Examen terminé</p>
                  <p className="text-2xl font-bold">
                    {Math.round((score.correct / score.total) * 100)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{score.correct}/{score.total}</p>
                <p className="text-xs text-white/70">réponses correctes</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-2 px-3 rounded-lg bg-white/20 text-white text-sm font-medium flex items-center justify-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Recommencer
              </button>
              <button
                onClick={() => navigate('/dashboard/home')}
                className="flex-1 py-2 px-3 rounded-lg bg-card text-primary text-sm font-medium flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Accueil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== MOBILE HEADER ============== */}
      <header className={cn(
        "lg:hidden bg-card/95 border-b border-border sticky top-0 z-40 shadow-sm backdrop-blur-xl w-full",
        showResults && "mt-32" // Add margin when results banner is showing
      )}>
        {/* Single compact row */}
        <div className="flex items-center justify-between gap-1.5 px-2 py-1.5">
          {/* Left: Menu + Exit */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSidebar(true)}
              className="flex items-center justify-center p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 active:bg-primary/30 transition-colors text-primary border border-primary/20"
              aria-label="Show questions"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              onClick={handleExitWithSave}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 active:bg-muted transition-colors text-foreground border border-border"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Exit</span>
            </button>
          </div>

          {/* Center: Timer + Progress */}
          <div className="flex items-center gap-1.5 flex-1 justify-center">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 font-mono text-[10px] px-1.5 py-0.5 transition-colors",
                getTimeColor()
              )}
            >
              <Timer className="h-3 w-3" />
              <span>{formatTime(timeElapsed)}</span>
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Q{sessionQuestionInfo.position}/{sessionQuestionInfo.total}
            </span>
            {isSaved ? (
              <Cloud className="h-3 w-3 text-emerald-500" />
            ) : (
              <CloudOff className="h-3 w-3 text-amber-500 animate-pulse" />
            )}

          </div>

          {/* Right: Verified count only */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" />
              {verifiedCount}
            </span>
          </div>
        </div>

        {/* Thin progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full"
            style={{
              background: `linear-gradient(to right, ${moduleColor}, ${adjustColor(moduleColor, -20)})`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* ============== DESKTOP HEADER ============== */}
      <header className="hidden lg:block bg-card/95 backdrop-blur-xl border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16">
            {/* Left Section - Menu button far left */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
              {/* Exit Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitWithSave}
                className="gap-1.5 text-foreground hover:bg-muted border-border"
              >
                <LogOut className="h-4 w-4" />
                <span>Exit</span>
              </Button>

              {/* Timer Badge */}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 font-mono text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 transition-colors",
                  getTimeColor()
                )}
              >
                <Timer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>{formatTime(timeElapsed)}</span>
              </Badge>

              {/* Save Status Indicator */}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 transition-all",
                  isSaved ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                )}
              >
                {isSaved ? (
                  <Cloud className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ) : (
                  <CloudOff className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-pulse" />
                )}
                <span className="hidden sm:inline">{isSaved ? 'Enregistré' : 'Enregistrement...'}</span>
              </Badge>
            </div>

            {/* Right Section - Font controls + Verify Shortcut + Profile */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Font Size Controls Popup */}
              <div className="relative">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-card text-foreground"
                    onClick={() => adjustFontSize(-2)}
                    disabled={fontSize <= 12}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs px-2 font-medium text-foreground min-w-[40px] text-center">
                    {fontSize}px
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-card text-foreground"
                    onClick={() => adjustFontSize(2)}
                    disabled={fontSize >= 24}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Verify Shortcut Button (Enter key) */}
              {/* Keyboard Shortcuts Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="gap-2 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 shadow-sm transition-all"
                  variant="outline"
                  title="Voir tous les raccourcis clavier"
                >
                  <Keyboard className="h-4 w-4" />
                  <span className="text-xs font-semibold">Raccourcis</span>
                </Button>
              </motion.div>

              {/* Vue d'ensemble Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setShowVueEnsemble(true)}
                  className="gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 shadow-sm transition-all"
                  variant="outline"
                  title="Voir l'aperçu des questions"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-xs font-semibold">Vue d'ensemble</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full"
            style={{
              background: `linear-gradient(to right, ${moduleColor}, ${adjustColor(moduleColor, -20)})`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8">
        <div className="grid lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block lg:col-span-1 h-full">
            <Card className="sticky top-24 border-border bg-card shadow-lg overflow-hidden flex flex-col h-[calc(100vh-7rem)]">
              <CardContent className="p-0 flex-1 overflow-hidden min-h-0 flex flex-col">
                {/* Legend Section - Moved to Top */}
                <div className="border-b border-border px-3 py-3 bg-muted/30 shrink-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px]">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-muted border border-border"></div>
                      <span className="text-muted-foreground">non visité</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40"></div>
                      <span className="text-muted-foreground">visité</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40"></div>
                      <span className="text-muted-foreground">correct</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40"></div>
                      <span className="text-muted-foreground">incorrect</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/40"></div>
                      <span className="text-muted-foreground">surligné</span>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-full flex-1">
                  <div className="p-3 space-y-2">
                    {Object.entries(examData.questions || {}).map(([sessionName, sessionQuestions]) => {
                      const isCollapsed = collapsedSessions.has(sessionName);
                      return (
                        <div key={sessionName} className="space-y-1">
                          <button
                            onClick={() => {
                              const newCollapsed = new Set(collapsedSessions);
                              if (isCollapsed) {
                                newCollapsed.delete(sessionName);
                              } else {
                                newCollapsed.add(sessionName);
                              }
                              setCollapsedSessions(newCollapsed);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "transition-transform duration-200",
                                !isCollapsed && "rotate-90"
                              )}>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm text-foreground">{sessionName}</span>
                            </div>
                            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                              {sessionQuestions.length}
                            </Badge>
                          </button>
                          {!isCollapsed && (
                            <div className="pl-2 flex flex-wrap gap-2">
                              {sessionQuestions.map((q, idx) => {
                                const globalIndex = questions.findIndex(question => question._id === q._id);
                                if (globalIndex === -1) return null;
                                const questionData = questions[globalIndex];
                                const { status, isFlagged } = getQuestionStatus(globalIndex);
                                const isCurrent = globalIndex === currentQuestion;
                                return (
                                  <button
                                    key={q._id}
                                    onClick={() => goToQuestion(globalIndex)}
                                    className={cn(
                                      "relative w-8 h-8 rounded-md text-xs font-semibold transition-all border-2 flex items-center justify-center",
                                      isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                                      status === 'correct' && "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
                                      status === 'incorrect' && "bg-rose-500/20 border-rose-500/40 text-rose-700 dark:text-rose-300",
                                      status === 'flagged' && "bg-purple-500/20 border-purple-500/40 text-purple-700 dark:text-purple-300",
                                      status === 'visited' && "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300",
                                      status === 'unanswered' && "bg-muted/60 border-border text-muted-foreground hover:bg-muted",
                                      "hover:shadow-md active:scale-95"
                                    )}
                                    title={`Q${questionData?.displayNumber || idx + 1}`}
                                  >
                                    {questionData?.displayNumber || idx + 1}
                                    {isFlagged && !showResults && (
                                      <Flag className="absolute -top-1 -right-1 h-2.5 w-2.5 fill-purple-500 text-purple-500" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Progression Section */}
                {!showResults && (
                  <div className="border-t border-border p-3 bg-muted/20 shrink-0">
                    <div className="space-y-3">
                      {/* Verified Progress Only */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-foreground">Vérifiées</span>
                          <span className="text-muted-foreground">
                            {Object.keys(verifiedQuestions).length} / {questions.length}
                          </span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                          {(() => {
                            const correctCount = questions.filter((_, i) => {
                              const verifiedData = verifiedQuestions[i];
                              const isVerified = verifiedData?.verified || verifiedData === true;
                              if (!isVerified) return false;
                              // Use stored isCorrect if available
                              if (verifiedData?.isCorrect !== undefined) {
                                return verifiedData.isCorrect;
                              }
                              const selected = selectedAnswers[i] || [];
                              const correctIndices = questions[i].options
                                .map((opt, idx) => opt.isCorrect ? idx : null)
                                .filter(idx => idx !== null);
                              return selected.length === correctIndices.length &&
                                selected.every(s => correctIndices.includes(s));
                            }).length;

                            const verifiedCount = Object.keys(verifiedQuestions).filter(key => {
                              const v = verifiedQuestions[key];
                              return v?.verified || v === true;
                            }).length;
                            const incorrectCount = verifiedCount - correctCount;

                            const correctPct = (correctCount / questions.length) * 100;
                            const incorrectPct = (incorrectCount / questions.length) * 100;

                            return (
                              <>
                                <div
                                  className="bg-emerald-500 transition-all"
                                  style={{ width: `${correctPct}%` }}
                                />
                                <div
                                  className="bg-red-500 transition-all"
                                  style={{ width: `${incorrectPct}%` }}
                                />
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Score Summary */}
                {showResults && (
                  <div className="border-t border-border p-4 space-y-4 bg-card">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <Trophy className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-foreground">
                          {Math.round((score.correct / score.total) * 100)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {score.correct}/{score.total} {t('dashboard:correct') || 'correct'}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={(score.correct / score.total) * 100}
                      className="h-2"
                    />
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleRetry}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {t('dashboard:retry') || 'Try Again'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3 space-y-2">

            {/* Question Card - with swipe support on mobile */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                ref={questionCardRef}
                initial={{ opacity: 0, x: questionTransition === 'next' ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: questionTransition === 'next' ? -50 : 50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="touch-pan-y"
              >
                <Card className="exam-question-card border-border bg-card shadow-lg overflow-hidden">
                  {/* Question Header - Compact unified row */}
                  <div className="bg-muted/40 dark:bg-muted/20 border-b border-border px-2 sm:px-4 md:px-6 py-2 sm:py-2.5">
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                      {/* Left: Verify button + Breadcrumb */}
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        {/* Verification Status / Verify Button - Desktop Only */}
                        <div className="hidden lg:flex items-center gap-2">
                          {currentQuestionData.isAnnulled ? (
                            /* Hide verification UI for annulled questions */
                            null
                          ) : !isQuestionVerified && !showResults ? (
                            <Button
                              type="button"
                              onClick={(e) => handleVerifyQuestion(e)}
                              disabled={isVerifying}
                              size="sm"
                              className="gap-1.5 text-white px-4 h-8"
                              style={{
                                background: `linear-gradient(135deg, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
                              }}
                            >
                              {isVerifying ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Vérification...
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4" />
                                  Vérifier
                                </>
                              )}
                            </Button>
                          ) : null}
                        </div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-foreground bg-card px-2.5 py-1.5 sm:py-2 rounded-lg flex-wrap border border-border shadow-sm">
                          <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-muted-foreground" />
                          <span className="break-words font-medium max-w-full leading-relaxed">
                            {(() => {
                              const moduleName = examData?.moduleName || 'Module';
                              const examYear = examData?.year || '';
                              const examName = examData?.name || examData?.title || '';
                              const sessionName = currentQuestionData?.sessionLabel || '';
                              const examType = examData?.examType || examData?.category || '';

                              // Build breadcrumb with full hierarchy
                              const parts = [];
                              
                              // Always start with module name
                              parts.push(moduleName);
                              
                              // Add year if available
                              if (examYear) {
                                parts.push(examYear);
                              }
                              
                              // Add exam name if different from year and not default
                              if (examName && examName !== examYear && examName !== moduleName) {
                                parts.push(examName);
                              }
                              
                              // Add session/course name if available and not default
                              if (sessionName && sessionName !== 'Session principale' && sessionName !== examName) {
                                parts.push(sessionName);
                              }
                              
                              return parts.join(' > ');
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Right: Desktop action buttons + Mobile 3-dot menu */}
                      <div className="flex items-center gap-0.5 shrink-0 bg-muted/60 dark:bg-muted/40 border border-border/80 rounded-lg px-2 py-1.5">
                        {/* DESKTOP: Show all buttons */}
                        <div className="hidden sm:flex items-center gap-0.5">
                          {/* Playlist */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePremiumProFeature('Playlist', () => setShowPlaylistModal(true))}
                            className={cn(
                              "h-6 w-6 sm:h-8 sm:w-8 hover:bg-muted hover:text-primary",
                              hasPremiumProAccess ? "text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
                            )}
                            disabled={!hasPremiumProAccess}
                            title={hasPremiumProAccess ? "Playlist" : "Playlist (Premium Pro requis)"}
                          >
                            <ListMusic className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          {/* Résumés */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowResumesModal(true)}
                            className="text-foreground h-6 w-6 sm:h-8 sm:w-8 hover:bg-muted hover:text-primary"
                            title="Résumés"
                          >
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          {/* Images */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowImageGallery(true)}
                            className="text-foreground h-6 w-6 sm:h-8 sm:w-8 hover:bg-muted hover:text-primary"
                            title={`Images (${currentQuestionData.images?.length || 0})`}
                          >
                            <Image className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePremiumProFeature('Notes', () => setShowNoteModal(true))}
                            className={cn(
                              "h-6 w-6 sm:h-8 sm:w-8 hover:bg-muted hover:text-primary",
                              hasPremiumProAccess ? "text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
                            )}
                            disabled={!hasPremiumProAccess}
                            title={hasPremiumProAccess ? "Note" : "Note (Premium Pro requis)"}
                          >
                            <NotebookPen className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowReportModal(true)}
                            className="text-foreground hover:text-red-500 hover:bg-muted h-6 w-6 sm:h-8 sm:w-8"
                            title="Signaler"
                          >
                            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFlag(currentQuestion)}
                            className={cn(
                              "transition-all h-6 w-6 sm:h-8 sm:w-8",
                              flaggedQuestions.has(currentQuestion)
                                ? "text-amber-500 hover:bg-muted"
                                : "text-foreground hover:bg-muted hover:text-amber-500"
                            )}
                            title="Surligner"
                          >
                            <Flag className={cn(
                              "h-3 w-3 sm:h-4 sm:w-4 transition-transform",
                              flaggedQuestions.has(currentQuestion) && "fill-current scale-110"
                            )} />
                          </Button>
                        </div>

                        {/* MOBILE: 3-dot menu */}
                        <div className="sm:hidden flex items-center">
                          <DropdownMenu open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {/* Playlist */}
                              <DropdownMenuItem
                                onClick={() => {
                                  handlePremiumProFeature('Playlist', () => setShowPlaylistModal(true));
                                  setShowMobileMenu(false);
                                }}
                                disabled={!hasPremiumProAccess}
                              >
                                <ListMusic className="h-4 w-4 mr-2" />
                                <span>Playlist</span>
                                {!hasPremiumProAccess && <span className="text-xs ml-auto">Pro</span>}
                              </DropdownMenuItem>

                              {/* Résumés */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setShowResumesModal(true);
                                  setShowMobileMenu(false);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                <span>Résumés</span>
                              </DropdownMenuItem>

                              {/* Images */}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setShowImageGallery(true);
                                  setShowMobileMenu(false);
                                }}
                              >
                                <Image className="h-4 w-4 mr-2" />
                                <span>Images</span>
                              </DropdownMenuItem>

                              {/* Notes */}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  handlePremiumProFeature('Notes', () => setShowNoteModal(true));
                                  setShowMobileMenu(false);
                                }}
                                disabled={!hasPremiumProAccess}
                              >
                                <NotebookPen className="h-4 w-4 mr-2" />
                                <span>Notes</span>
                                {!hasPremiumProAccess && <span className="text-xs ml-auto">Pro</span>}
                              </DropdownMenuItem>

                              {/* Report & Flag */}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setShowReportModal(true);
                                  setShowMobileMenu(false);
                                }}
                              >
                                <TriangleAlert className="h-4 w-4 mr-2 text-red-600" />
                                <span>Signaler</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  toggleFlag(currentQuestion);
                                  setShowMobileMenu(false);
                                }}
                              >
                                <Flag className={cn(
                                  "h-4 w-4 mr-2 transition-all",
                                  flaggedQuestions.has(currentQuestion) && "fill-current text-amber-500"
                                )} />
                                <span>{flaggedQuestions.has(currentQuestion) ? "Surligner (activé)" : "Surligner"}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
                    {/* Annulled Question Badge */}
                    {currentQuestionData.isAnnulled && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg">
                        <TriangleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Question Annulée</span>
                        <span className="text-xs text-amber-600 dark:text-amber-400">(Pas de points attribués)</span>
                      </div>
                    )}

                    {/* Question Text */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-muted-foreground">
                        Q{sessionQuestionInfo.position}/{sessionQuestionInfo.total}
                      </div>
                      <div
                        className="text-foreground leading-relaxed font-medium text-sm sm:text-base"
                        style={{ fontSize: `${Math.max(14, fontSize - 2)}px`, lineHeight: '1.6' }}
                      >
                        {currentQuestionData.question || currentQuestionData.text}
                      </div>
                    </div>

                    {/* Question Images */}
                    {currentQuestionData.images && currentQuestionData.images.length > 0 && (
                      <div className="space-y-2">
                        {currentQuestionData.images.map((imgUrl, imgIdx) => {
                          const fullImgUrl = resolveQuestionImageUrl(imgUrl);
                          return (
                            <button
                              key={imgIdx}
                              onClick={() => {
                                setZoomedImageUrl(fullImgUrl);
                                setShowImageZoom(true);
                              }}
                              className="relative rounded-lg sm:rounded-xl overflow-hidden border border-border bg-muted/30 cursor-pointer hover:border-primary transition-all group w-full"
                              title="Click to zoom"
                            >
                              <img
                                src={fullImgUrl}
                                alt={`Question illustration ${imgIdx + 1}`}
                                className="w-full max-h-48 sm:max-h-64 md:max-h-80 object-contain group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Answer Options */}
                    <div className="space-y-2 sm:space-y-3">
                      {currentQuestionData.options.map((option, index) => {
                        const isSelected = (selectedAnswers[currentQuestion] || []).includes(index);
                        const isCorrect = option.isCorrect;
                        const showCorrectness = showResults || isQuestionVerified;
                        const isAnimating = answerAnimation?.questionIndex === currentQuestion &&
                          answerAnimation?.optionIndex === index;

                        return (
                          <motion.button
                            key={index}
                            whileHover={{
                              scale: (showCorrectness || currentQuestionData.isAnnulled) ? 1 : 1.01,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: (showCorrectness || currentQuestionData.isAnnulled) ? 1 : 0.99 }}
                            animate={isAnimating ? { scale: [1, 1.02, 1] } : {}}
                            className={cn(
                              "imrs-focus-ring w-full text-left rounded-xl border-2 transition-all duration-200",
                              !showCorrectness && !currentQuestionData.isAnnulled && "hover:shadow-md cursor-pointer active:scale-[0.98] bg-card text-foreground",
                              (showCorrectness || currentQuestionData.isAnnulled) && "cursor-default",
                              // Annulled question state
                              currentQuestionData.isAnnulled && "border-border bg-muted/40 opacity-70",
                              // Default state (not selected, not showing correctness)
                              !currentQuestionData.isAnnulled && !isSelected && !showCorrectness && "border-border hover:border-border/80 bg-card text-foreground",
                              // Selected but not verified yet - show module color for all
                              !currentQuestionData.isAnnulled && isSelected && !showCorrectness && "border-2 bg-card text-foreground shadow-sm",
                              // After verification - correct answer that WAS selected (darker green)
                              !currentQuestionData.isAnnulled && showCorrectness && isCorrect && isSelected && "border-emerald-500 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-950 dark:text-emerald-200",
                              // After verification - correct answer that was NOT selected (lighter green with dashed border)
                              !currentQuestionData.isAnnulled && showCorrectness && isCorrect && !isSelected && "border-emerald-500/60 border-dashed bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
                              // After verification - wrong answer selected (light red background)
                              !currentQuestionData.isAnnulled && showCorrectness && !isCorrect && isSelected && "border-rose-500 bg-rose-500/15 hover:bg-rose-500/25 text-rose-950 dark:text-rose-200",
                              // After verification - not selected and not correct (gray) - keep normal opacity
                              !currentQuestionData.isAnnulled && showCorrectness && !isCorrect && !isSelected && "border-border/80 bg-card text-muted-foreground opacity-80"
                            )}
                            style={
                              !currentQuestionData.isAnnulled && isSelected && !showCorrectness
                                ? {
                                  borderColor: moduleColor,
                                  boxShadow: `0 2px 8px -2px ${moduleColor}30`
                                }
                                : {}
                            }
                            onClick={() => !showCorrectness && !currentQuestionData.isAnnulled && handleAnswerSelect(currentQuestion, index)}
                            aria-pressed={isSelected}
                            disabled={showCorrectness || currentQuestionData.isAnnulled}
                          >
                            <div className="p-3 sm:p-4 flex items-center gap-3">
                              {/* Option Letter */}
                              <div
                                className={cn(
                                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                                  !isSelected && !showCorrectness && "bg-muted text-muted-foreground",
                                  isSelected && !showCorrectness && "text-white font-bold",
                                  showCorrectness && isCorrect && isSelected && "bg-emerald-500 text-white font-bold",
                                  showCorrectness && isCorrect && !isSelected && "bg-emerald-500/80 text-white font-bold border-2 border-emerald-500 border-dashed",
                                  showCorrectness && !isCorrect && isSelected && "bg-rose-500 text-white font-bold",
                                  showCorrectness && !isCorrect && !isSelected && "bg-muted text-muted-foreground"
                                )}
                                style={
                                  isSelected && !showCorrectness
                                    ? { backgroundColor: moduleColor }
                                    : {}
                                }
                              >
                                {String.fromCharCode(65 + index)}
                              </div>

                              {/* Option Text */}
                              <span
                                className={cn(
                                  "flex-1 text-sm sm:text-base",
                                  showCorrectness && isCorrect && isSelected && "text-emerald-700 dark:text-emerald-300 font-semibold",
                                  showCorrectness && isCorrect && !isSelected && "text-emerald-600 dark:text-emerald-400 font-medium",
                                  showCorrectness && !isCorrect && isSelected && "text-rose-700 dark:text-rose-300",
                                  showCorrectness && !isCorrect && !isSelected && "text-muted-foreground"
                                )}
                                style={{ fontSize: `${Math.max(13, fontSize - 2)}px` }}
                              >
                                {option.text}
                              </span>

                              {/* Community vote percentage and indicator icon on right */}
                              {showCorrectness && (
                                <div className="shrink-0 flex items-center gap-1 sm:gap-2">
                                  {/* Percentage display removed */}
                                  {/* Correct/Incorrect icon - Hidden for all questions */}
                                </div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Action Buttons - Below Answer Options */}
                    <div className="pt-4 border-t border-border">
                      {!isQuestionVerified && !showResults && !currentQuestionData.isAnnulled ? (
                        /* Before Verification: Show Vérifier only (hide for annulled questions) */
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={(e) => handleVerifyQuestion(e)}
                            disabled={isVerifying || !selectedAnswers[currentQuestion] || selectedAnswers[currentQuestion].length === 0}
                            className="flex-1 gap-2 text-white"
                            style={{
                              background: isVerifying || !selectedAnswers[currentQuestion] || selectedAnswers[currentQuestion].length === 0
                                ? '#d1d5db'
                                : `linear-gradient(135deg, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
                            }}
                          >
                            {isVerifying ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Vérification...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4" />
                                Vérifier
                              </>
                            )}
                          </Button>
                        </div>
                      ) : !currentQuestionData.isAnnulled && (
                        /* After Verification: Show action buttons only */
                        <div className="space-y-3">
                          {/* Action Buttons Grid - Mobile Only */}
                          <div className="lg:hidden grid grid-cols-2 gap-2">
                            {!verifiedQuestions[currentQuestion]?.isCorrect && (
                              <Button
                                variant="outline"
                                onClick={(e) => handleResetQuestion(e)}
                                className="gap-2 border-border hover:bg-muted text-foreground"
                              >
                                <RefreshCcw className="h-4 w-4" />
                                Ressayer
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => setShowExplanation(true)}
                              className="gap-2 text-amber-600 dark:text-amber-400 border-amber-300/60 dark:border-amber-700/60 hover:bg-amber-500/10"
                            >
                              <Lightbulb className="h-4 w-4" />
                              Explication
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handlePremiumProFeature('Communauté', () => setShowCommunityModal(true))}
                              disabled={!hasPremiumProAccess}
                              className="gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-300/60 dark:border-emerald-700/60 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              <Users className="h-4 w-4" />
                              Community
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowVueEnsemble(true)}
                              className="gap-2 text-blue-600 dark:text-blue-400 border-blue-300/60 dark:border-blue-700/60 hover:bg-blue-500/10"
                            >
                              <LayoutGrid className="h-4 w-4" />
                              Vue d'ensemble
                            </Button>
                          </div>

                          {/* Status Display - Mobile Only */}
                          <div className="lg:hidden">
                            {verifiedQuestions[currentQuestion]?.isCorrect ? (
                              <div className="bg-emerald-500/15 border-l-4 border-emerald-500 p-3 rounded-r-lg">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  <div>
                                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">Correct !</p>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Bonne réponse</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-rose-500/15 border-l-4 border-rose-500 p-3 rounded-r-lg">
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                  <div>
                                    <p className="font-semibold text-rose-800 dark:text-rose-200">Incorrect</p>
                                    <p className="text-sm text-rose-700 dark:text-rose-300">Réessayez ou consultez l'explication</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Desktop Action Buttons - Inside Card */}
                      {isQuestionVerified && (
                        <div className="hidden lg:flex flex-col gap-3 pt-4 border-t border-border">
                          {/* Status Display - Desktop */}
                          {verifiedQuestions[currentQuestion]?.isCorrect ? (
                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-800 dark:text-emerald-200">
                              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              <span className="font-semibold">Réponse correcte !</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/15 border border-rose-500/30 rounded-lg text-rose-800 dark:text-rose-200">
                              <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                              <span className="font-semibold">Réponse incorrecte</span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-center gap-2">
                            {!verifiedQuestions[currentQuestion]?.isCorrect && (
                              <Button
                                variant="outline"
                                onClick={(e) => handleResetQuestion(e)}
                                className="gap-2 border-border hover:bg-muted text-foreground"
                              >
                                <RefreshCcw className="h-4 w-4" />
                                Ressayer
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => setShowExplanation(true)}
                              className="gap-2 text-amber-600 dark:text-amber-400 border-amber-300/60 dark:border-amber-700/60 hover:bg-amber-500/10"
                            >
                              <Lightbulb className="h-4 w-4" />
                              Explication
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handlePremiumProFeature('Communauté', () => setShowCommunityModal(true))}
                              disabled={!hasPremiumProAccess}
                              className="gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-300/60 dark:border-emerald-700/60 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              <Users className="h-4 w-4" />
                              Communauté
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation - Desktop Only */}
            <div className="hidden lg:flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToPrevious();
                }}
                disabled={currentQuestion === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t('dashboard:previous') || 'Previous'}</span>
              </Button>

              {/* Center: Question dots */}
              <div className="flex items-center gap-1.5">
                {questions.slice(
                  Math.max(0, currentQuestion - 2),
                  Math.min(questions.length, currentQuestion + 3)
                ).map((_, i) => {
                  const actualIndex = Math.max(0, currentQuestion - 2) + i;
                  return (
                    <button
                      key={actualIndex}
                      onClick={() => goToQuestion(actualIndex)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        actualIndex === currentQuestion
                          ? "w-6"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      )}
                      style={
                        actualIndex === currentQuestion
                          ? { backgroundColor: moduleColor }
                          : {}
                      }
                    />
                  );
                })}
              </div>

              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToNext();
                }}
                disabled={currentQuestion === questions.length - 1}
                className="gap-2"
              >
                <span className="hidden sm:inline">{t('dashboard:next') || 'Next'}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ============== MOBILE BOTTOM FIXED FOOTER ============== */}
      {!showResults ? (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb">
          {/* Navigation row - White background */}
          <div className="bg-card/95 border-t border-border shadow-lg px-3 py-2 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              {/* Previous button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToPrevious();
                }}
                disabled={currentQuestion === 0}
                className={cn(
                  "p-3 rounded-xl transition-all active:scale-95",
                  currentQuestion === 0
                    ? "bg-muted/40 text-muted-foreground/30 cursor-not-allowed"
                    : "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Verify / Check button - Main CTA */}
              {!isQuestionVerified && !showResults ? (
                <button
                  type="button"
                  onClick={(e) => handleVerifyQuestion(e)}
                  disabled={isVerifying || !selectedAnswers[currentQuestion] || selectedAnswers[currentQuestion].length === 0}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all active:scale-98",
                    (isVerifying || !selectedAnswers[currentQuestion] || selectedAnswers[currentQuestion].length === 0) && "opacity-70 cursor-not-allowed"
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${moduleColor}, ${adjustColor(moduleColor, -30)})`,
                    boxShadow: `0 4px 15px ${moduleColor}40`
                  }}
                >
                  {isVerifying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Vérifier
                    </>
                  )}
                </button>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  {/* Explanation button */}
                  <button
                    onClick={() => setShowExplanation(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium text-amber-700 dark:text-amber-300 bg-amber-500/20 border border-amber-500/30 transition-all active:scale-98"
                  >
                    <Lightbulb className="h-5 w-5" />
                    Explication
                  </button>

                  {/* Reset button */}
                  <button
                    type="button"
                    onClick={(e) => handleResetQuestion(e)}
                    className="p-3 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-all active:scale-95"
                  >
                    <RefreshCcw className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Question nav button */}
              <button
                onClick={() => setShowMobileQuestionNav(true)}
                className="p-3 rounded-xl transition-all active:scale-95"
                style={{ backgroundColor: `${moduleColor}15`, color: moduleColor }}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>

              {/* Next button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Next button clicked');
                  goToNext();
                }}
                disabled={currentQuestion === questions.length - 1}
                className={cn(
                  "p-3 rounded-xl transition-all active:scale-95",
                  currentQuestion === questions.length - 1
                    ? "bg-muted/40 text-muted-foreground/30 cursor-not-allowed"
                    : "text-white cursor-pointer"
                )}
                style={
                  currentQuestion !== questions.length - 1
                    ? {
                      background: `linear-gradient(135deg, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
                    }
                    : {}
                }
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Mobile Results Bottom Bar */
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border shadow-lg safe-area-pb backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Previous */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToPrevious();
              }}
              disabled={currentQuestion === 0}
              className={cn(
                "p-3 rounded-xl transition-all active:scale-95",
                currentQuestion === 0 ? "bg-muted/40 text-muted-foreground/30 cursor-not-allowed" : "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Question Nav Button */}
            <button
              onClick={() => setShowMobileQuestionNav(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all active:scale-98"
              style={{
                background: `linear-gradient(135deg, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
              }}
            >
              <Grid3X3 className="h-5 w-5" />
              Voir toutes les questions
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToNext();
              }}
              disabled={currentQuestion === questions.length - 1}
              className={cn(
                "p-3 rounded-xl transition-all active:scale-95",
                currentQuestion === questions.length - 1 ? "bg-muted/40 text-muted-foreground/30 cursor-not-allowed" : "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* ============== MOBILE QUESTION NAVIGATION DRAWER ============== */}
      <AnimatePresence>
        {showMobileQuestionNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowMobileQuestionNav(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-card text-card-foreground border-t border-border rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Questions</h3>
                  <p className="text-sm text-muted-foreground">
                    {verifiedCount} vérifiées • {correctCount} correctes
                  </p>
                </div>
                <button
                  onClick={() => setShowMobileQuestionNav(false)}
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-3 py-2 px-4 bg-muted/40 border-b border-border text-muted-foreground text-[10px]">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-muted border border-border" />
                  non visité
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                  visité
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                  correct
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/40" />
                  incorrect
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500/20 border border-purple-500/40" />
                  surligné
                </span>
              </div>

              {/* Questions grid */}
              <ScrollArea className="flex-1 p-4 overflow-y-auto min-h-0">
                <div className="grid grid-cols-6 gap-2">
                  {questions.map((q, index) => {
                    const { status, isFlagged } = getQuestionStatus(index);
                    const isCurrent = index === currentQuestion;

                    return (
                      <button
                        key={index}
                        onClick={() => {
                          goToQuestion(index);
                          setShowMobileQuestionNav(false);
                        }}
                        className={cn(
                          "relative aspect-square rounded-xl text-sm font-semibold transition-all active:scale-95 border-2",
                          isCurrent && "ring-2 ring-offset-2",
                          status === 'correct' && "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
                          status === 'incorrect' && "bg-rose-500/20 border-rose-500/40 text-rose-700 dark:text-rose-300",
                          status === 'flagged' && "bg-purple-500/20 border-purple-500/40 text-purple-700 dark:text-purple-300",
                          status === 'visited' && "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300",
                          status === 'unanswered' && "bg-muted/60 border-border text-muted-foreground"
                        )}
                        style={
                          isCurrent
                            ? { '--tw-ring-color': moduleColor }
                            : {}
                        }
                      >
                        {index + 1}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -right-1 h-3 w-3 text-purple-500 fill-purple-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Submit button */}
              {!showResults && (
                <div className="p-4 border-t border-border bg-card">
                  <button
                    onClick={() => {
                      setShowMobileQuestionNav(false);
                      setShowConfirmSubmit(true);
                    }}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all active:scale-98"
                    style={{
                      background: `linear-gradient(135deg, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
                    }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Send className="h-5 w-5" />
                      Terminer l'examen
                    </span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile FAB - positioned higher to avoid overlapping with bottom toolbar */}
      <div className="hidden fixed bottom-24 left-4 z-30">
        <Button
          size="lg"
          className="h-12 w-12 rounded-full shadow-xl bg-gradient-to-br from-blue-600 to-indigo-600"
          onClick={() => setShowSidebar(true)}
        >
          <ListChecks className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowSidebar(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card text-card-foreground shadow-2xl border-r border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-border bg-muted/30">
                <div className="flex items-center justify-between p-3 border-b border-border bg-card">
                  <h3 className="font-semibold text-foreground text-sm">{t('dashboard:questions') || 'Questions'}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)} className="h-8 w-8">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Legend Section */}
                <div className="border-b border-border">
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px]">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-muted border border-border"></div>
                        <span className="text-muted-foreground">non visité</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40"></div>
                        <span className="text-muted-foreground">visité</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40"></div>
                        <span className="text-muted-foreground">correct</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40"></div>
                        <span className="text-muted-foreground">incorrect</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/40"></div>
                        <span className="text-muted-foreground">surligné</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-340px)]">
                <div className="p-3 space-y-2">
                  {Object.entries(examData.questions || {}).map(([sessionName, sessionQuestions]) => {
                    const isCollapsed = collapsedSessions.has(sessionName);

                    return (
                      <div key={sessionName} className="space-y-1">
                        <button
                          className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors group"
                          onClick={() => {
                            const newCollapsed = new Set(collapsedSessions);
                            if (newCollapsed.has(sessionName)) {
                              newCollapsed.delete(sessionName);
                            } else {
                              newCollapsed.add(sessionName);
                            }
                            setCollapsedSessions(newCollapsed);
                          }}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className={cn(
                              "transition-transform duration-200 shrink-0",
                              !isCollapsed && "rotate-90"
                            )}>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
                            <span className="text-sm font-medium text-foreground break-words line-clamp-2">{sessionName}</span>
                          </div>
                          <Badge variant="outline" className="bg-muted text-muted-foreground">{sessionQuestions.length}</Badge>
                        </button>

                        {!isCollapsed && (
                          <div className="pl-6 space-y-0.5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-1">
                            {sessionQuestions.map((q, idx) => {
                              const globalIndex = questions.findIndex(question => question._id === q._id);
                              if (globalIndex === -1) return null; // Skip if question not found
                              const questionData = questions[globalIndex]; // Get the question with displayNumber
                              const { status, isFlagged } = getQuestionStatus(globalIndex);
                              const isCurrent = globalIndex === currentQuestion;

                              return (
                                <button
                                  key={q._id}
                                  data-question-id={q._id}
                                  className={cn(
                                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all",
                                    "lg:flex-col lg:items-center lg:justify-center lg:gap-1 lg:px-2 lg:py-1.5 lg:text-xs",
                                    isCurrent && "bg-primary/10 border-l-2 border-primary lg:border-l-0 lg:ring-2 lg:ring-primary",
                                    !isCurrent && "hover:bg-muted/50 active:bg-muted"
                                  )}
                                  onClick={() => {
                                    goToQuestion(globalIndex);
                                    setShowSidebar(false);
                                  }}
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs border font-medium",
                                    status === 'correct' && "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
                                    status === 'incorrect' && "bg-rose-500/20 border-rose-500/40 text-rose-700 dark:text-rose-300",
                                    status === 'flagged' && "bg-purple-500/20 border-purple-500/40 text-purple-700 dark:text-purple-300",
                                    status === 'visited' && "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300",
                                    status === 'unanswered' && "bg-muted border-border text-muted-foreground"
                                  )}>
                                    {shouldShowNumberInBox(questionData) ? (questionData?.displayNumber || idx + 1) : ''}
                                  </div>
                                  <span className="flex-1 text-left text-muted-foreground lg:flex-none lg:text-center lg:text-[10px] lg:leading-tight">Q{questionData?.displayNumber || idx + 1}</span>
                                  {isFlagged && (
                                    <Flag className="h-3 w-3 fill-purple-500 text-purple-500 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Progress Bar - Bottom */}
              {!showResults && (
                <div className="border-t border-border p-4 bg-card">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">Vérifiées</span>
                      <span className="font-semibold" style={{ color: moduleColor }}>
                        {Math.round((verifiedCount / questions.length) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{verifiedCount} / {questions.length} vérifiées</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${(verifiedCount / questions.length) * 100}%`,
                          background: `linear-gradient(90deg, ${moduleColor}, ${adjustColor(moduleColor, -20)})`
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Results */}
              {showResults && (
                <div className="border-t border-border p-4 bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">{t('dashboard:your_score') || 'Your Score'}</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {Math.round((score.correct / score.total) * 100)}%
                    </span>
                  </div>
                  <Button className="w-full gap-2" onClick={handleRetry}>
                    <RefreshCcw className="h-4 w-4" />
                    {t('dashboard:retry') || 'Try Again'}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Submit Modal */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmSubmit(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {t('dashboard:confirm_submit') || 'Submit Exam?'}
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    {t('dashboard:answered_questions') || 'You have answered'}{' '}
                    <strong>{answeredCount}</strong> {t('common:of') || 'of'}{' '}
                    <strong>{questions.length}</strong> {t('dashboard:questions') || 'questions'}.
                  </p>
                  {flaggedCount > 0 && (
                    <p className="text-amber-600">
                      <Flag className="inline h-4 w-4 mr-1" />
                      {flaggedCount} {t('dashboard:questions_flagged') || 'questions flagged for review'}
                    </p>
                  )}
                  {questions.length - answeredCount > 0 && (
                    <p className="text-red-600">
                      <AlertCircle className="inline h-4 w-4 mr-1" />
                      {questions.length - answeredCount} {t('dashboard:questions_unanswered') || 'questions unanswered'}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowConfirmSubmit(false)}
                  >
                    {t('common:cancel') || 'Cancel'}
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                    onClick={handleSubmit}
                  >
                    {t('dashboard:submit') || 'Submit'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showKeyboardShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowKeyboardShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Keyboard className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    {t('dashboard:keyboard_shortcuts') || 'Keyboard Shortcuts'}
                  </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowKeyboardShortcuts(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-3">
                {[
                  { keys: ['←', '→'], action: t('dashboard:navigate_questions') || 'Navigate questions' },
                  { keys: ['1', '2', '3', '4', '5'], action: t('dashboard:select_answer') || 'Select answer' },
                  { keys: ['Enter'], action: 'Vérifier' },
                  { keys: ['F'], action: t('dashboard:flag_question') || 'Flag question' },
                  { keys: ['?'], action: t('dashboard:show_shortcuts') || 'Show shortcuts' },
                  { keys: ['Esc'], action: t('dashboard:close_modal') || 'Close modal' },
                ].map(({ keys, action }) => (
                  <div key={action} className="flex items-center justify-between py-2">
                    <span className="text-foreground text-sm">{action}</span>
                    <div className="flex gap-1">
                      {keys.map((key) => (
                        <kbd
                          key={key}
                          className="px-2 py-1 bg-muted border border-border rounded text-sm font-mono text-foreground"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showExplanation && currentQuestionData && (
        <ExplicationModel
          question={currentQuestionData}
          setShowExplanation={setShowExplanation}
          userPlan={userPlan}
        />
      )}

      {showNoteModal && currentQuestionData && (
        <NoteModal
          isOpen={showNoteModal}
          onClose={() => setShowNoteModal(false)}
          questionId={currentQuestionData._id}
          moduleId={examData?.moduleId || null}
          examData={{
            moduleName: examData?.moduleName,
            examName: examData?.examName || examData?.name,
            year: examData?.year
          }}
        />
      )}

      {showReportModal && currentQuestionData && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          questionId={currentQuestionData._id}
        />
      )}

      {showCommunityModal && currentQuestionData && (
        <CommunityModal
          isOpen={showCommunityModal}
          onClose={() => setShowCommunityModal(false)}
          questionId={currentQuestionData._id}
          questionText={currentQuestionData.question || currentQuestionData.text}
          questionOptions={currentQuestionData.options}
          userLevel={20} // TODO: Get actual user level in this module
          requiredLevel={20}
          moduleColor={moduleColor}
          onOpenExplanation={() => setShowExplanation(true)}
        />
      )}

      {showResumesModal && (
        <ResumesModal
          isOpen={showResumesModal}
          onClose={() => setShowResumesModal(false)}
          examData={{
            ...examData,
            moduleId: typeof examData?.moduleId === 'object' 
              ? examData.moduleId?._id 
              : examData?.moduleId
          }}
        />
      )}

      {showPlaylistModal && currentQuestionData && (
        <PlaylistModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          questionId={currentQuestionData._id}
          examData={examData}
        />
      )}

      {/* Vue d'ensemble Modal - Shows the question list with result status colors */}
      <AnimatePresence>
        {showVueEnsemble && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setShowVueEnsemble(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-xl shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6" />
                  <h2 className="text-base sm:text-xl font-bold">Vue d'ensemble</h2>
                  <Badge className="bg-white/20 text-white text-[10px] sm:text-xs">{questions.length} questions</Badge>
                </div>
                <button
                  onClick={() => setShowVueEnsemble(false)}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Questions Grid - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {questions.map((q, index) => {
                    const { status } = getQuestionStatus(index);
                    const questionText = q.question || q.text || "Question sans texte";

                    return (
                      <button
                        key={q._id || index}
                        type="button"
                        className={cn(
                          "imrs-focus-ring min-h-20 w-full rounded-lg border-2 p-4 text-left transition-all hover:shadow-lg",
                          status === 'correct' && "border-emerald-500/50 bg-emerald-500/10",
                          status === 'incorrect' && "border-rose-500/50 bg-rose-500/10",
                          status === 'answered' && "border-primary/50 bg-primary/10",
                          status === 'visited' && "border-amber-500/50 bg-amber-500/10",
                          status === 'flagged' && "border-purple-500/50 bg-purple-500/10",
                          status === 'unanswered' && "border-border bg-muted/20 hover:bg-muted/40",
                          index === currentQuestion && "ring-2 ring-indigo-500"
                        )}
                        onClick={() => {
                          goToQuestion(index);
                          setShowVueEnsemble(false);
                        }}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <span className="shrink-0 text-sm font-bold text-foreground sm:text-base">
                            {index + 1}.
                          </span>
                          <span className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-foreground sm:text-base">
                            {questionText}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 border-t border-border bg-card rounded-b-xl shrink-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-emerald-600" />
                      </div>
                      Correct
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center">
                        <X className="h-2.5 w-2.5 text-red-600" />
                      </div>
                      Incorrect
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-primary/20 border-2 border-primary"></div>
                      Sélectionné
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowVueEnsemble(false)}
                    className="w-full sm:w-auto"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-md sm:max-w-lg w-full p-4 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  {isSavingBeforeExit ? (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8" />
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  {isSavingBeforeExit ? 'Enregistrement en cours...' : 'Modifications non enregistrées'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isSavingBeforeExit
                    ? 'Veuillez patienter pendant que nous enregistrons vos réponses...'
                    : 'Voulez-vous enregistrer vos réponses avant de quitter ?'}
                </p>
                {!isSavingBeforeExit && (
                  <div className="flex flex-col gap-2 sm:gap-3 pt-4 w-full">
                    <Button
                      variant="outline"
                      className="w-full text-xs sm:text-sm py-2 h-auto"
                      onClick={() => setShowExitConfirm(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm py-2 h-auto"
                      onClick={saveBeforeExit}
                    >
                      Enregistrer et quitter
                    </Button>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm py-2 h-auto"
                      onClick={() => {
                        setShowExitConfirm(false);
                        handleGoBack();
                      }}
                    >
                      Quitter sans enregistrer
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Gallery Modal */}
      <AnimatePresence>
        {showImageGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-2 backdrop-blur-sm sm:p-4"
            onClick={() => setShowImageGallery(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-gallery-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="grid h-[calc(100dvh-1rem)] w-full max-w-4xl min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl sm:h-[min(85dvh,760px)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between rounded-t-xl border-b bg-gradient-to-r from-purple-500 to-pink-600 p-3 text-white sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Image className="h-5 w-5 sm:h-6 sm:w-6" />
                  <h2 id="image-gallery-title" className="text-base font-bold sm:text-xl">
                    Toutes les images
                  </h2>
                </div>
                <button
                  onClick={() => setShowImageGallery(false)}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Fermer la galerie d'images"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Images Grid */}
              <div
                className="h-full min-h-0 touch-pan-y overflow-x-hidden overflow-y-scroll overscroll-y-contain p-3 sm:p-4"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                tabIndex={0}
                aria-label="Liste défilante des images de l'examen"
              >
                <div className="pr-3 sm:pr-4 space-y-0">
                  {(() => {
                    // Get all images from all questions in the entire exam
                    const allImages = questions.reduce((acc, q) => {
                      const globalIndex = questions.findIndex(question => question._id === q._id);
                      if (q.images && q.images.length > 0) {
                        q.images.forEach((imgUrl, imgIdx) => {
                          const imageUrl = resolveQuestionImageUrl(imgUrl);
                          
                          acc.push({
                            src: imageUrl,
                            questionIndex: globalIndex,
                            questionNumber: q.displayNumber,
                            questionText: q.text?.substring(0, 50) + '...',
                            imageIndex: imgIdx
                          });
                        });
                      }
                      return acc;
                    }, []);

                    if (allImages.length === 0) {
                      return (
                        <div className="text-center py-8 sm:py-12">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <Image className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                          </div>
                          <h4 className="text-base sm:text-lg font-medium text-foreground mb-2">
                            Aucune image dans cet examen
                          </h4>
                          <p className="text-muted-foreground text-xs sm:text-sm">
                            Cet examen ne contient pas d'images.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {allImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative group cursor-pointer rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all"
                            onClick={() => {
                              goToQuestion(img.questionIndex);
                              setShowImageGallery(false);
                            }}
                          >
                            <img
                              src={img.src}
                              alt={`Question ${img.questionNumber}`}
                              className="w-full h-24 sm:h-32 object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                // Log error for debugging
                                console.error(`Failed to load image from: ${img.src}`);
                                console.error(`Error details:`, e);
                                // Show placeholder if image fails
                                e.target.style.backgroundColor = '#e5e7eb';
                                e.target.alt = 'Image not found';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <span className="text-white text-xs font-medium">
                                Q{img.questionNumber}
                              </span>
                            </div>
                            <Badge className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-purple-600 text-[10px] sm:text-xs">
                              Q{img.questionNumber}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 rounded-b-xl border-t border-border bg-card p-3 sm:p-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowImageGallery(false)}
                    className="w-full sm:w-auto border-border text-foreground hover:bg-muted"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Image Zoom Modal */}
      <AnimatePresence>
        {showImageZoom && zoomedImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] touch-pan-y overflow-y-auto overscroll-contain bg-black/90 p-2 backdrop-blur-sm [-webkit-overflow-scrolling:touch] sm:p-4"
            onClick={() => setShowImageZoom(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Agrandissement de l'image"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative mx-auto flex min-h-full w-full max-w-5xl items-start justify-center py-12"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={zoomedImageUrl}
                alt="Image agrandie"
                className="block h-auto max-w-full rounded-lg object-contain shadow-2xl"
              />
              <button
                onClick={() => setShowImageZoom(false)}
                className="fixed right-3 top-3 z-10 rounded-full border border-border bg-card p-2 text-foreground shadow-lg transition-colors hover:bg-card/80 sm:right-5 sm:top-5"
                aria-label="Fermer l'image agrandie"
              >
                <X className="h-6 w-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ExamPage;
