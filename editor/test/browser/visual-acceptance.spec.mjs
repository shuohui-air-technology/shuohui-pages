import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openCMS, openEntry, readSaved } from '../fixtures/cms.mjs';
import { parseSourceFile } from '../../src/source-format.mjs';
for (const path of ['acgn/what_is_agent.md','acgn/what_is_prompt_engineering.md','math/latex-格式速记.md']) {
  test('visual_edit_undo_save_preserves_' + path, async ({ page }, testInfo) => {
    const source = readFileSync(new URL('../../../content/' + path, import.meta.url), 'utf8'), original = parseSourceFile(source);
    const errors = await openCMS(page, { ['content/' + path]: source }, { mathjax: true });
    await page.getByText(path.startsWith('math/') ? '学术推导与笔记' : '随笔', { exact: true }).first().click(); await openEntry(page, original.frontMatter.title);
    await page.getByRole('combobox', { name: '写作模式' }).selectOption('source');
    await page.getByRole('textbox', { name: '正文源码' }).focus(); await page.keyboard.press('Home'); await page.keyboard.insertText('验收');
    for (const mode of ['read','live','source']) await page.getByRole('combobox', { name: '写作模式' }).selectOption(mode);
    await page.getByRole('textbox', { name: '正文源码' }).focus(); await page.keyboard.press('Meta+z');
    await page.getByRole('combobox', { name: '写作模式' }).selectOption('live');
    await page.screenshot({ path: testInfo.outputPath('writing.png') });
    await page.getByRole('button', { name: '文章属性', exact: true }).click();
    await page.locator('[data-key-path="title"] input').fill(original.frontMatter.title + ' (acceptance)');
    await page.getByRole('button', { name: /^(Save|保存)$/ }).click();
    await expect.poll(async () => parseSourceFile(await readSaved(page, 'content/' + path)).frontMatter.title).toBe(original.frontMatter.title + ' (acceptance)');
    expect(parseSourceFile(await readSaved(page, 'content/' + path)).body).toBe(original.body);
    expect(errors).toEqual([]);
  });
}
