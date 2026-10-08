import { attachLocalIcons } from './ui-icons.mjs';

export function attachWritingLayout({ root, fieldRoot }) {
  const body = fieldRoot.closest('[data-key-path="body"]');
  const pane = body?.closest('[data-mode="edit"]');
  const save = [...(root?.querySelectorAll('button') ?? [])].find(button => /保存|^Save\b/i.test(button.textContent.trim()) || /保存|^Save\b/i.test(button.getAttribute('aria-label') ?? ''));
  if (!body || !pane || !save || !root?.contains(pane)) return { enabled: false, setPropertiesVisible() {}, destroy() {} };
  const hiddenByUs = new Map();
  const originalLayout = root.getAttribute('data-shuohui-layout');
  const originalPane = pane.getAttribute('data-shuohui-writing-pane');
  const icons = attachLocalIcons(root);
  pane.setAttribute('data-shuohui-writing-pane', '');
  let show = false, destroyed = false;
  function restore() { for (const [node, hidden] of hiddenByUs) { node.hidden = hidden; node.removeAttribute('data-shuohui-hidden'); } hiddenByUs.clear(); }
  function apply() {
    if (destroyed) return;
    restore();
    icons.refresh();
    const invalid = !!pane.querySelector('[aria-invalid="true"], [role="alert"]');
    root.setAttribute('data-shuohui-layout', show || invalid ? 'properties' : 'writing');
    if (show || invalid) return;
    const fields = [...pane.querySelectorAll('[data-key-path]')].filter(node => !node.parentElement.closest('[data-key-path]'));
    // Keep the CMS's real date and draft controls in place: no copies, no
    // synthetic save action, and no remounting when properties are toggled.
    for (const node of fields) if (node !== body && !['date', 'draft'].includes(node.dataset.keyPath)) { hiddenByUs.set(node, node.hidden); node.hidden = true; node.setAttribute('data-shuohui-hidden', ''); }
  }
  const observer = new MutationObserver(() => apply());
  observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['aria-invalid'], childList: true, characterData: true });
  apply();
  return { enabled: true, setPropertiesVisible(value) { show = !!value; apply(); }, destroy() {
    destroyed = true; observer.disconnect(); restore(); icons.destroy();
    if (originalLayout === null) root.removeAttribute('data-shuohui-layout'); else root.setAttribute('data-shuohui-layout', originalLayout);
    if (originalPane === null) pane.removeAttribute('data-shuohui-writing-pane'); else pane.setAttribute('data-shuohui-writing-pane', originalPane);
  } };
}
