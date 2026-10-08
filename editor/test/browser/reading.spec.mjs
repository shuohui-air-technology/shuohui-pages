import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { parseSourceFile } from '../../src/source-format.mjs';

const bundle = await build({ entryPoints: [new URL('../../src/reading-preview.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'iife', globalName: 'Preview' });
for (const name of ['acgn/what_is_agent.md', 'acgn/what_is_prompt_engineering.md', 'math/latex-格式速记.md']) {
  test('real Chrome reading preview preserves ' + name, async ({ page }) => {
    await page.setContent('<main></main>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const source = parseSourceFile(readFileSync(new URL('../../../content/' + name, import.meta.url), 'utf8')).body;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const result = await page.evaluate(source => {
      const preview = window.Preview.renderReading(source);
      document.querySelector('main').innerHTML = preview.html;
      return { ranges: preview.blocks.every(block => source.slice(block.from, block.to) === block.source), tables: document.querySelectorAll('table').length, math: document.querySelectorAll('[data-math-source]').length };
    }, source);
    expect(result.ranges).toBe(true);
    if (name.includes('latex')) expect(result.math).toBeGreaterThan(20);
    else expect(result.tables).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
test('nested collapse is retained by real Chrome sanitizer', async ({ page }) => {
  await page.setContent('<main></main>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(() => {
    document.querySelector('main').innerHTML = Preview.renderReading('{{< collapse summary="outer" >}}\n\n{{< collapse summary="inner" openByDefault=true >}}\ntext\n{{< /collapse >}}\n\n{{< /collapse >}}').html;
  });
  await expect(page.locator('details')).toHaveCount(2);
  await expect(page.locator('details[open]')).toHaveCount(1);
});
