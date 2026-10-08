import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { openCMS, openEntry } from '../fixtures/cms.mjs';

test('actual_CMS_math_filters_unsafe_URLs_and_author_styles_without_rewriting_source', async ({ page }, testInfo) => {
  const source = '---\ntitle: safe math\ndate: 2026-10-01T10:00:00\nmath: true\ndraft: false\n---\nintro\n\n$\\href{javascript:window.auditProof=1}{click}$\n\n$\\href{https://example.com}{safe}$\n\n$\\style{position:fixed;top:0}{x}$';
  // Exercise current production source without overwriting generated assets
  // that another worker may be rebuilding. Register after the fixture catch-all.
  const bundle = await build({ entryPoints: [new URL('../../src/index.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'esm' });
  const opening = openCMS(page, { 'content/math/safe.md': source }, { mathjax: true });
  await page.route('**/admin/editor/editor.js*', route => route.fulfill({ body: bundle.outputFiles[0].text, contentType: 'application/javascript' }));
  const errors = await opening;
  await page.getByText('学术推导与笔记', { exact: true }).first().click(); await openEntry(page, 'safe math');
  await page.getByRole('combobox', { name: '写作模式' }).selectOption('read');
  await expect(page.locator('mjx-container')).toHaveCount(3, { timeout: 20000 });
  expect(await page.evaluate(() => MathJax.config.loader.load)).toContain('ui/safe');
  await testInfo.attach('math-output.json', { body: JSON.stringify(await page.locator('mjx-container').evaluateAll(nodes => nodes.map(node => ({
    html: node.outerHTML, rect: node.getBoundingClientRect().toJSON(),
    children: [...node.querySelectorAll('a, mjx-math, mjx-mrow, mjx-c')].map(child => {
      const style = getComputedStyle(child), before = getComputedStyle(child, '::before');
      return { tag: child.tagName, class: child.className, rect: child.getBoundingClientRect().toJSON(), display: style.display, visibility: style.visibility, font: style.font, before: { content: before.content, display: before.display, font: before.font } };
    }),
    stylesheets: [...document.querySelectorAll('style[id^="MJX"]')].map(style => ({ id: style.id, css: style.textContent })),
  }))), null, 2), contentType: 'application/json' });
  const cdp = await page.context().newCDPSession(page);
  try {
    await testInfo.attach('math-layout-cdp.json', { body: JSON.stringify(await cdp.send('DOMSnapshot.captureSnapshot', { computedStyles: ['display', 'visibility', 'font-family', 'font-size', 'content'], includeDOMRects: true })), contentType: 'application/json' });
  } finally { await cdp.detach(); }
  await testInfo.attach('math-preview.png', { body: await page.screenshot(), contentType: 'image/png' });
  expect(await page.locator('mjx-container [href^="javascript:"], mjx-container [style*="position: fixed"]').count()).toBe(0);
  await expect(page.locator('mjx-container a[href="https://example.com"]')).toBeVisible();
  // Assistive MathML can look readable even when the actual CHTML glyphs have
  // no stylesheet and zero width. Verify the visible renderer, not its fallback.
  await expect(page.locator('mjx-container a[href="https://example.com"] mjx-c')).toHaveCount(4);
  await expect.poll(async () => page.locator('mjx-container mjx-math mjx-c').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect(), before = getComputedStyle(node, '::before');
    return rect.width > 0 && rect.height > 0 && !['none', 'normal', '""'].includes(before.content);
  }))).toEqual(Array(10).fill(true));
  expect(await page.locator('style#MJX-CHTML-styles').count()).toBe(1);
  await page.getByRole('combobox', { name: '写作模式' }).selectOption('source');
  await expect(page.getByRole('textbox', { name: '正文源码' })).toContainText('javascript:window.auditProof=1');
  expect(errors).toEqual([]);
});

test('actual_shared_MathJax_macro_state_is_isolated_between_editor_documents', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/**', route => {
    const path = new URL(route.request().url()).pathname.split('/es5/')[1];
    return route.fulfill({ body: readFileSync(new URL('../../node_modules/mathjax/es5/' + path, import.meta.url)), headers: { 'access-control-allow-origin': '*' }, contentType: path.endsWith('.js') ? 'application/javascript' : 'font/woff' });
  });
  await page.setContent('<main></main>');
  await page.addScriptTag({ content: readFileSync(new URL('../../../static/js/mathjax-config.js', import.meta.url), 'utf8') });
  await page.evaluate(() => { MathJax.startup = { typeset: false }; });
  await page.addScriptTag({ content: readFileSync(new URL('../../../static/admin/mathjax-loader.js', import.meta.url), 'utf8') });
  const output = await build({ entryPoints: [new URL('../../src/math-scheduler.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'iife', globalName: 'Scheduler' });
  await page.addScriptTag({ content: output.outputFiles[0].text });
  await page.evaluate(() => {
    const loader = ShuohuiMathJaxLoader.createRuntimeLoader({ hostWindow: window, document });
    window.renderDocument = source => {
      const node = document.createElement('span'); document.querySelector('main').append(node);
      window.scheduler = Scheduler.createMathScheduler({ ensureMathJax: () => loader.ensure() });
      scheduler.setVisible([node]); scheduler.request(node, source, 1);
    };
    renderDocument('\\newcommand{\\auditedmacro}{LEAK}\\auditedmacro');
  });
  await expect(page.locator('mjx-container')).toHaveCount(1, { timeout: 20000 });
  await expect(page.locator('mjx-assistive-mml')).toContainText('LEAK');
  await page.evaluate(() => { scheduler.destroy(); document.querySelector('main').replaceChildren(); renderDocument('\\auditedmacro'); });
  await expect(page.locator('mjx-container')).toHaveCount(1, { timeout: 10000 });
  await expect(page.locator('mjx-assistive-mml')).not.toContainText('LEAK');
  await expect(page.locator('mjx-assistive-mml')).toContainText('\\auditedmacro');
  await page.evaluate(() => scheduler.destroy());
});
