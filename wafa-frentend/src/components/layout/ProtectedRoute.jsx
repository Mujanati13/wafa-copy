import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearStoredAuthToken, getStoredAuthToken } from '@/utils/authStorage';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for a remembered or tab-only JWT token.
    const checkAuth = () => {
      const token = getStoredAuthToken();
      const user = localStorage.getItem('user');
      
      // User is authenticated if both token and user data exist
      if (token && user) {
        try {
          JSON.parse(user); // Verify user is valid JSON
          
          // Optional: Decode JWT to check expiration (basic check)
          // JWT format: header.payload.signature
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp && (payload.exp * 1000) < Date.now();
            
            if (isExpired) {
              console.log('Token expired, redirecting to login');
              clearStoredAuthToken();
              localStorage.removeItem('user');
              localStorage.removeItem('userProfile');
              setAuthenticated(false);
            } else {
              setAuthenticated(true);
            }
          } catch (decodeError) {
            // If we can't decode the token, assume it's still valid
            // The backend will reject it if it's actually invalid
            console.warn('Could not decode token:', decodeError);
            setAuthenticated(true);
          }
        } catch (error) {
          console.error('Invalid user data in localStorage:', error);
          setAuthenticated(false);
        }
      } else {
        setAuthenticated(false);
      }
      
      setLoading(false);
    };

    checkAuth();

    // Listen for storage changes (logout in other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        checkAuth();
      }
    };

    const handleAuthStateChanged = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-state-changed', handleAuthStateChanged);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleAuthStateChanged);
    };
  }, []);

  if (loading) {
    // Show loading spinner while checking authentication
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    // Redirect to login if not authenticated, save the attempted location
    return <Navigate to="/login" state={{ from: /^\/exam(?:\/|$)/.test(location.pathname) ? { pathname: '/dashboard/home' } : location }} replace />;
  }

  // User is authenticated, render the children
  return children;
};

export default ProtectedRoute;
