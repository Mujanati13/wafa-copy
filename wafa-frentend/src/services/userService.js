import { api } from '../lib/utils.js';

export const userService = {
    // Get all users with pagination
    getAllUsers: async (page = 1, limit = 10) => {
        try {
            console.log(`Fetching all users from: /users?page=${page}&limit=${limit}`);
            const response = await api.get(`/users?page=${page}&limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    },

    // Create user from admin panel (with Firebase support)
    createAdminUser: async (userData) => {
        try {
            console.log('Creating admin user:', userData);
            const response = await api.post('/users/admin/create', userData);
            return response.data;
        } catch (error) {
            console.error('Error creating admin user:', error);
            throw error;
        }
    },

    // Get free users
    getFreeUsers: async (page = 1, limit = 10) => {
        try {
            console.log(`Fetching free users from: /users/free?page=${page}&limit=${limit}`);
            const response = await api.get(`/users/free?page=${page}&limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching free users:', error);
            throw error;
        }
    },

    // Get paying users
    getPayingUsers: async (page = 1, limit = 10) => {
        try {
            console.log(`Fetching paying users from: /users/paying?page=${page}&limit=${limit}`);
            const response = await api.get(`/users/paying?page=${page}&limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching paying users:', error);
            throw error;
        }
    },

    // Get user statistics
    getUserStats: async () => {
        try {
            console.log(`Fetching user stats from: /users/stats`);
            const response = await api.get(`/users/stats`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            throw error;
        }
    },

    // Update user plan
    updateUserPlan: async (userId, plan) => {
        try {
            const response = await api.patch(`/users/${userId}/plan`, { plan });
            return response.data;
        } catch (error) {
            console.error('Error updating user plan:', error);
            throw error;
        }
    },

    // Toggle user status
    toggleUserStatus: async (userId) => {
        try {
            const response = await api.patch(`/users/${userId}/status`);
            return response.data;
        } catch (error) {
            console.error('Error toggling user status:', error);
            throw error;
        }
    },

    // Cache for user profile to prevent redundant API calls
    _profileCache: null,
    _profileCacheTime: null,
    _profileCacheExpiry: 30000, // 30 seconds cache
    _pendingProfileRequest: null,

    // Get current user profile with caching
    getUserProfile: async (forceRefresh = false) => {
        try {
            const now = Date.now();
            
            // Return cached data if valid and not forcing refresh
            if (!forceRefresh && 
                userService._profileCache && 
                userService._profileCacheTime && 
                (now - userService._profileCacheTime) < userService._profileCacheExpiry) {
                return userService._profileCache;
            }

            // Always share an in-flight profile request, including forced refreshes.
            if (userService._pendingProfileRequest) {
                return userService._pendingProfileRequest;
            }

            // Clear cached user data if force refresh is requested
            if (forceRefresh) {
                localStorage.removeItem('userProfile');
                userService._profileCache = null;
            }

            // Create the request and store it
            userService._pendingProfileRequest = (async () => {
                const response = await api.get('/users/profile');
                const user = response.data.data.user;

                // Update cache
                userService._profileCache = user;
                userService._profileCacheTime = Date.now();
                localStorage.setItem('userProfile', JSON.stringify(user));

                return user;
            })();

            const result = await userService._pendingProfileRequest;
            userService._pendingProfileRequest = null;
            return result;
        } catch (error) {
            userService._pendingProfileRequest = null;
            console.error('Error fetching user profile:', error);
            
            // Return cached data from localStorage as fallback
            const cached = localStorage.getItem('userProfile') || localStorage.getItem('user');
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (parseError) {
                    console.error('Invalid cached user profile JSON:', parseError);
                    localStorage.removeItem('userProfile');
                }
            }
            throw error;
        }
    },

    // Clear profile cache (call this on logout or profile update)
    clearProfileCache: () => {
        userService._profileCache = null;
        userService._profileCacheTime = null;
        localStorage.removeItem('userProfile');
    },

    // Update user profile
    updateUserProfile: async (profileData) => {
        try {
            console.log('Updating user profile at: /users/profile');
            const response = await api.put('/users/profile', profileData);
            return response.data.data.user;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    },

    // Upload profile picture
    uploadProfilePicture: async (file) => {
        try {
            const formData = new FormData();
            formData.append('profilePicture', file);

            console.log('Uploading profile picture to: /users/upload-photo');
            // Don't set Content-Type manually - axios handles it for FormData
            const response = await api.post('/users/upload-photo', formData);
            return response.data.data.user;
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            throw error;
        }
    },

    // Get current user stats and achievements
    getMyStats: async () => {
        try {
            console.log('Fetching user stats from: /users/my-stats');
            const response = await api.get('/users/my-stats');
            return response.data.data.stats;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            throw error;
        }
    },

    // Update user (for admin purposes)
    updateUser: async (userId, updateData) => {
        try {
            console.log(`Updating user ${userId}:`, updateData);
            const response = await api.put(`/users/${userId}`, updateData);
            return response.data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    // Delete user (for admin purposes)
    deleteUser: async (userId) => {
        try {
            console.log(`Deleting user ${userId}`);
            const response = await api.delete(`/users/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // Block/Unblock user (for admin purposes)
    toggleBlockUser: async (userId, reason = null) => {
        try {
            console.log(`Toggling block status for user ${userId}`);
            const response = await api.patch(`/users/${userId}/block`, { reason });
            return response.data;
        } catch (error) {
            console.error('Error toggling user block status:', error);
            throw error;
        }
    },

    // Get leaderboard
    getLeaderboard: async (limit = 20, sortBy = 'totalPoints') => {
        try {
            const params = { limit, sortBy };
            const response = await api.get(`/users/leaderboard`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            throw error;
        }
    },

    // Test connection
    testConnection: async () => {
        try {
            console.log('Testing API connection...');
            const response = await api.get(`/test`);
            return response.data;
        } catch (error) {
            console.error('Error testing connection:', error);
            throw error;
        }
    },

    // Check if user needs to select free semester
    checkFreeSemesterStatus: async () => {
        try {
            const response = await api.get('/users/free-semester-status');
            return response.data;
        } catch (error) {
            console.error('Error checking free semester status:', error);
            throw error;
        }
    },

    // Select free semester for new users
    selectFreeSemester: async (semester, moduleId) => {
        try {
            // Clear profile cache since we're updating the user
            userService.clearProfileCache();
            const response = await api.post('/users/select-free-semester', { semester, moduleId });
            return response.data;
        } catch (error) {
            console.error('Error selecting free semester:', error);
            throw error;
        }
    },
};
