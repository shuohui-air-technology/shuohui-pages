export function attachWritingLayout({ root, fieldRoot }) {
  const body = fieldRoot.closest('[data-key-path="body"]');
  const pane = body?.closest('[data-mode="edit"]');
  const save = [...(root?.querySelectorAll('button') ?? [])].find(button => /保存|^Save\b/i.test(button.textContent.trim()) || /保存|^Save\b/i.test(button.getAttribute('aria-label') ?? ''));
  if (!body || !pane || !save || !root.contains(body)) return { enabled: false, setPropertiesVisible() {}, destroy() {} };
  const hiddenByUs = new Map();
  let show = false, destroyed = false;
  function restore() { for (const [node, hidden] of hiddenByUs) { node.hidden = hidden; node.removeAttribute('data-shuohui-hidden'); } hiddenByUs.clear(); }
  function apply() {
    if (destroyed) return;
    restore();
    const invalid = !!pane.querySelector('[aria-invalid="true"], [role="alert"]');
    if (show || invalid) return;
    const fields = [...pane.querySelectorAll('[data-key-path]')].filter(node => !node.parentElement.closest('[data-key-path]'));
    for (const node of fields) if (node !== body) { hiddenByUs.set(node, node.hidden); node.hidden = true; node.setAttribute('data-shuohui-hidden', ''); }
  }
  const observer = new MutationObserver(() => apply());
  observer.observe(pane, { subtree: true, attributes: true, attributeFilter: ['aria-invalid'], childList: true });
  apply();
  return { enabled: true, setPropertiesVisible(value) { show = !!value; apply(); }, destroy() { destroyed = true; observer.disconnect(); restore(); } };
}
