import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const api = await import('../../src/math-scheduler.mjs').catch(() => ({}));
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(options = {}) {
  assert.equal(typeof api.createMathScheduler, 'function');
  const window = new JSDOM('<main></main>').window;
  let time = 0, id = 0; const timers = new Map(), calls = [];
  const clock = { now: () => time, setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, time: time + delay }); return key; }, clearTimeout: key => timers.delete(key) };
  function tick(amount) { const end = time + amount; for (;;) { const ready = [...timers.entries()].filter(([, item]) => item.time <= end).sort((a, b) => a[1].time - b[1].time)[0]; if (!ready) break; timers.delete(ready[0]); time = ready[1].time; ready[1].fn(); } time = end; }
  const ensureMathJax = async () => ({ async tex2chtmlPromise(source) { calls.push(source); if (options.convert) return options.convert(source, window); const node = window.document.createElement('b'); node.textContent = source; return node; } });
  const scheduler = api.createMathScheduler({ ensureMathJax, clock, maxCacheEntries: options.cache ?? 256 });
  const node = text => { const node = window.document.createElement('span'); node.textContent = text; window.document.querySelector('main').append(node); return node; };
  return { scheduler, node, tick, calls };
}
test('rapid_input_debounces_500ms_and_only_latest_version', async () => {
  const f = fixture(), node = f.node('$old$'); f.scheduler.setVisible([node]);
  f.scheduler.request(node, 'old', 1); f.tick(400);
  f.scheduler.invalidate(2); f.scheduler.request(node, 'new', 2);
  f.tick(499); await flush(); assert.deepEqual(f.calls, []);
  f.tick(1); await flush(); assert.deepEqual(f.calls, ['new']); assert.equal(node.textContent, 'new');
  f.scheduler.destroy();
});
test('max_one_typeset_in_flight_and_stale_version_never_applies', async () => {
  let resolve;
  const f = fixture({ convert: (source, window) => new Promise(done => { resolve = () => { const result = window.document.createElement('b'); result.textContent = source; done(result); }; }) });
  const first = f.node('$a$'), second = f.node('$b$'); f.scheduler.setVisible([first, second]);
  f.scheduler.request(first, 'a', 1); f.scheduler.request(second, 'b', 1); f.tick(500); await flush();
  assert.deepEqual(f.calls, ['a']); f.scheduler.invalidate(2); resolve(); await flush(); f.tick(0); await flush();
  assert.equal(first.textContent, '$a$'); assert.deepEqual(f.calls, ['a']); f.scheduler.destroy();
});
test('offscreen_is_not_typeset_until_visible', async () => {
  const f = fixture(), off = f.node('$off$'), visible = f.node('$visible$');
  f.scheduler.setVisible([visible]); f.scheduler.request(off, 'off', 1); f.scheduler.request(visible, 'visible', 1);
  f.tick(500); await flush(); assert.deepEqual(f.calls, ['visible']);
  f.scheduler.setVisible([off]); f.tick(500); await flush(); assert.deepEqual(f.calls, ['visible', 'off']); f.scheduler.destroy();
});
test('destroy_cancels_tasks_and_failure_keeps_source_without_busy_retry', async () => {
  const f = fixture({ convert: () => Promise.reject(Error('bad math')) }), node = f.node('$bad$');
  f.scheduler.setVisible([node]); f.scheduler.request(node, 'bad', 1); f.tick(500); await flush(); f.tick(5000); await flush();
  assert.equal(node.textContent, '$bad$'); assert.equal(f.calls.length, 1); assert.ok(node.getAttribute('title').includes('源码'));
  f.scheduler.request(node, 'other', 2); f.scheduler.destroy(); f.tick(1000); await flush(); assert.equal(f.calls.length, 1);
});
test('bounded_cache_clones_outputs_and_evicts_oldest', async () => {
  const f = fixture({ cache: 2 });
  async function render(source) { const node = f.node('$' + source + '$'); f.scheduler.setVisible([node]); f.scheduler.request(node, source, 1); f.tick(500); await flush(); return node; }
  const one = await render('one'), copy = await render('one');
  assert.equal(f.calls.length, 1); assert.notEqual(one.firstChild, copy.firstChild);
  await render('two'); await render('three'); await render('one');
  assert.deepEqual(f.calls, ['one', 'two', 'three', 'one']); f.scheduler.destroy();
});
test('default_cache_evicts_after_256_distinct_formulas', async () => {
  const f = fixture();
  for (let i = 0; i < 257; i++) {
    const node = f.node('$' + i + '$'); f.scheduler.setVisible([node]); f.scheduler.request(node, String(i), 1); f.tick(500); await flush(); node.remove();
  }
  const node = f.node('$0$'); f.scheduler.setVisible([node]); f.scheduler.request(node, '0', 1); f.tick(500); await flush();
  assert.equal(f.calls.length, 258); assert.equal(f.calls.at(-1), '0'); f.scheduler.destroy();
});
