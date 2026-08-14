import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const preview = require('../static/admin/mathjax-preview.js');

test('shared MathJax config defines the four supported delimiters', () => {
  const source = fs.readFileSync('static/js/mathjax-config.js', 'utf8');
  const window = {};
  vm.runInNewContext(source, { window });
  const config = JSON.parse(JSON.stringify(window.MathJax));
  assert.deepEqual(config.tex.inlineMath, [['$', '$'], ['\\(', '\\)']]);
  assert.deepEqual(config.tex.displayMath, [['$$', '$$'], ['\\[', '\\]']]);
  assert.equal(config.tex.processEscapes, true);
  assert.equal(config.tex.processEnvironments, true);
});

test('all project MathJax loaders use the same pinned runtime', () => {
  const expected = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js';
  const files = [
    'layouts/partials/extend_head.html',
    'static/admin/index.html',
    'static/admin/mathjax-preview.js'
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(source, /mathjax@3\/es5/);
  }
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
    appended.some((node) => node.src === 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js'),
    false
  );

  appended[0].onload();

  assert.equal(appended.length, 2);
  assert.equal(appended[1].src, 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js');
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
  assert.equal(appended[1].src, 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js');
  assert.equal(appended[1].async, true);
});
