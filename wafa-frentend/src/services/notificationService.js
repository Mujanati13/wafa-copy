import axios from "axios";
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

export const notificationService = {
  // Get all notifications with pagination
  getNotifications: async (page = 1, limit = 20, read = undefined) => {
    try {
      const params = { page, limit };
      if (read !== undefined) {
        params.read = read;
      }
      const { data } = await api.get('/notifications', {
        params,
      });
      return data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  // Get unread notification count
  getUnreadCount: async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      return data;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      throw error;
    }
  },

  // Mark a notification as read
  markAsRead: async (notificationId) => {
    try {
      const { data } = await api.put(
        `/notifications/${notificationId}/read`,
        {}
      );
      return data;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const { data } = await api.put('/notifications/read-all', {});
      return data;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  },

  // Delete a notification
  deleteNotification: async (notificationId) => {
    try {
      const { data } = await api.delete(`/notifications/${notificationId}`);
      return data;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  },
};
