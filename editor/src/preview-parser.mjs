import MarkdownIt from 'markdown-it';

const openingCollapse = /^\{\{<\s*collapse\b([\s\S]*?)>\}\}\s*$/;
const closingCollapse = /^\{\{<\s*\/collapse\s*>\}\}\s*$/;
const escaped = (text, pos) => {
  let count = 0;
  while (pos > 0 && text[--pos] === '\\') count++;
  return count % 2 === 1;
};

function mathInline(state, silent) {
  const start = state.pos;
  const opening = state.src.startsWith('\\(', start) ? '\\(' : state.src.startsWith('$$', start) ? '$$' : state.src[start] === '$' ? '$' : null;
  if (!opening || escaped(state.src, start)) return false;
  const closing = opening === '\\(' ? '\\)' : opening;
  if (/\s/.test(state.src[start + opening.length] || ' ')) return false;
  let end = start + opening.length;
  do { end = state.src.indexOf(closing, end); if (end < 0) return false; if (escaped(state.src, end)) end += closing.length; else break; } while (end < state.posMax);
  const content = state.src.slice(start + opening.length, end);
  if (!content || /\s$/.test(content) || content.includes('\n')) return false;
  if (opening === '$' && /\d/.test(state.src[end + 1] || '')) return false;
  if (!silent) {
    const token = state.push('math_inline', '', 0);
    token.content = content; token.meta = { display: opening === '$$' };
  }
  state.pos = end + closing.length;
  return true;
}

function mathBlock(state, line, endLine, silent) {
  if (state.sCount[line] - state.blkIndent >= 4) return false;
  const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
  const opening = text.startsWith('$$') ? '$$' : text.startsWith('\\[') ? '\\[' : null;
  if (!opening) return false;
  const closing = opening === '$$' ? '$$' : '\\]';
  const first = text.slice(opening.length);
  let last = line;
  let content;
  const sameLineEnd = first.indexOf(closing);
  if (sameLineEnd >= 0 && !first.slice(sameLineEnd + closing.length).trim()) content = first.slice(0, sameLineEnd);
  else {
    for (last = line + 1; last < endLine; last++) {
      const tail = state.src.slice(state.bMarks[last] + state.tShift[last], state.eMarks[last]);
      if (tail.trim() === closing) {
        content = first + '\n' + state.getLines(line + 1, last, state.blkIndent, false);
        break;
      }
    }
  }
  if (content === undefined) return false;
  if (!silent) {
    const token = state.push('math_block', '', 0);
    token.block = true; token.content = content; token.map = [line, last + 1];
  }
  state.line = last + 1;
  return true;
}

function collapseBlock(state, line, endLine, silent) {
  if (state.sCount[line] - state.blkIndent >= 4) return false;
  const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
  const match = openingCollapse.exec(text);
  if (!match) return false;
  const summary = /\bsummary\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/.exec(match[1]);
  if (!summary) return false;
  let depth = 1, fence = null, last;
  for (last = line + 1; last < endLine; last++) {
    const current = state.src.slice(state.bMarks[last] + state.tShift[last], state.eMarks[last]);
    const marker = /^(`{3,}|~{3,})(.*)$/.exec(current);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
    }
    if (fence || marker) continue;
    if (openingCollapse.test(current)) depth++;
    if (closingCollapse.test(current) && --depth === 0) break;
  }
  if (depth !== 0) return false;
  if (!silent) {
    const token = state.push('collapse', '', 0);
    token.block = true; token.map = [line, last + 1]; token.content = state.getLines(line + 1, last, state.blkIndent, false);
    token.meta = { summary: (summary[1] ?? summary[2]).replace(/\\(["'\\])/g, '$1'), open: /\bopenByDefault\s*=\s*true\b/.test(match[1]) };
  }
  state.line = last + 1;
  return true;
}

export function createMarkdownParser({ getAsset = value => value } = {}) {
  const md = new MarkdownIt({ html: false, breaks: false, linkify: false, typographer: false });
  md.inline.ruler.before('escape', 'protected_math', mathInline);
  md.block.ruler.before('fence', 'math_block', mathBlock, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
  md.block.ruler.before('fence', 'collapse', collapseBlock, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
  const math = (content, display) => `<span class="shuohui-math${display ? ' shuohui-math-block' : ''}" data-math-source="${md.utils.escapeHtml(content)}" data-math-display="${display}">${md.utils.escapeHtml((display ? '$$' : '$') + content + (display ? '$$' : '$'))}</span>`;
  md.renderer.rules.math_inline = (tokens, i) => math(tokens[i].content, tokens[i].meta.display);
  md.renderer.rules.math_block = (tokens, i) => math(tokens[i].content, true) + '\n';
  md.renderer.rules.collapse = (tokens, i) => {
    const token = tokens[i];
    return `<details${token.meta.open ? ' open' : ''}><summary>${md.renderInline(token.meta.summary)}</summary>${md.render(token.content)}</details>\n`;
  };
  const image = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, i, options, env, renderer) => {
    const token = tokens[i];
    token.attrSet('src', String(getAsset(token.attrGet('src'))));
    token.attrSet('loading', 'lazy');
    return image(tokens, i, options, env, renderer);
  };
  return md;
}

const parser = createMarkdownParser();
export function parsePreviewBlocks(source) {
  const starts = [0];
  for (const match of source.matchAll(/\r\n|\n|\r/g)) starts.push(match.index + match[0].length);
  const tokens = parser.parse(source, {});
  return tokens.filter(token => token.level === 0 && token.map).map(token => {
    const from = starts[token.map[0]] ?? source.length;
    let to = starts[token.map[1]] ?? source.length;
    // The separating line ending stays in the document, not a hidden widget.
    if (source.slice(from, to).endsWith('\r\n')) to -= 2;
    else if (/[\r\n]$/.test(source.slice(from, to))) to--;
    return { from, to, kind: token.type.replace(/_open$/, ''), source: source.slice(from, to) };
  });
}
