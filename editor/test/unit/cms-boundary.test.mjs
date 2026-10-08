// The real pinned upstream file functions are bundled; only collection stores
// are replaced. No GitHub calls or CMS file operations are simulated here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { registerSourceFormat } from '../../src/source-format.mjs';

const root = process.env.CMS_SOURCE_ROOT && resolve(process.env.CMS_SOURCE_ROOT);
const stores = {
  '$lib/services/api/registries': 'export const customFileFormatRegistry = new Map();',
  '$lib/services/contents/collection': 'export const getCollection = format => ({ format });',
  '$lib/services/contents/collection/entries/index-file': 'export const isCollectionIndexFilePath = () => false;',
  '$lib/services/contents/collection/files': 'export const getCollectionFile = () => undefined;',
  '$lib/services/contents/file/config': 'export const resolveFileConfig = ({collection}) => collection; export const getFrontMatterDelimiters = () => ["---", "---"];',
  '$lib/services/contents/file/constants': 'export const FRONTMATTER_FORMATS = ["yaml-frontmatter", "toml-frontmatter", "json-frontmatter"];',
  '$lib/services/contents/file/detected-formats': 'export const detectedFrontMatterFormats = new Map();',
  '$lib/services/config': 'export const cmsConfig = {current:{}};',
  '$lib/services/utils/cache': 'export const getOrCreate = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };',
  '@sveltia/utils/object': 'export const toRaw = value => value;',
  '@sveltia/utils/string': 'export const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\\\$&");',
};
let api;
if (root) {
  const paths = ['parse.js', 'format.js'].map(f => JSON.stringify(join(root, 'src/lib/services/contents/file', f)));
  const bundle = await build({
    stdin: { contents: `export { parseEntryFile } from ${paths[0]}; export { formatEntryFile } from ${paths[1]}; export { customFileFormatRegistry } from '$lib/services/api/registries';`, resolveDir: root },
    bundle: true, platform: 'node', format: 'cjs', write: false,
    nodePaths: [new URL('../../node_modules', import.meta.url).pathname, new URL('../../../node_modules', import.meta.url).pathname],
    plugins: [{ name: 'collection-stores', setup(b) {
      b.onResolve({ filter: /^\$lib\/|^@sveltia\/utils\// }, args => ({ path: args.path, namespace: 'stores' }));
      b.onLoad({ filter: /.*/, namespace: 'stores' }, args => ({ contents: stores[args.path], loader: 'js' }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  api = module.exports;
  registerSourceFormat({ registerCustomFormat(name, extension, { fromFile, toFile }) { api.customFileFormatRegistry.set(name, { parser: fromFile, formatter: toFile }); } });
}
const parse = (format, text) => api.parseEntryFile({ text, path: 'content/test.md', folder: { collectionName: format } });
const format = (name, content) => api.formatEntryFile({ content, _file: { format: name } });

test('custom_format_receives_raw_crlf_and_saves_no_trailing_newline_exactly', { skip: !root }, async () => {
  const source = '---\r\ntitle: x\r\n---\r\n\r\n\\alpha  ';
  const data = await parse('shuohui-markdown-lossless', source);
  assert.equal(data.body, '\r\n\\alpha  ');
  assert.equal(await format('shuohui-markdown-lossless', data), source);
});
test('other_custom_formats_keep_stock_trim_and_newline_behavior', { skip: !root }, async () => {
  api.customFileFormatRegistry.set('custom-other', { parser: body => ({ body }), formatter: data => data.body });
  const data = await parse('custom-other', ' \r\nbody  \r\n');
  assert.equal(data.body, 'body');
  assert.equal(await format('custom-other', { body: '  body  ' }), 'body\n');
});
test('stock_yaml_and_json_formats_are_unchanged', { skip: !root }, async () => {
  assert.deepEqual(await parse('yaml', ' \r\na: one\r\n '), { a: 'one' });
  assert.deepEqual(await parse('json', ' \r\n{"a":1}\r\n '), { a: 1 });
  assert.equal(await format('json', { a: 1 }), '{\n  "a": 1\n}\n');
});
