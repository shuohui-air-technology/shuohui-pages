import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const preview = require('../static/admin/mathjax-preview.js');
const mathJaxLoader = require('../static/admin/mathjax-loader.js');

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

function createIdleScheduleSpy() {
  const schedule = createScheduleSpy();
  const idleCallbacks = [];
  return {
    schedule,
    idleCallbacks,
    config: {
      set: schedule.schedule,
      clear: schedule.clear,
      idle(fn, options) {
        idleCallbacks.push({ fn, options });
        return fn;
      },
      cancelIdle() {}
    }
  };
}

async function runScheduledRender(schedule, idleCallbacks) {
  await schedule.calls.at(-1).fn();
  if (idleCallbacks) {
    return idleCallbacks.at(-1).fn();
  }
  return schedule.calls.at(-1).fn();
}

async function runScheduledPoll(controller, schedule, idleCallbacks) {
  const pollPromise = controller.poll();
  await runScheduledRender(schedule, idleCallbacks);
  return pollPromise;
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

test('plain preview changes settle without loading or typesetting MathJax', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>plain text</p>' };
  const idleSchedule = createIdleScheduleSpy();
  let loaderCalls = 0;
  let typesetCalls = 0;
  const controller = preview.createPreviewController({
    document: { querySelector() { return previewNode; } },
    containsRenderableMath() { return false; },
    ensureMathJax() { loaderCalls += 1; return Promise.resolve(null); },
    mathJax: {
      typesetPromise() { typesetCalls += 1; return Promise.resolve(); }
    },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );
  await controller.poll();
  assert.equal(loaderCalls, 0);
  assert.equal(typesetCalls, 0);
  assert.equal(idleSchedule.schedule.calls.at(-1).delay, 2000);
});

test('math preview loads once and typesets only the latest debounced snapshot', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>$a$</p>' };
  const idleSchedule = createIdleScheduleSpy();
  const renderedSnapshots = [];
  let loaderCalls = 0;
  let readyMathJax = null;
  const loadedMathJax = {
    typesetPromise(nodes) {
      renderedSnapshots.push(nodes[0].innerHTML);
      return Promise.resolve();
    }
  };
  const controller = preview.createPreviewController({
    document: { querySelector() { return previewNode; } },
    containsRenderableMath(source) { return source.includes('$'); },
    ensureMathJax() {
      loaderCalls += 1;
      readyMathJax = loadedMathJax;
      return Promise.resolve(loadedMathJax);
    },
    getMathJax() { return readyMathJax; },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  const firstPoll = controller.poll();
  previewNode.innerHTML = '<p>$b$</p>';
  assert.equal(controller.poll(), firstPoll);
  previewNode.innerHTML = '<p>$c$</p>';
  assert.equal(controller.poll(), firstPoll);
  await idleSchedule.schedule.calls.at(-1).fn();
  await idleSchedule.idleCallbacks.at(-1).fn();
  await firstPoll;

  assert.equal(loaderCalls, 1);
  assert.deepEqual(renderedSnapshots, ['<p>$c$</p>']);
});

test('plain iframe preview does not inject MathJax scripts', async () => {
  const appended = [];
  const iframe = {
    tagName: 'IFRAME',
    contentDocument: {
      head: {
        ownerDocument: {
          createElement(tag) { return { tagName: tag.toUpperCase() }; }
        },
        appendChild(node) { appended.push(node); return node; }
      },
      body: { innerHTML: '<p>plain text</p>' }
    },
    contentWindow: {}
  };
  const idleSchedule = createIdleScheduleSpy();
  const controller = preview.createPreviewController({
    document: { querySelector() { return iframe; } },
    containsRenderableMath() { return false; },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );
  assert.deepEqual(appended, []);
});

test('controller typesets inline preview content changes and idles on no-op polls', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>alpha</p>' };
  const document = {
    querySelector(selector) {
      assert.equal(selector, '[role="document"]');
      return previewNode;
    }
  };
  const idleSchedule = createIdleScheduleSpy();
  const scheduleSpy = idleSchedule.schedule;
  const typesetCalls = [];
  const controller = preview.createPreviewController({
    document,
    mathJax: {
      typesetPromise(nodes) {
        typesetCalls.push(nodes);
        return Promise.resolve();
      }
    },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);

  assert.deepEqual(typesetCalls, [[previewNode]]);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);

  await controller.poll();

  assert.equal(typesetCalls.length, 1);
  assert.equal(scheduleSpy.calls.at(-1).delay, 2000);
});

test('poll waits for the delayed render completion', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>formula</p>' };
  const idleSchedule = createIdleScheduleSpy();
  const scheduleSpy = idleSchedule.schedule;
  const typesetCalls = [];
  const controller = preview.createPreviewController({
    document: { querySelector() { return previewNode; } },
    mathJax: {
      typesetPromise(nodes) {
        typesetCalls.push(nodes);
        return Promise.resolve();
      }
    },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  let settled = false;
  const pollPromise = controller.poll().then((result) => {
    settled = true;
    return result;
  });

  await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(typesetCalls.length, 0);

  await scheduleSpy.calls.at(-1).fn();
  assert.equal(settled, false);
  assert.equal(typesetCalls.length, 0);

  await idleSchedule.idleCallbacks.at(-1).fn();
  assert.equal(await pollPromise, undefined);
  assert.deepEqual(typesetCalls, [[previewNode]]);
});

test('controller returns missing-preview polling to idle after a rendered preview is removed', async () => {
  let previewNode = { tagName: 'DIV', innerHTML: '<p>alpha</p>' };
  const idleSchedule = createIdleScheduleSpy();
  const scheduleSpy = idleSchedule.schedule;
  const typesetCalls = [];
  const controller = preview.createPreviewController({
    document: { querySelector() { return previewNode; } },
    mathJax: {
      typesetPromise(nodes) {
        typesetCalls.push(nodes);
        return Promise.resolve();
      }
    },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);

  assert.deepEqual(typesetCalls, [[previewNode]]);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);

  previewNode = null;
  await controller.poll();

  assert.equal(scheduleSpy.calls.at(-1).delay, 500);

  await controller.poll();

  assert.equal(scheduleSpy.calls.at(-1).delay, 2000);

  previewNode = { tagName: 'DIV', innerHTML: '<p>beta</p>' };
  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);

  assert.deepEqual(typesetCalls, [[{ tagName: 'DIV', innerHTML: '<p>alpha</p>' }], [previewNode]]);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);
});

test('browser controller detects math and loads the shared host runtime', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>$alpha$</p>' };
  const timers = [];
  const appended = [];
  const head = {
    appendChild(node) {
      node.parentNode = head;
      appended.push(node);
      return node;
    },
    removeChild(node) {
      node.parentNode = null;
      return node;
    }
  };
  const hostWindow = {
    MathJax: {},
    document: {
      head,
      createElement(tagName) {
        return { tagName: tagName.toUpperCase(), async: false, src: '' };
      },
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
  assert.equal(timers.length, 2);
  assert.equal(timers[1].delay, 500);
  await timers[1].fn();
  assert.equal(timers.at(-1).delay, 0);
  const renderPromise = timers.at(-1).fn();

  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, mathJaxLoader.MATHJAX_RUNTIME_URL);

  const typesetCalls = [];
  hostWindow.MathJax = {
    typesetPromise(nodes) {
      typesetCalls.push(nodes);
      return Promise.resolve();
    }
  };
  appended[0].onload();
  await renderPromise;

  assert.deepEqual(typesetCalls, [[previewNode]]);
  controller.stop();
});

test('controller retries existing inline content when MathJax becomes available without content changes', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>alpha</p>' };
  const document = {
    querySelector(selector) {
      assert.equal(selector, '[role="document"]');
      return previewNode;
    }
  };
  const idleSchedule = createIdleScheduleSpy();
  const scheduleSpy = idleSchedule.schedule;
  const typesetCalls = [];
  let mathJax;
  const controller = preview.createPreviewController({
    document,
    getMathJax() {
      return mathJax;
    },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);

  assert.equal(typesetCalls.length, 0);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);

  mathJax = {
    typesetPromise(nodes) {
      typesetCalls.push(nodes);
      return Promise.resolve();
    }
  };

  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);

  assert.deepEqual(typesetCalls, [[previewNode]]);
});

test('controller warns and retries unchanged inline math after runtime loading fails', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>$x$</p>' };
  const idleSchedule = createIdleScheduleSpy();
  const warnings = [];
  let loaderAttempts = 0;
  let readyMathJax = null;
  let typesetCalls = 0;
  const loadedMathJax = {
    typesetPromise() {
      typesetCalls += 1;
      return Promise.resolve();
    }
  };
  const controller = preview.createPreviewController({
    document: { querySelector() { return previewNode; } },
    containsRenderableMath() { return true; },
    ensureMathJax() {
      loaderAttempts += 1;
      if (loaderAttempts === 1) {
        return Promise.reject(new Error('offline'));
      }
      readyMathJax = loadedMathJax;
      return Promise.resolve(loadedMathJax);
    },
    getMathJax() { return readyMathJax; },
    schedule: idleSchedule.config,
    logger: {
      warn(...args) {
        warnings.push(args);
      }
    }
  });

  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );
  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );

  assert.equal(loaderAttempts, 2);
  assert.equal(typesetCalls, 1);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], '[Shuohui CMS MathJax]');
});

test('controller retries unchanged inline content after a transient typeset rejection', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>alpha</p>' };
  const document = { querySelector() { return previewNode; } };
  const warnings = [];
  let attempt = 0;
  const idleSchedule = createIdleScheduleSpy();
  const scheduleSpy = idleSchedule.schedule;
  const controller = preview.createPreviewController({
    document,
    mathJax: {
      typesetPromise(nodes) {
        attempt += 1;
        if (attempt === 1) {
          return Promise.reject(new Error('temporary typeset failure'));
        }
        assert.deepEqual(nodes, [previewNode]);
        return Promise.resolve();
      }
    },
    schedule: idleSchedule.config,
    logger: {
      warn(...args) {
        warnings.push(args);
      }
    }
  });

  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);
  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);

  assert.equal(attempt, 2);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], '[Shuohui CMS MathJax]');
});

test('controller coalesces rapid edits into one follow-up render while a render is pending', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>alpha</p>' };
  const document = { querySelector() { return previewNode; } };
  const idleSchedule = createIdleScheduleSpy();
  const scheduleSpy = idleSchedule.schedule;
  let releaseFirstRender;
  let activeRenders = 0;
  let maxConcurrentRenders = 0;
  const renderedSnapshots = [];
  const controller = preview.createPreviewController({
    document,
    mathJax: {
      typesetPromise(nodes) {
        activeRenders += 1;
        maxConcurrentRenders = Math.max(maxConcurrentRenders, activeRenders);
        renderedSnapshots.push(nodes[0].innerHTML);
        if (renderedSnapshots.length === 1) {
          return new Promise((resolve) => {
            releaseFirstRender = () => {
              activeRenders -= 1;
              resolve();
            };
          });
        }
        activeRenders -= 1;
        return Promise.resolve();
      }
    },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  const firstPoll = controller.poll();
  let firstPollSettled = false;
  firstPoll.then(() => {
    firstPollSettled = true;
  });
  await scheduleSpy.calls.at(-1).fn();
  const firstRender = idleSchedule.idleCallbacks.at(-1).fn();
  await Promise.resolve();

  assert.deepEqual(renderedSnapshots, ['<p>alpha</p>']);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);

  previewNode.innerHTML = '<p>beta</p>';
  const betaPoll = controller.poll();
  previewNode.innerHTML = '<p>gamma</p>';
  const gammaPoll = controller.poll();
  assert.equal(betaPoll, firstPoll);
  assert.equal(gammaPoll, firstPoll);
  await scheduleSpy.calls.at(-1).fn();
  await idleSchedule.idleCallbacks.at(-1).fn();

  assert.deepEqual(renderedSnapshots, ['<p>alpha</p>']);
  assert.equal(maxConcurrentRenders, 1);

  releaseFirstRender();
  await firstRender;
  assert.equal(firstPollSettled, false);
  await idleSchedule.idleCallbacks.at(-1).fn();

  assert.deepEqual(renderedSnapshots, ['<p>alpha</p>', '<p>gamma</p>']);
  assert.equal(maxConcurrentRenders, 1);
  await firstPoll;
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
  const idleSchedule = createIdleScheduleSpy();
  const scheduleSpy = idleSchedule.schedule;
  const controller = preview.createPreviewController({
    document: { querySelector() { return current; } },
    mathJax: {},
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);

  assert.equal(iframeWindowOne.calls, 1);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);

  current = iframeTwo;
  await runScheduledPoll(controller, scheduleSpy, idleSchedule.idleCallbacks);

  assert.equal(iframeWindowTwo.calls, 1);
  assert.equal(scheduleSpy.calls.at(-1).delay, 500);
});

test('controller retries iframe runtime injection after a network failure', async () => {
  const appended = [];
  const warnings = [];
  const iframeWindow = {};
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
  const iframe = {
    tagName: 'IFRAME',
    contentDocument: { head, body: { innerHTML: '<p>$x$</p>' } },
    contentWindow: iframeWindow
  };
  const idleSchedule = createIdleScheduleSpy();
  const controller = preview.createPreviewController({
    document: { querySelector() { return iframe; } },
    containsRenderableMath() { return true; },
    schedule: idleSchedule.config,
    logger: {
      warn(...args) {
        warnings.push(args);
      }
    }
  });

  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );
  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, '/js/mathjax-config.js');
  appended[0].onload();
  assert.equal(appended[1].src, mathJaxLoader.MATHJAX_RUNTIME_URL);
  assert.equal(typeof appended[1].onerror, 'function');
  appended[1].onerror(new Error('offline'));

  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );
  assert.equal(appended[2].src, '/js/mathjax-config.js');
  appended[2].onload();
  assert.equal(appended[3].src, mathJaxLoader.MATHJAX_RUNTIME_URL);
  iframeWindow.MathJax = {
    typesetPromise() {
      iframeWindow.typesetCalls += 1;
      return Promise.resolve();
    }
  };
  iframeWindow.typesetCalls = 0;
  appended[3].onload();

  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );
  assert.equal(iframeWindow.typesetCalls, 1);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], '[Shuohui CMS MathJax]');
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

  const pollPromise = controller.poll();
  controller.stop();
  previewNode.innerHTML = '<p>beta</p>';
  await controller.poll();
  await pollPromise;

  assert.equal(scheduleSpy.calls[0].cleared, true);
  assert.equal(scheduleSpy.calls[1].cleared, true);
  assert.deepEqual(typesetCalls, []);
});

test('debounces rapid edits into one final typeset', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: 'first' };
  const debounce = createScheduleSpy();
  const idleCallbacks = [];
  const typesetCalls = [];
  const controller = preview.createPreviewController({
    document: { querySelector: () => previewNode },
    mathJax: {
      typesetPromise(nodes) {
        typesetCalls.push(nodes);
        return Promise.resolve();
      }
    },
    schedule: {
      set: debounce.schedule,
      clear: debounce.clear,
      idle(fn) {
        idleCallbacks.push(fn);
        return fn;
      },
      cancelIdle() {}
    },
    logger: { warn() {} }
  });

  const firstPoll = controller.poll();
  previewNode.innerHTML = 'second';
  const secondPoll = controller.poll();
  previewNode.innerHTML = 'latest';
  const latestPoll = controller.poll();

  assert.equal(secondPoll, firstPoll);
  assert.equal(latestPoll, firstPoll);

  await debounce.calls.at(-1).fn();
  await idleCallbacks.at(-1)();
  await firstPoll;

  assert.equal(typesetCalls.length, 1);
  assert.deepEqual(typesetCalls[0], [previewNode]);
});

test('runs typesetting during idle time with a timeout fallback', async () => {
  const idleCallbacks = [];
  const schedule = createScheduleSpy();
  const typesetCalls = [];
  const controller = preview.createPreviewController({
    document: { querySelector: () => ({ tagName: 'DIV', innerHTML: 'formula' }) },
    mathJax: {
      typesetPromise(nodes) {
        typesetCalls.push(nodes);
        return Promise.resolve();
      }
    },
    schedule: {
      set: schedule.schedule,
      clear: schedule.clear,
      idle(fn) {
        idleCallbacks.push(fn);
        return fn;
      },
      cancelIdle() {}
    },
    logger: { warn() {} }
  });

  const pollPromise = controller.poll();
  await schedule.calls.at(-1).fn();

  assert.equal(idleCallbacks.length, 1);
  await idleCallbacks.at(-1)();
  await pollPromise;
  assert.equal(typesetCalls.length, 1);

  const fallbackSchedule = createScheduleSpy();
  const fallbackCalls = [];
  const fallbackController = preview.createPreviewController({
    document: { querySelector: () => ({ tagName: 'DIV', innerHTML: 'formula' }) },
    mathJax: {
      typesetPromise(nodes) {
        fallbackCalls.push(nodes);
        return Promise.resolve();
      }
    },
    schedule: {
      set: fallbackSchedule.schedule,
      clear: fallbackSchedule.clear
    },
    logger: { warn() {} }
  });

  const fallbackPoll = fallbackController.poll();
  await fallbackSchedule.calls.at(-1).fn();

  assert.equal(fallbackSchedule.calls.at(-1).delay, 0);
  await fallbackSchedule.calls.at(-1).fn();
  await fallbackPoll;
  assert.equal(fallbackCalls.length, 1);
});

test('does not repeat a successful unchanged large preview but retries a rejection', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: 'x'.repeat(100000) };
  const idleSchedule = createIdleScheduleSpy();
  const schedule = idleSchedule.schedule;
  let attempts = 0;
  const controller = preview.createPreviewController({
    document: { querySelector: () => previewNode },
    mathJax: {
      typesetPromise() {
        attempts += 1;
        if (attempts === 1) return Promise.reject(new Error('temporary failure'));
        return Promise.resolve();
      }
    },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(controller, schedule, idleSchedule.idleCallbacks);
  await runScheduledPoll(controller, schedule, idleSchedule.idleCallbacks);
  assert.equal(attempts, 2);

  await controller.poll();
  assert.equal(attempts, 2);
});
