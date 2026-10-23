import { cachedLearnerRead, learnerScope } from './learnerCache';
import { moduleService } from './moduleService';
import { userService } from './userService';
import { isPremiumPlan } from '../utils/subscriptionDisplay';
import { publishUserProfile } from '../utils/profileState';

// Free access is a single assigned module, not a filtered catalog snapshot.
export function getLearnerModules(user, forceRefresh = false) {
  const scope = learnerScope();
  const activeUserId = scope === 'anonymous' ? null : JSON.parse(scope)[0];
  const generation = userService._profileGeneration;
  const assertCurrentSession = () => {
    if ((activeUserId && String(activeUserId) !== String(user?._id)) ||
        generation !== userService._profileGeneration || scope !== learnerScope()) {
      throw new Error('Learner session changed');
    }
  };
  return cachedLearnerRead(`learner-modules:${user?._id}:${user?.plan}:${user?.freeModule?._id || user?.freeModule || ""}`, () => loadLearnerModules(user, forceRefresh, assertCurrentSession), { maxAge: 300000, forceRefresh });
}

async function loadLearnerModules(user, forceRefresh, assertCurrentSession) {
  assertCurrentSession();
  if (!user?._id) throw new Error('Profil utilisateur indisponible.');
  if (isPremiumPlan(user.plan)) return moduleService.getAllmodules(forceRefresh);

  const response = await userService.checkFreeSemesterStatus();
  // Cache invalidation alone cannot stop an old request's profile publication.
  assertCurrentSession();
  const access = response?.data;
  if (!access) throw new Error('Impossible de charger votre module actif.');
  const currentUser = {
    ...user,
    plan: access.plan,
    semesters: access.currentSemesters,
    freeModule: access.freeModule,
    freeExam: access.freeExam,
  };
  const moduleId = String(access.freeModule?._id || access.freeModule || '');
  if (!isPremiumPlan(access.plan) && !moduleId) {
    throw new Error('Votre module gratuit n\u2019est pas encore activ\u00e9. Terminez la s\u00e9lection de votre module.');
  }
  publishUserProfile(currentUser, { notify: true });
  if (isPremiumPlan(access.plan)) return moduleService.getAllmodules(forceRefresh);

  const moduleResponse = await moduleService.getModuleById(moduleId, forceRefresh);
  const module = moduleResponse?.data?.data;
  if (!module || String(module._id || module.id) !== moduleId) {
    throw new Error('Votre module actif est temporairement indisponible. R\u00e9essayez.');
  }
  return { data: { success: true, data: [module] } };
}
