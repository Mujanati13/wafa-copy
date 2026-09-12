import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";
import UserStats from "../models/userStatsModel.js";
import asyncHandler from "../handlers/asyncHandler.js";
import { getOverviewStats, getOverviewActivity } from "./adminOverviewController.js";

export const AdminAnalyticsController = {
  getDashboardStats: getOverviewStats,

  // Get user growth data for chart
  getUserGrowth: asyncHandler(async (req, res) => {
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: userGrowth
    });
  }),

  getRecentActivity: getOverviewActivity,

  // Get subscription analytics
  getSubscriptionAnalytics: asyncHandler(async (req, res) => {
    const [freeUsers, premiumUsers] = await Promise.all([
      User.countDocuments({ plan: "Free" }),
      User.countDocuments({ plan: "Premium" })
    ]);
    const total = freeUsers + premiumUsers;

    res.status(200).json({
      success: true,
      data: {
        free: freeUsers,
        premium: premiumUsers,
        total,
        conversionRate: total > 0 ? ((premiumUsers / total) * 100).toFixed(2) : "0.00"
      }
    });
  }),

  // Get user demographics
  getUserDemographics: asyncHandler(async (req, res) => {
    const demographics = await User.aggregate([
      {
        $group: {
          _id: "$semesters",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: demographics
    });
  }),

  // Get leaderboard with rankings
  getLeaderboard: asyncHandler(async (req, res) => {
    const { year, studentYear, period = 'all', limit = 200 } = req.query;
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 200, 1), 500);

    // Build match criteria
    const matchCriteria = {};

    if (year && year !== 'All') {
      matchCriteria['semesters'] = year;
    }

    // Fetch ALL users and left join with their stats (show all users even without stats)
    const leaderboard = await User.aggregate([
      {
        $match: matchCriteria
      },
      {
        $lookup: {
          from: 'userstats',
          localField: '_id',
          foreignField: 'userId',
          as: 'stats'
        }
      },
      {
        $project: {
          username: '$username',
          name: '$name',
          email: '$email',
          photoURL: '$profilePicture',
          normalPoints: {
            $ifNull: [
              { $arrayElemAt: ['$stats.totalPoints', 0] },
              0
            ]
          },
          points: {
            $ifNull: [
              { $arrayElemAt: ['$stats.totalPoints', 0] },
              0
            ]
          },
          bluePoints: {
            $ifNull: [
              { $arrayElemAt: ['$stats.bluePoints', 0] },
              0
            ]
          },
          greenPoints: {
            $ifNull: [
              { $arrayElemAt: ['$stats.greenPoints', 0] },
              0
            ]
          },
          totalExams: {
            $ifNull: [
              { $arrayElemAt: ['$stats.totalExams', 0] },
              0
            ]
          },
          averageScore: {
            $ifNull: [
              { $arrayElemAt: ['$stats.averageScore', 0] },
              0
            ]
          },
          studyHours: {
            $ifNull: [
              { $arrayElemAt: ['$stats.studyHours', 0] },
              0
            ]
          },
          questionsAnswered: {
            $ifNull: [
              { $arrayElemAt: ['$stats.questionsAnswered', 0] },
              0
            ]
          },
          correctAnswers: {
            $ifNull: [
              { $arrayElemAt: ['$stats.correctAnswers', 0] },
              0
            ]
          },
          semesters: '$semesters',
          plan: '$plan',
          currentYear: '$currentYear',
          isAactive: '$isAactive'
        }
      },
      {
        $addFields: {
          totalPoints: { $add: ['$normalPoints', '$bluePoints', '$greenPoints'] },
          level: {
            $floor: {
              $divide: [{ $add: ['$normalPoints', '$bluePoints', '$greenPoints'] }, 50]
            }
          }
        }
      },
      {
        $sort: { totalPoints: -1 }
      },
      {
        $limit: safeLimit
      }
    ]);

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Calculate statistics
    const totalUsers = leaderboard.length;
    const topPoints = leaderboard[0]?.totalPoints || 0;
    const avgPoints = totalUsers > 0
      ? Math.round(leaderboard.reduce((acc, u) => acc + (u.totalPoints || 0), 0) / totalUsers)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        stats: {
          totalUsers,
          topPoints,
          avgPoints
        }
      }
    });
  }),

  // Reset monthly revenue
  resetMonthlyRevenue: asyncHandler(async (req, res) => {
    try {
      // Delete all transactions from the current month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const result = await Transaction.deleteMany({
        createdAt: {
          $gte: currentMonth,
          $lt: nextMonth
        }
      });

      res.status(200).json({
        success: true,
        message: `Monthly revenue reset. Deleted ${result.deletedCount} transactions.`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error("Error resetting monthly revenue:", error);
      res.status(500).json({
        success: false,
        message: "Error resetting monthly revenue",
        error: error.message
      });
    }
  }),

  // Reset all transactions
  resetAllTransactions: asyncHandler(async (req, res) => {
    try {
      const result = await Transaction.deleteMany({});

      res.status(200).json({
        success: true,
        message: `All transactions deleted. Total: ${result.deletedCount} transactions.`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error("Error resetting all transactions:", error);
      res.status(500).json({
        success: false,
        message: "Error resetting all transactions",
        error: error.message
      });
    }
  })
};

export default AdminAnalyticsController;
