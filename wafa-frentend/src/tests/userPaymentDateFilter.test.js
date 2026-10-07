import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { create, act } from 'react-test-renderer';
import { transform } from 'esbuild';
import * as dateFns from 'date-fns';
import { fr } from 'date-fns/locale';
import { buildUserListFilter } from '../../../wafa-backend/utils/userListFilters.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const primitive = ({ children, ...props }) => React.createElement('div', props, children);
const button = ({ children, ...props }) => React.createElement('button', props, children);
const fixture = {
  _id: 'september-registration-october-payment', name: 'Test', email: 'test@example.com',
  plan: 'Premium', semesters: ['S7'], isActive: true,
  createdAt: new Date('2026-09-27T12:00:00Z'), paymentDate: new Date('2026-10-07T12:00:00Z'),
};
const matches = (record, filter) => Object.entries(filter).every(([field, range]) => {
  if (field === '$and') return range.every(clause => matches(record, clause));
  return (!range.$gte || record[field] >= range.$gte) && (!range.$lte || record[field] <= range.$lte);
});

async function loadComponent(relativePath, overrides = {}) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const context = vm.createContext({ console, Date, JSON, Number, String, Math });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, { context });
  const deps = {
    react: { ...React, default: React }, 'react/jsx-runtime': jsxRuntime,
    'date-fns': dateFns, 'date-fns/locale': { fr },
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

test('Paying date picker includes October 7 payment with September 27 registration', async () => {
  const requests = [];
  const fetchUsers = async (tab, page, limit, filters) => {
    requests.push({ tab, page, filters });
    const users = matches(fixture, buildUserListFilter(filters)) ? [fixture] : [];
    return { success: true, data: { users, pagination: { totalUsers: users.length } } };
  };
  const Component = await loadComponent('../components/admin/UsersWithTabs.jsx', {
    '../shared': { TableFilters: props => React.createElement('filter-probe', props) },
    '../../services/userService': { userService: {
      getFreeUsers: (...args) => fetchUsers('free', ...args),
      getPayingUsers: (...args) => fetchUsers('paying', ...args),
      getUserStats: async () => ({ success: true, data: {} }),
    } },
    '@/utils/subscriptionDisplay': { displaySubscriptionPlanName: p => p, editableUserPlan: u => u.plan },
  });
  let screen;
  await act(async () => { screen = create(React.createElement(Component)); });
  const controls = () => screen.root.findByType('filter-probe').props;
  const tabButton = name => screen.root.findAllByType('button').find(node => node.children.some(child => typeof child === 'string' && child.startsWith(name + ' (')));
  try {
    // A free-tab registration filter must not silently restrict the Paying tab.
    await act(async () => controls().onDateChange({ startDate: new Date(2026, 8, 27), endDate: new Date(2026, 8, 27) }));
    await act(async () => tabButton('Paying').props.onClick());
    assert.equal(controls().dateFilterLabel, 'Date de paiement');
    assert.equal(requests.at(-1).filters.startDate, undefined);
    assert.equal(requests.at(-1).filters.endDate, undefined);
    await act(async () => controls().onDateChange({ startDate: new Date(2026, 9, 7), endDate: new Date(2026, 9, 7) }));
    const request = requests.at(-1);
    assert.equal(request.page, 1);
    assert.equal(request.filters.startDate, undefined);
    assert.equal(request.filters.endDate, undefined);
    assert.equal(matches(fixture, buildUserListFilter(request.filters)), true);
    assert.ok(screen.root.findAll(node => node.children.includes('07/10/2026')).length);
    const end = new Date(request.filters.paymentEndDate);
    assert.equal(end.getHours(), 23);
    assert.equal(end.getMilliseconds(), 999);
    assert.equal(controls().activeFilterCount, 1);
    assert.equal(controls().additionalFilters.find(f => f.key === 'paymentDate').value, 'custom');
    await act(async () => controls().additionalFilters.find(f => f.key === 'paymentDate').onChange('last7days'));
    assert.equal(controls().additionalFilters.find(f => f.key === 'paymentDate').value, 'last7days');
    const preset = requests.at(-1).filters;
    assert.ok(preset.paymentStartDate && preset.paymentEndDate);
    const start = new Date(preset.paymentStartDate);
    start.setDate(start.getDate() + 6);
    assert.equal(start.toDateString(), new Date(preset.paymentEndDate).toDateString());
    await act(async () => tabButton('Free').props.onClick());
    assert.equal(controls().dateFilterLabel, "Date d'inscription");
    assert.equal(requests.at(-1).filters.paymentStartDate, undefined);
    assert.equal(requests.at(-1).filters.paymentEndDate, undefined);
    await act(async () => controls().onClearFilters());
    assert.equal(controls().activeFilterCount, 0);
    await act(async () => tabButton('Paying').props.onClick());
    assert.equal(controls().startDate, undefined);
    assert.equal(controls().additionalFilters.find(f => f.key === 'paymentDate').value, 'all');
  } finally { await act(async () => screen.unmount()); }
});

test('date picker keeps selected local day and refreshes draft values after clearing', async () => {
  const Component = await loadComponent('../components/shared/TableFilters.jsx', {
    '@/components/ui/input': { Input: props => React.createElement('input', props) },
  });
  let applied;
  let screen;
  await act(async () => { screen = create(React.createElement(Component, {
    dateFilterLabel: 'Date de paiement', onDateChange: value => { applied = value; },
  })); });
  const inputs = () => screen.root.findAllByType('input').filter(node => node.props.type === 'date');
  const popover = () => screen.root.findAll(node => typeof node.props.onOpenChange === 'function')[0];
  try {
    await act(async () => popover().props.onOpenChange(true));
    await act(async () => inputs()[0].props.onChange({ target: { value: '2026-10-07' } }));
    await act(async () => inputs()[1].props.onChange({ target: { value: '2026-10-07' } }));
    assert.equal(inputs()[0].props.value, '2026-10-07');
    await act(async () => screen.root.findAllByType('button').find(n => n.children.includes('Appliquer')).props.onClick());
    assert.equal(applied.startDate.getDate(), 7);
    assert.equal(applied.startDate.getMonth(), 9);
    await act(async () => popover().props.onOpenChange(true));
    assert.equal(inputs()[0].props.value, '');
    assert.equal(inputs()[1].props.value, '');
  } finally { await act(async () => screen.unmount()); }
});
