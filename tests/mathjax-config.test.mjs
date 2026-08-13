import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `expected function ${name} to exist`);

  const openBrace = source.indexOf('{', start);
  assert.notEqual(openBrace, -1, `expected function ${name} to have a body`);

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  assert.fail(`could not extract function ${name}`);
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
});

test('iframe MathJax injector appends the CDN only after the config script loads', () => {
  const adminHtml = fs.readFileSync('static/admin/index.html', 'utf8');
  const scriptSource = [
    extractFunctionSource(adminHtml, 'appendIframeMathJaxCdn'),
    extractFunctionSource(adminHtml, 'appendIframeMathJaxScripts')
  ].join('\n');

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

  const context = {};
  vm.runInNewContext(scriptSource, context);
  context.appendIframeMathJaxScripts(head);

  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, '/js/mathjax-config.js');
  assert.equal(
    appended.some((node) => node.src === 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'),
    false
  );

  appended[0].onload();

  assert.equal(appended.length, 2);
  assert.equal(appended[1].src, 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js');
  assert.equal(appended[1].async, true);
});

test('iframe MathJax injector still appends the CDN if the config script fails', () => {
  const adminHtml = fs.readFileSync('static/admin/index.html', 'utf8');
  const scriptSource = [
    extractFunctionSource(adminHtml, 'appendIframeMathJaxCdn'),
    extractFunctionSource(adminHtml, 'appendIframeMathJaxScripts')
  ].join('\n');

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

  const context = {};
  vm.runInNewContext(scriptSource, context);
  context.appendIframeMathJaxScripts(head);

  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, '/js/mathjax-config.js');

  appended[0].onerror();

  assert.equal(appended.length, 2);
  assert.equal(appended[1].src, 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js');
  assert.equal(appended[1].async, true);
});
