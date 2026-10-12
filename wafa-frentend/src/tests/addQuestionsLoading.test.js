import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';
import { transform } from 'esbuild';
import { buildQuestionsXlsx, QUESTIONS_XLSX_MIME } from '../utils/questionExport.js';
import ExcelJS from 'exceljs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function mountPage({ exportBuilder = buildQuestionsXlsx } = {}) {
  const source = await readFile(new URL('../pages/AddQuestions.jsx', import.meta.url), 'utf8');
  const requests = [];
  const tableRenders = [];
  const downloads = [];
  const releasedUrls = [];
  const attachedLinks = [];
  const notifications = [];
  const elementText = node => node == null || typeof node === 'boolean' ? ''
    : typeof node === 'string' || typeof node === 'number' ? String(node)
      : Array.isArray(node) ? node.map(elementText).join('') : elementText(node.props?.children);
  const question = (id, examId) => ({ _id: id, text: id, examId, options: [{ text: 'Option', isCorrect: true }] });
  const context = vm.createContext({ console: { error() {} }, URLSearchParams, Blob,
    setTimeout: callback => callback(),
    URL: { createObjectURL: blob => { downloads.push({ blob }); return 'blob:question-export'; },
      revokeObjectURL: url => releasedUrls.push(url) },
    document: { createElement: () => ({ style: {}, setAttribute(key, value) { this[key] = value; },
      click() { Object.assign(downloads.at(-1), { filename: this.download, href: this.href }); } }),
      body: { appendChild: link => attachedLinks.push(link), removeChild: link => attachedLinks.splice(attachedLinks.indexOf(link), 1) } },
  });
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
    sonner: synthetic({ toast: { error: message => notifications.push(['error', message]), success: message => notifications.push(['success', message]) } }),
    '@/lib/cryptoCompat': synthetic({ cryptoCompat: { randomUUID: () => String(++uuid) } }),
    '@/lib/mediaUrl': synthetic({ resolveQuestionImageUrl: value => value }),
    '@/utils/questionExport': synthetic({ buildQuestionsXlsx: exportBuilder, QUESTIONS_XLSX_MIME }),
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
      return [key, key === 'Select' ? control : key === 'Button' ? button : key === 'TableBody'
        ? props => { tableRenders.push(elementText(props.children)); return primitive(props); }
        : primitive];
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
  return { renderer, requests, tableRenders, question, select, settle, text, chooseExam, downloads, releasedUrls, attachedLinks, notifications };
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

test('selecting an exam never renders a previously loaded global list, even before effects run', async () => {
  const page = await mountPage();
  try {
    await page.select(0, 'S1');
    await page.select(1, 'm1');
    await page.select(2, 'years');
    await page.settle(page.requests.at(-1), [page.question('global-question', 'B')]);
    assert.ok(page.text().includes('global-question'));
    const firstRender = page.tableRenders.length;
    await page.select(3, 'A');
    assert.ok(page.tableRenders.slice(firstRender).every(text =>
      !text.includes('global-question') && !text.includes('Aucune question trouvée')));
    await page.settle(page.requests.at(-1), [page.question('first-selection-A', 'A')]);
    assert.ok(page.text().includes('first-selection-A'));
  } finally { await act(async () => page.renderer.unmount()); }
});

test('the table exam dropdown fetches its selected exam on the first attempt', async () => {
  const page = await mountPage();
  try {
    await page.select(4, 'm1');
    await page.settle(page.requests.at(-1), [page.question('global-question', 'B')]);
    const firstRender = page.tableRenders.length;
    await page.select(6, 'A');
    assert.equal(page.requests.at(-1).url, '/questions/by-exam/A');
    assert.ok(page.tableRenders.slice(firstRender).every(text => !text.includes('Aucune question trouvée')));
    await page.settle(page.requests.at(-1), [page.question('table-exam-A', 'A')]);
    assert.ok(page.text().includes('table-exam-A'));
    assert.ok(!page.text().includes('global-question'));
  } finally { await act(async () => page.renderer.unmount()); }
});

test('table exam switches ignore stale responses and returning to all exams refetches the catalog', async () => {
  const page = await mountPage();
  try {
    await page.select(4, 'm1');
    await page.select(6, 'A');
    const first = page.requests.at(-1);
    await page.select(6, 'B');
    await page.settle(page.requests.at(-1), [page.question('table-exam-B', 'B')]);
    await page.settle(first, []);
    assert.ok(page.text().includes('table-exam-B'));
    await page.select(6, 'all');
    assert.equal(page.requests.at(-1).url, '/questions/all?moduleId=m1');
    await page.settle(page.requests.at(-1), [page.question('all-module-questions', 'A')]);
    assert.ok(page.text().includes('all-module-questions'));
  } finally { await act(async () => page.renderer.unmount()); }
});

test('a failed exam request shows retry instead of claiming that the exam has zero questions', async () => {
  const page = await mountPage();
  try {
    await page.chooseExam('A');
    await act(async () => page.requests.at(-1).reject(new Error('offline')));
    assert.ok(page.text().includes('Impossible de charger les questions'));
    assert.ok(!page.text().includes('Aucune question trouvée'));
    const retry = page.renderer.root.findAllByType('button').find(node => node.children.includes('Réessayer'));
    await act(async () => retry.props.onClick());
    assert.equal(page.requests.at(-1).url, '/questions/by-exam/A');
    await page.settle(page.requests.at(-1), [page.question('retried-A', 'A')]);
    assert.ok(page.text().includes('retried-A'));
  } finally { await act(async () => page.renderer.unmount()); }
});

test('export button downloads a formatted Excel workbook for the exam or selected questions', async () => {
  const page = await mountPage();
  try {
    await page.chooseExam('A');
    await page.settle(page.requests.at(-1), [
      { ...page.question('accented', 'A'), text: 'Hémoptysie : évoquer une récidive ?' },
      page.question('second-question', 'A'),
    ]);
    const button = page.renderer.root.findAllByType('button').find(node => node.children.some(child => typeof child === 'string' && child.startsWith('Exporter')));
    assert.ok(button);
    await act(async () => { await button.props.onClick(); });
    assert.equal(page.downloads.length, 1);
    const download = page.downloads[0];
    assert.match(download.filename, /^questions_export_\d+\.xlsx$/);
    assert.equal(download.blob.type, QUESTIONS_XLSX_MIME);
    const bytes = Buffer.from(await download.blob.arrayBuffer());
    assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'must be an actual XLSX ZIP file');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    const sheet = workbook.getWorksheet('Questions');
    assert.equal(sheet.getCell('B2').value, 'Hémoptysie : évoquer une récidive ?');
    assert.equal(sheet.getCell('B3').value, 'second-question');
    assert.equal(sheet.getCell('B2').alignment.wrapText, true);
    assert.ok(sheet.getColumn(2).width >= 60);
    assert.equal(page.attachedLinks.length, 0);
    assert.deepEqual(page.releasedUrls, ['blob:question-export']);
    const checkbox = page.renderer.root.findAll(node => node.type === 'div' && typeof node.props.onCheckedChange === 'function').at(-1);
    await act(async () => checkbox.props.onCheckedChange(true));
    await act(async () => { await button.props.onClick(); });
    const selectedWorkbook = new ExcelJS.Workbook();
    await selectedWorkbook.xlsx.load(await page.downloads.at(-1).blob.arrayBuffer());
    const selectedSheet = selectedWorkbook.getWorksheet('Questions');
    assert.equal(selectedSheet.rowCount, 2);
    assert.equal(selectedSheet.getCell('B2').value, 'second-question');
  } finally { await act(async () => page.renderer.unmount()); }
});

test('export disables the button while preparing the workbook in both page locations', async () => {
  for (const contextSelected of [true, false]) {
    let finishExport;
    let calls = 0;
    const page = await mountPage({ exportBuilder: () => { calls++; return new Promise(resolve => { finishExport = resolve; }); } });
    try {
      if (contextSelected) await page.chooseExam('A');
      await page.settle(page.requests.at(-1), [page.question('q1', 'A')]);
      const buttons = () => page.renderer.root.findAllByType('button').filter(node =>
        node.children.some(child => typeof child === 'string' && (child.startsWith('Exporter Excel') || child === 'Export en cours…')));
      let exporting;
      await act(async () => { exporting = buttons()[0].props.onClick(); });
      assert.equal(buttons().length, 1);
      assert.ok(buttons().every(button => button.props.disabled));
      await act(async () => { await buttons()[0].props.onClick(); });
      assert.equal(calls, 1);
      await act(async () => { finishExport(new Uint8Array([80, 75])); await exporting; });
      assert.ok(buttons().every(button => !button.props.disabled));
      assert.equal(page.downloads.length, 1);
    } finally { await act(async () => page.renderer.unmount()); }
  }
});

test('failed exports preserve the selection and allow retry without a broken download', async () => {
  let attempts = 0;
  const page = await mountPage({ exportBuilder: questions => {
    if (++attempts === 1) return Promise.reject(new Error('write failed'));
    return buildQuestionsXlsx(questions);
  } });
  try {
    await page.chooseExam('A');
    await page.settle(page.requests.at(-1), [page.question('q1', 'A'), page.question('q2', 'A')]);
    const checkbox = page.renderer.root.findAll(node => node.type === 'div' && typeof node.props.onCheckedChange === 'function').at(-1);
    await act(async () => checkbox.props.onCheckedChange(true));
    const button = () => page.renderer.root.findAllByType('button').find(node => node.children.some(child => typeof child === 'string' && child.startsWith('Exporter Excel')));
    await act(async () => { await button().props.onClick(); });
    assert.equal(page.downloads.length, 0);
    assert.equal(page.notifications.at(-1)[0], 'error');
    assert.ok(button().children.includes('Exporter Excel (1)'));
    assert.equal(button().props.disabled, false);
    await act(async () => { await button().props.onClick(); });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await page.downloads[0].blob.arrayBuffer());
    assert.equal(workbook.getWorksheet('Questions').getCell('B2').value, 'q2');
    assert.equal(workbook.getWorksheet('Questions').rowCount, 2);
    assert.equal(page.notifications.at(-1)[0], 'success');
  } finally { await act(async () => page.renderer.unmount()); }
});

test('edit modal shows the yearly exam and every course, without replacing unsaved edits', async () => {
  const page = await mountPage();
  try {
    await page.chooseExam('A');
    await page.settle(page.requests.at(-1), [{ ...page.question('q1', { _id: 'A', name: '2026 normal' }),
      examCourseId: { name: 'Examen cardiovasculaire' } }]);
    await act(async () => page.renderer.root.findAllByType('button').find(node => node.props.title === 'Modifier').props.onClick());
    const refs = page.requests.at(-1);
    assert.equal(refs.url, '/questions/references/q1');
    const field = id => page.renderer.root.findByProps({ id });
    assert.equal(field('edit-question-reference-exam').props.value, '2026 normal');
    assert.equal(field('edit-question-reference-courses').props.value, 'Chargement…');
    const text = page.renderer.root.find(node => node.props.rows === 4 && node.props.value === 'q1');
    await act(async () => text.props.onChange({ target: { value: 'My unsaved edit' } }));
    await page.settle(refs, { yearlyExam: { name: '2026 normal' }, courses: [
      { name: 'le coeur' }, { name: 'les poumons' }, { name: ' le coeur ' },
    ] });
    assert.equal(field('edit-question-reference-exam').props.value, '2026 normal');
    assert.equal(field('edit-question-reference-courses').props.value, 'le coeur, les poumons');
    assert.equal(field('edit-question-reference-courses').props.readOnly, true);
    assert.equal(field('edit-question-reference-exam').props.readOnly, true);
    assert.ok(page.renderer.root.find(node => node.props.rows === 4 && node.props.value === 'My unsaved edit'));
  } finally { await act(async () => page.renderer.unmount()); }
});

test('changing the edited question ignores late reference responses from the previous question', async () => {
  const page = await mountPage();
  try {
    await page.chooseExam('A');
    await page.settle(page.requests.at(-1), [page.question('q1', 'A'), page.question('q2', 'A')]);
    const edit = async index => act(async () => page.renderer.root.findAllByType('button').filter(node => node.props.title === 'Modifier')[index].props.onClick());
    await edit(0);
    const old = page.requests.at(-1);
    await act(async () => page.renderer.root.find(node => node.type === 'div' && node.props.open === true && node.props.onOpenChange).props.onOpenChange(false));
    await edit(1);
    await page.settle(page.requests.at(-1), { yearlyExam: null, courses: [{ name: 'New topic' }] });
    await page.settle(old, { yearlyExam: { name: 'Wrong exam' }, courses: [{ name: 'Wrong topic' }] });
    assert.equal(page.renderer.root.findByProps({ id: 'edit-question-reference-exam' }).props.value, 'Aucun examen annuel associé');
    assert.equal(page.renderer.root.findByProps({ id: 'edit-question-reference-courses' }).props.value, 'New topic');
  } finally { await act(async () => page.renderer.unmount()); }
});

test('reference fetch errors offer retry and distinguish failure from no associated course', async () => {
  const page = await mountPage();
  try {
    await page.chooseExam('A');
    await page.settle(page.requests.at(-1), [page.question('q1', 'A')]);
    await act(async () => page.renderer.root.findAllByType('button').find(node => node.props.title === 'Modifier').props.onClick());
    await act(async () => page.requests.at(-1).reject(new Error('offline')));
    assert.equal(page.renderer.root.findByProps({ id: 'edit-question-reference-courses' }).props.value, 'Indisponible');
    const retry = page.renderer.root.findAllByType('button').find(node => node.children.includes('Réessayer les références'));
    await act(async () => retry.props.onClick());
    assert.equal(page.requests.at(-1).url, '/questions/references/q1');
    await page.settle(page.requests.at(-1), { yearlyExam: { name: '2026 normal' }, courses: [] });
    assert.equal(page.renderer.root.findByProps({ id: 'edit-question-reference-courses' }).props.value, 'Aucun cours associé');
    assert.ok(!page.text().includes('Impossible de charger les références de la question'));
  } finally { await act(async () => page.renderer.unmount()); }
});
