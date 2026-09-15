import axios from 'axios';
import { getStoredAuthToken } from '@/utils/authStorage';

const API_URL = import.meta.env.VITE_API_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminAnalyticsService = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    const response = await api.get('/admin/analytics/dashboard-stats');
    return response.data;
  },

  // Get user growth data
  getUserGrowth: async (period = '30d') => {
    const response = await api.get('/admin/analytics/user-growth', {
      params: { period }
    });
    return response.data;
  },

  // Get recent activity
  getRecentActivity: async (limit = 10) => {
    const response = await api.get('/admin/analytics/recent-activity', {
      params: { limit }
    });
    return response.data;
  },

  // Get subscription analytics
  getSubscriptionAnalytics: async () => {
    const response = await api.get('/admin/analytics/subscriptions');
    return response.data;
  },

  // Get user demographics
  getUserDemographics: async () => {
    const response = await api.get('/admin/analytics/demographics');
    return response.data;
  },

  // Get leaderboard
  getLeaderboard: async (params = {}) => {
    const response = await api.get('/admin/analytics/leaderboard', { params });
    return response.data;
  },

  // Reset monthly revenue
  resetMonthlyRevenue: async () => {
    const response = await api.post('/admin/analytics/reset-monthly-revenue');
    return response.data;
  },

  // Reset all transactions
  resetAllTransactions: async () => {
    const response = await api.post('/admin/analytics/reset-all-transactions');
    return response.data;
  },
};

export default adminAnalyticsService;
