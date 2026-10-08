import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { mount } from '../fixtures/harness.mjs';

export async function live(page, source) {
  await mount(page, source);
  // CM state instances must come from the same module graph, not two copies.
  const entry = await build({ stdin: { contents: `import {createDocument} from './src/document-state.mjs'; import {createLivePreview} from './src/live-preview.mjs'; import {renderReading} from './src/reading-preview.mjs'; import {parsePreviewBlocks} from './src/preview-parser.mjs'; window.mountLive=(source)=>{window.doc.destroy(); window.doc=createDocument({parent:document.querySelector('#editor'),value:source,preferences:{continueLists:true,pairBrackets:true},onChange:value=>window.changes.push(value),extensions:createLivePreview({getBlocks:parsePreviewBlocks,renderBlock: block=>renderReading(block.source,{references:block.references}).html})}); doc.view.focus();};`, resolveDir: new URL('../..', import.meta.url).pathname }, bundle: true, write: false, format: 'iife' });
  await page.addStyleTag({ content: readFileSync(new URL('../../src/editor.css', import.meta.url), 'utf8') });
  await page.addScriptTag({ content: entry.outputFiles[0].text });
  await page.evaluate(source => window.mountLive(source), source);
}
test('inactive_block_previews_active_block_shows_source_and_click_maps_back', async ({ page }) => {
  await live(page, '## 标题\n\n普通 **正文**');
  await page.evaluate(() => doc.view.dispatch({ selection: { anchor: doc.view.state.doc.length } }));
  await expect(page.locator('.shuohui-block h2')).toHaveText('标题');
  await page.locator('.shuohui-block h2').click();
  await expect(page.locator('.cm-line').filter({ hasText: '## 标题' })).toBeVisible();
  expect(await page.evaluate(() => changes.length)).toBe(0);
});
test('unchanged_preview_dom_survives_edits_before_it_and_click_tracks_new_offset', async ({ page }) => {
  await live(page, '# active\n\n**preview**');
  await page.evaluate(() => { window.originalPreview = document.querySelector('.shuohui-block'); doc.view.dispatch({ changes: { from: 0, insert: 'abc' } }); });
  expect(await page.evaluate(() => originalPreview === document.querySelector('.shuohui-block'))).toBe(true);
  await page.locator('.shuohui-block strong').click();
  expect(await page.evaluate(() => doc.view.state.selection.main.head)).toBe(13);
});
test('reference_links_refresh_when_another_blocks_definition_changes', async ({ page }) => {
  const source = '[链接][ref]\n\n[ref]: https://example.com/old';
  await live(page, source);
  await page.evaluate(() => doc.view.dispatch({ selection: { anchor: doc.view.state.doc.length } }));
  await expect(page.locator('.shuohui-block a')).toHaveAttribute('href', 'https://example.com/old');
  await page.evaluate(() => {
    const start = doc.view.state.doc.toString().indexOf('old');
    doc.view.dispatch({ changes: { from: start, to: start + 3, insert: 'new' } });
  });
  await expect(page.locator('.shuohui-block a')).toHaveAttribute('href', 'https://example.com/new');
});
test('cross_block_selection_reveals_all_selected_source_and_copy_returns_markdown', async ({ page }) => {
  await live(page, '## 标题\n\n普通 **正文**');
  await page.evaluate(() => doc.view.dispatch({ selection: { anchor: 0, head: doc.view.state.doc.length } }));
  await expect(page.locator('.shuohui-block')).toHaveCount(0);
  const copied = await page.evaluate(() => {
    const data = new DataTransfer();
    doc.view.contentDOM.dispatchEvent(new ClipboardEvent('copy', { bubbles: true, clipboardData: data }));
    return data.getData('text/plain');
  });
  expect(copied).toBe('## 标题\n\n普通 **正文**');
});
test('collapse_toggle_does_not_change_document_and_modes_keep_history', async ({ page }) => {
  const source = '{{< collapse summary="推导" >}}\n\n$x^2$\n\n{{< /collapse >}}\n\n末尾';
  await live(page, source);
  await page.evaluate(() => doc.view.dispatch({ selection: { anchor: doc.view.state.doc.length } }));
  await page.locator('.shuohui-block summary').click();
  await expect(page.locator('.shuohui-block details')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => doc.getSource())).toBe(source);
  for (const mode of ['read', 'source', 'live']) await page.evaluate(mode => doc.setMode(mode), mode);
  expect(await page.evaluate(() => changes.length)).toBe(0);
});
test('narrow_screen_and_incomplete_fence_remain_editable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await live(page, '标题\n\n```text\n未完成');
  await page.evaluate(() => doc.view.dispatch({ selection: { anchor: doc.view.state.doc.length } }));
  await page.keyboard.type('\ncontinued');
  expect(await page.evaluate(() => doc.getSource())).toBe('标题\n\n```text\n未完成\ncontinued');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('keyboard_crosses_preview_and_composition_freezes_structure', async ({ page }) => {
  await live(page, '# 首节\n\n## 次节\n\n末尾');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await expect(page.locator('.cm-line').filter({ hasText: '## 次节' })).toBeVisible();
  const result = await page.evaluate(async () => {
    const input = doc.view.contentDOM;
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    doc.view.dispatch({ changes: { from: doc.view.state.selection.main.head, insert: '中文' } });
    const frozen = input === doc.view.contentDOM && doc.setMode('source') === false;
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await Promise.resolve();
    return { frozen, finished: !doc.isComposing(), body: doc.getSource() };
  });
  expect(result.frozen).toBe(true); expect(result.finished).toBe(true);
  expect(result.body).toContain('中文');
});
