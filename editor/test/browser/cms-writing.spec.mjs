import { test, expect } from '@playwright/test';
import { openCMS, openEntry, readSaved } from '../fixtures/cms.mjs';
import { parseSourceFile } from '../../src/source-format.mjs';
import { readFileSync } from 'node:fs';
const source = '---\ntitle: fixture\ndate: 2026-10-01T10:00:00\nmath: false\ndraft: false\ncomments: true\n---\nfirst\n\nlast\n';
for (const eol of ['\n', '\r\n']) test('collapse_insert_positions_caret_inside_content_' + (eol === '\n' ? 'LF' : 'CRLF'), async ({ page }) => {
  await openCMS(page, { 'content/acgn/fixture.md': source.replace(/\n/g, eol) });
  await page.getByText('随笔', { exact: true }).first().click(); await openEntry(page, 'fixture');
  await page.getByRole('combobox', { name: '写作模式' }).selectOption('source');
  await page.getByRole('textbox', { name: '正文源码' }).focus(); await page.keyboard.press('Home');
  await page.locator('.shuohui-writing-toolbar > details').filter({ hasText: '更多' }).locator('summary').click();
  await page.getByRole('button', { name: '插入折叠内容', exact: true }).click(); await page.keyboard.insertText('INS');
  await page.getByRole('button', { name: /^(Save|保存)$/ }).click();
  await expect.poll(async () => parseSourceFile(await readSaved(page, 'content/acgn/fixture.md')).body).toBe('{{< collapse summary="查看详细内容" >}}\n\nINS\n\n{{< /collapse >}}first\n\nlast\n'.replace(/\n/g, eol));
});
test('actual_CMS_uploaded_image_path_is_valid_markdown_after_save', async ({ page }) => {
  await openCMS(page, { 'content/acgn/fixture.md': source });
  await page.getByText('随笔', { exact: true }).first().click(); await openEntry(page, 'fixture');
  await page.getByRole('combobox', { name: '写作模式' }).selectOption('source');
  await page.getByRole('textbox', { name: '正文源码' }).focus(); await page.keyboard.press('Home');
  await page.locator('.shuohui-writing-toolbar > details').filter({ hasText: '更多' }).locator('summary').click();
  await page.getByRole('button', { name: '插入图片', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /^(Upload|上传)$/ }).click();
  await (await chooser).setFiles({ name: 'my picture(1).png', mimeType: 'image/png', buffer: readFileSync(new URL('../../../static/images/lemniscate.png', import.meta.url)) });
  await page.getByRole('button', { name: /^(Insert|插入)$/ }).click();
  await page.getByRole('button', { name: /^(Save|保存)$/ }).click();
  await expect.poll(async () => parseSourceFile(await readSaved(page, 'content/acgn/fixture.md')).body).toMatch(/^!\[图片\]\(\/images\/my%20picture%281%29\.png\)first\n\nlast\n$/);
});
