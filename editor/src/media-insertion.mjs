import { StateEffect, StateField } from '@codemirror/state';
import { compositionState } from './document-state.mjs';
const bookmarkEffect = StateEffect.define();
const bookmarks = StateField.define({
  create: () => new Map(),
  update(value, tr) {
    const next = new Map([...value].map(([id, position]) => [id, tr.changes.mapPos(position, 1)]));
    for (const effect of tr.effects) if (effect.is(bookmarkEffect)) {
      if (effect.value.position == null) next.delete(effect.value.id);
      else next.set(effect.value.id, effect.value.position);
    }
    return next;
  },
});

export async function insertMedia({ view, pickFile, addFile, entryId, getEntryId = () => entryId, file }) {
  const writable = () => !view.state.readOnly && !view.composing && !view.state.field(compositionState, false);
  if (!writable()) return;
  if (!view.state.field(bookmarks, false)) view.dispatch({ effects: StateEffect.appendConfig.of(bookmarks) });
  const id = Symbol('media'), alive = () => view.dom.isConnected && getEntryId() === entryId;
  view.dispatch({ effects: bookmarkEffect.of({ id, position: view.state.selection.main.head }) });
  try {
    const selected = file ? { value: await addFile(file) } : await pickFile({ kind: 'image', accept: 'image/*', multiple: false });
    if (!selected || !alive() || !writable()) return;
    const value = (Array.isArray(selected) ? selected[0] : selected)?.value;
    if (typeof value !== 'string' || !/^(?:\/|https?:\/\/|blob:)/.test(value) || /^\/\//.test(value)) throw Error('图片地址无效；正文已保留');
    const position = view.state.field(bookmarks).get(id);
    if (position == null) return;
    // Encode only the inserted destination, never re-serialize any existing text.
    const destination = value.replace(/\s/g, char => encodeURIComponent(char)).replace(/[()]/g, char => char === '(' ? '%28' : '%29');
    const insert = `![图片](${destination})`;
    view.dispatch({ changes: { from: position, insert }, selection: { anchor: position + insert.length }, effects: bookmarkEffect.of({ id }), userEvent: 'input.media' });
  } finally { if (view.dom.isConnected) view.dispatch({ effects: bookmarkEffect.of({ id }) }); }
}
