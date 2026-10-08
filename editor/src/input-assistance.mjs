import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { insertNewlineContinueMarkup } from '@codemirror/lang-markdown';

export function createAssistance(preferences) {
  const extensions = [];
  if (preferences.continueLists) extensions.push(keymap.of([{ key: 'Enter', run(view) {
    if (view.composing) return false;
    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.head);
    if (selection.empty && /^\s*(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s*)?$/.test(line.text)) {
      view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from }, userEvent: 'input' });
      return true;
    }
    return insertNewlineContinueMarkup(view);
  } }]));
  if (preferences.pairBrackets) extensions.push(
    Prec.highest(EditorView.inputHandler.of((view, from, to, text) => {
      if (!/^[([{\"']$/.test(text)) return false;
      const prefix = view.state.sliceDoc(Math.max(0, from - 100), from);
      const slashes = prefix.match(/\\+$/)?.[0].length ?? 0;
      if (slashes % 2 !== 1) return false;
      view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, userEvent: 'input.type' });
      return true;
    })), closeBrackets(), keymap.of(closeBracketsKeymap));
  return extensions;
}
