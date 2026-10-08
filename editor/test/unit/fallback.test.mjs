import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { registerEditor } from '../../src/cms-adapter.mjs';

test('actual_Control_fallback_syncs_clean_external_values_and_readonly_props', () => {
  const window = new JSDOM('<main></main>').window;
  globalThis.window = window; globalThis.document = window.document;
  globalThis.IntersectionObserver = class { constructor() { throw Error('forced preview initialization failure'); } };
  const refs = [], effects = []; let index = 0, Control;
  const React = {
    useRef(initial) { const i = index++; return refs[i] ??= { current: initial }; },
    useLayoutEffect(run, deps) { const i = index++; const prev = effects[i]; if (!prev || deps.some((dep, j) => dep !== prev.deps[j])) effects[i] = { run, deps, pending: true, cleanup: prev?.cleanup }; },
    createElement(_tag, props) { props.ref.current = document.querySelector('main'); },
  };
  registerEditor({ React, registerFieldType(_name, control) { Control = control; } });
  const entry = { get: name => ({ collection: 'acgn', path: 'content/acgn/fixture.md' })[name], getIn: () => false };
  const changes = [], base = { value: 'original body', entry, readonly: false, onChange: value => changes.push(value) };
  function render(props) { index = 0; Control(props); for (const effect of effects) if (effect?.pending) { effect.cleanup?.(); effect.cleanup = effect.run(); effect.pending = false; } }
  render(base);
  const input = document.querySelector('textarea'); assert.equal(input.value, 'original body');
  render({ ...base, value: 'remote\r\nreplacement', readonly: true });
  assert.equal(input.value, 'remote\nreplacement'); assert.equal(input.readOnly, true);
  render({ ...base, value: 'remote\r\nreplacement', readonly: false });
  input.value += '!'; input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(changes.at(-1), 'remote\r\nreplacement!');
  render({ ...base, value: 'conflicting remote' });
  assert.equal(input.value, 'remote\nreplacement!');
  assert.match(document.querySelector('[role="status"]').textContent, /未覆盖/);
  for (const effect of effects) effect?.cleanup?.();
  window.close();
});
