import { readFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { expect } from '@playwright/test';

export async function openCMS(page, files, { missingEditor = false, compatibility, mathjax = false, onMathJaxDownload = () => {} } = {}) {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const config = parse(readFileSync(new URL('../../../static/admin/config.yml', import.meta.url), 'utf8'));
  config.backend = { name: 'test-repo' }; config.locale = 'en';
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (mathjax && url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/mathjax@3.2.2/es5/')) {
      const path = url.pathname.split('/es5/')[1];
      if (path === 'tex-mml-chtml.js') onMathJaxDownload();
      return route.fulfill({ body: readFileSync(new URL('../../node_modules/mathjax/es5/' + path, import.meta.url)), headers: { 'access-control-allow-origin': '*' }, contentType: path.endsWith('.js') ? 'application/javascript' : 'font/woff' });
    }
    if (url.pathname === '/test-empty') return route.fulfill({ body: '<!doctype html><html><body></body></html>', contentType: 'text/html' });
    if (url.origin === 'http://127.0.0.1:8765') {
      if (compatibility && url.pathname === '/admin/editor/compatibility-preview.json') return route.fulfill({ json: compatibility });
      if (url.pathname === '/admin/config.yml') return route.fulfill({ body: stringify(config), contentType: 'text/yaml' });
      if (missingEditor && url.pathname === '/admin/editor/editor.js') return route.abort();
      return route.continue();
    }
    if (url.hostname === 'unpkg.com' && url.pathname === '/@sveltia/cms/dist/sveltia-cms.js') return route.fulfill({ body: readFileSync(new URL('../../../static/admin/vendor/sveltia-cms.js', import.meta.url)), contentType: 'application/javascript' });
    if (url.hostname === 'unpkg.com' && url.pathname === '/immutable@5.1.9/dist/immutable.es.js') return route.fulfill({ body: readFileSync(new URL('../../node_modules/immutable/dist/immutable.es.js', import.meta.url)), contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
    if (url.hostname === 'unpkg.com' && url.pathname.includes('/locales/')) return route.fulfill({ body: readFileSync(new URL('../../../static/admin/vendor/locales/' + url.pathname.split('/').at(-1), import.meta.url)), contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } });
    // No test account or request is capable of writing to GitHub or a real backend.
    return route.abort();
  });
  await page.goto('/test-empty');
  await page.evaluate(async files => {
    const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('sveltia-cms-test', { create: true });
    for (const [path, value] of Object.entries(files)) {
      let directory = root;
      const parts = path.split('/');
      for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part, { create: true });
      const handle = await directory.getFileHandle(parts.at(-1), { create: true });
      const writer = await handle.createWritable(); await writer.write(value); await writer.close();
    }
  }, files);
  await page.goto('/admin/');
  await page.getByRole('button', { name: /test repo|测试仓库/i }).click({ timeout: 10000 });
  return errors;
}
export async function readSaved(page, path) {
  let text;
  await expect.poll(async () => { text = await page.evaluate(async path => {
    try {
    let directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('sveltia-cms-test');
    const parts = path.split('/');
    for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
    return await (await (await directory.getFileHandle(parts.at(-1))).getFile()).text();
    } catch (error) { if (['NotFoundError', 'NotReadableError'].includes(error.name)) return undefined; throw error; }
  }, path); return text !== undefined; }).toBe(true);
  return text;
}
export async function openEntry(page, title) {
  await page.getByText(title, { exact: true }).first().dblclick();
  await expect(page.locator('.shuohui-writing')).toBeVisible({ timeout: 10000 });
}
