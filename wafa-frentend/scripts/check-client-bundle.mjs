import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

// Count all static dependencies required to open an authenticated dashboard.
// Dynamic admin routes, exam dialogs and export tools are intentionally excluded.
const directory = path.resolve(process.argv[2] || 'dist');
const manifest = JSON.parse(await readFile(path.join(directory, '.vite/manifest.json'), 'utf8'));
const roots = [Object.keys(manifest).find(key => manifest[key].isEntry),
  'src/components/layout/LearnerExperienceLayout.jsx', 'src/pages/LearnerDashboard.jsx'];
const visited = new Set(), files = new Set();
function visit(key) {
  if (visited.has(key)) return;
  if (!manifest[key]) throw new Error(`Missing dashboard build entry: ${key}`);
  visited.add(key);
  files.add(manifest[key].file);
  for (const imported of manifest[key].imports || []) visit(imported);
}
roots.forEach(visit);
let bytes = 0, gzipBytes = 0;
for (const file of files) {
  const data = await readFile(path.join(directory, file));
  bytes += data.length;
  gzipBytes += gzipSync(data).length;
}
const result = { javascriptFiles: files.size, bytes, gzipBytes };
if (process.argv[3]) {
  const baseline = await readFile(path.resolve(process.argv[3]));
  result.baselineGzipBytes = gzipSync(baseline).length;
  result.reductionPercent = Math.round((1 - gzipBytes / result.baselineGzipBytes) * 1000) / 10;
  if (result.reductionPercent < 50) process.exitCode = 1;
}
console.log(JSON.stringify(result, null, 2));
