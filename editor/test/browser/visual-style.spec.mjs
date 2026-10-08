import { test, expect } from '@playwright/test';
import { openCMS, openEntry } from '../fixtures/cms.mjs';

test('rendered_prose_uses_normal_whitespace_without_changing_author_soft_breaks', async ({ page }) => {
  const source = '---\ntitle: style regression\ndate: 2026-10-01T10:00:00\nmath: false\ndraft: false\n---\n起点\n\n第一行\n第二行\n\n末尾';
  const errors = await openCMS(page, { 'content/acgn/style.md': source });
  await page.getByText('随笔', { exact: true }).first().click();
  await openEntry(page, 'style regression');
  const prose = page.locator('.shuohui-block p').filter({ hasText: '第一行' });
  await expect(prose).toBeVisible();
  expect(await prose.evaluate(node => getComputedStyle(node).whiteSpace)).toBe('normal');
  expect(await page.locator('.shuohui-writing .cm-scroller').evaluate(node => getComputedStyle(node).fontFamily)).not.toContain('monospace');
  expect(errors).toEqual([]);
});
