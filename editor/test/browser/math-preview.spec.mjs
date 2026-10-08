import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

test('actual_mathjax_322_loads_once_and_only_math_placeholders_render', async ({ page }) => {
  let downloads = 0;
  await page.route('https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/es5/')[1];
    if (path === 'tex-mml-chtml.js') downloads++;
    await route.fulfill({ body: readFileSync(new URL('../../node_modules/mathjax/es5/' + path, import.meta.url)), headers: { 'access-control-allow-origin': '*' }, contentType: path.endsWith('.js') ? 'application/javascript' : 'font/woff' });
  });
  await page.setContent('<main></main>');
  await page.addScriptTag({ content: readFileSync(new URL('../../../static/js/mathjax-config.js', import.meta.url), 'utf8') });
  await page.evaluate(() => { MathJax.startup = { typeset: false }; });
  await page.addScriptTag({ content: readFileSync(new URL('../../../static/admin/mathjax-loader.js', import.meta.url), 'utf8') });
  const output = await build({ stdin: { contents: `export {renderReading} from './src/reading-preview.mjs'; export {createMathScheduler} from './src/math-scheduler.mjs';`, resolveDir: new URL('../..', import.meta.url).pathname }, bundle: true, write: false, format: 'iife', globalName: 'MathPreview' });
  await page.addScriptTag({ content: output.outputFiles[0].text });
  await page.evaluate(() => {
    document.querySelector('main').innerHTML = MathPreview.renderReading('Cost $5 and $10.\n\n~~~text\n$x$\n~~~\n\n$\\int_0^1 x^2\\,dx$\n\n$$x^2+y^2$$').html;
    const loader = ShuohuiMathJaxLoader.createRuntimeLoader({ hostWindow: window, document });
    window.scheduler = MathPreview.createMathScheduler({ ensureMathJax: () => loader.ensure() });
    const nodes = [...document.querySelectorAll('[data-math-source]')];
    scheduler.setVisible(nodes);
    nodes.forEach(node => scheduler.request(node, node.dataset.mathSource, 1));
  });
  await expect(page.locator('mjx-container')).toHaveCount(2, { timeout: 15000 });
  expect(downloads).toBe(1);
  expect(await page.evaluate(() => MathJax.version)).toBe('3.2.2');
  await expect(page.locator('code')).toHaveText('$x$');
  await expect(page.locator('p').first()).toHaveText('Cost $5 and $10.');
  await page.evaluate(() => scheduler.destroy());
});
