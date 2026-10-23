import { api } from "@/lib/utils";
import { cachedLearnerRead, clearLearnerCache, learnerScope } from './learnerCache';

let catalogGeneration = 0;

export const moduleService = {
    getAllmodules: (forceRefresh = false) => cachedLearnerRead('modules', async () => {
        const scope = learnerScope();
        const generation = catalogGeneration;
        try {
            const stored = JSON.parse(localStorage.getItem('learner-module-catalog') || 'null');
            if (!forceRefresh && stored?.scope === scope && Date.now() - stored.at < 300000 && Array.isArray(stored.data?.data)) {
                return { data: stored.data };
            }
        } catch { /* Ignore corrupt or unavailable storage. */ }
        const response = await api.get('/modules');
        if (generation === catalogGeneration && learnerScope() === scope) {
            try { localStorage.setItem('learner-module-catalog', JSON.stringify({ scope, at: Date.now(), data: response.data })); } catch { /* Continue with the memory cache. */ }
        }
        return response;
    }, {
        maxAge: 5 * 60 * 1000, forceRefresh,
    }),

    clearCache: () => {
        catalogGeneration++;
        clearLearnerCache();
        // Retire the old unscoped persisted catalog.
        try { localStorage.removeItem('learner-module-catalog'); localStorage.removeItem('modules'); localStorage.removeItem('modulesCacheTime'); } catch { /* Storage may be unavailable. */ }
    },

    getModuleById: (id, forceRefresh = false) => cachedLearnerRead(`module:${id}`, () => api.get(`/modules/${id}`), {
        maxAge: 5 * 60 * 1000, forceRefresh,
    }),

    getModuleList: (id, type, forceRefresh = false) => {
        const resource = { year: 'exams', course: 'exam-courses', qcm: 'qcm-banque' }[type];
        if (!resource) return Promise.reject(new Error('Invalid module content type'));
        return cachedLearnerRead(`module-list:${id}:${type}`, () => api.get(`/${resource}/module/${id}?summary=true`), {
            maxAge: 60000, forceRefresh,
        });
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
