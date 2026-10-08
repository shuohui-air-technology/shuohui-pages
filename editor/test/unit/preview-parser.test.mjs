import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const api = await import('../../src/preview-parser.mjs').catch(() => ({}));
const reading = await import('../../src/reading-preview.mjs').catch(() => ({}));
const window = new JSDOM('').window;
const render = source => { assert.equal(typeof reading.renderReading, 'function'); return reading.renderReading(source, { window }).html; };

test('math_backslashes_survive_parser', () => {
  const source = '$x_1\\alpha$\n\n$$\n\\int_0^1 x^2\\,dx\n$$';
  const html = render(source);
  assert.ok(html.includes('x_1\\alpha'));
  assert.ok(html.includes('\\int_0^1 x^2\\,dx'));
  assert.equal((html.match(/data-math-source=/g) || []).length, 2);
});
test('fenced_shortcode_stays_literal', () => {
  const html = render('~~~text\n{{< collapse summary="test" >}}\n$x$\n{{< /collapse >}}\n~~~');
  assert.equal(html.includes('<details'), false);
  assert.equal(html.includes('data-math-source'), false);
  assert.ok(html.includes('collapse'));
});
test('currency_not_math', () => {
  assert.equal(render('Costs $5 and $10, escaped \\$x\\$.').includes('data-math-source'), false);
});
test('nested_collapse_has_correct_ranges', () => {
  const source = '{{< collapse summary="外层" >}}\n\n{{< collapse summary="内层" openByDefault=true >}}\n$x$\n{{< /collapse >}}\n\n{{< /collapse >}}';
  assert.equal((render(source).match(/<details/g) || []).length, 2);
  assert.ok(render(source).includes('open=""'));
  assert.equal(api.parsePreviewBlocks(source)[0].source, source);
});
test('unknown_shortcode_visible_and_unclosed_markers_editable', () => {
  const html = render('{{< unknown name="text" >}}\n\n{{< collapse summary="未闭合" >}}');
  assert.ok(html.includes('unknown'));
  assert.equal(html.includes('<details'), false);
});
test('dangerous_html_never_executes', () => {
  const html = render('<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n<img src=x onerror="alert(1)">');
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('<img src="x"'), false);
  assert.equal(html.includes('href="javascript:'), false);
});
test('emoji_offsets_are_utf16', () => {
  assert.equal(typeof api.parsePreviewBlocks, 'function');
  const source = '# 😀标题\r\n\r\n正文 **文字**\r\n\r\n| a | b |\r\n|---|---|\r\n| 1 | 2 |';
  const blocks = api.parsePreviewBlocks(source);
  assert.equal(blocks.length, 3);
  for (const block of blocks) assert.equal(source.slice(block.from, block.to), block.source);
  assert.equal(blocks[1].from, source.indexOf('正文'));
});
test('asset_resolver_does_not_rewrite_source', () => {
  const source = '![图片](/images/original.png)';
  const result = reading.renderReading(source, { window, getAsset: value => '/resolved' + value });
  assert.ok(result.html.includes('src="/resolved/images/original.png"'));
  assert.equal(result.blocks[0].source, source);
});
test('real_articles_keep_tables_fences_and_math_in_reading_preview', () => {
  for (const name of ['acgn/what_is_agent.md', 'acgn/what_is_prompt_engineering.md', 'math/latex-格式速记.md']) {
    const source = readFileSync(new URL('../../../content/' + name, import.meta.url), 'utf8');
    assert.ok(render(source).length > 100);
    const blocks = api.parsePreviewBlocks(source);
    for (const block of blocks) assert.equal(source.slice(block.from, block.to), block.source, name);
    if (name.includes('latex')) assert.ok(render(source).includes('data-math-source'));
    else assert.ok(render(source).includes('<table'));
  }
});
test('soft_line_break_matches_goldmark_instead_of_forcing_br', () => {
  assert.equal(render('line 1\nline 2'), '<p>line 1\nline 2</p>\n');
});
