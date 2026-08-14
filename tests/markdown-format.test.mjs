import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const formatter = require('../static/admin/markdown-format.js');

test('normalizeMarkdownBody formats common article boundaries', () => {
  const source = [
    '1.Agent',
    '这是一个用于说明段落分隔问题的较长文本，后面本应是一个新的段落。',
    '优点：',
    '这是优点内容。'
  ].join('\n');

  const normalized = formatter.normalizeMarkdownBody(source);

  assert.match(normalized, /## 1\. Agent\n\n/);
  assert.match(normalized, /\n\n这是一个用于说明段落分隔问题的较长文本/);
  assert.match(normalized, /### 优点\n\n/);
  assert.equal(normalized, formatter.normalizeMarkdownBody(normalized));
});

test('normalizeMarkdownBody skips math entries and fenced code', () => {
  const source = [
    '1.Agent',
    '```text',
    '2.raw-value',
    '```',
    '$$x^2 + y^2 = z^2$$'
  ].join('\n');

  assert.equal(source, formatter.normalizeMarkdownBody(source, { math: true }));
  const normalized = formatter.normalizeMarkdownBody(source);
  assert.match(normalized, /```text\n2\.raw-value\n```/);
});

test('normalizeMarkdownBody keeps sentence-introducing labels as prose', () => {
  const source = [
    '这是一个用于记录我个人感悟与思考的空间。内容主要包括：',
    '',
    '- 日常随笔'
  ].join('\n');

  assert.equal(source, formatter.normalizeMarkdownBody(source));
});

test('registerPreSaveFormatter updates only the Markdown body', () => {
  const listeners = [];
  const CMS = {
    registerEventListener(listener) {
      listeners.push(listener);
    }
  };

  formatter.registerPreSaveFormatter(CMS);

  const body = '1.Agent\n\n正文';
  const entry = {
    getIn(path) {
      if (path.join('.') === 'data.body') return body;
      if (path.join('.') === 'data.math') return false;
      return undefined;
    },
    setIn(path, value) {
      assert.deepEqual(path, ['data', 'body']);
      return { value };
    }
  };

  const result = listeners[0].handler({ entry });

  assert.match(result.value, /## 1\. Agent/);
});
