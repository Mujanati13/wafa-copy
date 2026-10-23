import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { userService } from '@/services/userService';
import { PROFILE_UPDATED_EVENT, resolveProfileSemester } from '@/utils/profileState';

const SemesterContext = createContext();
const SELECTED_SEMESTER_STORAGE_KEY = 'selectedSemester';

const getCachedUserProfile = () => {
    try {
        const cached = localStorage.getItem('userProfile') || localStorage.getItem('user');
        if (!cached) return null;
        return JSON.parse(cached);
    } catch (error) {
        console.error('Error parsing cached user profile:', error);
        return null;
    }
};

export const SemesterProvider = ({ children }) => {
    const [user, setUser] = useState(getCachedUserProfile);
    // Initialize from persisted selected semester for stable UX across route transitions
    const [selectedSemester, setSelectedSemester] = useState(() => {
        const persisted = localStorage.getItem(SELECTED_SEMESTER_STORAGE_KEY);
        const user = getCachedUserProfile();

        if (persisted) {
            if (!Array.isArray(user?.semesters) || user.semesters.includes(persisted)) {
                return persisted;
            }
        }

        return user?.semesters?.[0] || null;
    });

    const [userSemesters, setUserSemesters] = useState(() => {
        const user = getCachedUserProfile();
        if (Array.isArray(user?.semesters)) {
            return user.semesters;
        }
        return [];
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const refreshProfile = useCallback(() => setReloadKey(value => value + 1), []);

    useEffect(() => {
        if (selectedSemester) {
            localStorage.setItem(SELECTED_SEMESTER_STORAGE_KEY, selectedSemester);
        } else {
            localStorage.removeItem(SELECTED_SEMESTER_STORAGE_KEY);
        }
    }, [selectedSemester]);

    // Fetch user profile to get subscribed semesters
    useEffect(() => {
        let active = true;
        let requestVersion = 0;
        const applyProfile = (profile) => {
            setUser(current => JSON.stringify(current) === JSON.stringify(profile) ? current : profile);
            const semesters = Array.isArray(profile?.semesters) ? profile.semesters : [];
            setUserSemesters(current => JSON.stringify(current) === JSON.stringify(semesters) ? current : semesters);
            setSelectedSemester(current => resolveProfileSemester(profile, current));
        };
        const handleProfileUpdated = (event) => {
            if (active) applyProfile(event.detail);
        };
        let confirmed = false;
        let lastRefresh = 0;
        const fetchUserSemesters = async (background = false) => {
            if (background && (document.visibilityState === "hidden" || Date.now() - lastRefresh < 1000)) return;
            lastRefresh = Date.now();
            const version = ++requestVersion;
            if (!confirmed) setLoading(true);
            setError(null);
            try {
                const userProfile = await userService.getUserProfile(true);
                if (!active || version !== requestVersion) return;
                applyProfile(userProfile);
                confirmed = true;
            } catch (error) {
                if (active && version === requestVersion && !confirmed) setError(error);
                console.error("Error fetching user semesters:", error);
                // Fallback to localStorage - already initialized above
            } finally {
                if (active && version === requestVersion) setLoading(false);
            }
        };

        window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
        fetchUserSemesters();

        const handleAuthStateChanged = () => {
            const snapshot = getCachedUserProfile();
            confirmed = false;
            setLoading(true);
            setUser(snapshot);
            fetchUserSemesters();
        };
        const handleStorage = event => {
            if (['user', 'userProfile', 'token'].includes(event.key)) handleAuthStateChanged();
        };

        const refreshVisible = () => fetchUserSemesters(true);
        const interval = window.setInterval(refreshVisible, 15000);
        window.addEventListener('focus', refreshVisible);
        window.addEventListener('storage', handleStorage);
        document.addEventListener('visibilitychange', refreshVisible);
        window.addEventListener('auth-state-changed', handleAuthStateChanged);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener('focus', refreshVisible);
            window.removeEventListener('storage', handleStorage);
            document.removeEventListener('visibilitychange', refreshVisible);
            window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
            window.removeEventListener('auth-state-changed', handleAuthStateChanged);
        };
    }, [reloadKey]);

    const value = useMemo(() => ({
        user,
        error,
        refreshProfile,
        selectedSemester,
        setSelectedSemester,
        userSemesters,
        loading,
    }), [user, error, refreshProfile, selectedSemester, userSemesters, loading]);

    return (
        <SemesterContext.Provider value={value}>
            {children}
        </SemesterContext.Provider>
    );
};

export const useSemester = () => {
    const context = useContext(SemesterContext);
    if (!context) {
        throw new Error('useSemester must be used within a SemesterProvider');
    }
    return context;
};

export default SemesterContext;
