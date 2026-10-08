import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { mount } from '../fixtures/harness.mjs';
async function start(page) {
  await mount(page, 'original');
  const result = await build({ stdin: { contents: `export {insertMedia} from './src/media-insertion.mjs'; export {createDocument} from './src/document-state.mjs';`, resolveDir: new URL('../..', import.meta.url).pathname }, bundle: true, write: false, format: 'iife', globalName: 'MediaApi' });
  await page.addScriptTag({ content: result.outputFiles[0].text });
  await page.evaluate(() => { doc.destroy(); window.doc = MediaApi.createDocument({ parent: document.querySelector('#editor'), value: 'original', preferences: { continueLists: true, pairBrackets: true }, onChange: value => changes.push(value) }); window.entryId = 'first'; doc.view.dispatch({ selection: { anchor: 8 } }); window.upload = MediaApi.insertMedia({ view: doc.view, entryId, getEntryId: () => window.entryId, pickFile: () => new Promise(resolve => window.finishUpload = resolve) }); });
}
test('typing_while_uploading_is_preserved_and_position_follows_edits', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { doc.view.dispatch({ changes: { from: 0, insert: 'new ' } }); finishUpload({ value: '/images/picture.png' }); });
  await page.evaluate(() => upload);
  expect(await page.evaluate(() => doc.getSource())).toBe('new original![图片](/images/picture.png)');
});
test('media_completion_after_switch_does_not_insert', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { window.entryId = 'second'; finishUpload({ value: '/images/picture.png' }); });
  await page.evaluate(() => upload);
  expect(await page.evaluate(() => doc.getSource())).toBe('original');
});
test('media_failure_keeps_source_and_selection', async ({ page }) => {
  await start(page);
  await page.evaluate(() => finishUpload({ value: 'javascript:alert(1)' }));
  const failed = await page.evaluate(async () => { try { await upload; return false; } catch { return true; } });
  expect(failed).toBe(true); expect(await page.evaluate(() => doc.getSource())).toBe('original');
});
test('media_destination_parentheses_are_encoded', async ({ page }) => {
  await start(page);
  await page.evaluate(() => finishUpload({ value: '/images/my picture(1).png' }));
  await page.evaluate(() => upload);
  expect(await page.evaluate(() => doc.getSource())).toBe('original![图片](/images/my%20picture%281%29.png)');
});
test('media_does_not_insert_after_switching_to_read_only', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { doc.setMode('read'); finishUpload({ value: '/images/a.png' }); });
  await page.evaluate(() => upload);
  expect(await page.evaluate(() => doc.getSource())).toBe('original');
});
