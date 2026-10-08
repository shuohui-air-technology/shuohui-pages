import { test, expect } from '@playwright/test';
import { openCMS, openEntry, readSaved } from '../fixtures/cms.mjs';
import { parseSourceFile } from '../../src/source-format.mjs';
const source = '---\ntitle: fixture\ndate: 2026-10-01T10:00:00\nmath: false\ndraft: false\ncomments: true\n---\nOriginal **body**\n';
test('saved_not_deployed_never_says_live_and_underscore_public_url', async ({ page }) => {
  await openCMS(page, { 'content/acgn/fixture.md': source });
  await page.getByText('随笔', { exact: true }).first().click(); await openEntry(page, 'fixture');
  await page.getByRole('button', { name: '文章属性', exact: true }).click();
  const field = page.getByRole('textbox', { name: '公开链接名称', exact: true });
  await field.fill('what_is_agent');
  await expect(page.getByText('https://shuohui.uk/acgn/what_is_agent/', { exact: true })).toBeVisible();
  await expect(page.getByText('预计网址；部署成功后生效', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^(Save|保存)$/ }).click();
  await expect.poll(async () => parseSourceFile(await readSaved(page, 'content/acgn/fixture.md')).frontMatter.slug).toBe('what_is_agent');
  expect(parseSourceFile(await readSaved(page, 'content/acgn/fixture.md')).body).toBe(parseSourceFile(source).body);
});
test('url_override_disables_slug_without_altering_source', async ({ page }) => {
  await openCMS(page, { 'content/acgn/fixture.md': source.replace('title: fixture', 'title: fixture\nurl: /custom/path/') });
  await page.getByText('随笔', { exact: true }).first().click(); await openEntry(page, 'fixture');
  await page.getByRole('button', { name: '文章属性', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '公开链接名称', exact: true })).toBeDisabled();
  await expect(page.getByText('https://shuohui.uk/custom/path/', { exact: true })).toBeVisible();
});
