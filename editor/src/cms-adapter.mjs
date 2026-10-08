import { createDocument } from './document-state.mjs';
import { createLivePreview } from './live-preview.mjs';
import { parsePreviewBlocks } from './preview-parser.mjs';
import { renderReading } from './reading-preview.mjs';
import { createMathScheduler } from './math-scheduler.mjs';
import { attachWritingLayout } from './layout-adapter.mjs';
import { insertMedia } from './media-insertion.mjs';
import { readPreferences, writePreferences } from './preferences.mjs';
import { buildOutline } from './outline.mjs';
import { Text } from '@codemirror/state';
import { mountSourceFallback } from './source-fallback.mjs';

let runtimeLoader;
const entryId = props => `${props.entry?.get('collection') ?? ''}:${props.entry?.get('path') ?? 'new'}`;
const sha256 = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
let compatibility;
function compatibilityRecords() { return compatibility ??= fetch('/admin/editor/compatibility-preview.json').then(response => response.ok ? response.json() : {}).catch(() => ({})); }

export function mountEditor({ root, props }) {
  let latest = props, alive = true, version = 0, properties = false, mode = 'live', legacy = null, legacyWarned = false;
  const initialSource = String(props.value ?? ''), identity = entryId(props);
  let storage; try { storage = localStorage; } catch { /* Private mode can deny storage. */ }
  let preferences = readPreferences(storage);
  const toolbar = document.createElement('div'); toolbar.className = 'shuohui-writing-toolbar';
  const host = document.createElement('div'), legacyHost = document.createElement('div'); legacyHost.className = 'shuohui-block'; legacyHost.hidden = true;
  const status = document.createElement('div'); status.className = 'shuohui-writing-status'; status.setAttribute('role', 'status');
  root.replaceChildren(toolbar, status, host, legacyHost);
  const modeSelect = document.createElement('select'); modeSelect.setAttribute('aria-label', '写作模式');
  for (const [value, text] of [['live', '实时预览'], ['source', '源码'], ['read', '阅读']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; modeSelect.append(option); }
  toolbar.append(modeSelect);
  const button = (label, action, container = toolbar) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', action); container.append(button); return button; };
  const getAsset = value => String(latest.getAsset?.(value) ?? value);
  const scheduler = createMathScheduler({ ensureMathJax: () => {
    if (!window.ShuohuiMathJaxLoader) throw Error('MathJax loader unavailable');
    runtimeLoader ??= window.ShuohuiMathJaxLoader.createRuntimeLoader({ hostWindow: window, document });
    return runtimeLoader.ensure();
  } });
  const observed = new Set(), visible = new Set();
  function mathEnabled() { return latest.entry?.getIn(['data', 'math']) === true; }
  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); }
    scheduler.setVisible(mathEnabled() ? visible : []);
  }, { rootMargin: '150px' });
  function refreshMath() {
    for (const node of observed) if (!node.isConnected) { intersection.unobserve(node); observed.delete(node); visible.delete(node); }
    if (!mathEnabled() || mode === 'source') { scheduler.setVisible([]); return; }
    for (const node of root.querySelectorAll('[data-math-source]')) {
      if (!observed.has(node)) { observed.add(node); intersection.observe(node); }
      scheduler.request(node, node.dataset.mathSource, version);
    }
    scheduler.setVisible(visible);
  }
  const doc = createDocument({ parent: host, value: initialSource, preferences, extensions: createLivePreview({ getBlocks: parsePreviewBlocks, renderBlock: block => renderReading(block.source, { getAsset, references: block.references }).html }), onChange(value) {
    version++; scheduler.invalidate(version);
    if (legacy && !legacyWarned) { legacyWarned = true; legacy = null; status.textContent = '本篇原有自动排版将不再套用，请检查发布预览'; }
    latest.onChange(value); refreshMath();
  } });
  doc.setReadonly(props.readonly);
  doc.view.contentDOM.id = props.forID ?? '';
  doc.view.contentDOM.setAttribute('aria-label', '正文源码');
  for (const [name, value] of [['spellcheck', 'false'], ['autocorrect', 'off'], ['autocapitalize', 'off']]) doc.view.contentDOM.setAttribute(name, value);
  let layoutRoot = root.closest('[data-mode="edit"]')?.parentElement;
  while (layoutRoot && ![...layoutRoot.querySelectorAll('button')].some(node => /保存|^Save\b/i.test(node.textContent.trim()))) layoutRoot = layoutRoot.parentElement;
  const layout = attachWritingLayout({ root: layoutRoot, fieldRoot: root });
  const propertyButton = button('文章属性', () => { properties = !properties; layout.setPropertiesVisible(properties); propertyButton.setAttribute('aria-pressed', String(properties)); });
  propertyButton.setAttribute('aria-pressed', 'false');
  const menu = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = '更多'; menu.append(summary); toolbar.append(menu);
  button('插入图片', async () => { try { await insertMedia({ view: doc.view, pickFile: latest.pickFile, addFile: latest.addFile, entryId: identity, getEntryId: () => alive ? entryId(latest) : null }); } catch { status.textContent = '图片插入失败，正文已保留；可重试'; } }, menu);
  button('插入折叠内容', () => {
    if (doc.view.state.readOnly || doc.isComposing()) return;
    const selection = doc.view.state.selection.main, selected = doc.view.state.sliceDoc(selection.from, selection.to);
    const prefix = '{{< collapse summary="查看详细内容" >}}\n\n';
    const insert = prefix + selected.replace(/\r\n/g, '\n') + '\n\n{{< /collapse >}}';
    doc.view.dispatch({ changes: { from: selection.from, to: selection.to, insert: Text.of(insert.split('\n')) }, selection: { anchor: selection.from + prefix.length }, userEvent: 'input.shortcode' }); doc.view.focus();
  }, menu);
  for (const [name, text] of [['continueLists', '续接列表'], ['pairBrackets', '括号配对']]) {
    const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = preferences[name];
    input.addEventListener('change', () => { preferences = writePreferences(storage, { ...preferences, [name]: input.checked }); doc.setPreferences(preferences); });
    label.append(input, text); menu.append(label);
  }
  const outline = document.createElement('details'), outlineLabel = document.createElement('summary'), outlineBody = document.createElement('nav');
  outline.className = 'shuohui-writing-outline'; outlineLabel.textContent = '大纲'; outline.append(outlineLabel, outlineBody); toolbar.append(outline);
  outline.addEventListener('toggle', () => { if (!outline.open) return; outlineBody.replaceChildren(); for (const heading of buildOutline(doc.view.state.doc.toString())) button(heading.label, () => { doc.setMode('live'); mode = 'live'; modeSelect.value = mode; doc.view.dispatch({ selection: { anchor: heading.from }, scrollIntoView: true }); doc.view.focus(); }, outlineBody); });
  modeSelect.addEventListener('change', () => {
    if (!doc.setMode(modeSelect.value)) { modeSelect.value = mode; return; }
    mode = modeSelect.value;
    host.hidden = mode === 'read' && !!legacy; legacyHost.hidden = !host.hidden;
    if (host.hidden) legacyHost.innerHTML = renderReading(doc.getSource(), { legacyBody: legacy.renderedMarkdown, getAsset }).html;
    else legacyHost.replaceChildren();
    if (mode !== 'read') doc.view.focus(); refreshMath();
  });
  button('复制阅读文本', async () => {
    if (mode !== 'read') { status.textContent = '请先切换到阅读模式；普通复制保留 Markdown'; return; }
    try { const target = document.createElement('div'); target.innerHTML = renderReading(doc.getSource(), { legacyBody: legacy?.renderedMarkdown, getAsset }).html; await navigator.clipboard.writeText(target.textContent); status.textContent = '已复制阅读文本'; } catch { status.textContent = '浏览器未允许复制；正文不受影响'; }
  }, menu);
  const adopt = button('采用外部版本', () => { doc.acceptExternalValue(String(latest.value ?? '')); status.textContent = '已采用外部版本；可撤销'; adopt.hidden = true; }); adopt.hidden = true;
  status.textContent = layout.enabled ? '正文按原样保存；公式预览不影响保存' : '布局适配未启用，保留完整属性表单';
  const mutation = new MutationObserver(() => refreshMath()); mutation.observe(host, { subtree: true, childList: true }); mutation.observe(legacyHost, { subtree: true, childList: true });
  refreshMath();
  void Promise.all([compatibilityRecords(), sha256(initialSource), sha256(props.entry?.get('path') ?? '')]).then(([records, hash, id]) => {
    const record = records.entries?.[id];
    if (alive && doc.getSource() === initialSource && record?.bodyHash === hash && record.mathPolicy?.math === mathEnabled() && record.mathPolicy?.legacyMathDirectory === (props.entry?.get('path')?.startsWith('content/math/') ?? false)) legacy = record;
  }).catch(() => {});
  return {
    doc,
    update(next) {
      latest = next;
      doc.setReadonly(next.readonly);
      if (doc.syncValue(String(next.value ?? '')) === 'conflict') { status.textContent = '检测到外部正文差异，未覆盖当前输入；请确认后采用'; adopt.hidden = false; }
      if (!mathEnabled()) { version++; scheduler.invalidate(version); } refreshMath();
      for (const image of root.querySelectorAll('img[data-source-path]')) { const value = getAsset(image.dataset.sourcePath); if (image.getAttribute('src') !== value) image.setAttribute('src', value); }
    },
    destroy() { alive = false; mutation.disconnect(); intersection.disconnect(); scheduler.destroy(); layout.destroy(); doc.destroy(); },
  };
}

export function registerEditor(CMS) {
  const React = CMS.React;
  function Control(props) {
    const root = React.useRef(null), editor = React.useRef(null), latest = React.useRef(props); latest.current = props;
    const identity = entryId(props);
    React.useLayoutEffect(() => {
      try { editor.current = mountEditor({ root: root.current, props: latest.current }); }
      catch { editor.current = mountSourceFallback({ root: root.current, props: latest.current }); }
      return () => { editor.current?.destroy(); editor.current = null; };
    }, [identity]);
    React.useLayoutEffect(() => { editor.current?.update(props); }, [props.value, props.entry, props.getAsset, props.readonly]);
    return React.createElement('div', { ref: root, className: 'shuohui-writing' });
  }
  CMS.registerFieldType('source-markdown', Control);
}
