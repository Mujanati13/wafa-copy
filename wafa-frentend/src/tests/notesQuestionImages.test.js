import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { act, create } from 'react-test-renderer';
import { transform } from 'esbuild';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const synthetic = (context, exports) => new vm.SyntheticModule(Object.keys(exports), function () {
  for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
}, { context });

for (const images of [['/uploads/questions/heart.png', 'https://example.com/diagram.jpg'], []]) {
  test('note question preview exposes its associated images: ' + images.length, async () => {
    const source = await readFile(new URL('../pages/NotesPage.jsx', import.meta.url), 'utf8');
    const context = vm.createContext({ console, localStorage: { getItem: () => '{}' } });
    const primitive = ({ children, ...props }) => React.createElement('div', props, children);
    const button = ({ children, ...props }) => React.createElement('button', props, children);
    const navigate = () => {};
    const question = { _id: 'q1', text: 'Sur le schéma...', images, options: [{ text: 'Réponse', isCorrect: true }] };
    const note = { _id: 'n1', title: 'Anatomie', content: 'Ma note', createdAt: '2026-01-01', questionId: question };
    const deps = {
      react: synthetic(context, { ...React, default: React }),
      'react/jsx-runtime': synthetic(context, jsxRuntime),
      'react-i18next': synthetic(context, { useTranslation: () => ({ t: key => key }) }),
      'react-router-dom': synthetic(context, { useNavigate: () => navigate }),
      'framer-motion': synthetic(context, { motion: { div: primitive }, AnimatePresence: primitive }),
      lodash: synthetic(context, { debounce: fn => fn }),
      sonner: synthetic(context, { toast: { error() {}, info() {} } }),
      '@/utils/subscriptionDisplay': synthetic(context, { isPremiumProPlan: () => true }),
      '@/lib/utils': synthetic(context, { cn: (...args) => args.filter(Boolean).join(' '), api: {
        get: async url => ({ data: { data: url === '/notes' ? [note] : [] } }),
      } }),
      '@/components/ExamsPage/InTextImageViewer': synthetic(context, {
        default: props => React.createElement('image-viewer', props),
      }),
    };
    const iconNames = source.match(/import\s*{([^}]+)}\s*from\s*"lucide-react"/)[1].split(',').map(name => name.trim());
    deps['lucide-react'] = synthetic(context, Object.fromEntries(iconNames.map(name => [name, () => null])));
    for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*"(@\/components\/ui\/[^" ]+)"/g)) {
      deps[match[2]] = synthetic(context, Object.fromEntries(match[1].split(',').map(name => {
        const key = name.trim();
        return [key, key === 'Button' ? button : primitive];
      })));
    }
    const compiled = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' });
    const page = new vm.SourceTextModule(compiled.code, { context });
    await page.link(specifier => {
      assert.ok(deps[specifier], 'Unmocked import: ' + specifier);
      return deps[specifier];
    });
    await page.evaluate();
    let renderer;
    await act(async () => { renderer = create(React.createElement(page.namespace.default)); });
    try {
      const viewButton = renderer.root.findAllByType('button').find(node =>
        node.findAllByType('span').some(span => span.children.includes('Voir Question')));
      await act(async () => viewButton.props.onClick({ stopPropagation() {} }));
      const viewers = renderer.root.findAllByType('image-viewer');
      assert.equal(viewers.length, images.length ? 1 : 0);
      if (images.length) {
        assert.deepEqual(viewers[0].props.images, images);
        assert.equal(viewers[0].props.buttonText, 'Voir les images de la question');
      }
    } finally {
      await act(async () => renderer.unmount());
    }
  });
}

test('note endpoints include images when populating linked questions', async () => {
  const source = await readFile(new URL('../../../wafa-backend/controllers/noteController.js', import.meta.url), 'utf8');
  const context = vm.createContext({ console });
  const projections = [];
  const query = {
    populate(path) { if (path?.path === 'questionId') projections.push(path.select); return this; },
    sort() { return this; },
    then(resolve) { return Promise.resolve([]).then(resolve); },
  };
  const controller = new vm.SourceTextModule(source, { context });
  await controller.link(specifier => {
    if (specifier.includes('noteModel')) return synthetic(context, { default: { find: () => query, findOne: () => query } });
    if (specifier.includes('asyncHandler')) return synthetic(context, { default: fn => fn });
    return synthetic(context, { NotificationController: {} });
  });
  await controller.evaluate();
  const req = { user: { _id: 'u1' }, query: {}, params: { id: 'n1', moduleId: 'm1' } };
  const res = { status() { return this; }, json() {} };
  for (const endpoint of ['getAll', 'getById', 'getByModule']) {
    await controller.namespace.noteController[endpoint](req, res);
  }
  assert.equal(projections.length, 3);
  for (const projection of projections) assert.ok(projection.split(' ').includes('images'));
});
