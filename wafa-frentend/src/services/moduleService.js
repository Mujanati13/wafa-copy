import { api } from "@/lib/utils";

// Module cache
let moduleCache = null;
let moduleCacheTime = null;
const MODULE_CACHE_EXPIRY = 5 * 60 * 1000;
const MODULE_CACHE_KEY = 'modules';
const MODULE_CACHE_TIME_KEY = 'modulesCacheTime';
let pendingModuleRequest = null;

export const moduleService = {
    // Get all modules with caching
    getAllmodules: async (forceRefresh = false) => {
        try {
            const now = Date.now();

            // Return cached data if valid
            if (!forceRefresh && 
                moduleCache && 
                moduleCacheTime && 
                (now - moduleCacheTime) < MODULE_CACHE_EXPIRY) {
                return { data: moduleCache };
            }

            // Share one network request across the sidebar, dashboard and pages.
            if (pendingModuleRequest) {
                return pendingModuleRequest;
            }

            // Reuse a recent persisted list after reloads and route changes.
            if (!forceRefresh) {
                const cached = localStorage.getItem(MODULE_CACHE_KEY);
                const cachedAt = Number(localStorage.getItem(MODULE_CACHE_TIME_KEY));
                if (cached && cachedAt && (now - cachedAt) < MODULE_CACHE_EXPIRY) {
                    const parsedCache = JSON.parse(cached);
                    moduleCache = { success: true, count: parsedCache.length, data: parsedCache };
                    moduleCacheTime = cachedAt;
                    return { data: moduleCache };
                }
            }

            // Create the request
            pendingModuleRequest = (async () => {
                const response = await api.get("/modules");
                moduleCache = response.data;
                moduleCacheTime = Date.now();
                
                // Try to save to localStorage, but don't fail if quota exceeded
                try {
                    localStorage.setItem(MODULE_CACHE_KEY, JSON.stringify(response.data.data));
                    localStorage.setItem(MODULE_CACHE_TIME_KEY, String(moduleCacheTime));
                } catch (e) {
                    // Quota exceeded - clear old data and try storing only essential fields
                    console.warn('localStorage quota exceeded, clearing old cache:', e);
                    try {
                        localStorage.removeItem(MODULE_CACHE_KEY);
                        // Store minimal module data (only what's needed for sidebar)
                        const minimalModules = response.data.data.map(m => ({
                            _id: m._id,
                            name: m.name,
                            semester: m.semester,
                            icon: m.icon
                        }));
                        localStorage.setItem(MODULE_CACHE_KEY, JSON.stringify(minimalModules));
                        localStorage.setItem(MODULE_CACHE_TIME_KEY, String(moduleCacheTime));
                    } catch (e2) {
                        console.error('Still cannot save to localStorage:', e2);
                        // Continue without localStorage cache
                    }
                }
                return response;
            })();

            const result = await pendingModuleRequest;
            pendingModuleRequest = null;
            return result;
        } catch (error) {
            pendingModuleRequest = null;
            console.error('Error fetching all modules:', error);
            
            // Return cached data as fallback
            const cached = localStorage.getItem('modules');
            if (cached) {
                return { data: { data: JSON.parse(cached) } };
            }
            throw error;
        }
    },

    // Clear module cache
    clearCache: () => {
        moduleCache = null;
        moduleCacheTime = null;
        localStorage.removeItem(MODULE_CACHE_KEY);
        localStorage.removeItem(MODULE_CACHE_TIME_KEY);
    },

    // Get module by ID
    getModuleById: async (id) => {
        try {
            const response = await api.get("/modules/" + id);
            return response;
        } catch (error) {
            console.error('Error fetching module by id:', error);
            throw error;
        }
    },

    // Create a new module
    createModule: async (moduleData) => {
        try {
            const response = await api.post("/modules/create", moduleData);
            moduleService.clearCache();
            return response;
        } catch (error) {
            console.error('Error creating module:', error);
            throw error;
        }
    },

    // Update a module
    updateModule: async (id, moduleData) => {
        try {
            const response = await api.put(`/modules/${id}`, moduleData);
            moduleService.clearCache();
            return response;
        } catch (error) {
            console.error('Error updating module:', error);
            throw error;
        }
    },

    // Delete a module
    deleteModule: async (id) => {
        try {
            const response = await api.delete(`/modules/${id}`);
            moduleService.clearCache();
            return response;
        } catch (error) {
            console.error('Error deleting module:', error);
            throw error;
        }
    },
};
