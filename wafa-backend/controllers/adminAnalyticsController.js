import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";
import UserStats from "../models/userStatsModel.js";
import asyncHandler from "../handlers/asyncHandler.js";

export const AdminAnalyticsController = {
  // Get dashboard statistics
  getDashboardStats: asyncHandler(async (req, res) => {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);
      const currentMonthEnd = new Date();

      // These metrics are independent, so start all database work together.
      const [
        totalUsers,
        activeSubscriptions,
        usersLastMonth,
        subscriptionsLastMonth,
        examStats,
        examsLastMonth,
        transactions
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ plan: "Premium" }),
        User.countDocuments({ createdAt: { $gte: lastMonth } }),
        User.countDocuments({ plan: "Premium", createdAt: { $gte: lastMonth } }),
        UserStats.aggregate([
          {
            $group: {
              _id: null,
              totalExams: { $sum: "$totalExams" },
              avgScore: { $avg: "$averageScore" },
              totalStudyHours: { $sum: "$studyHours" }
            }
          }
        ]),
        UserStats.aggregate([
          { $match: { lastExamDate: { $gte: lastMonth } } },
          { $group: { _id: null, count: { $sum: "$totalExams" } } }
        ]),
        Transaction.aggregate([
          {
            $match: {
              status: "completed",
              createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
            }
          },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
      ]);

      const userGrowth = totalUsers > 0
        ? ((usersLastMonth / totalUsers) * 100).toFixed(1)
        : 0;
      const subscriptionGrowth = activeSubscriptions > 0
        ? ((subscriptionsLastMonth / activeSubscriptions) * 100).toFixed(1)
        : 0;
      const examData = {
        totalExams: 0,
        avgScore: 0,
        totalStudyHours: 0,
        ...(examStats[0] || {})
      };
      const examGrowth = examData.totalExams > 0 && examsLastMonth[0]
        ? ((examsLastMonth[0].count / examData.totalExams) * 100).toFixed(1)
        : 0;
      const monthlyRevenue = transactions[0]?.total || 0;
      
      res.status(200).json({
        success: true,
        data: {
          totalUsers: {
            value: totalUsers,
            growth: `+${userGrowth}%`,
            newUsers: usersLastMonth
          },
          activeSubscriptions: {
            value: activeSubscriptions,
            growth: `+${subscriptionGrowth}%`,
            newSubscriptions: subscriptionsLastMonth
          },
          examAttempts: {
            value: examData.totalExams,
            growth: `+${examGrowth}%`,
            recentAttempts: examsLastMonth[0]?.count || 0
          },
          monthlyRevenue: {
            value: monthlyRevenue,
            currency: "MAD"
          },
          performanceMetrics: {
            averageScore: Number(examData.avgScore || 0).toFixed(1),
            totalStudyHours: Number(examData.totalStudyHours || 0).toFixed(1)
          }
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching dashboard statistics",
        error: error.message
      });
    }
  }),

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

  // Get recent activity
  getRecentActivity: asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 100);

    const [recentUsers, recentSubscriptions] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .select("username email createdAt plan")
        .lean(),
      User.find({ plan: "Premium" })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("username email updatedAt")
        .lean()
    ]);
    
    // Format activities
    const activities = [
      ...recentUsers.map(user => ({
        type: "user",
        action: "New user registered",
        user: user.username,
        email: user.email,
        time: user.createdAt
      })),
      ...recentSubscriptions.map(user => ({
        type: "subscription",
        action: "Subscription upgraded",
        user: user.username,
        email: user.email,
        time: user.updatedAt
      }))
    ];
    
    // Sort by time
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    res.status(200).json({
      success: true,
      data: activities.slice(0, safeLimit)
    });
  }),

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
