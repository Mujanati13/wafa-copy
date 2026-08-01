import { motion } from "framer-motion";
import { FaCheckCircle, FaTimesCircle, FaCircle } from "react-icons/fa";

const QuestionProgressBar = ({ totalQuestions, currentQuestion, selectedAnswers }) => {
  const getQuestionStatus = (index) => {
    if (selectedAnswers[index] !== undefined) {
      // Question answered - will determine if correct/incorrect after submission
      return "answered";
    }
    if (index === currentQuestion) {
      return "current";
    }
    return "unanswered";
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const percentage = ((answeredCount / totalQuestions) * 100).toFixed(0);

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl shadow-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Progression de l'examen
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <FaCheckCircle className="text-green-500" />
            <span className="text-muted-foreground">Répondu: {answeredCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <FaCircle className="text-muted-foreground/40" size={10} />
            <span className="text-muted-foreground">
              Restant: {totalQuestions - answeredCount}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative w-full bg-muted rounded-full h-3 mb-3">
        <motion.div
          className="absolute h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
        </motion.div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Question {currentQuestion + 1} / {totalQuestions}
        </span>
        <span className="font-bold text-blue-600 dark:text-blue-400">{percentage}% complété</span>
      </div>

      {/* Question dots indicator */}
      <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
        {Array.from({ length: Math.min(totalQuestions, 50) }).map((_, index) => {
          const status = getQuestionStatus(index);
          return (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                status === "answered"
                  ? "bg-blue-500 scale-110"
                  : status === "current"
                  ? "bg-teal-500 scale-125 ring-2 ring-teal-200 dark:ring-teal-900"
                  : "bg-muted-foreground/30"
              }`}
              title={`Question ${index + 1}`}
            />
          );
        })}
        {totalQuestions > 50 && (
          <span className="text-xs text-muted-foreground ml-2">
            +{totalQuestions - 50} questions
          </span>
        )}
      </div>
    </div>
  );
};

export default QuestionProgressBar;
