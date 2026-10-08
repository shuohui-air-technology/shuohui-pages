import createDOMPurify from 'dompurify';

const purifiers = new WeakMap();
export function sanitizeMathOutput(output) {
  const window = output.ownerDocument.defaultView;
  let purifier = purifiers.get(window);
  if (!purifier) { purifier = createDOMPurify(window); purifiers.set(window, purifier); }
  return purifier.sanitize(output, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: true, mathMl: true },
    CUSTOM_ELEMENT_HANDLING: { tagNameCheck: /^mjx-[a-z0-9-]+$/, attributeNameCheck: /^(?:display|jax|texclass|space|size|variant|align|width|height|unselectable)$/ },
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
  });
}
