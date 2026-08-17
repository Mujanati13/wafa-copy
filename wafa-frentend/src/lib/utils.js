import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import axios from "axios";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  // Enhanced for Firefox/Brave compatibility
  timeout: 30000, // 30 second timeout
  headers: {
    'Accept': 'application/json',
  }
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Add token to requests if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Set Content-Type for FormData - let axios set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (config.data && !config.headers['Content-Type']) {
      // For non-FormData requests (JSON), set the content type
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const method = (config.method || 'get').toLowerCase();
    const status = error.response?.status;
    const errorCode = error.response?.data?.code;
    const isGetRequest = method === 'get';
    const isTransientFailure = !error.response || error.code === 'ECONNABORTED' || (status >= 500 && status < 600);

    if (isGetRequest && isTransientFailure) {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < 1) {
        config.__retryCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
        return api.request(config);
      }
    }

    if (status === 401 && errorCode === 'SESSION_INVALID') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userProfile');
      window.dispatchEvent(new Event('auth-state-changed'));
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Permission helper functions
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

export const isSuperAdmin = () => {
  const user = getUser();
  return user.isAdmin && user.adminRole === 'super_admin';
};

export const hasPermission = (permission) => {
  const user = getUser();
  if (!user.isAdmin) return false;
  if (user.adminRole === 'super_admin') return true;
  return (user.permissions || []).includes(permission);
};

export const hasAnyPermission = (...permissions) => {
  const user = getUser();
  if (!user.isAdmin) return false;
  if (user.adminRole === 'super_admin') return true;
  const userPermissions = user.permissions || [];
  return permissions.some(p => userPermissions.includes(p));
};

export const hasAllPermissions = (...permissions) => {
  const user = getUser();
  if (!user.isAdmin) return false;
  if (user.adminRole === 'super_admin') return true;
  const userPermissions = user.permissions || [];
  return permissions.every(p => userPermissions.includes(p));
};

// Safe localStorage wrapper for Firefox/Brave quota limits
export const safeLocalStorage = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn(`localStorage quota exceeded for key: ${key}. Clearing old data...`);
        // Try to clear some space
        try {
          // Remove cached modules and large items first
          const itemsToRemove = ['modules', 'userProfile', 'examResults'];
          itemsToRemove.forEach(item => {
            if (item !== key) localStorage.removeItem(item);
          });
          // Try again
          localStorage.setItem(key, value);
          return true;
        } catch (e2) {
          console.error('Still cannot save to localStorage after cleanup:', e2);
          return false;
        }
      }
      console.error('localStorage error:', e);
      return false;
    }
  },
  
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage getItem error:', e);
      return null;
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('localStorage removeItem error:', e);
      return false;
    }
  }
};
