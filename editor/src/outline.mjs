import { createMarkdownParser } from './preview-parser.mjs';
const parser = createMarkdownParser();
export function buildOutline(source) {
  const starts = [0], outline = [];
  for (const ending of source.matchAll(/\r\n|\n/g)) starts.push(ending.index + ending[0].length);
  const tokens = parser.parse(source, {});
  tokens.forEach((token, index) => {
    if (token.type === 'heading_open' && token.map) outline.push({ label: tokens[index + 1].content, from: starts[token.map[0]], level: Number(token.tag.substring(1)) });
  });
  return outline;
}
