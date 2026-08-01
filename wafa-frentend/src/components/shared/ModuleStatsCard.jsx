import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { CircularProgress } from "@/components/ui/circular-progress";
import { cn } from "@/lib/utils";

const ModuleStatsCard = ({
  name,
  questionsAnswered = 0,
  totalQuestions = 0,
  correctAnswers = 0,
  incorrectAnswers = 0,
  color = "#3b82f6",
  onClick
}) => {
  // Calculate percentage
  const percentage = totalQuestions > 0 
    ? Math.round((questionsAnswered / totalQuestions) * 100) 
    : 0;

  // Calculate bar widths
  const total = correctAnswers + incorrectAnswers;
  const correctPercent = total > 0 ? (correctAnswers / total) * 100 : 0;
  const incorrectPercent = total > 0 ? (incorrectAnswers / total) * 100 : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "bg-blue-50/80 rounded-xl p-4 cursor-pointer",
        "border border-blue-100 hover:border-blue-200",
        "hover:shadow-md transition-all duration-200"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Circular Progress */}
        <CircularProgress 
          value={percentage} 
          size={50} 
          strokeWidth={5}
          color={color}
          trackColor="#e0e7ff"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Module Name */}
          <h3 className="font-semibold text-foreground text-sm mb-1 truncate">
            {name}
          </h3>

          {/* Question Count */}
          <p className="text-xs text-muted-foreground mb-2">
            {questionsAnswered} sur {totalQuestions}
          </p>

          {/* Progress Bar (Green/Red) */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
            {correctPercent > 0 && (
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${correctPercent}%` }}
              />
            )}
            {incorrectPercent > 0 && (
              <div 
                className="h-full bg-red-400 transition-all duration-300"
                style={{ width: `${incorrectPercent}%` }}
              />
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0" />
      </div>
    </motion.div>
  );
};

export default ModuleStatsCard;
