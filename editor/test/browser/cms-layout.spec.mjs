import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { openCMS, openEntry, readSaved } from '../fixtures/cms.mjs';
import { parseSourceFile } from '../../src/source-format.mjs';

// Exercise source changes without writing/rebuilding shared generated assets.
async function openPolishedCMS(page, files) {
  const errors = await openCMS(page, files);
  const output = await build({ entryPoints: [new URL('../../src/index.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'esm', target: 'es2022' });
  await page.route('**/admin/editor/editor.js*', route => route.fulfill({ body: output.outputFiles[0].text, contentType: 'application/javascript' }));
  await page.route('**/admin/editor/editor.css*', route => route.fulfill({ body: readFileSync(new URL('../../src/editor.css', import.meta.url), 'utf8'), contentType: 'text/css' }));
  // Install these routes after the fixture's catch-all; route.continue() in
  // that fixture deliberately bypasses older routes. Reload uses no disk build.
  await page.reload();
  const login = page.getByRole('button', { name: /test repo|测试仓库/i });
  await login.or(page.getByText('随笔', { exact: true }).first()).first().waitFor();
  if (await login.isVisible()) await login.click();
  return errors;
}

const body = '起点  \n\n第一行\n第二行\n\n## 标题\n\n正文含 \\alpha 与 _符号_。\n\n结尾  \n';
const source = '---\ntitle: layout fixture\ndate: 2026-10-01T10:00:00\nmath: false\ndraft: false\ncomments: true\n---\n' + body;

for (const [theme, width] of [['light', 1440], ['dark', 1440], ['light', 390]]) {
  test(`actual_CMS_date_draft_native_save_exact_body_${theme}_${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await openPolishedCMS(page, { 'content/acgn/layout.md': source });
    await page.getByText('随笔', { exact: true }).first().click();
    await openEntry(page, 'layout fixture');
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    const date = page.locator('[data-mode="edit"] [data-key-path="date"] input');
    const draft = page.locator('[data-mode="edit"] [data-key-path="draft"] [role="switch"]');
    await expect(date).toBeVisible();
    await expect(draft).toBeVisible();
    await expect(page.locator('[data-mode="edit"] [data-key-path="title"]')).toBeHidden();
    await page.evaluate(() => {
      const selectors = ['[data-key-path="date"] input', '[data-key-path="draft"] [role="switch"]', '.cm-editor'];
      window.layoutControls = selectors.map(selector => document.querySelector('[data-mode="edit"]').querySelector(selector));
      window.layoutParents = layoutControls.map(node => node.parentNode);
    });
    for (const mode of ['source', 'read', 'live']) await page.getByRole('combobox', { name: '写作模式' }).selectOption(mode);
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '文章属性', exact: true }).click();
    expect(await page.evaluate(() => layoutControls.every((node, i) => node.isConnected && node.parentNode === layoutParents[i]))).toBe(true);
    await expect(date).toBeInViewport();
    await expect(draft).toBeInViewport();
    // This is the CMS's switch and datetime input, not an editor-side metadata copy.
    // The locked native input defaults to minute precision; do not change its
    // step or date semantics from the optional layout adapter.
    await date.fill('2026-10-07T12:34');
    await date.press('Tab');
    await draft.click();
    await expect(draft).toHaveAttribute('aria-checked', 'true');
    const save = page.getByRole('button', { name: /^(Save|保存)$/ });
    await expect(save).toBeVisible();
    const icons = page.locator('[data-shuohui-layout] .sui.icon');
    expect(await icons.count()).toBeGreaterThan(0);
    for (const icon of await icons.all()) {
      if (await icon.isVisible()) {
        await expect(icon).toHaveAttribute('data-shuohui-icon', /.+/);
        expect(await icon.evaluate(node => getComputedStyle(node).fontSize)).toBe('0px');
      }
    }
    expect(await page.locator('.cm-editor').evaluate(node => getComputedStyle(node).borderTopWidth)).toBe('0px');
    expect(await page.locator('.cm-scroller').evaluate(node => getComputedStyle(node).fontFamily)).not.toContain('monospace');
    const prose = page.locator('.shuohui-block p').filter({ hasText: '第一行' });
    expect(await prose.evaluate(node => getComputedStyle(node).whiteSpace)).toBe('normal');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('writing.png') });
    await save.click();
    await expect.poll(async () => parseSourceFile(await readSaved(page, 'content/acgn/layout.md')).frontMatter.draft).toBe(true);
    const saved = parseSourceFile(await readSaved(page, 'content/acgn/layout.md'));
    expect(saved.frontMatter.date).toBe('2026-10-07T12:34:00');
    expect(saved.body).toBe(body);
    expect(saved.frontMatter.comments).toBe(true);
    expect(errors).toEqual([]);
  });
}
