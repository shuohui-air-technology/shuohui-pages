import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { openCMS, openEntry, readSaved } from '../fixtures/cms.mjs';
import { parseSourceFile } from '../../src/source-format.mjs';
import { metrics, writePerformanceReport } from '../performance-report.mjs';
const content = new URL('../../../content/', import.meta.url);
const longest = readdirSync(content, { recursive: true }).filter(path => path.endsWith('.md') && !path.endsWith('_index.md')).map(path => ({ path, source: readFileSync(new URL(path, content), 'utf8') })).sort((a, b) => b.source.length - a.source.length)[0];
let pressure = '# pressure\n\n开始写作\n\n' + Array.from({ length: 2000 }, (_, i) => `第 ${i} 段说明，保留数学公式和中文段落。\n\n$$\nx_{${i}}^2+\\alpha=\\frac{1}{1+x}\n$$\n\n`).join('');
pressure += '正文文字'.repeat(Math.ceil((150000 - pressure.length) / 4)).slice(0, 150000 - pressure.length);
for (const fixture of [{ name: 'longest', path: 'content/' + longest.path, source: longest.source, duration: 30000 }, { name: '150k-2000math', path: 'content/math/pressure.md', source: '---\ntitle: pressure\ndate: 2026-10-01T10:00:00\nmath: true\ndraft: false\ncomments: true\n---\n' + pressure, duration: 30000 }]) {
  test('actual_CMS_performance_' + fixture.name, async ({ page, browser }, testInfo) => {
    test.setTimeout(100000);
    let downloads = 0;
    const opening = Date.now();
    // Register before CMS's general interceptor. The specific handler is added
    // by the fixture and never accesses a real backend.
    const errors = await openCMS(page, { [fixture.path]: fixture.source }, { mathjax: true, onMathJaxDownload: () => downloads++ });
    const original = parseSourceFile(fixture.source);
    await page.getByText(fixture.path.startsWith('content/math/') ? '学术推导与笔记' : '随笔', { exact: true }).first().click();
    await openEntry(page, original.frontMatter.title);
    const openMs = Date.now() - opening;
    await page.getByRole('textbox', { name: '正文源码' }).focus();
    await page.keyboard.press('Home');
    if (fixture.name === '150k-2000math') await expect(page.locator('mjx-container').first()).toBeVisible({ timeout: 20000 });
    await page.evaluate(() => {
      window.typingMetrics = { samples: [], longTasks: [], trusted: [], begin: performance.now() };
      const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) typingMetrics.longTasks.push(entry.duration); }); observer.observe({ type: 'longtask' }); window.typingObserver = observer;
      document.addEventListener('beforeinput', event => { if (!event.target.closest('.cm-content')) return; const start = performance.now(); typingMetrics.trusted.push(event.isTrusted); requestAnimationFrame(() => typingMetrics.samples.push(performance.now() - start)); }, true);
    });
    const start = Date.now(); let inserted = '';
    while (Date.now() - start < fixture.duration) { await page.keyboard.insertText('a'); inserted += 'a'; await page.waitForTimeout(100); }
    await page.waitForTimeout(600);
    const measured = await page.evaluate(() => { typingObserver.disconnect(); return { ...typingMetrics, elapsedMs: performance.now() - typingMetrics.begin, browser: navigator.userAgent }; });
    const report = { ...metrics(measured.samples), openMs, chars: original.body.length, formulaCount: (original.body.match(/\$\$/g) ?? []).length / 2, elapsedMs: measured.elapsedMs, longTasks: measured.longTasks, blockingMs: Math.max(0, ...measured.longTasks), mathJaxDownloads: downloads, browserVersion: browser.version(), userAgent: measured.browser, gzipBytes: JSON.parse(readFileSync(new URL('../../../static/admin/editor/build-manifest.json', import.meta.url))).gzipBytes };
    await writePerformanceReport(fixture.name, report);
    await testInfo.attach('performance.json', { body: JSON.stringify(report), contentType: 'application/json' });
    await page.getByRole('button', { name: /^(Save|保存)$/ }).click();
    await expect.poll(async () => parseSourceFile(await readSaved(page, fixture.path)).body.length).toBe(original.body.length + inserted.length);
    const saved = parseSourceFile(await readSaved(page, fixture.path)).body;
    expect(saved.replace(inserted, '')).toBe(original.body);
    expect(errors).toEqual([]); expect(measured.trusted.every(Boolean)).toBe(true);
    expect(report.elapsedMs).toBeGreaterThanOrEqual(30000); expect(report.samples).toBeGreaterThan(100);
    expect(report.p95Ms).toBeLessThanOrEqual(50); expect(report.blockingMs).toBeLessThanOrEqual(200);
    expect(report.gzipBytes).toBeLessThanOrEqual(300 * 1024);
    if (fixture.name === '150k-2000math') expect(downloads).toBe(1);
    else expect(downloads).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('writing.png') });
  });
}
