import mongoose from "mongoose";

const userStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    // Overall statistics
    totalQuestionsAttempted: {
      type: Number,
      default: 0,
    },
    totalCorrectAnswers: {
      type: Number,
      default: 0,
    },
    totalIncorrectAnswers: {
      type: Number,
      default: 0,
    },
    totalTimeSpent: {
      // in seconds
      type: Number,
      default: 0,
    },
    // Cumulative time reported by each active exam session. Keeping the last
    // elapsed value per session makes periodic client updates idempotent.
    studySessions: {
      type: Map,
      of: {
        elapsedSeconds: {
          type: Number,
          default: 0,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
      default: new Map(),
      select: false,
    },
    totalExamsCompleted: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      // days
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastActivityDate: {
      type: Date,
      default: Date.now,
    },
    // Answered questions persistence for exam page
    answeredQuestions: {
      type: Map,
      of: {
        selectedAnswers: [Number],
        isVerified: Boolean,
        isCorrect: Boolean,
        answeredAt: Date,
        examId: mongoose.Schema.Types.ObjectId,
        moduleId: mongoose.Schema.Types.ObjectId
      },
      default: new Map()
    },
    // Questions answered count (for progress calculation)
    questionsAnswered: {
      type: Number,
      default: 0
    },
    // Correct answers count
    correctAnswers: {
      type: Number,
      default: 0
    },
    // Points system
    totalPoints: {
      type: Number,
      default: 0
    },
    // Normal points (from correct answers: +1 pt each)
    normalPoints: {
      type: Number,
      default: 0
    },
    // Blue points (from approved explanations: +40 pts each)
    bluePoints: {
      type: Number,
      default: 0
    },
    // Green points (from approved reports: +30 pts each)
    greenPoints: {
      type: Number,
      default: 0
    },
    // Total questions in system (for percentage calculation)
    totalQuestionsInSystem: {
      type: Number,
      default: 0
    },
    // Percentage: (questionsAnswered / totalQuestionsInSystem) * 100
    percentageAnswered: {
      type: Number,
      default: 0
    },
    // Wrong answers count
    wrongAnswers: {
      type: Number,
      default: 0
    },
    // Module-specific progress
    moduleProgress: [
      {
        moduleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Module",
        },
        moduleName: String,
        questionsAttempted: {
          type: Number,
          default: 0,
        },
        correctAnswers: {
          type: Number,
          default: 0,
        },
        wrongAnswers: {
          type: Number,
          default: 0,
        },
        incorrectAnswers: {
          type: Number,
          default: 0,
        },
        completionPercentage: {
          type: Number,
          default: 0,
        },
        averageScore: {
          type: Number,
          default: 0,
        },
        timeSpent: {
          type: Number,
          default: 0,
        },
        lastAttempted: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Weekly activity (last 7 days)
    weeklyActivity: [
      {
        date: Date,
        questionsAttempted: {
          type: Number,
          default: 0,
        },
        correctAnswers: {
          type: Number,
          default: 0,
        },
        timeSpent: {
          type: Number,
          default: 0,
        },
        examsCompleted: {
          type: Number,
          default: 0,
        },
      },
    ],
    // Achievements
    achievements: [
      {
        achievementId: String,
        achievementName: String,
        earnedDate: {
          type: Date,
          default: Date.now,
        },
        description: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Calculate and update completion percentage
userStatsSchema.methods.updateModuleProgress = async function (
  moduleId,
  moduleName,
  isCorrect,
  timeSpent = 0
) {
  const moduleIndex = this.moduleProgress.findIndex(
    (m) => m.moduleId.toString() === moduleId.toString()
  );

  if (moduleIndex === -1) {
    // Add new module progress
    this.moduleProgress.push({
      moduleId,
      moduleName,
      questionsAttempted: 1,
      correctAnswers: isCorrect ? 1 : 0,
      incorrectAnswers: isCorrect ? 0 : 1,
      timeSpent,
      lastAttempted: new Date(),
    });
  } else {
    // Update existing module progress
    const module = this.moduleProgress[moduleIndex];
    module.questionsAttempted += 1;
    if (isCorrect) {
      module.correctAnswers += 1;
    } else {
      module.incorrectAnswers += 1;
    }
    module.timeSpent += timeSpent;
    module.averageScore =
      (module.correctAnswers / module.questionsAttempted) * 100;
    module.lastAttempted = new Date();
  }

  // Update overall stats
  this.totalQuestionsAttempted += 1;
  if (isCorrect) {
    this.totalCorrectAnswers += 1;
  } else {
    this.totalIncorrectAnswers += 1;
  }
  this.totalTimeSpent += timeSpent;
  this.averageScore =
    (this.totalCorrectAnswers / this.totalQuestionsAttempted) * 100;
  this.lastActivityDate = new Date();

  await this.save();
};

export default mongoose.model("UserStats", userStatsSchema);
