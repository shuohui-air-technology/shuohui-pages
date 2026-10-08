import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
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
