import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseSourceFile } from '../../src/source-format.mjs';
import { openCMS, openEntry, readSaved } from '../fixtures/cms.mjs';

const content = new URL('../../../content/', import.meta.url);
const articles = readdirSync(content, { recursive: true }).filter(name => name.endsWith('.md') && !name.endsWith('_index.md'));
for (const path of articles) {
  test('actual CMS preserves existing body: ' + path, async ({ page }) => {
    const source = readFileSync(new URL(path, content), 'utf8'), original = parseSourceFile(source);
    const errors = await openCMS(page, { ['content/' + path]: source });
    await page.getByText(path.startsWith('math/') ? '学术推导与笔记' : '随笔', { exact: true }).first().click();
    await openEntry(page, original.frontMatter.title);
    for (const mode of ['source', 'read', 'live']) await page.getByRole('combobox', { name: '写作模式' }).selectOption(mode);
    await page.getByRole('button', { name: '文章属性', exact: true }).click();
    await page.locator('[data-key-path="title"] input').fill(original.frontMatter.title + ' (test)');
    await page.getByRole('button', { name: /^(Save|保存)$/ }).click();
    await expect.poll(async () => parseSourceFile(await readSaved(page, 'content/' + path)).frontMatter.title).toBe(original.frontMatter.title + ' (test)');
    const saved = parseSourceFile(await readSaved(page, 'content/' + path));
    expect(saved.body).toBe(original.body);
    for (const field of ['date', 'draft', 'math', 'comments']) if (Object.hasOwn(original.frontMatter, field)) expect(saved.frontMatter[field]).toEqual(original.frontMatter[field]);
    expect(errors).toEqual([]);
  });
}
test('unknown_frontmatter_crlf_survives_and_missing_bundle_falls_back_losslessly', async ({ page }) => {
  const source = '---\r\ntitle: fixture\r\ndate: 2026-10-01T10:00:00\r\nmath: false\r\ndraft: false\r\ncomments: true\r\ncustom_string: "  raw  "\r\ncustom:\r\n  values: [one, two]\r\n---\r\n\r\n$x_1\\alpha$  \r\n\r\n';
  await openCMS(page, { 'content/acgn/fixture.md': source }, { missingEditor: true });
  await page.evaluate(() => { window.boundaryTrace = []; CMS.registerEventListener({ name: 'preSave', handler({ entry }) { boundaryTrace.push({ body: entry.getIn(['data', 'body']), snapshot: entry.getIn(['data', '_shuohui_source_snapshot']) }); } }); });
  await page.getByText('随笔', { exact: true }).first().click(); await openEntry(page, 'fixture');
  await expect(page.getByText(/源码模式.*保留/)).toBeVisible();
  await page.locator('[data-key-path="title"] input').fill('fixture changed');
  await page.getByRole('button', { name: /^(Save|保存)$/ }).click();
  await expect.poll(async () => parseSourceFile(await readSaved(page, 'content/acgn/fixture.md')).frontMatter.title).toBe('fixture changed');
  const saved = parseSourceFile(await readSaved(page, 'content/acgn/fixture.md'));
  expect(await page.evaluate(() => boundaryTrace[0].body)).toBe('\r\n$x_1\\alpha$  \r\n\r\n');
  expect(saved.body).toBe('\r\n$x_1\\alpha$  \r\n\r\n'); expect(saved.frontMatter.custom).toEqual({ values: ['one', 'two'] });
  expect(saved.frontMatter.custom_string).toBe('  raw  ');
  expect(await readSaved(page, 'content/acgn/fixture.md')).not.toContain('_shuohui_source_snapshot');
});
test('legacy_display_only_and_first_edit_reminder_once', async ({ page }) => {
  const path = 'content/acgn/fixture.md', body = 'raw source';
  const hash = value => createHash('sha256').update(value).digest('hex');
  await openCMS(page, { [path]: '---\ntitle: fixture\ndate: 2026-10-01T10:00:00\nmath: false\ndraft: false\ncomments: true\n---\n' + body }, { compatibility: { entries: { [hash(path)]: { bodyHash: hash(body), renderedMarkdown: '**legacy display**', mathPolicy: { math: false, legacyMathDirectory: false } } } } });
  await page.getByText('随笔', { exact: true }).first().click(); await openEntry(page, 'fixture');
  await page.getByRole('combobox', { name: '写作模式' }).selectOption('read');
  await expect(page.locator('.shuohui-block strong')).toHaveText('legacy display');
  await page.getByRole('combobox', { name: '写作模式' }).selectOption('source');
  await page.getByRole('textbox', { name: '正文源码' }).click(); await page.keyboard.press('End'); await page.keyboard.type('!');
  await expect(page.getByRole('status').filter({ hasText: '本篇原有自动排版将不再套用' })).toBeVisible();
  await page.keyboard.type('?');
  await page.getByRole('combobox', { name: '写作模式' }).selectOption('read');
  await expect(page.locator('.shuohui-block strong')).toHaveCount(0);
  await page.getByRole('button', { name: /^(Save|保存)$/ }).click();
  await expect.poll(async () => parseSourceFile(await readSaved(page, path)).body).toBe('raw source!?');
});
