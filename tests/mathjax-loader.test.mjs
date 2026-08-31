import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const loader = require('../static/admin/mathjax-loader.js');

test('detects complete supported math and ignores incomplete or code-only delimiters', () => {
  assert.equal(loader.containsRenderableMath('结果为 $x^2$。'), true);
  assert.equal(loader.containsRenderableMath('$$\\int_0^1 x dx$$'), true);
  assert.equal(loader.containsRenderableMath('\\(x+y\\)'), true);
  assert.equal(loader.containsRenderableMath('\\[x-y\\]'), true);
  assert.equal(loader.containsRenderableMath('价格是 $100'), false);
  assert.equal(loader.containsRenderableMath('孤立的 $ 符号'), false);
  assert.equal(loader.containsRenderableMath('<pre>$$x$$</pre>正文'), false);
  assert.equal(loader.containsRenderableMath('<code>$x$</code>正文'), false);
  assert.equal(loader.containsRenderableMath('```text\n$$x$$\n```'), false);
  assert.equal(loader.containsRenderableMath('正文 `\\(x\\)` 仍是代码'), false);
});

test('ignores paired currency amounts without hiding legitimate inline math', () => {
  const currencyExamples = [
    '价格从 $100 降到 $80。',
    '价格区间为 $100-$200。'
  ];

  assert.deepEqual(
    currencyExamples.map((source) => loader.containsRenderableMath(source)),
    [false, false]
  );
  assert.equal(loader.containsRenderableMath('方程为 $100 + x$。'), true);
  assert.equal(loader.containsRenderableMath('总价为 $x + 80$。'), true);
});

function createRuntimeFixture(ready = false) {
  const appended = [];
  const removed = [];
  const hostWindow = {
    MathJax: ready ? { typesetPromise() { return Promise.resolve(); } } : {}
  };
  const head = {
    appendChild(node) {
      node.parentNode = head;
      appended.push(node);
      return node;
    },
    removeChild(node) {
      removed.push(node);
      node.parentNode = null;
      return node;
    }
  };
  const document = {
    head,
    createElement(tagName) {
      return { tagName: tagName.toUpperCase(), async: false, src: '' };
    }
  };
  return { appended, removed, hostWindow, document };
}

test('coalesces concurrent runtime requests into one script and one promise', async () => {
  const fixture = createRuntimeFixture();
  const runtime = loader.createRuntimeLoader(fixture);
  const first = runtime.ensure();
  const second = runtime.ensure();

  assert.equal(first, second);
  assert.equal(fixture.appended.length, 1);
  assert.equal(fixture.appended[0].src, loader.MATHJAX_RUNTIME_URL);
  assert.equal(fixture.appended[0].async, true);
  fixture.hostWindow.MathJax = {
    typesetPromise() { return Promise.resolve(); }
  };
  fixture.appended[0].onload();
  assert.equal(await first, fixture.hostWindow.MathJax);
  assert.equal(runtime.getState(), 'ready');
});

test('keeps the in-flight promise when readiness appears before script onload', async () => {
  const fixture = createRuntimeFixture();
  const runtime = loader.createRuntimeLoader(fixture);
  const first = runtime.ensure();
  fixture.hostWindow.MathJax = {
    typesetPromise() { return Promise.resolve(); }
  };

  const concurrent = runtime.ensure();

  assert.equal(concurrent, first);
  assert.equal(runtime.getState(), 'loading');
  fixture.appended[0].onload();
  assert.equal(await first, fixture.hostWindow.MathJax);

  const afterSuccess = runtime.ensure();
  assert.notEqual(afterSuccess, first);
  assert.equal(await afterSuccess, fixture.hostWindow.MathJax);
});

test('rejects an onload without a ready API and allows a later retry', async () => {
  const fixture = createRuntimeFixture();
  const runtime = loader.createRuntimeLoader(fixture);
  const first = runtime.ensure();
  fixture.appended[0].onload();
  await assert.rejects(first, /typesetPromise/);
  assert.equal(runtime.getState(), 'failed');
  assert.deepEqual(fixture.removed, [fixture.appended[0]]);

  const second = runtime.ensure();
  assert.notEqual(second, first);
  assert.equal(fixture.appended.length, 2);
  fixture.hostWindow.MathJax = {
    typesetPromise() { return Promise.resolve(); }
  };
  fixture.appended[1].onload();
  assert.equal(await second, fixture.hostWindow.MathJax);
});

test('removes a failed script and retries after a network error', async () => {
  const fixture = createRuntimeFixture();
  const runtime = loader.createRuntimeLoader(fixture);
  const first = runtime.ensure();
  fixture.appended[0].onerror(new Error('offline'));
  await assert.rejects(first, /MathJax runtime/);
  assert.equal(runtime.getState(), 'failed');
  assert.deepEqual(fixture.removed, [fixture.appended[0]]);
  runtime.ensure();
  assert.equal(fixture.appended.length, 2);
});

test('retries after synchronous script insertion failure', async () => {
  const fixture = createRuntimeFixture();
  const appendChild = fixture.document.head.appendChild;
  let insertionFails = true;
  fixture.document.head.appendChild = (node) => {
    if (insertionFails) {
      insertionFails = false;
      throw new Error('script insertion blocked');
    }
    return appendChild(node);
  };
  const runtime = loader.createRuntimeLoader(fixture);

  const first = runtime.ensure();
  await assert.rejects(first, /script insertion blocked/);
  assert.equal(runtime.getState(), 'failed');

  const second = runtime.ensure();
  assert.notEqual(second, first);
  assert.equal(fixture.appended.length, 1);
  fixture.hostWindow.MathJax = {
    typesetPromise() { return Promise.resolve(); }
  };
  fixture.appended[0].onload();
  assert.equal(await second, fixture.hostWindow.MathJax);
});

test('returns an already-ready MathJax without appending a script', async () => {
  const fixture = createRuntimeFixture(true);
  const runtime = loader.createRuntimeLoader(fixture);
  assert.equal(await runtime.ensure(), fixture.hostWindow.MathJax);
  assert.equal(fixture.appended.length, 0);
  assert.equal(runtime.getState(), 'ready');
});
