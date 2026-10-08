import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const window = new Window();
for (const key of ['window', 'document', 'MutationObserver', 'HTMLElement', 'Node', 'Window']) globalThis[key] = key === 'window' ? window : window[key];
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
const api = await import('../../src/document-state.mjs').catch(() => ({}));
const preferences = await import('../../src/preferences.mjs').catch(() => ({}));

function create(value, onChange = () => {}) {
  assert.equal(typeof api.createDocument, 'function', 'document state not implemented');
  const parent = document.createElement('div'); document.body.append(parent);
  return api.createDocument({ parent, value, onChange, preferences: { continueLists: true, pairBrackets: true } });
}
test('same_value_keeps_history', async () => {
  const doc = create('original');
  const { undo } = await import('@codemirror/commands');
  doc.view.dispatch({ changes: { from: 8, insert: ' edit' } });
  assert.equal(doc.syncValue('original edit'), 'unchanged');
  assert.equal(undo(doc.view), true);
  assert.equal(doc.getSource(), 'original');
  doc.destroy();
});
test('external_value_conflict_is_not_overwritten', () => {
  const doc = create('original');
  doc.view.dispatch({ changes: { from: 8, insert: ' edited' } });
  assert.equal(doc.syncValue('remote'), 'conflict');
  assert.equal(doc.getSource(), 'original edited');
  doc.destroy();
});
test('mode_toggle_does_not_emit_change_and_preserves_crlf', () => {
  const changes = [];
  const doc = create('a\r\n\r\nb  \r\n', value => changes.push(value));
  const view = doc.view;
  for (const mode of ['source', 'read', 'live']) doc.setMode(mode);
  assert.equal(doc.view, view);
  assert.equal(doc.getSource(), 'a\r\n\r\nb  \r\n');
  assert.deepEqual(changes, []);
  doc.destroy();
});
test('preferences_fail_open_when_storage_unavailable', () => {
  assert.equal(typeof preferences.readPreferences, 'function');
  assert.deepEqual(preferences.readPreferences({ getItem() { throw Error('blocked'); } }), { continueLists: true, pairBrackets: true });
});
test('external_value_before_edit_preserves_new_eol', () => {
  const doc = create('original');
  assert.equal(doc.syncValue('new\r\ntext\r\n'), 'applied');
  assert.equal(doc.getSource(), 'new\r\ntext\r\n');
  doc.destroy();
});
test('preferences_persist_only_valid_booleans', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  assert.equal(typeof preferences.writePreferences, 'function');
  preferences.writePreferences(storage, { continueLists: false, pairBrackets: false });
  assert.deepEqual(preferences.readPreferences(storage), { continueLists: false, pairBrackets: false });
});
