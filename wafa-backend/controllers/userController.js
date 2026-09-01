import mongoose from "mongoose";
import User from "../models/userModel.js";
import UserStats from "../models/userStatsModel.js";
import Transaction from "../models/transactionModel.js";
import { saveProfilePictureLocally, deleteFromLocalStorage } from "../middleware/uploadMiddleware.js";
import asyncHandler from "../handlers/asyncHandler.js";
import { NotificationController } from "./notificationController.js";
import admin from "../config/firebase.js";
import bcrypt from "bcrypt";
import {
    getAcademicYearFromSemesters,
    withAcademicYear,
} from "../utils/academicYear.js";
import { buildProfileActivityStatistics } from "../services/profileStatisticsService.js";
import { classifyFirebaseAdminError } from "../utils/firebaseError.js";

const getPagination = (query, defaultLimit = 10, maxLimit = 100) => {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(
        Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1),
        maxLimit
    );

    return { page, limit, skip: (page - 1) * limit };
};

const getAcademicYear = (user, queryYear = null) => {
    if (queryYear !== null && queryYear !== undefined && queryYear !== "") {
        const parsedQuery = Number.parseInt(String(queryYear).replace(/\D/g, ""), 10);
        if (Number.isInteger(parsedQuery) && parsedQuery >= 1 && parsedQuery <= 12) {
            return parsedQuery;
        }
    }

    const semesterYear = getAcademicYearFromSemesters(user?.semesters);
    if (semesterYear) return Number.parseInt(semesterYear, 10);

    const rawYear = String(user?.currentYear || "").trim();
    if (!rawYear) return null;

    const semesterFormatMatch = rawYear.match(/^S(\d+)$/i);
    if (semesterFormatMatch) {
        const sNum = Number.parseInt(semesterFormatMatch[1], 10);
        if (sNum >= 1 && sNum <= 12) {
            return Math.ceil(sNum / 2);
        }
    }

    const currentYearMatch = rawYear.match(/(?:^|\D)([1-6])(?:\D|$)/);
    if (currentYearMatch) {
        return Number.parseInt(currentYearMatch[1], 10);
    }

    const parsedDirect = Number.parseInt(rawYear.replace(/\D/g, ""), 10);
    if (Number.isInteger(parsedDirect) && parsedDirect >= 1 && parsedDirect <= 6) {
        return parsedDirect;
    }

    return null;
};

const getStudyHours = (totalTimeSpent) => (
    Math.round(((Number(totalTimeSpent) || 0) / 3600) * 10) / 10
);

const getAcademicRanking = async (user, totalPoints) => {
    const academicYear = getAcademicYear(user);
    if (!academicYear) return { rank: null, totalUsers: 0, academicYear: null };

    const academicYearSemesters = [`S${academicYear * 2 - 1}`, `S${academicYear * 2}`];
    const academicYearPattern = new RegExp(`(^|\\D)${academicYear}(\\D|$)`, "i");
    const currentUserId = user._id;
    const currentUserPoints = Number(totalPoints) || 0;

    const [ranking] = await User.aggregate([
        {
            $match: {
                isAactive: true,
                isBlocked: { $ne: true },
                $or: [
                    { semesters: { $in: academicYearSemesters } },
                    { currentYear: academicYearPattern },
                ],
            },
        },
        {
            $lookup: {
                from: "userstats",
                localField: "_id",
                foreignField: "userId",
                as: "stats",
            },
        },
        { $addFields: { stats: { $arrayElemAt: ["$stats", 0] } } },
        {
            $project: {
                points: { $ifNull: ["$stats.totalPoints", 0] },
            },
        },
        {
            $facet: {
                ahead: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $gt: ["$points", currentUserPoints] },
                                    {
                                        $and: [
                                            { $eq: ["$points", currentUserPoints] },
                                            { $lt: ["$_id", currentUserId] },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    { $count: "count" },
                ],
                total: [{ $count: "count" }],
            },
        },
    ]);

    return {
        rank: (ranking?.ahead?.[0]?.count || 0) + 1,
        totalUsers: ranking?.total?.[0]?.count || 0,
        academicYear,
    };
};

export const UserController = {
    // Admin create user - creates user with Firebase and MongoDB
    createAdminUser: async (req, res) => {
        try {
            const { 
                firstName, 
                lastName, 
                email, 
                password, 
                phone,
                plan = "Free",
                currentYear,
                semesters = [],
                paymentMode,
                isPaid = false,
                sendPasswordEmail = true
            } = req.body;
            const normalizedPlan = plan === "Premium Annuel" ? "Premium" : plan;

            // Validate required fields
            if (!firstName || !lastName || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'First name, last name, email and password are required'
                });
            }

            // Check if user already exists in MongoDB
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'A user with this email already exists'
                });
            }

            // Generate username
            const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}_${Math.random().toString(36).substring(7)}`;
            const name = `${firstName} ${lastName}`;

            // Create Firebase user if Firebase is initialized
            let firebaseUid = null;
            let firebaseCreated = false;
            let firebaseErrorDetail = null;
            try {
                // Check if Firebase Admin SDK is properly initialized
                const firebaseInitialized = admin && admin.apps && admin.apps.length > 0;
                console.log('🔥 Firebase initialization check:', firebaseInitialized);
                
                if (firebaseInitialized) {
                    const firebaseUser = await admin.auth().createUser({
                        email: email,
                        password: password,
                        displayName: name,
                        emailVerified: true, // Admin-created users are pre-verified
                    });
                    firebaseUid = firebaseUser.uid;
                    firebaseCreated = true;
                    console.log('✅ Firebase user created:', firebaseUid);
                } else {
                    console.log('⚠️  Firebase not initialized - user will only be created in MongoDB');
                    firebaseErrorDetail = classifyFirebaseAdminError(new Error('Firebase Admin SDK is not initialized'));
                }
            } catch (firebaseError) {
                console.error('🔥 Firebase user creation error:');
                console.error('   Code:', firebaseError.code);
                console.error('   Message:', firebaseError.message);
                
                firebaseErrorDetail = classifyFirebaseAdminError(firebaseError);
                
                // If Firebase user exists, try to get their UID and update password
                if (firebaseError.code === 'auth/email-already-exists') {
                    try {
                        const existingFirebaseUser = await admin.auth().getUserByEmail(email);
                        firebaseUid = existingFirebaseUser.uid;
                        // Update the existing Firebase user's password and mark as verified
                        await admin.auth().updateUser(firebaseUid, {
                            password: password,
                            emailVerified: true,
                            displayName: name,
                        });
                        firebaseCreated = true;
                        firebaseErrorDetail = null;
                        console.log('✅ Existing Firebase user updated:', firebaseUid);
                    } catch (e) {
                        console.error('Could not update existing Firebase user:', e.message);
                        firebaseErrorDetail = classifyFirebaseAdminError(e);
                    }
                }
            }

            // If Firebase was not created successfully, return error
            if (!firebaseCreated) {
                const firebaseFailure = firebaseErrorDetail || {
                    type: 'configuration',
                    detail: 'Firebase Admin authentication is unavailable.',
                    solution: 'Verify the server-side Firebase Admin configuration.',
                };

                return res.status(503).json({
                    success: false,
                    message: 'Firebase authentication could not be set up.',
                    firebaseError: true,
                    firebaseErrorType: firebaseFailure.type,
                    detail: firebaseFailure.detail,
                    solution: firebaseFailure.solution
                });
            }

            // Hash password for MongoDB
            const hashedPassword = await bcrypt.hash(password, 10);

            // Prepare user data
            const userData = {
                username,
                name,
                email,
                password: hashedPassword,
                phone: phone || null,
                plan: normalizedPlan,
                currentYear: currentYear || getAcademicYearFromSemesters(semesters),
                semesters: semesters || [],
                emailVerified: true, // Admin-created users are pre-verified
                isAactive: true,
                firebaseUid,
            };

            // Add payment-related fields if user is paid
            if (isPaid && normalizedPlan !== "Free") {
                userData.paymentMode = paymentMode || "Manual";
                userData.paymentDate = new Date();
                userData.approvalDate = new Date();
                
                // Set plan expiry based on plan type
                const now = new Date();
                if (normalizedPlan === "Premium") {
                    // 6 months for semester plan
                    userData.planExpiry = new Date(now.setMonth(now.getMonth() + 6));
                }
            }

            // Create user in MongoDB
            const newUser = await User.create(userData);

            res.status(201).json({
                success: true,
                message: 'User created successfully' + (firebaseCreated ? ' (Firebase + MongoDB)' : ' (MongoDB only - login may not work)'),
                data: {
                    user: {
                        _id: newUser._id,
                        username: newUser.username,
                        name: newUser.name,
                        email: newUser.email,
                        plan: newUser.plan,
                        currentYear: newUser.currentYear,
                        semesters: newUser.semesters,
                        paymentMode: newUser.paymentMode,
                        paymentDate: newUser.paymentDate,
                        approvalDate: newUser.approvalDate,
                        planExpiry: newUser.planExpiry,
                        isAactive: newUser.isAactive,
                        emailVerified: newUser.emailVerified,
                        firebaseCreated: firebaseCreated,
                    }
                }
            });

        } catch (error) {
            console.error('Error creating admin user:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create user',
                error: error.message
            });
        }
    },

    // Get all users with pagination
    getAllUsers: async (req, res) => {
        try {
            const { page, limit, skip } = getPagination(req.query);

            const [users, totalUsers] = await Promise.all([
                User.find({})
                    .select('-resetCode')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                User.countDocuments({})
            ]);

            // Add hasPassword field and remove actual password
            const usersWithPasswordFlag = users.map(user => {
                const { password, ...safeUser } = user;
                return {
                    ...withAcademicYear(safeUser),
                    hasPassword: Boolean(password)
                };
            });

            const totalPages = Math.ceil(totalUsers / limit);

            res.status(200).json({
                success: true,
                data: {
                    users: usersWithPasswordFlag,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalUsers,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: error.message
            });
        }
    },

    // Get free users (plan: "Free")
    getFreeUsers: async (req, res) => {
        try {
            const { page, limit, skip } = getPagination(req.query);
            const filter = { plan: "Free" };
            const [users, totalFreeUsers] = await Promise.all([
                User.find(filter)
                    .select('-password -resetCode')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                User.countDocuments(filter)
            ]);
            const totalPages = Math.ceil(totalFreeUsers / limit);

            res.status(200).json({
                success: true,
                data: {
                    users: users.map(withAcademicYear),
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalUsers: totalFreeUsers,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching free users:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch free users',
                error: error.message
            });
        }
    },

    // Get paying users (plan: not "Free")
    getPayingUsers: async (req, res) => {
        try {
            const { page, limit, skip } = getPagination(req.query);
            const filter = { plan: { $ne: "Free" } };
            const [users, totalPayingUsers] = await Promise.all([
                User.find(filter)
                    .select('-password -resetCode')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                User.countDocuments(filter)
            ]);

            const usersNeedingTransaction = users
                .filter(user => !user.paymentMode)
                .map(user => user._id);
            const latestTransactions = usersNeedingTransaction.length > 0
                ? await Transaction.aggregate([
                    {
                        $match: {
                            user: { $in: usersNeedingTransaction },
                            status: 'completed'
                        }
                    },
                    { $sort: { createdAt: -1 } },
                    {
                        $group: {
                            _id: '$user',
                            paymentMethod: { $first: '$paymentMethod' }
                        }
                    }
                ])
                : [];
            const paymentMethodByUser = new Map(
                latestTransactions.map(transaction => [
                    transaction._id.toString(),
                    transaction.paymentMethod
                ])
            );
            const usersWithPayment = users.map(user => ({
                ...withAcademicYear(user),
                paymentMethod: user.paymentMode
                    || paymentMethodByUser.get(user._id.toString())
                    || 'Contact'
            }));

            const totalPages = Math.ceil(totalPayingUsers / limit);

            res.status(200).json({
                success: true,
                data: {
                    users: usersWithPayment,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalUsers: totalPayingUsers,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching paying users:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch paying users',
                error: error.message
            });
        }
    },

    // Get user statistics
    getUserStats: async (req, res) => {
        try {
            const [
                totalUsers,
                freeUsers,
                payingUsers,
                activeUsers,
                adminUsers,
                planBreakdown
            ] = await Promise.all([
                User.countDocuments({}),
                User.countDocuments({ plan: "Free" }),
                User.countDocuments({ plan: { $ne: "Free" } }),
                User.countDocuments({ isAactive: true }),
                User.countDocuments({ isAdmin: true }),
                User.aggregate([
                    { $group: { _id: "$plan", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ])
            ]);

            res.status(200).json({
                success: true,
                data: {
                    totalUsers,
                    freeUsers,
                    payingUsers,
                    activeUsers,
                    adminUsers,
                    planBreakdown
                }
            });
        } catch (error) {
            console.error('Error fetching user stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user statistics',
                error: error.message
            });
        }
    },

    // Update user plan
    updateUserPlan: async (req, res) => {
        try {
            const { userId } = req.params;
            const { plan } = req.body;

            if (!plan || !["Free", "Premium", "Enterprise", "Student Discount"].includes(plan)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid plan type'
                });
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { plan },
                { new: true, runValidators: true }
            ).select('-password -resetCode');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'User plan updated successfully',
                data: user
            });
        } catch (error) {
            console.error('Error updating user plan:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user plan',
                error: error.message
            });
        }
    },

    // Toggle user active status
    toggleUserStatus: async (req, res) => {
        try {
            const { userId } = req.params;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            user.isAactive = !user.isAactive;
            await user.save();

            res.status(200).json({
                success: true,
                message: `User ${user.isAactive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    userId: user._id,
                    isActive: user.isAactive
                }
            });
        } catch (error) {
            console.error('Error toggling user status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle user status',
                error: error.message
            });
        }
    },

    // Update user (admin: role, permissions, etc.)
    updateUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const updateData = req.body;

            console.log('📝 updateUser called for:', userId);
            console.log('📝 Received data:', JSON.stringify(updateData, null, 2));
            console.log('📝 Password in request:', updateData.password ? 'Yes (length: ' + updateData.password.length + ')' : 'No');

            // Allowed fields for update - expanded to include all user fields
            const allowedFields = [
                'isAdmin', 'adminRole', 'permissions', 'plan', 'isAactive',
                'name', 'email', 'currentYear', 'semesters',
                'paymentDate', 'approvalDate', 'planExpiry', 'paymentMode',
                'phone', 'university', 'faculty', 'password', 'consentAcceptedAt'
            ];
            const updates = {};

            allowedFields.forEach(field => {
                if (updateData.hasOwnProperty(field)) {
                    updates[field] = updateData[field];
                }
            });

            if (
                Object.prototype.hasOwnProperty.call(updates, 'semesters')
                && !String(updates.currentYear ?? "").trim()
            ) {
                updates.currentYear = getAcademicYearFromSemesters(updates.semesters);
            }

            console.log('📝 Fields to update:', Object.keys(updates));

            // Hash password if provided
            if (updates.password) {
                console.log('📝 Hashing password:', updates.password);
                updates.password = await bcrypt.hash(updates.password, 10);
                console.log('📝 Password hashed successfully, new hash:', updates.password.substring(0, 20) + '...');
            }

            // If email is being updated, check if it's already taken
            if (updates.email) {
                const existingUser = await User.findOne({ 
                    email: updates.email, 
                    _id: { $ne: userId } 
                });
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email is already in use by another user'
                    });
                }
            }

            const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true })
                .select('-password -resetCode');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: user
            });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user',
                error: error.message
            });
        }
    },

    // Block/Unblock user (admin only)
    toggleBlockUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Toggle block status
            user.isBlocked = !user.isBlocked;
            user.blockedAt = user.isBlocked ? new Date() : null;
            user.blockedReason = user.isBlocked ? (reason || null) : null;
            await user.save();

            res.status(200).json({
                success: true,
                message: user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
                data: {
                    userId: user._id,
                    isBlocked: user.isBlocked,
                    blockedAt: user.blockedAt,
                    blockedReason: user.blockedReason
                }
            });
        } catch (error) {
            console.error('Error toggling user block status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user block status',
                error: error.message
            });
        }
    },

    // Delete user (admin only)
    deleteUser: async (req, res) => {
        try {
            const { userId } = req.params;

            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Delete from Firebase if user has firebaseUid
            if (user.firebaseUid) {
                try {
                    const firebaseInitialized = admin && admin.apps && admin.apps.length > 0;
                    if (firebaseInitialized) {
                        await admin.auth().deleteUser(user.firebaseUid);
                        console.log('✅ Firebase user deleted:', user.firebaseUid);
                    } else {
                        console.log('⚠️  Firebase not initialized - user only deleted from MongoDB');
                    }
                } catch (firebaseError) {
                    console.error('🔥 Firebase user deletion error:', firebaseError.message);
                    // Continue with MongoDB deletion even if Firebase deletion fails
                    if (firebaseError.code !== 'auth/user-not-found') {
                        console.error('   User may still exist in Firebase');
                    }
                }
            }

            // Delete from MongoDB
            await User.findByIdAndDelete(userId);

            // Also delete user stats if exists
            try {
                await UserStats.deleteOne({ userId: userId });
            } catch (e) {
                console.log('No user stats to delete or error:', e.message);
            }

            res.status(200).json({
                success: true,
                message: 'User deleted successfully from both Firebase and database'
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user',
                error: error.message
            });
        }
    },

    // Upload profile picture
    uploadProfilePicture: asyncHandler(async (req, res) => {
        if (!req.file) {
            res.status(400);
            throw new Error("Aucun fichier téléchargé");
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404);
            throw new Error("Utilisateur non trouvé");
        }

        // Delete old profile picture from local storage if exists
        if (user.profilePicture && user.profilePicture.startsWith('/uploads/')) {
            await deleteFromLocalStorage(user.profilePicture);
        }

        // Upload new picture to Cloudinary
        const result = await saveProfilePictureLocally(req.file.buffer, req.user._id);

        user.profilePicture = result.secure_url;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Photo de profil mise à jour avec succès",
            profilePicture: user.profilePicture,
        });
    }),

    // Update profile
    updateProfile: asyncHandler(async (req, res) => {
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404);
            throw new Error("Utilisateur non trouvé");
        }

        const { name, email, phone, dateOfBirth, address, university, faculty, currentYear, studentId, bio } = req.body;

        // Update only provided fields
        if (name) user.name = name;
        if (email && email !== user.email) {
            // Check if email is already taken
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                res.status(400);
                throw new Error("Cet email est déjà utilisé");
            }
            user.email = email;
            user.emailVerified = false; // Require re-verification
        }
        if (phone !== undefined) user.phone = phone;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (address !== undefined) user.address = address;
        if (university !== undefined) user.university = university;
        if (faculty !== undefined) user.faculty = faculty;
        if (currentYear !== undefined) user.currentYear = currentYear;
        if (studentId !== undefined) user.studentId = studentId;
        if (bio !== undefined) user.bio = bio;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profil mis à jour avec succès",
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    dateOfBirth: user.dateOfBirth,
                    address: user.address,
                    university: user.university,
                    faculty: user.faculty,
                    currentYear: user.currentYear,
                    studentId: user.studentId,
                    bio: user.bio,
                    profilePicture: user.profilePicture,
                    emailVerified: user.emailVerified,
                },
            },
        });
    }),

    // Get current user profile
    getProfile: asyncHandler(async (req, res) => {
        const user = await User.findById(req.user._id).select("-password -emailVerificationToken -emailVerificationExpires -resetPasswordToken -resetPasswordExpires");

        if (!user) {
            res.status(404);
            throw new Error("Utilisateur non trouvé");
        }

        // Fix missing name field for existing users
        if (!user.name && user.username) {
            user.name = user.username;
            await user.save();
        }

        // Get user stats for additional data
        const UserStats = (await import("../models/userStatsModel.js")).default;
        const userStats = await UserStats.findOne({ userId: req.user._id });

        // Merge user data with stats
        const userData = user.toObject();
        if (userStats) {
            userData.totalPoints = userStats.totalPoints || 0;
            userData.normalPoints = userStats.normalPoints || 0;
            userData.bluePoints = userStats.bluePoints || 0;
            userData.greenPoints = userStats.greenPoints || 0;
            userData.questionsAnswered = userStats.questionsAnswered || 0;
            userData.correctAnswers = userStats.correctAnswers || 0;
            userData.percentageAnswered = userStats.percentageAnswered || 0;
            userData.level = Math.floor((userStats.totalPoints || 0) / 50);
            userData.xpToNextLevel = (userStats.totalPoints || 0) % 50;
        } else {
            userData.totalPoints = 0;
            userData.normalPoints = 0;
            userData.bluePoints = 0;
            userData.greenPoints = 0;
            userData.questionsAnswered = 0;
            userData.correctAnswers = 0;
            userData.percentageAnswered = 0;
            userData.level = 0;
            userData.xpToNextLevel = 0;
        }

        res.status(200).json({
            success: true,
            data: { user: userData },
        });
    }),

    // Get current user's stats and achievements
    getMyStats: asyncHandler(async (req, res) => {
        const UserStats = (await import("../models/userStatsModel.js")).default;

        let userStats = await UserStats.findOne({ userId: req.user._id });

        // If no stats exist, create default stats
        if (!userStats) {
            userStats = await UserStats.create({
                userId: req.user._id,
                totalExams: 0,
                averageScore: 0,
                totalScore: 0,
                studyHours: 0,
                rank: 0,
                achievements: [],
                answeredQuestions: new Map()
            });
        }

        // Convert Map to plain object for JSON serialization
        const answeredQuestionsObj = {};
        if (userStats.answeredQuestions && userStats.answeredQuestions.size > 0) {
            // Mongoose Map - use entries() or forEach()
            userStats.answeredQuestions.forEach((value, key) => {
                answeredQuestionsObj[key] = {
                    selectedAnswers: value.selectedAnswers || [],
                    isVerified: value.isVerified || false,
                    isCorrect: value.isCorrect || false,
                    answeredAt: value.answeredAt,
                    examId: value.examId?.toString(),
                    moduleId: value.moduleId?.toString()
                };
            });
        }

        // Consolidate duplicate moduleProgress entries (handle data inconsistencies gracefully)
        const moduleProgressMap = new Map();
        (userStats.moduleProgress || []).forEach(mp => {
            const moduleId = mp.moduleId?.toString();
            if (!moduleId) return;
            
            if (!moduleProgressMap.has(moduleId)) {
                moduleProgressMap.set(moduleId, {
                    moduleId: mp.moduleId,
                    moduleName: mp.moduleName,
                    questionsAttempted: mp.questionsAttempted || 0,
                    correctAnswers: mp.correctAnswers || 0,
                    incorrectAnswers: mp.incorrectAnswers || 0,
                    timeSpent: mp.timeSpent || 0,
                    lastAttempted: mp.lastAttempted
                });
            } else {
                // Merge with existing entry
                const existing = moduleProgressMap.get(moduleId);
                existing.questionsAttempted += mp.questionsAttempted || 0;
                existing.correctAnswers += mp.correctAnswers || 0;
                existing.incorrectAnswers += mp.incorrectAnswers || 0;
                existing.timeSpent += mp.timeSpent || 0;
                if (mp.lastAttempted > existing.lastAttempted) {
                    existing.lastAttempted = mp.lastAttempted;
                }
            }
        });
        
        // Convert map to array and calculate averageScore
        const consolidatedProgress = Array.from(moduleProgressMap.values()).map(mp => ({
            ...mp,
            averageScore: mp.questionsAttempted > 0 
                ? Math.round((mp.correctAnswers / mp.questionsAttempted) * 100)
                : 0,
            completionPercentage: 0 // Will be calculated by frontend based on total questions
        }));

        const ranking = await getAcademicRanking(req.user, userStats.totalPoints || 0);
        const activityStats = buildProfileActivityStatistics({
            answeredQuestions: userStats.answeredQuestions,
            totalQuestionsAttempted: userStats.totalQuestionsAttempted,
            totalCorrectAnswers: userStats.totalCorrectAnswers,
            averageScore: userStats.averageScore,
            totalExamsCompleted: userStats.totalExamsCompleted,
            totalExams: userStats.totalExams,
        });

        // Calculate additional stats
        const stats = {
            examsCompleted: activityStats.examsCompleted,
            averageScore: activityStats.averageScore,
            studyTimeSeconds: userStats.totalTimeSpent || 0,
            studyHours: getStudyHours(userStats.totalTimeSpent),
            rank: ranking.rank,
            rankedUsers: ranking.totalUsers,
            academicYear: ranking.academicYear,
            totalPoints: userStats.totalPoints || 0,
            achievements: userStats.achievements || [],
            moduleProgress: consolidatedProgress,
            questionsAnswered: activityStats.questionsAttempted,
            correctAnswers: activityStats.correctAnswers,
            totalQuestionsAttempted: activityStats.questionsAttempted,
            totalCorrectAnswers: activityStats.correctAnswers,
            totalIncorrectAnswers: activityStats.incorrectAnswers,
            weeklyActivity: userStats.weeklyActivity || [] // Include weekly activity for charts
        };

        res.set("Cache-Control", "private, no-store");
        res.status(200).json({
            success: true,
            data: { 
                stats,
                answeredQuestions: answeredQuestionsObj
            },
        });
    }),

    // Persist cumulative elapsed time from an active exam session. The session
    // value is monotonic, so retries or duplicate browser requests add no time.
    recordStudyTime: asyncHandler(async (req, res) => {
        const { sessionId, elapsedSeconds } = req.body;
        const safeSessionId = typeof sessionId === "string" ? sessionId.trim() : "";
        const safeElapsedSeconds = Number.parseInt(elapsedSeconds, 10);

        if (!/^[a-zA-Z0-9_-]{8,128}$/.test(safeSessionId)) {
            return res.status(400).json({ success: false, message: "Invalid study session" });
        }
        if (!Number.isInteger(safeElapsedSeconds) || safeElapsedSeconds < 0 || safeElapsedSeconds > 12 * 60 * 60) {
            return res.status(400).json({ success: false, message: "Invalid elapsed study time" });
        }

        let userStats = await UserStats.findOne({ userId: req.user._id }).select("+studySessions");
        if (!userStats) {
            userStats = await UserStats.create({ userId: req.user._id });
        }

        const previousElapsedSeconds = Number(userStats.studySessions?.get(safeSessionId)?.elapsedSeconds) || 0;
        const addedSeconds = Math.max(safeElapsedSeconds - previousElapsedSeconds, 0);
        const now = new Date();

        userStats.studySessions.set(safeSessionId, {
            elapsedSeconds: Math.max(safeElapsedSeconds, previousElapsedSeconds),
            updatedAt: now,
        });

        if (addedSeconds > 0) {
            userStats.totalTimeSpent = (userStats.totalTimeSpent || 0) + addedSeconds;

            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);
            const todayActivity = userStats.weeklyActivity.find((activity) => {
                if (!activity.date) return false;
                const activityDate = new Date(activity.date);
                activityDate.setHours(0, 0, 0, 0);
                return activityDate.getTime() === startOfToday.getTime();
            });

            if (todayActivity) {
                todayActivity.timeSpent = (todayActivity.timeSpent || 0) + addedSeconds;
            } else {
                userStats.weeklyActivity.push({
                    date: startOfToday,
                    questionsAttempted: 0,
                    correctAnswers: 0,
                    timeSpent: addedSeconds,
                    examsCompleted: 0,
                });
            }
            userStats.lastActivityDate = now;
        }

        await userStats.save();

        res.set("Cache-Control", "private, no-store");
        res.status(200).json({
            success: true,
            data: {
                addedSeconds,
                studyTimeSeconds: userStats.totalTimeSpent || 0,
                studyHours: getStudyHours(userStats.totalTimeSpent),
            },
        });
    }),

    // Get user's subscription information
    getSubscriptionInfo: asyncHandler(async (req, res) => {
        const userId = req.user._id;

        const user = await User.findById(userId).select('plan subscription email');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                // Keep legacy records readable while exposing the current terminology.
                plan: user.plan === 'Premium Annuel' ? 'Premium Semestre' : (user.plan || 'Free'),
                subscription: user.subscription || null,
                email: user.email
            }
        });
    }),

    // Select the single module/exam included with the free plan (one-time only)
    selectFreeSemester: asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const { semester, moduleId, examId } = req.body;

        if (!mongoose.isValidObjectId(moduleId) || !mongoose.isValidObjectId(examId)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid module and exam."
            });
        }

        const availableSemesters = (await mongoose
            .model("Module")
            .distinct("semester", { semester: { $nin: [null, ""] } }))
            .filter((value) => /^S\d+$/i.test(value));

        if (!semester || !availableSemesters.includes(semester)) {
            return res.status(400).json({
                success: false,
                message: `Invalid semester. Allowed semesters: ${availableSemesters.sort((a, b) => parseInt(a.replace("S", ""), 10) - parseInt(b.replace("S", ""), 10)).join(", ")}`
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if user already used their free semester selection
        if (user.hasUsedFreeSemester && user.freeModule && user.freeExam) {
            return res.status(400).json({
                success: false,
                message: "You have already selected your free semester. Upgrade to Premium for more access.",
                alreadyUsed: true
            });
        }

        // Check if user already has semesters (shouldn't happen, but extra check)
        if (user.semesters && user.semesters.length > 0 && user.freeModule && user.freeExam) {
            return res.status(400).json({
                success: false,
                message: "You already have semester access",
                alreadyHasSemesters: true
            });
        }

        const selectedModule = await mongoose.model("Module")
            .findOne({ _id: moduleId, semester })
            .select("name semester")
            .lean();

        if (!selectedModule) {
            return res.status(400).json({
                success: false,
                message: `The selected module is not available in ${semester}.`
            });
        }

        const selectedExam = await mongoose.model("ExamParYear")
            .findOne({ _id: examId, moduleId: selectedModule._id })
            .select("name moduleId")
            .lean();

        if (!selectedExam) {
            return res.status(400).json({
                success: false,
                message: "The selected exam does not belong to the selected module."
            });
        }

        // Keep the semester for navigation, but grant content access only to this exam.
        user.semesters = [semester];
        user.currentYear = getAcademicYearFromSemesters(user.semesters);
        user.freeModules = [selectedModule.name];
        user.freeModule = selectedModule._id;
        user.freeExam = selectedExam._id;
        user.hasUsedFreeSemester = true;
        user.freeSemesterSelectedAt = new Date();
        await user.save();

        // Clear profile cache
        try {
            // Send notification about free semester
            await NotificationController.createNotification(
                userId,
                "system",
                "Examen gratuit activé !",
                `Vous avez maintenant accès à l'examen ${selectedExam.name} du module ${selectedModule.name}.`,
                "/dashboard/home"
            );
        } catch (notifError) {
            console.error("Error sending notification:", notifError);
        }

        res.status(200).json({
            success: true,
            message: `Your free exam ${selectedExam.name} has been activated.`,
            data: {
                user: {
                    _id: user._id,
                    currentYear: user.currentYear,
                    semesters: user.semesters,
                    freeModule: user.freeModule,
                    freeExam: user.freeExam,
                    hasUsedFreeSemester: user.hasUsedFreeSemester,
                    plan: user.plan
                }
            }
        });
    }),

    // Check if user needs to select free semester
    checkFreeSemesterStatus: asyncHandler(async (req, res) => {
        const userId = req.user._id;

        const user = await User.findById(userId).select('semesters hasUsedFreeSemester plan freeModule freeExam');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const needsToSelectSemester = 
            user.plan === "Free" && 
            (!user.freeModule || !user.freeExam);

        res.status(200).json({
            success: true,
            data: {
                needsToSelectSemester,
                hasUsedFreeSemester: user.hasUsedFreeSemester || false,
                currentSemesters: user.semesters || [],
                freeModule: user.freeModule || null,
                freeExam: user.freeExam || null,
                plan: user.plan
            }
        });
    }),

    // Unlock achievement and send notification
    unlockAchievement: asyncHandler(async (req, res) => {
        const { userId, achievementName, achievementDescription } = req.body;

        if (!userId || !achievementName) {
            return res.status(400).json({
                success: false,
                message: "User ID and achievement name are required"
            });
        }

        // You would typically get UserStats model here
        // For now, sending notification
        try {
            await NotificationController.createNotification(
                userId,
                "achievement",
                "Nouveau badge débloqué !",
                `Félicitations ! Vous avez débloqué le badge '${achievementName}'. ${achievementDescription || ''}`,
                "/dashboard/profile"
            );

            res.status(200).json({
                success: true,
                message: "Achievement unlocked and notification sent",
                achievement: {
                    name: achievementName,
                    description: achievementDescription
                }
            });
        } catch (error) {
            console.error("Error unlocking achievement:", error);
            res.status(500).json({
                success: false,
                message: "Error unlocking achievement"
            });
        }
    }),

    // Get leaderboard for public display
    getLeaderboard: asyncHandler(async (req, res) => {
        const { limit = 20, sortBy = 'totalPoints', year, academicYear: reqAcademicYear } = req.query;
        const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 1000);

        try {
            const requestingUser = req.user;
            // Derive cohort from query, semesters or currentYear
            const academicYear = getAcademicYear(requestingUser, reqAcademicYear || year);
            const requiresAcademicYear = !academicYear;

            // Get total questions count for percentage calculation
            const Question = mongoose.model('Question');
            const totalQuestionsInSystem = await Question.countDocuments({});

            // Define sort field based on filter
            let sortField = '$totalPoints';
            if (sortBy === 'bluePoints') sortField = '$bluePoints';
            else if (sortBy === 'greenPoints') sortField = '$greenPoints';
            else if (sortBy === 'level') sortField = '$totalPoints'; // Level is based on totalPoints
            else if (sortBy === 'percentage') sortField = '$percentageAnswered';

            const matchConditions = {
                isAactive: true,
                isBlocked: { $ne: true }
            };

            if (academicYear) {
                matchConditions.$or = [
                    { semesters: { $in: [`S${academicYear * 2 - 1}`, `S${academicYear * 2}`] } },
                    { currentYear: new RegExp(`(^|\\D)${academicYear}(\\D|$)`, "i") },
                ];
            }

            // Start from Users and lookup their stats to include users with 0 stats
            const User = mongoose.model('User');
            
            const [leaderboardResult] = await User.aggregate([
                {
                    $match: matchConditions
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
                    $addFields: {
                        stats: { $arrayElemAt: ['$stats', 0] }
                    }
                },
                {
                    $addFields: {
                        // Calculate level: 1 level = 50 points
                        level: { 
                            $floor: { 
                                $divide: [{ $ifNull: ['$stats.totalPoints', 0] }, 50] 
                            } 
                        },
                        // Calculate percentage: questionsAnswered / totalQuestionsInSystem * 100
                        percentageCalculated: {
                            $cond: {
                                if: { $gt: [totalQuestionsInSystem, 0] },
                                then: {
                                    $multiply: [
                                        { $divide: [{ $ifNull: ['$stats.questionsAnswered', 0] }, totalQuestionsInSystem] },
                                        100
                                    ]
                                },
                                else: 0
                            }
                        }
                    }
                },
                {
                    $project: {
                        odUserId: '$_id',
                        odUserIdStr: { $toString: '$_id' },
                        username: '$username',
                        name: { $ifNull: ['$name', '$username'] },
                        email: '$email',
                        currentYear: '$currentYear',
                        profilePicture: '$profilePicture',
                        points: { $ifNull: ['$stats.totalPoints', 0] },
                        totalPoints: { $ifNull: ['$stats.totalPoints', 0] },
                        bluePoints: { $ifNull: ['$stats.bluePoints', 0] },
                        greenPoints: { $ifNull: ['$stats.greenPoints', 0] },
                        level: '$level',
                        questionsAnswered: { $ifNull: ['$stats.questionsAnswered', 0] },
                        correctAnswers: { $ifNull: ['$stats.correctAnswers', 0] },
                        percentageAnswered: { $round: ['$percentageCalculated', 1] },
                        totalExams: { $ifNull: ['$stats.totalExamsCompleted', 0] },
                        averageScore: { $ifNull: ['$stats.averageScore', 0] },
                        sortValue: sortField === '$totalPoints' ? { $ifNull: ['$stats.totalPoints', 0] } :
                                   sortField === '$bluePoints' ? { $ifNull: ['$stats.bluePoints', 0] } :
                                   sortField === '$greenPoints' ? { $ifNull: ['$stats.greenPoints', 0] } :
                                   sortField === '$percentageAnswered' ? '$percentageCalculated' :
                                   { $ifNull: ['$stats.totalPoints', 0] }
                    }
                },
                {
                    $setWindowFields: {
                        sortBy: { sortValue: -1 },
                        output: {
                            rank: { $documentNumber: {} }
                        }
                    }
                },
                {
                    $facet: {
                        leaderboard: [{ $limit: safeLimit }],
                        currentUser: [
                            { $match: { odUserId: requestingUser._id } },
                            { $project: { _id: 0, rank: 1 } }
                        ],
                        metadata: [{ $count: "totalUsers" }]
                    }
                }
            ]);

            const displayLeaderboard = leaderboardResult?.leaderboard || [];
            const userRank = leaderboardResult?.currentUser?.[0]?.rank || null;
            const totalUsers = leaderboardResult?.metadata?.[0]?.totalUsers || 0;

            res.status(200).json({
                success: true,
                data: {
                    leaderboard: displayLeaderboard,
                    userRank,
                    totalUsers,
                    totalQuestionsInSystem,
                    academicYear,
                    requiresAcademicYear
                }
            });
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch leaderboard',
                error: error.message
            });
        }
    })
};
