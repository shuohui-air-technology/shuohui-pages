import { Annotation, Compartment, EditorState, StateEffect, StateField } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { createAssistance } from './input-assistance.mjs';

export const modeEffect = StateEffect.define();
export const compositionEffect = StateEffect.define();
export const modeState = StateField.define({ create: () => 'live', update: (value, tr) => tr.effects.find(effect => effect.is(modeEffect))?.value ?? value });
export const compositionState = StateField.define({ create: () => false, update: (value, tr) => tr.effects.find(effect => effect.is(compositionEffect))?.value ?? value });
const externalChange = Annotation.define();

export function createDocument({ parent, value, onChange, preferences, extensions = [] }) {
  const source = String(value ?? '');
  const mode = new Compartment(), assistance = new Compartment(), preview = new Compartment(), eol = new Compartment();
  let dirty = false, destroyed = false, restoreFocus = false;
  const view = new EditorView({ parent, state: EditorState.create({ doc: source, extensions: [
    eol.of(source.includes('\r\n') ? EditorState.lineSeparator.of('\r\n') : []),
    history(), markdown({ addKeymap: false }), EditorView.lineWrapping,
    modeState, compositionState, mode.of([]), assistance.of(createAssistance(preferences)), preview.of(extensions),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.domEventHandlers({
      compositionstart: () => { view.dispatch({ effects: compositionEffect.of(true) }); },
      compositionend: () => { queueMicrotask(() => { if (!destroyed) view.dispatch({ effects: compositionEffect.of(false) }); }); },
    }),
    EditorView.updateListener.of(update => {
      if (update.docChanged && !update.transactions.every(tr => tr.annotation(externalChange))) {
        dirty = true;
        onChange?.(view.state.sliceDoc());
      }
    }),
  ] }) });
  function applyValue(next) {
    // Normalize only CM's internal line structure; serialization uses the incoming convention.
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next.replace(/\r\n/g, '\n') }, effects: eol.reconfigure(next.includes('\r\n') ? EditorState.lineSeparator.of('\r\n') : []), annotations: [externalChange.of(true)] });
    dirty = false;
    return 'applied';
  }
  return {
    view,
    getSource: () => view.state.sliceDoc(),
    isComposing: () => view.state.field(compositionState),
    syncValue(next) {
      if (next === view.state.sliceDoc()) return 'unchanged';
      if (dirty || view.composing || view.state.field(compositionState)) return 'conflict';
      return applyValue(next);
    },
    acceptExternalValue: applyValue,
    setMode(next) {
      if (!['live', 'source', 'read'].includes(next)) throw Error('Unknown writing mode');
      if (view.composing || view.state.field(compositionState)) return false;
      restoreFocus ||= view.hasFocus;
      view.dispatch({ effects: [modeEffect.of(next), mode.reconfigure([EditorState.readOnly.of(next === 'read'), EditorView.editable.of(next !== 'read')])] });
      if (restoreFocus && next !== 'read') { view.focus(); restoreFocus = false; }
      return true;
    },
    setPreferences: next => view.dispatch({ effects: assistance.reconfigure(createAssistance(next)) }),
    setPreview: next => view.dispatch({ effects: preview.reconfigure(next) }),
    destroy() { destroyed = true; view.destroy(); },
  };
}
