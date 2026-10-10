import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';
import { transform } from 'esbuild';
import { getNoteContext } from '../utils/noteContext.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function mountNote(props, get = async () => ({ data: { data: [] } })) {
  const calls = [];
  const context = vm.createContext({ console: { error() {} } });
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context });
  const primitive = ({ children, ...props }) => React.createElement('div', props, children);
  const deps = {
    react: synthetic(React), 'react/jsx-runtime': synthetic(jsxRuntime),
    'framer-motion': synthetic({ motion: { div: primitive }, AnimatePresence: primitive }),
    'react-icons/fa': synthetic({ FaTimes: () => null, FaSave: () => null, FaTrash: () => null }),
    'lucide-react': synthetic({ NotebookPen: () => null }),
    sonner: synthetic({ toast: { success() {}, error() {}, warning() {} } }),
    '@/lib/utils': synthetic({ api: {
      get: async (url, options) => { calls.push({ method: 'get', url, options }); return get(url, options); },
      post: async (url, body) => { calls.push({ method: 'post', url, body }); return { data: { data: { _id: 'saved-note' } } }; },
      put: async (url, body) => { calls.push({ method: 'put', url, body }); },
    } }),
  };
  const source = await readFile(new URL('../components/ExamsPage/NoteModal.jsx', import.meta.url), 'utf8');
  const compiled = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
  const module = new vm.SourceTextModule(compiled.code, { context });
  await module.link(name => deps[name]);
  await module.evaluate();
  const render = props => React.createElement(module.namespace.default, { isOpen: true, onClose() {}, ...props });
  let renderer;
  await act(async () => { renderer = create(render(props)); });
  return { renderer, calls, update: async props => act(async () => renderer.update(render(props))) };
}

for (const courseId of ['111111111111111111111111', null]) {
  test('note modal fetches and saves the right origin: ' + (courseId || 'yearly'), async () => {
    const { renderer, calls } = await mountNote({ questionId: 'question', moduleId: 'module', examCourseId: courseId });
    try {
      assert.equal(calls[0].options.params.examCourseId, courseId || 'null');
      await act(async () => renderer.root.findByType('textarea').props.onChange({ target: { value: 'My note' } }));
      const save = () => renderer.root.findAllByType('button').find(node => node.children.includes('Enregistrer'));
      await act(async () => save().props.onClick());
      const saved = calls.find(call => call.method === 'post');
      assert.equal(saved.body.examCourseId, courseId);
      assert.equal(saved.body.questionId, 'question');
      assert.equal(saved.body.moduleId, 'module');
      await act(async () => save().props.onClick());
      assert.equal(calls.at(-1).method, 'put');
      assert.equal(calls.at(-1).url, '/notes/saved-note');
    } finally { await act(async () => renderer.unmount()); }
  });
}

test('changing course drops stale note data and cannot update a note from another course', async () => {
  let resolveOld;
  const oldResponse = new Promise(resolve => { resolveOld = resolve; });
  const { renderer, calls, update } = await mountNote({ questionId: 'question', examCourseId: 'course-a' },
    (url, options) => options.params.examCourseId === 'course-a' ? oldResponse : { data: { data: [] } });
  try {
    assert.equal(renderer.root.findByType('textarea').props.disabled, true);
    await update({ questionId: 'question', examCourseId: 'course-b' });
    await act(async () => resolveOld({ data: { data: [{ _id: 'wrong-note', content: 'Wrong course' }] } }));
    assert.equal(renderer.root.findByType('textarea').props.value, '');
    await act(async () => renderer.root.findByType('textarea').props.onChange({ target: { value: 'New course note' } }));
    await act(async () => renderer.root.findAllByType('button').find(node => node.children.includes('Enregistrer')).props.onClick());
    assert.equal(calls.at(-1).method, 'post');
    assert.equal(calls.at(-1).body.examCourseId, 'course-b');
  } finally { await act(async () => renderer.unmount()); }
});

test('note origin preserves the yearly source and recovers known native course context', () => {
  const question = { examId: { name: '2026 normal' }, examCourseId: { name: 'Native course', moduleId: { name: 'Anatomie I' } } };
  assert.equal(getNoteContext({ questionId: question }).origin, 'Anatomie I > Native course > 2026 normal');
  assert.equal(getNoteContext({ questionId: question, examCourseId: { name: 'Selected course', moduleId: { name: 'Anatomie I' } } }).origin,
    'Anatomie I > Selected course > 2026 normal');
  assert.equal(getNoteContext({ moduleId: { name: 'Anatomie I' }, questionId: { examId: { name: '2026 normal' } } }).origin,
    'Anatomie I > 2026 normal');
  assert.equal(getNoteContext().origin, '');
});

test('a failed note lookup cannot create a duplicate and can be retried', async () => {
  let attempts = 0;
  const { renderer, calls } = await mountNote({ questionId: 'question', examCourseId: 'course' }, async () => {
    if (attempts++ === 0) throw new Error('network unavailable');
    return { data: { data: [{ _id: 'existing-note', content: 'Saved note' }] } };
  });
  try {
    assert.equal(renderer.root.findByType('textarea').props.disabled, true);
    assert.equal(renderer.root.findAllByProps({ role: 'alert' }).length, 1);
    await act(async () => renderer.root.findAllByType('button').find(node => node.children.includes('Réessayer')).props.onClick());
    assert.equal(renderer.root.findByType('textarea').props.value, 'Saved note');
    assert.equal(renderer.root.findAllByProps({ role: 'alert' }).length, 0);
    await act(async () => renderer.root.findAllByType('button').find(node => node.children.includes('Enregistrer')).props.onClick());
    assert.equal(calls.at(-1).method, 'put');
    assert.equal(calls.at(-1).url, '/notes/existing-note');
  } finally { await act(async () => renderer.unmount()); }
});
