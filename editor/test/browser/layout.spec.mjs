import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

async function focusedFixture(page) {
  await page.setContent(`<main role="group" aria-label="Editor">
    <header><button aria-label="Cancel editing"><span class="sui icon material-symbols-outlined" aria-hidden="true">arrow_back</span></button><button>Save</button><button aria-label="More save options" aria-haspopup="menu"><span class="sui icon material-symbols-outlined" aria-hidden="true">arrow_drop_down</span></button><menu><button>Save and Publish</button></menu></header>
    <section data-mode="edit"><div data-key-path="title"><input aria-label="Title" aria-invalid="false"></div><div data-key-path="slug"><input aria-label="Slug"></div>
    <div data-key-path="date"><header>发布日期</header><input type="datetime-local" value="2026-10-01T10:00:00"></div><div data-key-path="draft"><header>是否为草稿</header><input type="checkbox"></div>
    <div data-key-path="body"><div id="editor" class="shuohui-writing"><div class="shuohui-writing-toolbar"><select aria-label="写作模式"><option>实时预览</option></select><button>文章属性</button><details><summary>更多</summary><button>插入图片</button></details></div><div class="cm-editor cm-focused"><div class="cm-scroller"><div class="cm-content" contenteditable="true" role="textbox" aria-label="正文源码">正文</div></div></div></div></div></section>
    <aside><button aria-label="Validation"><span class="sui icon material-symbols-outlined" aria-hidden="true">check_circle</span></button></aside></main>`);
  await page.addStyleTag({ content: readFileSync(new URL('../../src/editor.css', import.meta.url), 'utf8') });
  const output = await build({ entryPoints: [new URL('../../src/layout-adapter.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'iife', globalName: 'Layout' });
  await page.addScriptTag({ content: output.outputFiles[0].text });
  await page.evaluate(() => {
    window.originalNodes = [...document.querySelectorAll('input, button, #editor')];
    window.originalParents = originalNodes.map(node => node.parentNode);
    window.layout = Layout.attachWritingLayout({ root: document.querySelector('main'), fieldRoot: document.querySelector('#editor') });
  });
}

test('date_draft_and_native_save_publish_stay_visible_without_moving_controls', async ({ page }) => {
  await focusedFixture(page);
  await expect(page.locator('[data-key-path="title"]')).toBeHidden();
  await expect(page.locator('[data-key-path="slug"]')).toBeHidden();
  for (const key of ['date', 'draft', 'body']) await expect(page.locator(`[data-key-path="${key}"]`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save and Publish', exact: true })).toBeVisible();
  for (const show of [true, false, true, false]) await page.evaluate(show => layout.setPropertiesVisible(show), show);
  expect(await page.evaluate(() => originalNodes.every((node, i) => node.isConnected && node.parentNode === originalParents[i]))).toBe(true);
  await page.evaluate(() => layout.destroy());
  await expect(page.locator('[data-key-path="title"]')).toBeVisible();
  await expect(page.locator('[data-shuohui-layout], [data-shuohui-writing-pane], [data-shuohui-icon]')).toHaveCount(0);
});

test('local_icons_keep_semantic_buttons_and_update_new_native_icons', async ({ page }) => {
  await focusedFixture(page);
  const back = page.getByRole('button', { name: 'Cancel editing', exact: true });
  await expect(back.locator('[data-shuohui-icon="arrow_back"]')).toHaveCount(1);
  expect(await back.locator('span').evaluate(node => getComputedStyle(node).fontSize)).toBe('0px');
  expect(await back.locator('span').evaluate(node => getComputedStyle(node, '::before').maskImage)).toContain('data:image/svg+xml');
  await page.evaluate(() => {
    const icon = document.querySelector('aside span'); icon.textContent = 'history';
    const another = icon.cloneNode(true); another.textContent = 'more_vert'; document.querySelector('aside').append(another);
  });
  await expect(page.locator('[data-shuohui-icon="history"]')).toHaveCount(1);
  await expect(page.locator('[data-shuohui-icon="more_vert"]')).toHaveCount(1);
  await expect(back).toHaveAccessibleName('Cancel editing');
});

for (const theme of ['light', 'dark']) test(`quiet_editor_frame_and_keyboard_focus_${theme}`, async ({ page }) => {
  await focusedFixture(page);
  await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
  const styles = await page.locator('.cm-editor').evaluate(node => {
    const css = getComputedStyle(node); return { border: css.borderTopWidth, outline: css.outlineStyle };
  });
  expect(styles).toEqual({ border: '0px', outline: 'none' });
  const select = page.getByRole('combobox', { name: '写作模式' });
  await select.focus();
  expect(await select.evaluate(node => getComputedStyle(node).outlineStyle)).toBe('solid');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unsupported_layout_does_not_hide_properties_or_annotate_icons', async ({ page }) => {
  await focusedFixture(page);
  await page.evaluate(() => { layout.destroy(); document.querySelector('header').remove(); window.layout = Layout.attachWritingLayout({ root: document.querySelector('main'), fieldRoot: document.querySelector('#editor') }); });
  expect(await page.evaluate(() => layout.enabled)).toBe(false);
  await expect(page.locator('[data-key-path="title"]')).toBeVisible();
  await expect(page.locator('[data-shuohui-hidden], [data-shuohui-icon]')).toHaveCount(0);
});
test('validation_error_reveals_properties_without_unmounting_editor_or_save', async ({ page }) => {
  await page.setContent('<main role="group" aria-label="Editor"><header><button>Save</button></header><section data-mode="edit"><div data-key-path="title"><input aria-invalid="false"></div><div data-key-path="body"><div id="editor"></div></div></section></main>');
  const output = await build({ entryPoints: [new URL('../../src/layout-adapter.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'iife', globalName: 'Layout' });
  await page.addScriptTag({ content: output.outputFiles[0].text });
  await page.evaluate(() => { window.layout = Layout.attachWritingLayout({ root: document.querySelector('main'), fieldRoot: document.querySelector('#editor') }); layout.setPropertiesVisible(false); });
  await expect(page.locator('[data-key-path="title"]')).toBeHidden(); await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  await page.evaluate(() => document.querySelector('input').setAttribute('aria-invalid', 'true'));
  await expect(page.locator('[data-key-path="title"]')).toBeVisible();
  expect(await page.evaluate(() => document.querySelector('#editor') !== null)).toBe(true);
  await page.evaluate(() => layout.destroy()); await expect(page.locator('[data-key-path="title"]')).toBeVisible();
});
