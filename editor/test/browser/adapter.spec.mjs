import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
test('CMS_readonly_permissions_survive_mode_changes_and_updates', async ({ page }) => {
  await page.route('**/adapter-fixture', route => route.fulfill({ body: '<main><button>Save</button><section data-mode="edit"><div data-key-path="body"><div id="editor"></div></div></section></main>', contentType: 'text/html' }));
  await page.goto('/adapter-fixture');
  const output = await build({ entryPoints: [new URL('../../src/cms-adapter.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'iife', globalName: 'Adapter' });
  await page.addScriptTag({ content: output.outputFiles[0].text });
  await page.evaluate(() => {
    const entry = { get: name => ({ collection: 'acgn', path: 'content/acgn/fixture.md' })[name], getIn: () => false };
    window.adapterProps = { value: 'original', entry, readonly: true, onChange: value => window.changed = value };
    window.controller = Adapter.mountEditor({ root: document.querySelector('#editor'), props: adapterProps });
  });
  await page.getByRole('combobox', { name: '写作模式' }).selectOption('source');
  await page.getByRole('textbox', { name: '正文源码' }).focus(); await page.keyboard.insertText('wrong');
  expect(await page.evaluate(() => controller.doc.getSource())).toBe('original');
  await page.evaluate(() => controller.update({ ...adapterProps, readonly: false }));
  await page.getByRole('textbox', { name: '正文源码' }).focus(); await page.keyboard.insertText('new');
  expect(await page.evaluate(() => controller.doc.getSource())).toContain('new');
  await page.evaluate(() => controller.destroy());
});
