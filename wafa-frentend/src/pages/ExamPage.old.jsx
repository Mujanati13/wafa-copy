import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiEdit } from "react-icons/fi";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaArrowRight,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes,
  FaMoon,
  FaSun,
  FaCheck,
  FaChevronRight,
  FaPlay,
  FaFilter,
  FaFlag,
  FaExclamationTriangle,
  FaPlus,
  FaMinus,
} from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { ImFontSize } from "react-icons/im";
import { PiImagesSquareFill } from "react-icons/pi";
import ResumeModel from "../components/ExamsPage/ResumeModel";
import ExplicationModel from "../components/ExamsPage/ExplicationModel";
import { api } from "@/lib/utils";

import {
  Album,
  ArrowLeft,
  Bookmark,
  LogOut,
  Minus,
  NotebookPen,
  Plus,
  TriangleAlert,
} from "lucide-react";
import ProfileMenu from "@/components/profile/ProfileMenu";
import IconWithTooltip from "@/components/ExamsPage/IconWithTooltip";
import ShowNoDataState from "@/components/ExamsPage/ShowNoDataState";
import LoadingExam from "@/components/ExamsPage/LoadingExam";
import FaildStatus from "@/components/ExamsPage/FaildStatus";

const ExamPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // Start collapsed on mobile
  const [areActionsCollapsed, setAreActionsCollapsed] = useState(true); // Start collapsed on mobile
  const { examId } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editModelShow, setEditModelShow] = useState(false);
  const [fontSize, setFontSize] = useState(16); // Default font size
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [examQuestionData, setExamQuestionData] = useState(null); // Backend exam data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  // Get current question from backend data
  const getCurrentQuestion = () => {
    if (!examQuestionData || !examQuestionData.questions) return null;

    // Flatten all questions from all sessions
    const allQuestions = [];
    Object.values(examQuestionData.questions).forEach((sessionQuestions) => {
      allQuestions.push(...sessionQuestions);
    });

    return allQuestions[currentQuestion] || null;
  };

  const question = getCurrentQuestion();

  // Generate exam periods from backend data
  const getExamPeriods = () => {
    if (!examQuestionData || !examQuestionData.questions) return [];

    return Object.entries(examQuestionData.questions).map(
      ([sessionLabel, questions]) => ({
        id: sessionLabel.toLowerCase().replace(/\s+/g, ""),
        label: sessionLabel,
        questions: questions.map((q, index) => ({
          id: q._id,
          status: "pending",
        })),
      })
    );
  };

  const examPeriods = getExamPeriods();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close font size menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFontSizeMenu && !event.target.closest(".font-size-selector")) {
        setShowFontSizeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFontSizeMenu]);

  // Keyboard shortcuts for font size
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "=":
          case "+":
            event.preventDefault();
            increaseFontSize();
            break;
          case "-":
            event.preventDefault();
            decreaseFontSize();
            break;
          case "0":
            event.preventDefault();
            resetFontSize();
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleAnswerSelect = (answerKey) => {
    const currentQuestionAnswers = selectedAnswers[currentQuestion] || [];
    const updatedAnswers = currentQuestionAnswers.includes(answerKey)
      ? currentQuestionAnswers.filter((key) => key !== answerKey)
      : [...currentQuestionAnswers, answerKey];

    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: updatedAnswers,
    });
  };

  const handleCheckAnswer = () => {
    setShowResults(true);
    setShowVerifyModal(true);
  };

  const togglePeriod = (periodId) => {
    setExpandedPeriods((prev) => ({
      ...prev,
      [periodId]: !prev[periodId],
    }));
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 2, 20)); // Max 24px
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 2, 14)); // Min 12px
  };

  const resetFontSize = () => {
    setFontSize(16); // Reset to default
  };

  const handleExit = () => {
    navigate("/dashboard/home");
  };
  // Fetch exam data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("exams/all/" + examId);
        setExamQuestionData(response.data.data);
      } catch (err) {
        setError("Failed to load exam data");
        console.error("Error fetching exam data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId]);

  // Expand all periods by default when exam data is loaded
  useEffect(() => {
    if (examQuestionData && examQuestionData.questions) {
      const allPeriods = {};
      Object.keys(examQuestionData.questions).forEach((sessionLabel) => {
        const periodId = sessionLabel.toLowerCase().replace(/\s+/g, "");
        allPeriods[periodId] = true;
      });
      setExpandedPeriods(allPeriods);
    }
  }, [examQuestionData]);

  // Check if answer is correct
  const isAnswerCorrect = () => {
    if (!question) return false;

    const userAnswers = selectedAnswers[currentQuestion] || [];
    const correctAnswers = question.options
      .map((option, index) =>
        option.isCorrect ? String.fromCharCode(65 + index) : null
      )
      .filter(Boolean);

    // Consider correct if every selected answer is correct and at least one was chosen
    if (userAnswers.length === 0) return false;
    const allSelectedAreCorrect = userAnswers.every((answer) =>
      correctAnswers.includes(answer)
    );
    const missedAnyCorrect = correctAnswers.some(
      (answer) => !userAnswers.includes(answer)
    );
    return allSelectedAreCorrect && !missedAnyCorrect;
  };

  // Get answer option styling based on correctness and selection
  const getAnswerOptionStyle = (answerKey, index) => {
    if (!question)
      return "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";

    const currentQuestionAnswers = selectedAnswers[currentQuestion] || [];
    const isSelected = currentQuestionAnswers.includes(answerKey);
    const isCorrect = question.options[index]?.isCorrect || false;

    if (showResults) {
      if (isCorrect && isSelected) {
        return "bg-green-500 text-white border-green-500"; // Correct and selected
      } else if (isCorrect && !isSelected) {
        return "bg-green-100 text-green-800 border-green-300"; // Correct but not selected
      } else if (!isCorrect && isSelected) {
        return "bg-red-500 text-white border-red-500"; // Wrong and selected
      }
      return "bg-gray-100 text-gray-600 border-gray-200"; // Not selected and not correct
    }

    if (isSelected) {
      return "bg-blue-500 text-white border-blue-300";
    }

    return "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";
  };

  // Get icon for answer option
  const getAnswerIcon = (answerKey, index) => {
    if (!question) return null;

    const currentQuestionAnswers = selectedAnswers[currentQuestion] || [];
    const isSelected = currentQuestionAnswers.includes(answerKey);
    const isCorrect = question.options[index]?.isCorrect || false;

    if (showResults) {
      if (isCorrect) {
        return <FaCheck className="w-3 h-3 text-white" />;
      } else if (isSelected) {
        return <FaTimes className="w-3 h-3 text-white" />;
      }
    }

    // Check if this is a multiple choice question (more than one correct answer)
    const correctAnswersCount = question.options.filter(
      (opt) => opt.isCorrect
    ).length;
    if (correctAnswersCount > 1) {
      return isSelected ? <FaCheck className="w-3 h-3" /> : null;
    }

    return null;
  };

  // Get feedback message based on user's answer
  const getFeedbackMessage = () => {
    if (!question) {
      return {
        type: "incorrect",
        message: "Question non disponible.",
        icon: <FaTimesCircle className="w-5 h-5 text-red-500" />,
      };
    }

    const userAnswers = selectedAnswers[currentQuestion] || [];
    const correctAnswers = question.options
      .map((option, index) =>
        option.isCorrect ? String.fromCharCode(65 + index) : null
      )
      .filter(Boolean);

    const hasSelectedCorrect = userAnswers.some((answer) =>
      correctAnswers.includes(answer)
    );
    const hasSelectedIncorrect = userAnswers.some(
      (answer) => !correctAnswers.includes(answer)
    );
    const missedCorrect = correctAnswers.some(
      (answer) => !userAnswers.includes(answer)
    );

    if (hasSelectedCorrect && !hasSelectedIncorrect && !missedCorrect) {
      return {
        type: "correct",
        message: "Parfait ! Vous avez sélectionné toutes les bonnes réponses.",
        icon: <FaCheckCircle className="w-5 h-5 text-green-500" />,
      };
    } else if (hasSelectedCorrect && (hasSelectedIncorrect || missedCorrect)) {
      return {
        type: "partial",
        message:
          "Vous avez sélectionné certaines bonnes réponses, mais il y a des erreurs.",
        icon: <FaExclamationTriangle className="w-5 h-5 text-yellow-500" />,
      };
    } else {
      return {
        type: "incorrect",
        message: "Vous n'avez pas sélectionné les bonnes réponses.",
        icon: <FaTimesCircle className="w-5 h-5 text-red-500" />,
      };
    }
  };

  // Show loading state
  if (loading) {
    return <LoadingExam />;
  }

  // Show error state
  if (error) {
    return <FaildStatus error={error} />;
  }

  // Show no data state
  if (!examQuestionData || !question) {
    return <ShowNoDataState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Top Header Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 h-[50px] md:h-[60px]">
        <div className="flex items-center justify-between px-3 md:px-6 pt-1.5">
          {/* Left - Logo and App Name */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Tree lines icon to collapse sidebar */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 md:p-2 rounded hover:bg-gray-100 transition-colors focus:outline-none"
              title="Réduire la barre latérale"
            >
              <span className="flex flex-col justify-center items-center space-y-0.5">
                <span className="block w-4 md:w-6 h-0.5 bg-gray-400"></span>
                <span className="block w-4 md:w-6 h-0.5 bg-gray-400"></span>
                <span className="block w-4 md:w-6 h-0.5 bg-gray-400"></span>
              </span>
            </button>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-teal-500 to-blue-600 text-lg md:text-2xl font-bold tracking-wide drop-shadow-sm select-none">
              YourQCM
            </span>
          </div>

          {/* Center - App Name - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-2">
            <span className="font-semibold text-gray-500 text-sm lg:text-base">
              {examQuestionData?.moduleName || "Examen"}
            </span>
          </div>

          {/* Right - Controls */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={toggleTheme}
              className="p-1 md:p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isDarkMode ? (
                <FaSun className="w-3 md:w-4 h-3 md:h-4" />
              ) : (
                <FaMoon className="w-3 md:w-4 h-3 md:h-4" />
              )}
            </button>
            <span onClick={() => handleExit()} className="cursor-pointer p-1">
              <LogOut className="w-4 md:w-5 h-4 md:h-5" />
            </span>
            <ProfileMenu isOpen={isOpen} setIsOpen={setIsOpen} />
          </div>
        </div>
      </div>

      {/* Left Sidebar */}
      <div
        className={`${
          isSidebarCollapsed
            ? "-translate-x-full opacity-0 pointer-events-none"
            : "translate-x-0 opacity-100"
        } fixed inset-y-0 left-0 w-[280px] md:w-[255px] lg:w-[280px] bg-white border-r border-gray-200 flex flex-col pt-12 md:pt-16 max-h-screen transition-all duration-300 z-40`}
      >
        {/* Legend */}
        {!isSidebarCollapsed && (
          <div className="px-3 md:px-4 pt-4 relative">
            <div className="absolute top-0 left-0">
              <span
                className="text-gray-500 text-xs md:text-sm cursor-pointer hover:text-gray-700 transition-colors"
                onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
              >
                {isLegendCollapsed ? (
                  <Plus className="w-5 h-5 bg-blue-500 rounded-full text-white" />
                ) : (
                  <Minus className="w-5 h-5 bg-blue-500 rounded-full text-white" />
                )}
              </span>
            </div>
            {!isLegendCollapsed && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-2 md:p-3 flex flex-col  justify-center gap-2 md:gap-4">
                <div className="flex  items-center gap-2 ">
                  <span className="w-3 h-3 rounded-full bg-gray-300"></span>
                  <span className="text-gray-500 text-xs md:text-sm">
                    not visited
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-400"></span>
                  <span className="text-orange-500 text-xs md:text-sm">
                    unanswered
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <span className="text-purple-500 text-xs md:text-sm">
                    review
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items */}
        {!isSidebarCollapsed && (
          <div className="flex-1 overflow-y-auto space-y-3 px-3 md:px-0">
            {examPeriods.map((period) => (
              <div key={period.id}>
                <div className="h-[2px] w-full bg-gray-200 mt-[5px]"></div>
                <button
                  onClick={() => togglePeriod(period.id)}
                  className={`w-full flex items-center space-x-3 text-left text-xs md:text-sm py-2 px-3 rounded-lg transition-all ${
                    period.id === "normal2022"
                      ? "bg-blue-100 text-blue-700 font-semibold "
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  <IoIosArrowForward
                    className={`w-3 md:w-4 h-3 md:h-4 transition-transform ${
                      expandedPeriods[period.id] ? "rotate-90" : "rotate-0"
                    } ${
                      period.id === "normal2022"
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  />
                  <span className="font-medium">{period.label}</span>
                </button>

                {expandedPeriods[period.id] && period.questions.length > 0 && (
                  <div className="ml-6 md:ml-8 mt-2">
                    <div className="grid grid-cols-6 gap-1">
                      {period.questions.map((q, index) => {
                        const isCurrentQuestion = q.id === question?._id;
                        const dotColor = isCurrentQuestion
                          ? "bg-blue-500"
                          : "bg-orange-300";

                        return (
                          <React.Fragment key={q.id}>
                            <button
                              onClick={() => {
                                const allQuestions = [];
                                Object.values(
                                  examQuestionData.questions
                                ).forEach((sessionQuestions) => {
                                  allQuestions.push(...sessionQuestions);
                                });
                                const questionIndex = allQuestions.findIndex(
                                  (eq) => eq._id === q.id
                                );
                                if (questionIndex !== -1) {
                                  setCurrentQuestion(questionIndex);
                                  setShowResults(false);
                                  setShowExplanation(false);
                                  setShowVerifyModal(false);
                                  // Close sidebar on mobile after selection
                                  if (window.innerWidth < 768) {
                                    setIsSidebarCollapsed(true);
                                  }
                                }
                              }}
                              className={`flex items-center gap-2 text-xs md:text-[13px] p-1 rounded hover:bg-gray-50 ${
                                isCurrentQuestion
                                  ? "text-blue-700 font-semibold"
                                  : "text-gray-700 hover:text-gray-900"
                              }`}
                            >
                              <span
                                className={`w-4  h-4  rounded-full ${dotColor}`}
                              ></span>
                              <span className="text-[15px]">{index + 1}</span>
                            </button>
                            {/* Vertical separator between each question except the last, styled as in the screenshot */}
                            {index !== period.questions.length - 1 && (
                              <div
                                className="h-6 w-px bg-gray-300 mx-1 self-center"
                                style={{ minHeight: 24 }}
                              ></div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expandedPeriods[period.id] &&
                  period.questions.length === 0 && (
                    <div className="ml-6 md:ml-8 text-xs md:text-sm text-gray-400 py-2">
                      Aucune question
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {/* Progress Indicator */}
        {!isSidebarCollapsed && (
          <div className="p-3 md:p-6 border-t border-gray-200">
            <div className="flex justify-between text-xs md:text-sm mb-2">
              <span className="text-red-500 font-medium">fausses</span>
              <span className="text-green-500 font-medium">corrects</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{
                  width: `${
                    examQuestionData?.totalQuestions
                      ? (currentQuestion / examQuestionData.totalQuestions) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
            <div className="text-xs md:text-sm text-gray-600">
              {examQuestionData?.totalQuestions
                ? Math.round(
                    (currentQuestion / examQuestionData.totalQuestions) * 100
                  )
                : 0}
              % Complete
            </div>
            <div className="text-xs md:text-sm text-gray-500">
              {currentQuestion + 1}/{examQuestionData?.totalQuestions || 0}
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay backdrop */}
      {!isSidebarCollapsed && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-[50px] md:pt-[60px] h-screen overflow-hidden px-3 md:px-6">
        {/* Top Navigation Bar */}
        <div className="text-white px-3 md:px-6 lg:px-8 py-3 w-full mx-auto mt-4 bg-[#00a8f3] rounded-t-2xl max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="text-xs md:text-sm truncate flex-1 mr-4">
              {examQuestionData?.moduleName || "Module"} &gt;{" "}
              {examQuestionData?.year || "Année"} -{" "}
              {examQuestionData?.name || "Session"}
            </div>

            {/* Mobile: Toggle button + collapsible actions */}
            <div className="md:hidden flex items-center">
              {/* Collapsible actions - show when not collapsed */}
              <div
                className={`flex gap-1.5 mr-2 transition-all duration-300 ease-in-out overflow-hidden ${
                  areActionsCollapsed
                    ? "max-w-0 opacity-0 pointer-events-none"
                    : "max-w-[500px] opacity-100 pointer-events-auto"
                }`}
                style={{
                  maxWidth: areActionsCollapsed ? 0 : 500,
                }}
              >
                <IconWithTooltip Icon={Album} label="ajouter à revoir" />
                <IconWithTooltip Icon={Bookmark} label="ajouter à playlist" />
                <IconWithTooltip Icon={NotebookPen} label="ajouter une note" />
                <IconWithTooltip Icon={TriangleAlert} label="Signaler" />
              </div>

              {/* Toggle button */}
              <button
                onClick={() => setAreActionsCollapsed(!areActionsCollapsed)}
                className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 active:scale-95"
                title={
                  areActionsCollapsed
                    ? "Afficher les actions"
                    : "Masquer les actions"
                }
              >
                {areActionsCollapsed ? (
                  <div className="flex flex-col items-center justify-center w-4 h-4">
                    <div className="w-1 h-1 bg-white rounded-full mb-0.5"></div>
                    <div className="w-1 h-1 bg-white rounded-full mb-0.5"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-3 h-0.5 bg-white rounded-full transform rotate-45 absolute"></div>
                    <div className="w-3 h-0.5 bg-white rounded-full transform -rotate-45 absolute"></div>
                  </div>
                )}
              </button>
            </div>

            {/* Desktop: Always show actions */}
            <div className="hidden md:flex gap-2.5">
              <IconWithTooltip Icon={Album} label={"ajouter à revoir"} />
              <IconWithTooltip Icon={Bookmark} label={"ajouter a playlist"} />
              <IconWithTooltip Icon={NotebookPen} label={"ajouter une note"} />
              <IconWithTooltip Icon={TriangleAlert} label={"Signaler"} />
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 pb-8 overflow-y-auto ">
          <div className="w-full mx-auto bg-white rounded-b-2xl  p-2 max-w-7xl">
            {/* Meta Header: question count and tags (layout only, keep colors) */}

            {/* Question Header */}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 ">
              <div className="flex items-center space-x-2 md:space-x-4 ">
                <span className="text-gray-600 font-medium text-sm md:text-base">
                  {question?.sessionLabel || "Session"} Q{currentQuestion + 1}
                </span>
                <span className="text-gray-400 hidden md:inline">|</span>
                <span className="bg-black text-white px-2 md:px-3 py-1 rounded-full text-xs md:text-sm">
                  collective
                </span>
              </div>

              <div className="flex items-center space-x-2 md:space-x-3">
                <button className="p-1.5 md:p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
                  <div className="w-3 md:w-4 h-3 md:h-4 border-2 border-gray-400 rounded flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                </button>

                {/* Font Size Selector */}
                <div className="relative font-size-selector">
                  <button
                    onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
                    className="p-1.5 md:p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors flex items-center space-x-1 md:space-x-2"
                  >
                    <ImFontSize className="w-3 md:w-4 h-3 md:h-4 text-gray-600" />
                    <span className="text-xs font-bold hidden md:inline">
                      <span className="text-red-500">A</span>
                      <span className="text-gray-500">a</span>
                    </span>
                    <span className="text-xs text-gray-600">{fontSize}px</span>
                  </button>

                  {showFontSizeMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                      <div className="p-2 border-b border-gray-100">
                        <div className="text-xs text-gray-600 mb-2">
                          Font Size
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={decreaseFontSize}
                            className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200"
                          >
                            <span className="text-xs">-</span>
                          </button>
                          <span className="text-xs font-medium">
                            {fontSize}px
                          </span>
                          <button
                            onClick={increaseFontSize}
                            className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200"
                          >
                            <span className="text-xs">+</span>
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={resetFontSize}
                        className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Reset to Default
                      </button>
                    </div>
                  )}
                </div>

                <button className="p-1.5 md:p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
                  <PiImagesSquareFill className="w-3 md:w-4 h-3 md:h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Question Box */}
            <div
              className="rounded-xl p-4 md:p-6 mb-2 relative"
              style={{ backgroundColor: "#f9ddad" }}
            >
              <div className="flex items-start space-x-3 md:space-x-4">
                {question?.images && question.images.length > 0 ? (
                  <div className="w-10 md:w-12 h-10 md:h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-gray-600">IMG</span>
                  </div>
                ) : (
                  <div className="w-10 md:w-12 h-10 md:h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-gray-600">TXT</span>
                  </div>
                )}
                <div className="flex-1">
                  <p
                    className="text-gray-800 leading-relaxed"
                    style={{ fontSize: `${Math.max(fontSize - 2, 14)}px` }}
                  >
                    {question?.text || "Question non disponible"}
                  </p>
                </div>
              </div>
            </div>

            {/* Answer Options */}
            <div className="space-y-2 md:space-y-3 mb-6 md:mb-8">
              {question?.options?.map((option, index) => {
                const answerKey = String.fromCharCode(65 + index);
                const currentQuestionAnswers =
                  selectedAnswers[currentQuestion] || [];
                const isSelected = currentQuestionAnswers.includes(answerKey);
                const isCorrect = option.isCorrect || false;

                return (
                  <button
                    key={index}
                    onClick={() =>
                      !showResults && handleAnswerSelect(answerKey)
                    }
                    disabled={showResults}
                    className={`w-full rounded-[8px] md:rounded-[10px] text-left transition-all border overflow-hidden touch-manipulation ${
                      showResults
                        ? ""
                        : isSelected
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                    style={
                      showResults
                        ? // Results styles
                          isCorrect && isSelected
                          ? {
                              backgroundColor: "#28a89b",
                              borderColor: "#28a89b",
                              color: "#ffffff",
                            }
                          : isCorrect && !isSelected
                          ? {
                              backgroundColor: "#ffffff",
                              borderColor: "#298e7e",
                              color: "#298e7e",
                            }
                          : !isCorrect && isSelected
                          ? {
                              backgroundColor: "#cf4d65",
                              borderColor: "#cf4d65",
                              color: "#ffffff",
                            }
                          : {
                              backgroundColor: "#f3f4f6",
                              borderColor: "#e5e7eb",
                              color: "#374151",
                            }
                        : // Pre-submit styles
                        isSelected
                        ? { backgroundColor: "#276fc9", borderColor: "#276fc9" }
                        : { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" }
                    }
                  >
                    <div
                      className="flex items-center gap-3 md:gap-3 px-3 md:px-4"
                      style={{ minHeight: "48px" }}
                    >
                      <div
                        className="w-6 md:w-7 h-6 md:h-7 rounded-full border flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{
                          backgroundColor: showResults
                            ? isCorrect && isSelected
                              ? "#0c8381"
                              : !isCorrect && isSelected
                              ? "#ac1429"
                              : isCorrect && !isSelected
                              ? "#298e7e"
                              : "#ffffff"
                            : isSelected
                            ? "#f59e0b"
                            : "#ffffff",
                          color: showResults
                            ? isCorrect || isSelected
                              ? "#ffffff"
                              : "#374151"
                            : isSelected
                            ? "#ffffff"
                            : "#374151",
                          borderColor: showResults
                            ? isCorrect || isSelected
                              ? "transparent"
                              : "#d1d5db"
                            : isSelected
                            ? "transparent"
                            : "#d1d5db",
                          borderWidth: 1,
                        }}
                      >
                        {answerKey}
                      </div>

                      <span
                        className="font-medium leading-relaxed flex-1"
                        style={{ fontSize: `${Math.max(fontSize - 1, 13)}px` }}
                      >
                        {option.text}
                      </span>
                      {showResults && (
                        <span className="ml-auto flex-shrink-0">
                          {getAnswerIcon(answerKey, index)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Navigation Row */}
            <div className="mt-6 md:mt-8 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 md:gap-4 w-full">
                {/* Previous */}
                <button
                  onClick={() => {
                    if (currentQuestion > 0) {
                      setCurrentQuestion(currentQuestion - 1);
                      setShowResults(false);
                      setShowExplanation(false);
                      setShowVerifyModal(false);
                    }
                  }}
                  disabled={currentQuestion === 0}
                  className="flex items-center justify-center sm:justify-start gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  <FaArrowLeft className="w-3 md:w-4 h-3 md:h-4" />
                  <span className="text-sm md:text-base font-medium">
                    Précédent
                  </span>
                </button>

                {/* Voir explication */}
                <button
                  onClick={() => {
                    setShowExplanation(true);
                    setShowVerifyModal(false);
                  }}
                  className="px-4 md:px-6 py-2 md:py-2.5 rounded-lg border border-blue-400 text-blue-700 bg-white hover:bg-blue-50 font-medium text-sm md:text-base touch-manipulation w-full"
                >
                  Voir explication
                </button>
                <button
                  onClick={handleCheckAnswer}
                  className="px-4 md:px-6 py-2 md:py-2.5 rounded-lg border border-blue-400 text-blue-700 bg-white hover:bg-blue-50 font-medium text-sm md:text-base touch-manipulation w-full"
                >
                  Vérifier réponse
                </button>

                {/* Next */}
                <button
                  onClick={() => {
                    const allQuestions = [];
                    Object.values(examQuestionData.questions).forEach(
                      (sessionQuestions) => {
                        allQuestions.push(...sessionQuestions);
                      }
                    );
                    if (currentQuestion < allQuestions.length - 1) {
                      setCurrentQuestion(currentQuestion + 1);
                      setShowResults(false);
                      setShowExplanation(false);
                      setShowVerifyModal(false);
                    }
                  }}
                  disabled={
                    currentQuestion >=
                    (examQuestionData?.totalQuestions || 0) - 1
                  }
                  className="flex items-center justify-center sm:justify-end gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  <span className="text-sm md:text-base font-medium">
                    Suivant
                  </span>
                  <FaArrowRight className="w-3 md:w-4 h-3 md:h-4" />
                </button>
              </div>
            </div>

            {/* Explanation */}
            {showExplanation && (
              <ExplicationModel
                question={question}
                setShowExplanation={setShowExplanation}
              />
            )}
          </div>
        </div>
      </div>
      {editModelShow && <ResumeModel />}
      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed bottom-3 left-0 w-full z-[60] flex items-end justify-center p-4 pointer-events-none ">
          <div
            className="absolute inset-0"
            onClick={() => setShowVerifyModal(false)}
          ></div>
          <div className="relative bg-white rounded-2xl w-full max-w-2xl p-4 md:p-6 max-h-[80vh] overflow-y-auto transform transition-all duration-300 scale-100 border border-gray-300">
            {/* Result indicators */}
            <div className="flex items-center justify-center gap-6 mb-6">
              {isAnswerCorrect() ? (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-600 shadow-lg shadow-green-300/40 flex items-center justify-center text-white text-xl md:text-2xl font-bold">
                  ✓
                </div>
              ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600 shadow-lg shadow-red-300/40 flex items-center justify-center text-white text-xl md:text-2xl font-bold">
                  ×
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
              {/* Action buttons */}
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
                <button
                  className="w-full md:w-auto px-4 md:px-5 py-2 rounded-full border border-gray-400 text-gray-900 bg-white hover:bg-gray-50 shadow-sm text-sm md:text-base touch-manipulation"
                  onClick={() => setShowVerifyModal(false)}
                >
                  communauté
                </button>

                <button
                  className="w-full md:w-auto px-4 md:px-5 py-2 rounded-full border border-gray-400 text-gray-900 bg-white hover:bg-gray-50 shadow-sm text-sm md:text-base touch-manipulation"
                  onClick={() => {
                    setSelectedAnswers({
                      ...selectedAnswers,
                      [currentQuestion]: [],
                    });
                    setShowResults(false);
                    setShowVerifyModal(false);
                  }}
                >
                  Ressayer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Help legend overlay removed; legend moved inside sidebar */}
    </div>
  );
};

export default ExamPage;
