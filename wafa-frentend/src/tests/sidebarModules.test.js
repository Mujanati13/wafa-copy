import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { create, act } from 'react-test-renderer';
import { transform } from 'esbuild';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const anatomy = { _id: 'anatomy', name: 'Anatomie III', semester: 'S3', totalQuestions: 10 };

async function mountDashboard({ user, moduleRequest, profileError = null, profileLoading = false }) {
  const ProfileContext = React.createContext(null);
  let updateProfile;
  let refreshes = 0;
  const requests = [];
  const context = vm.createContext({ console, JSON, Number, String, Math, Set });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const moduleService = {
    getAllmodules: async force => { requests.push(force ? 'fresh-catalog' : 'catalog'); return moduleRequest.promise; },
    getModuleById: async id => { requests.push(id); return moduleRequest.promise; },
  };
  const deps = {
    react: synthetic({ ...React, default: React }),
    'react/jsx-runtime': synthetic(jsxRuntime),
    'react-router-dom': synthetic({ NavLink: primitive, useLocation: () => ({ pathname: '/dashboard/subjects/anatomy' }), useNavigate: () => () => {} }),
    'lucide-react': synthetic(Object.fromEntries(['BookOpen', 'ChevronDown', 'Crown', 'Loader2'].map(name => [name, () => null]))),
    sonner: synthetic({ toast: { info() {} } }),
    '@/components/ui/button': synthetic({ Button: ({ children, ...props }) => React.createElement('button', props, children) }),
    '@/components/ui/skeleton': synthetic({ Skeleton: () => React.createElement('span', { 'data-loading': true }) }),
    '@/components/Dashboard/ModuleCard': synthetic({ default: ({ course }) => React.createElement('article', { 'data-module': course._id }, course.name) }),
    '@/components/Dashboard/PromotionalUpgradeBanner': synthetic({ default: () => null }),
    '@/context/SemesterContext': synthetic({ useSemester: () => React.useContext(ProfileContext) }),
    '@/services/moduleService': synthetic({ moduleService }),
    '@/services/dashboardService': synthetic({ dashboardService: {
      getUserStats: async () => ({ data: { stats: { examsCompleted: 2, averageScore: 80 } } }),
      getLeaderboardRank: async () => ({ rank: 3 }),
    } }),
    '@/utils/subscriptionDisplay': synthetic({ isPremiumPlan: plan => plan !== 'Free', displaySubscriptionPlanName: plan => plan }),
    '@/lib/utils': synthetic({ cn: (...values) => values.filter(Boolean).join(' ') }),
    profile: synthetic({ publishUserProfile: profile => updateProfile(current => JSON.stringify(current) === JSON.stringify(profile) ? current : profile) }),
    userService: synthetic({ userService: { checkFreeSemesterStatus: async () => ({ data: { plan: 'Free', currentSemesters: ['S3'], freeModule: 'anatomy', freeExam: 'exam' } }) } }),
  };
  const layout = await readFile(new URL('../components/layout/LearnerExperienceLayout.jsx', import.meta.url), 'utf8');
  const imports = [
    'import { useState, useEffect, useMemo } from "react";',
    'import { useLocation, useNavigate, NavLink } from "react-router-dom";',
    'import { BookOpen, ChevronDown, Crown, Loader2 } from "lucide-react";',
    'import { useSemester } from "@/context/SemesterContext";',
    'import { getLearnerModules } from "@/services/learnerModuleService";',
    'import { isPremiumPlan } from "@/utils/subscriptionDisplay";',
    'import { cn } from "@/lib/utils";',
    'import { toast } from "sonner";',
  ].join('\n');
  const source = imports + layout.slice(layout.indexOf('function ModuleNavigation(')) + '\nexport default ModuleNavigation;';

  for (const match of imports.matchAll(/import\s*{([^}]+)}\s*from\s*"([^"]+)"/g)) {
    if (!deps[match[2]]) deps[match[2]] = synthetic(Object.fromEntries(match[1].split(',').map(name => [name.trim(), primitive])));
  }
  for (const match of imports.matchAll(/import\s+(\w+)\s+from\s*"([^"]+)"/g)) {
    if (!deps[match[2]]) deps[match[2]] = synthetic({ default: primitive });
  }
  const compiled = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  const dashboard = new vm.SourceTextModule(compiled.code, { context });
  const learnerModules = new vm.SourceTextModule(await readFile(new URL('../services/learnerModuleService.js', import.meta.url), 'utf8'), { context });
  deps['@/services/learnerModuleService'] = learnerModules;
  await dashboard.link(specifier => {
    if (specifier === './moduleService') return deps['@/services/moduleService'];
    if (specifier === './userService') return deps.userService;
    if (specifier === '../utils/subscriptionDisplay') return deps['@/utils/subscriptionDisplay'];
    if (specifier === '../utils/profileState') return deps.profile;
    if (!deps[specifier]) throw new Error(`Unmocked import: ${specifier}`);
    return deps[specifier];
  });
  await dashboard.evaluate();
  function Harness() {
    const [profile, setProfile] = React.useState(user);
    const [semester, setSemester] = React.useState('S3');
    updateProfile = setProfile;
    return React.createElement(ProfileContext.Provider, { value: {
      user: profile, selectedSemester: semester, setSelectedSemester: setSemester,
      userSemesters: profile.semesters || [], loading: profileLoading, error: profileError,
      refreshProfile: () => { refreshes++; },
    } }, React.createElement(dashboard.namespace.default, { collapsed: false, setCollapsed() {} }));
  }
  let root;
  await act(async () => { root = create(React.createElement(Harness)); });
  return { root, requests, get refreshes() { return refreshes; } };
}

test('first S3 load recovers the assigned free module without remount or browser refresh', async () => {
  const moduleRequest = deferred();
  const screen = await mountDashboard({ user: { _id: 'new-user', plan: 'Free', semesters: ['S3'] }, moduleRequest });
  try {
    assert.ok(JSON.stringify(screen.root.toJSON()).includes('Chargement des modules'), 'must remain loading until the assigned module arrives');
    assert.equal(JSON.stringify(screen.root.toJSON()).includes('Aucun module disponible'), false);
    await act(async () => { moduleRequest.resolve({ data: { data: anatomy } }); });
    assert.equal(screen.root.root.findAllByProps({ 'aria-label': '1 modules' }).length, 1);
    assert.equal(JSON.stringify(screen.root.toJSON()).includes('Anatomie III'), true);
    assert.equal(screen.requests.includes('catalog'), false);
  } finally { await act(async () => screen.root.unmount()); }
});

test('an assigned module absent from the catalog loads directly on first mount', async () => {
  const moduleRequest = deferred();
  const screen = await mountDashboard({ user: { _id: 'user', plan: 'Free', semesters: ['S3'], freeModule: 'anatomy' }, moduleRequest });
  try {
    await act(async () => moduleRequest.resolve({ data: { data: anatomy } }));
    assert.equal(screen.root.root.findAllByProps({ 'aria-label': '1 modules' }).length, 1);
  } finally { await act(async () => screen.root.unmount()); }
});

test('profile failure shows retry instead of an empty module list and retries profile loading', async () => {
  const screen = await mountDashboard({ user: { _id: 'user', plan: 'Free', semesters: ['S3'] }, moduleRequest: deferred(), profileError: new Error('offline') });
  try {
    assert.ok(JSON.stringify(screen.root.toJSON()).includes('Modules indisponibles'));
    assert.equal(JSON.stringify(screen.root.toJSON()).includes('Aucun module disponible'), false);
    const retry = screen.root.root.findAllByType('button').find(node => node.children.includes('R\u00e9essayer'));
    await act(async () => retry.props.onClick());
    assert.equal(screen.refreshes, 1);
    assert.equal(screen.requests.length, 0);
  } finally { await act(async () => screen.root.unmount()); }
});

test('sidebar keeps loading and hides the zero count while the login profile is pending', async () => {
  const screen = await mountDashboard({ user: {}, moduleRequest: deferred(), profileLoading: true });
  try {
    assert.equal(screen.requests.length, 0);
    assert.ok(JSON.stringify(screen.root.toJSON()).includes('Chargement des modules'));
    assert.ok(!JSON.stringify(screen.root.toJSON()).includes('Aucun module disponible'));
    assert.equal(screen.root.root.findAllByProps({ 'aria-label': '0 modules' }).length, 0);
  } finally { await act(async () => screen.root.unmount()); }
});

for (const modules of [[anatomy], []]) {
  test('subscribed sidebar loads a fresh catalog and resolves ' + modules.length + ' modules', async () => {
    const moduleRequest = deferred();
    const screen = await mountDashboard({ user: { _id: 'subscriber', plan: 'Premium', semesters: ['S3'] }, moduleRequest });
    try {
      assert.deepEqual(screen.requests, ['fresh-catalog']);
      assert.ok(!JSON.stringify(screen.root.toJSON()).includes('Aucun module disponible'));
      await act(async () => moduleRequest.resolve({ data: { data: modules } }));
      assert.equal(screen.root.root.findAllByProps({ 'aria-label': modules.length + ' modules' }).length, 1);
      assert.equal(JSON.stringify(screen.root.toJSON()).includes('Aucun module disponible'), modules.length === 0);
    } finally { await act(async () => screen.root.unmount()); }
  });
}
