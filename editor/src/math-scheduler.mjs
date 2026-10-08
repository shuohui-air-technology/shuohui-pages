const defaultClock = {
  setTimeout: (fn, delay) => setTimeout(fn, delay), clearTimeout: id => clearTimeout(id),
  requestIdleCallback: typeof requestIdleCallback === 'function' ? fn => requestIdleCallback(fn, { timeout: 100 }) : null,
  cancelIdleCallback: typeof cancelIdleCallback === 'function' ? id => cancelIdleCallback(id) : null,
};

export function createMathScheduler({ ensureMathJax, clock = defaultClock, maxCacheEntries = 256, configKey = 'shuohui-mathjax-3.2.2-v1' }) {
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
        output = await mathJax.tex2chtmlPromise(job.source, { display: job.display });
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
