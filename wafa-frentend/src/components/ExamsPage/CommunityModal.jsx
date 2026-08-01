import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Lock, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/utils";
import { toast } from "sonner";

const CommunityModal = ({ 
  isOpen, 
  onClose, 
  questionId,
  questionText,
  questionOptions, 
  userLevel = 0, 
  requiredLevel = 20,
  moduleColor = "#6366f1",
  onOpenExplanation
}) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalVotes: 0,
    optionVotes: {},
    correctPercentage: 0,
    totalVoters: 0
  });

  const canVote = userLevel >= requiredLevel;

  // Helper function to darken/lighten color
  const adjustColor = (color, amount) => {
    if (!color) return '#6366f1';
    
    const isDark = document.documentElement.classList.contains('dark');
    const finalAmount = isDark ? Math.abs(amount) * 1.5 : amount;

    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + finalAmount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + finalAmount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + finalAmount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Fetch existing votes
  const fetchVotes = useCallback(async () => {
    if (!questionId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`questions/community-votes/${questionId}`);
      if (response.data.success) {
        const data = response.data.data;
        setStats({
          totalVotes: data.voteStats.totalVotes || 0,
          optionVotes: data.voteStats.optionVotes || {},
          correctPercentage: data.correctPercentage || 0,
          totalVoters: data.totalVoters || 0
        });
        
        if (data.userVote) {
          setUserVote(data.userVote);
          setSelectedOptions(data.userVote.selectedOptions || []);
          setHasVoted(true);
        }
      }
    } catch (error) {
      console.error("Error fetching votes:", error);
      // Use mock data if API fails
      if (questionOptions) {
        const mockVotes = {};
        let total = 0;
        questionOptions.forEach((opt, index) => {
          const letter = String.fromCharCode(65 + index);
          const votes = opt.isCorrect ? Math.floor(Math.random() * 100) + 100 : Math.floor(Math.random() * 50);
          mockVotes[letter] = votes;
          total += votes;
        });
        setStats({
          totalVotes: total,
          optionVotes: mockVotes,
          correctPercentage: 0,
          totalVoters: Math.floor(total / 1.5)
        });
      }
    } finally {
      setLoading(false);
    }
  }, [questionId, questionOptions]);

  useEffect(() => {
    if (isOpen) {
      fetchVotes();
      setSelectedOptions([]);
      setHasVoted(false);
    }
  }, [isOpen, fetchVotes]);

  const toggleOption = (index) => {
    if (!canVote || hasVoted) return;
    
    setSelectedOptions(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleConfirmVote = async () => {
    if (!canVote || selectedOptions.length === 0) return;

    try {
      setSubmitting(true);
      const response = await api.post(`questions/community-vote/${questionId}`, {
        selectedOptions
      });

      if (response.data.success) {
        setHasVoted(true);
        setUserVote({ selectedOptions });
        toast.success("Vote enregistré avec succès!");
        
        // Update stats
        if (response.data.data.voteStats) {
          setStats(prev => ({
            ...prev,
            totalVotes: response.data.data.voteStats.totalVotes,
            optionVotes: response.data.data.voteStats.optionVotes
          }));
        }
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error("Erreur lors de l'enregistrement du vote");
    } finally {
      setSubmitting(false);
    }
  };

  const options = questionOptions || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with module color */}
            <div 
              className="p-4 text-white shrink-0"
              style={{
                background: `linear-gradient(to right, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-900/20 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      Vote de la communauté
                    </h3>
                    <p className="text-sm text-white/80">
                      {stats.totalVotes} votes
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Level requirement warning */}
              {!canVote && (
                <div 
                  className="mb-4 p-3 rounded-lg flex items-start gap-3"
                  style={{
                    backgroundColor: `${moduleColor}10`,
                    border: `1px solid ${moduleColor}30`
                  }}
                >
                  <Lock className="h-5 w-5 shrink-0 mt-0.5" style={{ color: moduleColor }} />
                  <p className="text-sm" style={{ color: adjustColor(moduleColor, -60) }}>
                    Tu dois atteindre <strong>{requiredLevel}%</strong> de niveau dans un module pour que tu peux voter dans les questions de ce module.
                    <br />
                    <span className="text-gray-500">Niveau actuel: <strong>{userLevel}%</strong></span>
                  </p>
                </div>
              )}

              {/* Question text */}
              {questionText && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-800 font-medium">
                    {questionText}
                  </p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: moduleColor }} />
                </div>
              ) : (
                <>
                  {/* Options with checkboxes and vote percentages */}
                  <div className="space-y-2">
                    {options.map((option, index) => {
                      const isSelected = selectedOptions.includes(index);
                      const letter = String.fromCharCode(65 + index);
                      const voteCount = stats.optionVotes[letter] || 0;
                      // Calculate percentage based on total weighted votes
                      const percentage = stats.totalVotes > 0 
                        ? Math.round((voteCount / stats.totalVotes) * 1000) / 10 
                        : 0;
                      const isHighestVoted = hasVoted && voteCount > 0 && 
                        voteCount === Math.max(...Object.values(stats.optionVotes));

                      return (
                        <button
                          key={index}
                          onClick={() => toggleOption(index)}
                          disabled={!canVote || hasVoted}
                          className={`w-full overflow-hidden rounded-lg border-2 transition-all text-left ${
                            !canVote || hasVoted ? "cursor-default" : "cursor-pointer hover:border-gray-300"
                          }`}
                          style={{
                            borderColor: isSelected ? moduleColor : '#E5E7EB',
                            backgroundColor: isSelected ? `${moduleColor}08` : 'white'
                          }}
                        >
                          <div className="flex items-center gap-3 p-3">
                            {/* Checkbox */}
                            <div 
                              className="w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                              style={{
                                borderColor: isSelected ? moduleColor : '#D1D5DB',
                                backgroundColor: isSelected ? moduleColor : 'white'
                              }}
                            >
                              {isSelected && (
                                <Check className="h-4 w-4 text-white" />
                              )}
                            </div>

                            {/* Option letter */}
                            <span className="font-semibold text-gray-700">
                              {letter}-
                            </span>

                            {/* Option text */}
                            <span className="text-sm text-gray-700 flex-1">
                              {option.text}
                            </span>

                            {/* Vote percentage - shown after voting */}
                            {hasVoted && (
                              <span 
                                className={`text-sm font-semibold px-2 py-0.5 rounded ${
                                  isHighestVoted 
                                    ? 'bg-yellow-100 text-yellow-700' 
                                    : 'text-gray-500'
                                }`}
                              >
                                {percentage}%
                              </span>
                            )}
                          </div>

                          {/* Vote progress bar - shown after voting */}
                          {hasVoted && (
                            <div className="h-1 bg-gray-100">
                              <div 
                                className="h-full transition-all duration-500"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: isHighestVoted ? '#F59E0B' : '#D1D5DB'
                                }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Confirm button */}
                  {canVote && !hasVoted && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={handleConfirmVote}
                        disabled={selectedOptions.length === 0 || submitting}
                        className="px-6 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        confirmer
                      </button>
                    </div>
                  )}

                  {/* Vote confirmed message */}
                  {hasVoted && (
                    <div 
                      className="mt-4 p-3 rounded-lg text-center"
                      style={{
                        backgroundColor: `${moduleColor}10`,
                        border: `1px solid ${moduleColor}30`
                      }}
                    >
                      <p className="text-sm" style={{ color: adjustColor(moduleColor, -40) }}>
                        ✓ Tu as voté pour <strong>{selectedOptions.map(i => String.fromCharCode(65 + i)).join(', ')}</strong> comme réponse juste
                      </p>
                    </div>
                  )}

                  {/* Explanation info */}
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-gray-600">
                      Si tu veux ajouter à votre vote une forte valeur (comme si 20 personnes a voté votre choix), 
                      <strong> ajouté un explication</strong>.
                    </p>
                    <p className="text-sm text-gray-600">
                      Et en plus tu vas <span className="text-blue-600 font-semibold">gagner un point bleu</span>.
                    </p>
                  </div>

                  {/* Explanation button */}
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenExplanation) {
                          onOpenExplanation();
                        }
                      }}
                      className="px-6 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      explication
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommunityModal;
