import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';
import { transform } from 'esbuild';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function mountPage() {
  const source = await readFile(new URL('../pages/AddQuestions.jsx', import.meta.url), 'utf8');
  const requests = [];
  const question = (id, examId) => ({ _id: id, text: id, examId, options: [{ text: 'Option', isCorrect: true }] });
  const context = vm.createContext({ console: { error() {} }, URLSearchParams });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const control = ({ children, ...props }) => React.createElement('select-control', props, children);
  const button = ({ children, ...props }) => React.createElement('button', props, children);
  let uuid = 0;
  const deps = {
    react: synthetic({ ...React, default: React }),
    'react/jsx-runtime': synthetic(jsxRuntime),
    'react-i18next': synthetic({ useTranslation: () => ({ t: (key, fallback) => fallback || key }) }),
    sonner: synthetic({ toast: { error() {}, success() {} } }),
    '@/lib/cryptoCompat': synthetic({ cryptoCompat: { randomUUID: () => String(++uuid) } }),
    '@/lib/mediaUrl': synthetic({ resolveQuestionImageUrl: value => value }),
    '@/components/shared': synthetic({ PageHeader: primitive }),
    '@/lib/utils': synthetic({ api: { get: url => {
      const metadata = {
        '/modules': [{ _id: 'm1', name: 'Anatomie', semester: 'S1' }],
        '/exams/all': ['A', 'B', 'C'].map(_id => ({ _id, name: _id, moduleId: 'm1', year: 2026 })),
        '/qcm-banque/all': [{ _id: 'Q', name: 'Banque', moduleId: 'm1' }],
      };
      if (url.startsWith('/questions/')) return new Promise((resolve, reject) => requests.push({ url, resolve, reject }));
      return Promise.resolve({ data: { data: metadata[url] || [] } });
    } } }),
  };
  const iconNames = source.match(/import\s*{([^}]+)}\s*from\s*"lucide-react"/)[1].split(',').map(name => name.trim());
  deps['lucide-react'] = synthetic(Object.fromEntries(iconNames.map(name => [name, () => null])));
  for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*"(@\/components\/ui\/[^" ]+)"/g)) {
    deps[match[2]] = synthetic(Object.fromEntries(match[1].split(',').map(name => {
      const key = name.trim();
      return [key, key === 'Select' ? control : key === 'Button' ? button : primitive];
    })));
  }
  const compiled = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  const page = new vm.SourceTextModule(compiled.code, { context });
  await page.link(specifier => { assert.ok(deps[specifier], specifier); return deps[specifier]; });
  await page.evaluate();
  let renderer;
  await act(async () => { renderer = create(React.createElement(page.namespace.default)); });
  const select = async (index, value) => act(async () => renderer.root.findAllByType('select-control')[index].props.onValueChange(value));
  const settle = async (request, data) => act(async () => request.resolve({ data: { data } }));
  const text = () => JSON.stringify(renderer.toJSON());
  const chooseExam = async id => {
    await select(0, 'S1');
    await select(1, 'm1');
    await select(2, 'years');
    await select(3, id);
  };
  return { renderer, requests, question, select, settle, text, chooseExam };
}

test('first exam selection ignores late all-question responses and errors', async () => {
  const page = await mountPage();
  try {
    await page.chooseExam('A');
    const scoped = page.requests.find(r => r.url === '/questions/by-exam/A');
    assert.ok(scoped);
    const obsolete = page.requests.filter(r => r !== scoped);
    assert.ok(!page.text().includes('Aucune question trouvée'));
    await page.settle(scoped, [page.question('only-A', 'A')]);
    assert.ok(page.text().includes('only-A'));
    await page.settle(obsolete[0], [page.question('unrelated-exam', 'B')]);
    await act(async () => obsolete.slice(1).forEach(r => r.reject(new Error('obsolete request'))));
    assert.ok(page.text().includes('only-A'));
    assert.ok(!page.text().includes('unrelated-exam'));
    assert.ok(!page.text().includes('Aucune question trouvée'));
  } finally { await act(async () => page.renderer.unmount()); }
});

test('rapid exam switches keep newest result and restore browsing after context reset', async () => {
  const page = await mountPage();
  try {
    await page.chooseExam('A');
    await page.select(3, 'B');
    await page.select(3, 'C');
    const requestFor = id => page.requests.find(r => r.url === '/questions/by-exam/' + id);
    await page.settle(requestFor('C'), [page.question('newest-C', 'C')]);
    await page.settle(requestFor('B'), []);
    await page.settle(requestFor('A'), [page.question('outdated-A', 'A')]);
    assert.ok(page.text().includes('newest-C'));
    assert.ok(!page.text().includes('outdated-A'));
    await page.select(0, 'S1');
    const browseRequest = page.requests.at(-1);
    assert.ok(browseRequest.url.startsWith('/questions/all'));
    await page.settle(browseRequest, [page.question('browse-question', 'A')]);
    assert.ok(page.text().includes('browse-question'));
  } finally { await act(async () => page.renderer.unmount()); }
});

test('hidden browse exam and search filters do not hide the selected exam', async () => {
  const page = await mountPage();
  try {
    // Initially three context selectors precede the four browse selectors.
    await page.select(4, 'm1');
    await page.select(6, 'B');
    const search = page.renderer.root.find(node => node.props.placeholder === 'Rechercher par texte, option ou N° question...');
    await act(async () => search.props.onChange({ target: { value: 'no matching question' } }));
    await page.chooseExam('A');
    await page.settle(page.requests.find(r => r.url === '/questions/by-exam/A'), [page.question('visible-A', 'A')]);
    assert.ok(page.text().includes('visible-A'));
    assert.ok(!page.text().includes('Aucune question trouvée'));
  } finally { await act(async () => page.renderer.unmount()); }
});
