import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const api = await import('../../src/source-format.mjs').catch(() => ({}));
const get = () => { assert.equal(typeof api.parseSourceFile, 'function', 'source parser not implemented'); return api; };

test('no_edit_roundtrip_is_exact', () => {
  const { parseSourceFile, serializeSourceFile } = get();
  for (const eol of ['\n', '\r\n']) {
    for (const tail of ['', '  ', eol, eol + eol]) {
      const source = ['---', 'title: 原文', 'date: 2026-09-23T08:54:00', 'draft: false', '---', '', '$$\\int_0^1 x^2\\,dx$$', '---'].join(eol) + tail;
      const envelope = parseSourceFile(source);
      assert.equal(serializeSourceFile(envelope, { ...envelope.frontMatter, body: envelope.body }), source);
    }
  }
});

test('metadata_edit_preserves_body_and_unknown_fields', () => {
  const { parseSourceFile, serializeSourceFile } = get();
  const source = '---\r\ntitle: before\r\ncustom:\r\n  nested: [one, two]\r\n---\r\n\r\n正文  \r\n\r\n';
  const original = parseSourceFile(source);
  const saved = parseSourceFile(serializeSourceFile(original, { title: 'after', body: original.body }));
  assert.equal(saved.frontMatter.title, 'after');
  assert.deepEqual(saved.frontMatter.custom, { nested: ['one', 'two'] });
  assert.equal(saved.body, '\r\n正文  \r\n\r\n');
});

test('registered_format_preserves_raw_crlf_and_does_not_persist_snapshot', () => {
  const { registerSourceFormat } = get();
  let format;
  registerSourceFormat({ registerCustomFormat(name, extension, methods) {
    assert.equal(name, 'shuohui-markdown-lossless'); assert.equal(extension, 'md'); format = methods;
  } });
  const source = '---\r\ntitle: x\r\n---\r\n\r\n\\alpha  \r\n';
  const data = format.fromFile(source);
  assert.equal(data.body, '\r\n\\alpha  \r\n');
  assert.equal(format.toFile(data), source);
  data.title = 'y';
  const saved = format.toFile(data);
  assert.equal(saved.includes('_shuohui_source_snapshot'), false);
  assert.equal(get().parseSourceFile(saved).body, data.body);
});

test('reserved_snapshot_key_is_rejected_without_silently_losing_author_data', () => {
  assert.throws(() => get().parseSourceFile('---\n_shuohui_source_snapshot: author-data\n---\ntext'), /reserved|保留/);
});

test('existing_article_bodies_roundtrip_without_changes', () => {
  const { parseSourceFile, serializeSourceFile } = get();
  const root = new URL('../../../content/', import.meta.url).pathname;
  const visit = path => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const p = join(path, entry.name);
      if (entry.isDirectory()) visit(p);
      else if (p.endsWith('.md')) {
        const source = readFileSync(p, 'utf8'); const env = parseSourceFile(source);
        assert.equal(serializeSourceFile(env, { ...env.frontMatter, body: env.body }), source, p);
      }
    }
  };
  visit(root);
});
