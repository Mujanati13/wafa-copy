import React from "react";
import { cn } from "@/lib/utils";

const CircularProgress = ({ 
  value = 0, 
  size = 60, 
  strokeWidth = 6,
  className,
  textClassName,
  color = "#3b82f6",
  trackColor,
  showPercentage = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor || "currentColor"}
          strokeWidth={strokeWidth}
          className={cn(!trackColor && "text-muted-foreground/20")}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showPercentage && (
        <span 
          className={cn(
            "absolute text-sm font-bold",
            textClassName
          )}
          style={{ color }}
        >
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
};

export { CircularProgress };
