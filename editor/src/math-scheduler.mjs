import { sanitizeMathOutput } from './math-output.mjs';

// All editor documents share one downloaded runtime, not one mutable TeX session.
const runtimes = new WeakMap();
async function convert(mathJax, owner, job, valid) {
  let runtime = runtimes.get(mathJax);
  if (!runtime) { runtime = { tail: Promise.resolve(), owner: null }; runtimes.set(mathJax, runtime); }
  const result = runtime.tail.then(async () => {
    if (!valid()) return null;
    if (runtime.owner !== owner) {
      // Documented MathJax 3 startup API rebuilds parser state, including macros;
      // texReset alone only clears equation numbers and labels.
      const startup = mathJax.startup;
      if (startup?.getInputJax && startup?.getDocument) {
        // Keep the shared CHTML font/style cache: rebuilding the output jax can
        // leave already-inserted adaptive CSS incomplete for later glyphs.
        startup.input = startup.getInputJax();
        startup.document = startup.getDocument();
        startup.makeMethods();
      }
      runtime.owner = owner;
    }
    const output = await mathJax.tex2chtmlPromise(job.source, { display: job.display });
    // String conversion returns CHTML but does not insert its stylesheet.
    // Use the pinned HTMLDocument API to mount/update trusted renderer CSS,
    // including adaptive glyph rules and assistive-MathML clipping. Keep this
    // in the shared queue; never permit author <style> through the sanitizer.
    mathJax.startup?.document?.addStyleSheet?.();
    return output;
  });
  runtime.tail = result.catch(() => {});
  return result;
}

const defaultClock = {
  setTimeout: (fn, delay) => setTimeout(fn, delay), clearTimeout: id => clearTimeout(id),
  requestIdleCallback: typeof requestIdleCallback === 'function' ? fn => requestIdleCallback(fn, { timeout: 100 }) : null,
  cancelIdleCallback: typeof cancelIdleCallback === 'function' ? id => cancelIdleCallback(id) : null,
};

export function createMathScheduler({ ensureMathJax, clock = defaultClock, maxCacheEntries = 256, configKey = 'shuohui-mathjax-3.2.2-v1' }) {
  const owner = {};
  const pending = new Map(), cache = new Map(), rendered = new WeakMap();
  let visible = new Set(), version = 0, destroyed = false, running = false, timer = null, idle = null, debouncing = false;
  function clearTimer() { if (timer !== null) clock.clearTimeout(timer); timer = null; }
  function queueIdle() {
    if (destroyed || running || debouncing || idle !== null || ![...pending.keys()].some(node => node.isConnected && visible.has(node))) return;
    const run = () => { idle = null; void drain(); };
    idle = clock.requestIdleCallback ? clock.requestIdleCallback(run) : clock.setTimeout(run, 0);
  }
  function debounce() {
    clearTimer(); debouncing = true;
    timer = clock.setTimeout(() => { timer = null; debouncing = false; queueIdle(); }, 500);
  }
  async function drain() {
    if (destroyed || running || debouncing) return;
    for (const node of pending.keys()) if (!node.isConnected) pending.delete(node);
    const job = [...pending.values()].find(item => visible.has(item.node));
    if (!job) return;
    pending.delete(job.node); running = true;
    try {
      let output = cache.get(job.key);
      if (!output) {
        const mathJax = await ensureMathJax();
        if (destroyed || job.version !== version || !job.node.isConnected || !visible.has(job.node)) return;
        output = await convert(mathJax, owner, job, () => !destroyed && job.version === version && job.node.isConnected && visible.has(job.node));
        if (!output) return;
        output = sanitizeMathOutput(output);
        cache.set(job.key, output.cloneNode(true));
        while (cache.size > maxCacheEntries) cache.delete(cache.keys().next().value);
      } else { cache.delete(job.key); cache.set(job.key, output); }
      if (!destroyed && job.version === version && job.node.isConnected && visible.has(job.node) && !pending.has(job.node)) {
        job.node.replaceChildren(output.cloneNode(true));
        job.node.removeAttribute('title'); rendered.set(job.node, job.key);
      }
    } catch {
      if (!destroyed && job.version === version && job.node.isConnected) job.node.setAttribute('title', '公式预览失败；源码已保留，可重试，不影响保存');
    } finally { running = false; queueIdle(); }
  }
  return {
    request(node, source, nextVersion) {
      if (destroyed || nextVersion < version) return;
      if (nextVersion > version) { version = nextVersion; pending.clear(); }
      const display = node.dataset.mathDisplay === 'true';
      const key = JSON.stringify([configKey, source, display]);
      if (rendered.get(node) === key) return;
      pending.set(node, { node, source, key, display, version: nextVersion }); debounce();
    },
    setVisible(nodes) { visible = new Set(nodes); queueIdle(); },
    invalidate(nextVersion) { if (nextVersion <= version) return; version = nextVersion; pending.clear(); clearTimer(); debouncing = false; },
    destroy() {
      destroyed = true; pending.clear(); visible.clear(); cache.clear(); clearTimer();
      if (idle !== null) { if (clock.cancelIdleCallback && clock.requestIdleCallback) clock.cancelIdleCallback(idle); else clock.clearTimeout(idle); }
      idle = null;
    },
  };
}
