import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const preview = require('../static/admin/mathjax-preview.js');

function createScheduleSpy() {
  const calls = [];
  return {
    calls,
    schedule(fn, delay) {
      const handle = { fn, delay, cleared: false };
      calls.push(handle);
      return handle;
    },
    clear(handle) {
      if (handle) handle.cleared = true;
    }
  };
}

test('getPreviewMode distinguishes missing, inline, and iframe previews', () => {
  assert.equal(preview.getPreviewMode(null), 'none');
  assert.equal(preview.getPreviewMode({ tagName: 'DIV' }), 'inline');
  assert.equal(preview.getPreviewMode({ tagName: 'IFRAME' }), 'iframe');
});

test('getPollDelay uses the active interval only after a change', () => {
  assert.equal(preview.getPollDelay(true), 500);
  assert.equal(preview.getPollDelay(false), 2000);
});

test('shouldTypeset detects node, mode, and content changes', () => {
  const node = {};
  const same = { node, mode: 'inline', snapshot: 'a' };
  assert.equal(preview.shouldTypeset(same, same), false);
  assert.equal(preview.shouldTypeset(same, { ...same, snapshot: 'b' }), true);
  assert.equal(preview.shouldTypeset(same, { ...same, mode: 'iframe' }), true);
  assert.equal(preview.shouldTypeset(same, { ...same, node: {} }), true);
});

test('controller typesets inline preview content changes and idles on no-op polls', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>alpha</p>' };
  const document = {
    querySelector(selector) {
      assert.equal(selector, '[role="document"]');
      return previewNode;
    }
  };
  const scheduleSpy = createScheduleSpy();
  const typesetCalls = [];
  const controller = preview.createPreviewController({
    document,
    mathJax: {
      typesetPromise(nodes) {
        typesetCalls.push(nodes);
        return Promise.resolve();
      }
    },
    schedule: {
      set: scheduleSpy.schedule,
      clear: scheduleSpy.clear
    },
    logger: { warn() {} }
  });

  await controller.poll();

  assert.deepEqual(typesetCalls, [[previewNode]]);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);

  await controller.poll();

  assert.equal(typesetCalls.length, 1);
  assert.equal(scheduleSpy.calls.at(-1).delay, 2000);
});

test('browser controller recovers when MathJax loads after startup', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>alpha</p>' };
  const timers = [];
  const hostWindow = {
    MathJax: undefined,
    document: {
      querySelector(selector) {
        assert.equal(selector, '[role="document"]');
        return previewNode;
      }
    },
    console: { warn() {} },
    setTimeout(fn, delay) {
      const handle = { fn, delay, cleared: false };
      timers.push(handle);
      return handle;
    },
    clearTimeout(handle) {
      if (handle) handle.cleared = true;
    }
  };

  const controller = preview.startBrowserController(hostWindow);

  await Promise.resolve();

  assert.equal(timers.at(-1).delay, 500);

  const typesetCalls = [];
  hostWindow.MathJax = {
    typesetPromise(nodes) {
      typesetCalls.push(nodes);
      return Promise.resolve();
    }
  };
  previewNode.innerHTML = '<p>beta</p>';

  await controller.poll();

  assert.deepEqual(typesetCalls, [[previewNode]]);
});

test('controller injects and typesets iframe previews, then reinjects for a replacement iframe', async () => {
  const iframeHeadOne = {
    ownerDocument: {
      createElement(tag) {
        return { tagName: tag.toUpperCase() };
      }
    },
    appendChild(node) {
      if (typeof node.onload === 'function') node.onload();
      return node;
    }
  };
  const iframeWindowOne = {
    MathJax: {
      typesetPromise() {
        iframeWindowOne.calls += 1;
        return Promise.resolve();
      }
    },
    calls: 0
  };
  const iframeOne = {
    tagName: 'IFRAME',
    contentDocument: { head: iframeHeadOne, body: { innerHTML: '<p>one</p>' } },
    contentWindow: iframeWindowOne
  };

  const iframeHeadTwo = {
    ownerDocument: iframeHeadOne.ownerDocument,
    appendChild(node) {
      if (typeof node.onload === 'function') node.onload();
      return node;
    }
  };
  const iframeWindowTwo = {
    MathJax: {
      typesetPromise() {
        iframeWindowTwo.calls += 1;
        return Promise.resolve();
      }
    },
    calls: 0
  };
  const iframeTwo = {
    tagName: 'IFRAME',
    contentDocument: { head: iframeHeadTwo, body: { innerHTML: '<p>two</p>' } },
    contentWindow: iframeWindowTwo
  };

  let current = iframeOne;
  const scheduleSpy = createScheduleSpy();
  const controller = preview.createPreviewController({
    document: { querySelector() { return current; } },
    mathJax: {},
    schedule: {
      set: scheduleSpy.schedule,
      clear: scheduleSpy.clear
    },
    logger: { warn() {} }
  });

  await controller.poll();

  assert.equal(iframeWindowOne.calls, 1);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);

  current = iframeTwo;
  await controller.poll();

  assert.equal(iframeWindowTwo.calls, 1);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);
});

test('controller warns and keeps polling when iframe access or typesetting fails', async () => {
  const warnings = [];
  const scheduleSpy = createScheduleSpy();
  const iframe = {
    tagName: 'IFRAME',
    get contentDocument() {
      throw new Error('denied');
    }
  };
  const controller = preview.createPreviewController({
    document: { querySelector() { return iframe; } },
    mathJax: {},
    schedule: {
      set: scheduleSpy.schedule,
      clear: scheduleSpy.clear
    },
    logger: {
      warn(...args) {
        warnings.push(args);
      }
    }
  });

  await controller.poll();

  assert.equal(warnings.length > 0, true);
  assert.equal(warnings[0][0], '[Shuohui CMS MathJax]');
  assert.equal(scheduleSpy.calls.at(-1).delay, 2000);
});

test('stop clears the scheduled poll and prevents further typesetting work', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>alpha</p>' };
  const scheduleSpy = createScheduleSpy();
  const typesetCalls = [];
  const controller = preview.createPreviewController({
    document: { querySelector() { return previewNode; } },
    mathJax: {
      typesetPromise(nodes) {
        typesetCalls.push(nodes);
        return Promise.resolve();
      }
    },
    schedule: {
      set: scheduleSpy.schedule,
      clear: scheduleSpy.clear
    },
    logger: { warn() {} }
  });

  await controller.poll();
  controller.stop();
  previewNode.innerHTML = '<p>beta</p>';
  await controller.poll();

  assert.equal(scheduleSpy.calls[0].cleared, true);
  assert.deepEqual(typesetCalls, [[previewNode]]);
});
