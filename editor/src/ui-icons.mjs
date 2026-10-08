// Sveltia 0.232.0 / @sveltia/ui Icon renders semantic text in .sui.icon.
// Original text, button labels and native handlers remain untouched. These
// small, independently drawn SVGs need neither a font request nor an asset URL.
const paths = {
  arrow_back: '<path d="m11 5-7 7 7 7M4 12h16"/>',
  arrow_forward: '<path d="m13 5 7 7-7 7M4 12h16"/>',
  more_vert: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  arrow_drop_down: '<path d="m6 9 6 6 6-6"/>',
  expand_more: '<path d="m6 9 6 6 6-6"/>',
  chevron_right: '<path d="m9 6 6 6-6 6"/>',
  anchor: '<circle cx="12" cy="4" r="2"/><path d="M12 6v14M8 10h8M4 14v3c0 4 16 4 16 0v-3M2 16l2-2 2 2m12 0 2-2 2 2"/>',
  check_circle: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  history: '<path d="M4 7a9 9 0 1 1-1 8M4 3v5h5M12 7v5l4 2"/>',
  article_shortcut: '<path d="M19 10V3H4v18h9M8 7h7M8 11h4M8 15h3M14 16h7m-3-3 3 3-3 3"/>',
  dock_to_right: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 4v16M7 12h5m-2-2 2 2-2 2"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m4 15 11-11 5 5L9 20H4v-5m9-9 5 5"/>',
};
const masks = Object.fromEntries(Object.entries(paths).map(([name, path]) => [name,
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`)}")`,
]));

export function attachLocalIcons(root) {
  const originals = new Map();
  function restore(node) {
    const original = originals.get(node);
    if (!original) return;
    if (original.name === null) node.removeAttribute('data-shuohui-icon');
    else node.setAttribute('data-shuohui-icon', original.name);
    if (original.mask) node.style.setProperty('--shuohui-icon-mask', original.mask, original.priority);
    else node.style.removeProperty('--shuohui-icon-mask');
    originals.delete(node);
  }
  return {
    refresh() {
      for (const node of root.querySelectorAll('span.sui.icon.material-symbols-outlined')) {
        const name = node.textContent.trim();
        if (!Object.hasOwn(masks, name)) { restore(node); continue; }
        if (!originals.has(node)) originals.set(node, { name: node.getAttribute('data-shuohui-icon'), mask: node.style.getPropertyValue('--shuohui-icon-mask'), priority: node.style.getPropertyPriority('--shuohui-icon-mask') });
        node.setAttribute('data-shuohui-icon', name);
        node.style.setProperty('--shuohui-icon-mask', masks[name]);
      }
    },
    destroy() { for (const node of [...originals.keys()]) restore(node); },
  };
}
