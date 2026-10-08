import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('heavy_code_languages_are_not_eagerly_bundled', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../../static/admin/editor/build-manifest.json', import.meta.url)));
  for (const name of ['@codemirror/lang-javascript', '@codemirror/lang-css', '@codemirror/lang-html']) assert.equal(Object.hasOwn(manifest.dependencies, name), false, name + ' is eagerly bundled');
});
