import { parseDocument, stringify } from 'yaml';

export const SNAPSHOT_KEY = '_shuohui_source_snapshot';
export const SOURCE_FORMAT = 'shuohui-markdown-lossless';

export function parseSourceFile(text) {
  if (typeof text !== 'string') throw new TypeError('Markdown source must be a string');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const match = /^(?:\uFEFF)?---[^\S\r\n]*\r?\n([\s\S]*?)^---[^\S\r\n]*(\r?\n|$)/m.exec(text);
  if (!match || match.index !== 0) {
    if (/^(?:\uFEFF)?---(?:\s|$)/.test(text)) throw new Error('Unclosed YAML front matter');
    return { frontMatter: {}, body: text, separator: '', eol, headRaw: '' };
  }
  const document = parseDocument(match[1], { uniqueKeys: true, maxAliasCount: 100 });
  if (document.errors.length) throw new Error(document.errors[0].message);
  const frontMatter = document.toJS({ maxAliasCount: 100 }) ?? {};
  if (typeof frontMatter !== 'object' || Array.isArray(frontMatter)) throw new Error('Front matter must be an object');
  if (Object.hasOwn(frontMatter, SNAPSHOT_KEY)) throw new Error(`reserved field: ${SNAPSHOT_KEY}`);
  if (Object.hasOwn(frontMatter, 'body')) throw new Error('reserved front matter field: body');
  const separator = match[2];
  return { frontMatter, body: text.slice(match[0].length), separator, eol, headRaw: match[0].slice(0, match[0].length - separator.length) };
}

export function serializeSourceFile(envelope, data) {
  const { body, [SNAPSHOT_KEY]: ignored, ...fields } = data;
  if (typeof body !== 'string') throw new TypeError('Refusing to save missing Markdown body');
  const metadata = { ...envelope.frontMatter, ...fields };
  if (JSON.stringify(metadata) === JSON.stringify(envelope.frontMatter)) return envelope.headRaw + envelope.separator + body;
  const eol = envelope.eol || '\n';
  const head = stringify(metadata, { lineWidth: 0 }).replace(/\n/g, eol);
  return `---${eol}${head}---${envelope.separator || eol}${body}`;
}

export function registerSourceFormat(CMS) {
  CMS.registerCustomFormat(SOURCE_FORMAT, 'md', {
    fromFile(text) {
      const envelope = parseSourceFile(text);
      return { ...envelope.frontMatter, body: envelope.body, [SNAPSHOT_KEY]: JSON.stringify({ ...envelope, body: undefined }) };
    },
    toFile(data) {
      const snapshot = data[SNAPSHOT_KEY];
      if (snapshot != null && typeof snapshot !== 'string') throw new Error('Invalid source snapshot; refusing to overwrite article');
      const envelope = snapshot ? JSON.parse(snapshot) : { frontMatter: {}, headRaw: '', separator: '\n\n', eol: '\n' };
      return serializeSourceFile(envelope, data);
    },
  });
}
