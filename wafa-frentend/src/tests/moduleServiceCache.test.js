import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

for (const action of ['update', 'clear']) {
  test(`an old catalog response cannot restore persisted data after ${action}`, async () => {
    const values = new Map([['user', JSON.stringify({ _id: 'user', plan: 'Premium' })]]);
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    const pending = deferred(), started = deferred(); let calls = 0;
    const context = vm.createContext({ localStorage: storage, console });
    const api = new vm.SyntheticModule(['api'], function () {
      this.setExport('api', {
        get: () => { calls++; if (calls === 1) { started.resolve(); return pending.promise; }
          return Promise.resolve({ data: { data: [{ _id: 'module', name: 'Updated' }] } }); },
        put: async () => ({ data: { success: true } }),
      });
    }, { context });
    const cache = new vm.SourceTextModule(await readFile(new URL('../services/learnerCache.js', import.meta.url), 'utf8'), { context });
    const service = new vm.SourceTextModule(await readFile(new URL('../services/moduleService.js', import.meta.url), 'utf8'), { context });
    await service.link(specifier => specifier.includes('learnerCache') ? cache : api);
    await service.evaluate();
    const modules = service.namespace.moduleService;
    const old = modules.getAllmodules();
    await started.promise;
    if (action === 'update') await modules.updateModule('module', { name: 'Updated' });
    else modules.clearCache();
    pending.resolve({ data: { data: [{ _id: 'module', name: 'Old' }] } });
    await old;
    const fresh = await modules.getAllmodules();
    assert.equal(fresh.data.data[0].name, 'Updated');
    assert.equal(calls, 2);
  });
}
