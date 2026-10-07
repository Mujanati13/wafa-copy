import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { create, act } from 'react-test-renderer';
import { transform } from 'esbuild';
import { buildUserListFilter } from '../../../wafa-backend/utils/userListFilters.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const primitive = ({ children, ...props }) => React.createElement('div', props, children);
const button = ({ children, ...props }) => React.createElement('button', props, children);
async function loadComponent(relativePath, overrides = {}) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const context = vm.createContext({ console, Date, JSON, Number, String, Math });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, { context });
  const deps = {
    react: { ...React, default: React }, 'react/jsx-runtime': jsxRuntime,
    '@/lib/utils': { cn: (...args) => args.filter(Boolean).join(' ') },
    ...overrides,
  };
  for (const [, imports, specifier] of source.matchAll(/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];/g)) {
    if (deps[specifier]) continue;
    const names = imports.includes('{')
      ? imports.slice(imports.indexOf('{') + 1, imports.indexOf('}')).split(',').map(s => s.trim()).filter(Boolean)
      : ['default'];
    deps[specifier] = Object.fromEntries(names.map(name => [name,
      specifier === 'lucide-react' ? () => null : name === 'Button' ? button : primitive]));
  }
  const modules = Object.fromEntries(Object.entries(deps).map(([key, value]) => [key, synthetic(value)]));
  const compiled = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  const component = new vm.SourceTextModule(compiled.code, { context });
  await component.link(specifier => modules[specifier]);
  await component.evaluate();
  return component.namespace.default;
}


const users = Array.from({ length: 120 }, (_, i) => ({
  _id: String(i), name: 'User ' + i, username: 'user' + i, email: 'user' + i + '@example.com',
  plan: i % 2 ? 'Free' : 'Premium',
}));
const nada = { _id: 'nada', name: 'Nada', username: 'nada2026', email: 'nada@example.com', plan: 'Premium' };
users.push(nada);
const matches = (user, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === '$and') return value.every(clause => matches(user, clause));
  if (key === '$or') return value.some(clause => matches(user, clause));
  if (value instanceof RegExp) return value.test(user[key] || '');
  if (value?.$ne) return user[key] !== value.$ne;
  return user[key] === value;
});
const responseFor = (status, page, limit, filters) => {
  const base = status === 'paid' ? { plan: { $ne: 'Free' } } : status === 'free' ? { plan: 'Free' } : {};
  const matching = users.filter(user => matches(user, buildUserListFilter(filters, base)));
  const totalPages = Math.ceil(matching.length / limit);
  return { success: true, data: { users: matching.slice((page - 1) * limit, page * limit),
    pagination: { totalUsers: matching.length, totalPages, hasNextPage: page < totalPages } } };
};
async function mount(fetch, posts = [], errors = []) {
  const Component = await loadComponent('../pages/NotificationAdmin.jsx', {
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'framer-motion': { motion: { div: primitive } },
    sonner: { toast: { error: (...args) => errors.push(args), success() {} } },
    '@/lib/utils': { api: { post: async (url, payload) => { posts.push({ url, payload }); return { data: { success: true } }; } } },
    '@/components/ui/tabs': { Tabs: props => React.createElement('tabs-probe', props), TabsContent: primitive, TabsList: primitive, TabsTrigger: primitive },
    '@/components/ui/select': { Select: props => React.createElement('select-probe', props), SelectContent: primitive, SelectItem: primitive, SelectTrigger: primitive, SelectValue: primitive },
    '@/components/ui/input': { Input: props => React.createElement('input', props) },
    '@/components/ui/textarea': { Textarea: props => React.createElement('textarea', props) },
    '@/services/userService': { userService: {
      getAllUsers: (...args) => fetch('all', ...args),
      getPayingUsers: (...args) => fetch('paid', ...args),
      getFreeUsers: (...args) => fetch('free', ...args),
    } },
  });
  let screen;
  await act(async () => { screen = create(React.createElement(Component)); });
  await act(async () => screen.root.findByType('tabs-probe').props.onValueChange('individual'));
  return screen;
}
const search = screen => screen.root.findAllByType('input').find(n => n.props.placeholder?.startsWith('Rechercher'));
const status = screen => screen.root.findAllByType('select-probe').find(n => n.findAllByProps({ id: 'recipient-subscription' }).length);
const row = (screen, email) => screen.root.findAllByType('button').find(n => n.findAllByType('p').some(p => p.children.includes(email)));
const namedButton = (screen, text) => screen.root.findAllByType('button').find(n => n.children.includes(text));
const selectPage = screen => screen.root.findByProps({ id: 'selectAll' });

test('notification search reaches users beyond first 100 and composes with paid/free filters', async () => {
  const requests = [];
  const screen = await mount(async (...args) => { requests.push(args); return responseFor(...args); });
  try {
    assert.equal(row(screen, nada.email), undefined);
    await act(async () => search(screen).props.onChange({ target: { value: '  NaDa  ' } }));
    assert.equal(requests.at(-1)[3].search, 'NaDa');
    assert.ok(row(screen, nada.email));
    await act(async () => status(screen).props.onValueChange('paid'));
    assert.equal(requests.at(-1)[0], 'paid');
    assert.ok(row(screen, nada.email));
    await act(async () => status(screen).props.onValueChange('free'));
    assert.equal(row(screen, nada.email), undefined);
    assert.ok(screen.root.findAllByType('p').some(p => p.children.includes('Aucun utilisateur trouvé')));
    await act(async () => search(screen).props.onChange({ target: { value: 'user1@example.com' } }));
    assert.ok(row(screen, 'user1@example.com'));
    await act(async () => status(screen).props.onValueChange('all'));
    await act(async () => search(screen).props.onChange({ target: { value: 'nada2026' } }));
    assert.ok(row(screen, nada.email));
  } finally { await act(async () => screen.unmount()); }
});

test('pagination and select-page preserve recipients across pages and filters without duplicates', async () => {
  const posts = [];
  const requests = [];
  const screen = await mount(async (...args) => { requests.push(args); return responseFor(...args); }, posts);
  try {
    await act(async () => selectPage(screen).props.onChange());
    assert.equal(selectPage(screen).props.checked, true);
    await act(async () => namedButton(screen, 'Suivant').props.onClick());
    assert.equal(requests.at(-1)[1], 2);
    assert.equal(selectPage(screen).props.checked, false);
    await act(async () => selectPage(screen).props.onChange());
    await act(async () => namedButton(screen, 'Précédent').props.onClick());
    assert.equal(selectPage(screen).props.checked, true);
    await act(async () => selectPage(screen).props.onChange());
    await act(async () => search(screen).props.onChange({ target: { value: 'Nada' } }));
    assert.equal(requests.at(-1)[1], 1);
    await act(async () => row(screen, nada.email).props.onClick());
    await act(async () => status(screen).props.onValueChange('free'));
    const title = screen.root.findAllByType('input').find(n => n.props.placeholder === 'Titre');
    const message = screen.root.findAllByType('textarea').find(n => n.props.placeholder === 'Contenu...');
    await act(async () => {
      title.props.onChange({ target: { name: 'title', value: 'Test notification' } });
      message.props.onChange({ target: { name: 'message', value: 'Test message' } });
    });
    const send = screen.root.findAllByType('button').find(n => n.children.some(c => typeof c === 'string' && c.startsWith('Envoyer (')));
    await act(async () => send.props.onClick());
    assert.equal(posts.length, 1);
    assert.equal(posts[0].url, '/notifications/admin/send-system');
    assert.deepEqual([...posts[0].payload.userIds].sort(), [...users.slice(50, 100).map(u => u._id), nada._id].sort());
  } finally { await act(async () => screen.unmount()); }
});

test('an older user request cannot replace newer search results', async () => {
  let resolveOld;
  const oldRequest = new Promise(resolve => { resolveOld = resolve; });
  const screen = await mount((status, page, limit, filters) => filters.search
    ? Promise.resolve(responseFor(status, page, limit, filters)) : oldRequest);
  try {
    assert.equal(selectPage(screen).props.disabled, true);
    await act(async () => search(screen).props.onChange({ target: { value: 'Nada' } }));
    assert.ok(row(screen, nada.email));
    await act(async () => resolveOld(responseFor('all', 1, 50, {})));
    assert.ok(row(screen, nada.email));
    assert.equal(row(screen, 'user0@example.com'), undefined);
  } finally { await act(async () => screen.unmount()); }
});
