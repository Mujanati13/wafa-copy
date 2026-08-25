import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const subscriptionPlanService = {
  // Get all plans
  getAllPlans: async () => {
    const response = await api.get('/subscription-plans');
    return response.data;
  },

  // Single source for public and authenticated customer pricing surfaces.
  getAvailablePlans: async () => {
    const response = await api.get('/subscription-plans/available');
    return response.data;
  },
  
  // Get single plan
  getPlanById: async (planId) => {
    const response = await api.get(`/subscription-plans/${planId}`);
    return response.data;
  },
  
  // Create plan (admin only)
  createPlan: async (planData) => {
    const response = await api.post('/subscription-plans', planData);
    return response.data;
  },
  
  // Update plan (admin only)
  updatePlan: async (planId, planData) => {
    const response = await api.patch(`/subscription-plans/${planId}`, planData);
    return response.data;
  },
  
  // Delete plan (admin only)
  deletePlan: async (planId) => {
    const response = await api.delete(`/subscription-plans/${planId}`);
    return response.data;
  }
};
