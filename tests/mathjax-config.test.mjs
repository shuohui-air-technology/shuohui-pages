import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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
