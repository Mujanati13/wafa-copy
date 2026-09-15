import axios from 'axios';
import { getStoredAuthToken } from '@/utils/authStorage';

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
  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const paymentService = {
  // Get all transactions (admin only)
  getAllTransactions: async (params = {}) => {
    const response = await api.get('/payments/admin/transactions', { params });
    return response.data;
  },

  // Approve transaction (admin only)
  approveTransaction: async (transactionId) => {
    const response = await api.post(`/payments/admin/approve/${transactionId}`);
    return response.data;
  },

  // Reject transaction (admin only)
  rejectTransaction: async (transactionId) => {
    const response = await api.post(`/payments/admin/reject/${transactionId}`);
    return response.data;
  }
};
