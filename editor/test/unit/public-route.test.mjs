import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { previewPublicRoute, validArticleSlug } from '../../src/public-route.mjs';
const args = { entryPath: 'content/acgn/original.md', sectionPath: '/acgn/', baseURL: 'https://shuohui.uk/' };
test('underscore_slug_previews_public_url', () => assert.equal(previewPublicRoute({ ...args, slug: 'what_is_agent' }).url, 'https://shuohui.uk/acgn/what_is_agent/'));
test('blank_uses_filename_without_renaming', () => assert.equal(previewPublicRoute({ ...args, slug: '' }).url, 'https://shuohui.uk/acgn/original/'));
test('url_override_disables_ineffective_slug_edit', () => {
  const result = previewPublicRoute({ ...args, slug: 'ignored', urlOverride: '/custom/path/' });
  assert.equal(result.editable, false); assert.equal(result.url, 'https://shuohui.uk/custom/path/');
});
test('shared_python_javascript_slug_fixtures', () => {
  for (const item of JSON.parse(readFileSync(new URL('../../../tests/fixtures/article-slugs.json', import.meta.url)))) assert.equal(validArticleSlug(item.value), item.valid);
});
test('unsafe_url_and_slug_are_not_previewed_as_publishable', () => {
  assert.equal(previewPublicRoute({ ...args, slug: '../oops' }).url, null);
  assert.equal(previewPublicRoute({ ...args, urlOverride: 'javascript:alert(1)' }).url, null);
});
