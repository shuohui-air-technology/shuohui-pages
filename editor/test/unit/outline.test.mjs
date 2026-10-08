import { test } from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../../src/outline.mjs').catch(() => ({}));
test('outline_maps_headings_but_not_fenced_examples', () => {
  assert.equal(typeof api.buildOutline, 'function');
  assert.deepEqual(api.buildOutline('# 😀标题\n\n```\n# example\n```\n\n## 第二节'), [
    { label: '😀标题', from: 0, level: 1 }, { label: '第二节', from: 27, level: 2 },
  ]);
});
