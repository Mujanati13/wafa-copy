import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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
        const fetchUserSemesters = async () => {
            const version = ++requestVersion;
            setLoading(true);
            setError(null);
            try {
                const userProfile = await userService.getUserProfile(true);
                if (!active || version !== requestVersion) return;
                applyProfile(userProfile);
            } catch (error) {
                if (active && version === requestVersion) setError(error);
                console.error("Error fetching user semesters:", error);
                // Fallback to localStorage - already initialized above
            } finally {
                if (active && version === requestVersion) setLoading(false);
            }
        };

        window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
        fetchUserSemesters();

        const handleAuthStateChanged = () => {
            fetchUserSemesters();
        };

        window.addEventListener('auth-state-changed', handleAuthStateChanged);
        return () => {
            active = false;
            window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
            window.removeEventListener('auth-state-changed', handleAuthStateChanged);
        };
    }, [reloadKey]);

    const value = {
        user,
        error,
        refreshProfile,
        selectedSemester,
        setSelectedSemester,
        userSemesters,
        loading,
    };

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
