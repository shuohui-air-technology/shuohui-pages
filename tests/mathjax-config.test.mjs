import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const preview = require('../static/admin/mathjax-preview.js');
const mathJaxLoader = require('../static/admin/mathjax-loader.js');

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

test('shared MathJax config defines the four supported delimiters', () => {
  const source = fs.readFileSync('static/js/mathjax-config.js', 'utf8');
  const window = {};
  vm.runInNewContext(source, { window });
  const config = JSON.parse(JSON.stringify(window.MathJax));
  assert.deepEqual(config.tex.inlineMath, [['$', '$'], ['\\(', '\\)']]);
  assert.deepEqual(config.tex.displayMath, [['$$', '$$'], ['\\[', '\\]']]);
  assert.equal(config.tex.processEscapes, true);
  assert.equal(config.tex.processEnvironments, true);
  assert.deepEqual(config.loader.load, ['ui/lazy']);
  assert.equal(config.options.lazyMargin, '200px');
});

test('all project MathJax loaders use the same pinned runtime', () => {
  const expected = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js';
  const runtimePattern = /https:\/\/cdn\.jsdelivr\.net\/npm\/mathjax@[^'"<\s]+\/es5\/tex-mml-chtml\.js/g;
  const occurrences = [];

  for (const file of [...listFiles('layouts'), ...listFiles('static')]) {
    const source = fs.readFileSync(file, 'utf8');
    for (const url of source.match(runtimePattern) || []) {
      occurrences.push({ file, url });
    }
  }

  assert.equal(mathJaxLoader.MATHJAX_RUNTIME_URL, expected);
  assert.deepEqual(occurrences, [
    { file: 'layouts/partials/extend_head.html', url: expected },
    { file: 'static/admin/mathjax-loader.js', url: expected }
  ]);
});

test('CMS loads local MathJax assets in lazy order without an eager runtime', () => {
  const source = fs.readFileSync('static/admin/index.html', 'utf8');
  const scripts = Array.from(
    source.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g),
    (match) => match[1]
  );

  assert.deepEqual(scripts, [
    '/js/mathjax-config.js?v=lazy-1',
    'https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js',
    '/admin/markdown-format.js?v=2e8ea2f',
    '/admin/mathjax-loader.js?v=lazy-1',
    '/admin/mathjax-preview.js?v=lazy-1'
  ]);
  assert.equal(source.includes(mathJaxLoader.MATHJAX_RUNTIME_URL), false);
});

test('Hugo uses the current locale configuration key', () => {
  const source = fs.readFileSync('hugo.toml', 'utf8');
  assert.match(source, /^locale\s*=\s*["']zh-CN["']/m);
  assert.doesNotMatch(source, /^languageCode\s*=/m);
});

test('iframe MathJax injector appends the CDN only after the config script loads', () => {
  const appended = [];
  const head = {
    ownerDocument: {
      createElement(tag) {
        return { tagName: tag.toUpperCase() };
      }
    },
    appendChild(node) {
      appended.push(node);
      return node;
    }
  };

  preview.appendIframeMathJaxScripts(head);

  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, '/js/mathjax-config.js');
  assert.equal(
    appended.some((node) => node.src === mathJaxLoader.MATHJAX_RUNTIME_URL),
    false
  );

  appended[0].onload();

  assert.equal(appended.length, 2);
  assert.equal(appended[1].src, mathJaxLoader.MATHJAX_RUNTIME_URL);
  assert.equal(appended[1].async, true);
});

test('iframe MathJax injector still appends the CDN if the config script fails', () => {
  const appended = [];
  const head = {
    ownerDocument: {
      createElement(tag) {
        return { tagName: tag.toUpperCase() };
      }
    },
    appendChild(node) {
      appended.push(node);
      return node;
    }
  };

  preview.appendIframeMathJaxScripts(head);

  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, '/js/mathjax-config.js');

  appended[0].onerror();

  assert.equal(appended.length, 2);
  assert.equal(appended[1].src, mathJaxLoader.MATHJAX_RUNTIME_URL);
  assert.equal(appended[1].async, true);
});
