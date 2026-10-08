import { build } from 'esbuild';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parseSourceFile } from './src/source-format.mjs';

const root = new URL('..', import.meta.url).pathname;
const editorRoot = new URL('.', import.meta.url).pathname;
const check = process.argv.includes('--check');
const hash = data => createHash('sha256').update(data).digest('hex');
const main = await build({ absWorkingDir: editorRoot, entryPoints: ['src/index.mjs'], bundle: true, write: false, minify: true, format: 'esm', target: 'es2022', legalComments: 'inline', metafile: true });
const boot = await build({ absWorkingDir: editorRoot, entryPoints: ['src/bootstrap.mjs'], bundle: true, write: false, minify: true, format: 'iife', target: 'es2022', legalComments: 'inline', metafile: true, define: { __EDITOR_VERSION__: JSON.stringify(hash(main.outputFiles[0].contents)) } });
const assets = new Map([['editor.js', main.outputFiles[0].contents], ['bootstrap.js', boot.outputFiles[0].contents], ['editor.css', await readFile(join(editorRoot, 'src/editor.css'))]]);
const packages = new Map();
const bundledInputs = [main, boot].flatMap(result => Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, detail]) => detail.bytesInOutput > 0).map(([name]) => name)));
for (const input of new Set(bundledInputs)) {
  if (!input.includes('node_modules/')) continue;
  let path = dirname(resolve(editorRoot, input));
  for (;;) {
    try { const pkg = JSON.parse(await readFile(join(path, 'package.json'), 'utf8')); if (pkg.name && pkg.version) { packages.set(pkg.name, { path, pkg }); break; } } catch { /* A dist/package.json may contain only its module type. */ }
    const parent = dirname(path); if (parent === path) throw Error(`Missing dependency metadata: ${input}`); path = parent;
  }
}
let licenses = '';
for (const [name, { path, pkg }] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
  const files = (await readdir(path)).filter(file => /^(?:licen[cs]e|copying)(?:[._-]|$)/i.test(file));
  if (!files.length) throw Error(`Missing license text: ${name}`);
  licenses += `\n=== ${name}@${pkg.version} (${typeof pkg.license === 'string' ? pkg.license : 'see below'}) ===\n`;
  for (const file of files) licenses += await readFile(join(path, file), 'utf8');
}
assets.set('LICENSES.txt', licenses);
const baseline = JSON.parse(await readFile(join(root, 'data/editor/legacy-markdown.json'), 'utf8'));
const preview = { version: 1, entries: {} };
for (const [path, entry] of Object.entries(baseline.entries)) {
  const source = parseSourceFile(await readFile(join(root, path), 'utf8'));
  if (source.frontMatter.draft !== true) preview.entries[entry.id] = entry;
}
assets.set('compatibility-preview.json', JSON.stringify(preview, null, 2) + '\n');
const gzipBytes = gzipSync(main.outputFiles[0].contents).length + gzipSync(boot.outputFiles[0].contents).length;
if (gzipBytes > 300 * 1024) throw Error(`Editor exceeds gzip budget: ${gzipBytes}`);
assets.set('build-manifest.json', JSON.stringify({ version: 1, gzipBytes, files: Object.fromEntries([...assets].map(([name, data]) => [name, hash(data)])), dependencies: Object.fromEntries([...packages].map(([name, item]) => [name, item.pkg.version])) }, null, 2) + '\n');
const output = join(root, 'static/admin/editor'); await mkdir(output, { recursive: true });
for (const [name, data] of assets) {
  if (check) { const actual = await readFile(join(output, name)); if (!actual.equals(Buffer.from(data))) throw Error(`Editor generated asset drift: ${name}`); }
  else await writeFile(join(output, name), data);
}
const indexPath = join(root, 'static/admin/index.html'), index = await readFile(indexPath, 'utf8');
const indexed = index.replace(/editor\/bootstrap\.js\?v=[^"\s]+/g, `editor/bootstrap.js?v=${hash(boot.outputFiles[0].contents).slice(0, 16)}`).replace(/editor\/editor\.css\?v=[^"\s]+/g, `editor/editor.css?v=${hash(assets.get('editor.css')).slice(0, 16)}`);
if (check && indexed !== index) throw Error('Admin entry resource version drift');
if (!check) await writeFile(indexPath, indexed);
process.stdout.write(`Editor assets ${check ? 'verified' : 'generated'}; gzip JS ${gzipBytes} bytes\n`);
