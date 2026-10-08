import { StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, keymap } from '@codemirror/view';
import { modeState, compositionState } from './document-state.mjs';

function complete(block) {
  if (block.kind !== 'fence') return true;
  const lines = block.source.split('\n');
  const start = /^\s*(`{3,}|~{3,})/.exec(lines[0]);
  return !start || (lines.length > 1 && new RegExp(`^\\s*${start[1][0]}{${start[1].length},}\\s*$`).test(lines.at(-1)));
}
const previewDOM = new WeakMap();
class PreviewWidget extends WidgetType {
  constructor(block, render, read) { super(); this.block = block; this.render = render; this.read = read; }
  eq(other) { return this.block.source === other.block.source && this.block.referenceKey === other.block.referenceKey && this.block.from === other.block.from && this.read === other.read && this.render === other.render; }
  toDOM(view) {
    const root = view.dom.ownerDocument.createElement('div');
    root.className = 'shuohui-block';
    root.dataset.sourceFrom = this.block.from;
    root.dataset.sourceTo = this.block.to;
    root.innerHTML = this.render(this.block);
    previewDOM.set(root, this);
    root.addEventListener('mousedown', event => {
      // Toggle native details/summary without turning a UI action into a source edit.
      if (this.read || event.target.closest('summary')) return;
      event.preventDefault();
      view.dispatch({ selection: { anchor: Number(root.dataset.sourceFrom) }, scrollIntoView: true });
      view.focus();
    });
    return root;
  }
  updateDOM(root) {
    const previous = previewDOM.get(root);
    if (!previous || previous.block.source !== this.block.source || previous.block.referenceKey !== this.block.referenceKey || previous.render !== this.render || previous.read !== this.read) return false;
    root.dataset.sourceFrom = this.block.from; root.dataset.sourceTo = this.block.to;
    previewDOM.set(root, this);
    return true;
  }
  ignoreEvent() { return true; }
}

export function createLivePreview({ getBlocks, renderBlock, isComposing = () => false }) {
  function decorations(state, blocks) {
    const mode = state.field(modeState);
    if (mode === 'source') return Decoration.none;
    const read = mode === 'read';
    const ranges = [];
    for (const block of blocks) {
      const active = !read && state.selection.ranges.some(range => range.from <= block.to && range.to >= block.from);
      if (!active && block.to > block.from && complete(block)) ranges.push(Decoration.replace({ block: true, widget: new PreviewWidget(block, renderBlock, read) }).range(block.from, block.to));
    }
    return Decoration.set(ranges, true);
  }
  const field = StateField.define({
    create(state) { const blocks = getBlocks(state.doc.toString()); return { blocks, decorations: decorations(state, blocks) }; },
    update(value, tr) {
      if (tr.state.field(compositionState) || isComposing()) return { blocks: value.blocks, decorations: value.decorations.map(tr.changes) };
      if (!tr.docChanged && !tr.selection && !tr.effects.length) return value;
      const blocks = tr.docChanged || tr.startState.field(compositionState) ? getBlocks(tr.state.doc.toString()) : value.blocks;
      return { blocks, decorations: decorations(tr.state, blocks) };
    },
    provide: field => EditorView.decorations.from(field, value => value.decorations),
  });
  const navigation = direction => view => {
    if (view.composing || view.state.field(compositionState) || view.state.field(modeState) !== 'live') return false;
    const line = view.state.doc.lineAt(view.state.selection.main.head), next = line.number + direction;
    if (next < 1 || next > view.state.doc.lines) return false;
    const target = view.state.doc.line(next);
    if (!view.state.field(field).blocks.some(block => target.from >= block.from && target.from <= block.to)) return false;
    view.dispatch({ selection: { anchor: Math.min(target.to, target.from + (view.state.selection.main.head - line.from)) }, scrollIntoView: true });
    return true;
  };
  return [field, keymap.of([{ key: 'ArrowDown', run: navigation(1) }, { key: 'ArrowUp', run: navigation(-1) }])];
}
