import createDOMPurify from 'dompurify';
import { createMarkdownParser, parsePreviewBlocks } from './preview-parser.mjs';

const purifiers = new WeakMap();
export function renderReading(source, options = {}) {
  const window = options.window ?? globalThis.window;
  if (!window?.document) throw new Error('Preview requires a DOM; original source is unchanged');
  let purifier = purifiers.get(window);
  if (!purifier) { purifier = createDOMPurify(window); purifiers.set(window, purifier); }
  const md = createMarkdownParser(options);
  const html = purifier.sanitize(md.render(options.legacyBody ?? source, { references: options.references }), { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'button'], FORBID_ATTR: ['style'], ADD_ATTR: ['loading'] });
  return { html, blocks: parsePreviewBlocks(source) };
}
