import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fontCSS = readFileSync(new URL('../../../assets/css/fonts/lxgw-wenkai-mono-1.522.css', import.meta.url), 'utf8');
const typography = readFileSync(new URL('../../../assets/css/article-typography.css', import.meta.url), 'utf8');
const fixtureNames = new Set(['a2a0e390d23e112b.woff2', '47d4cb91a90d76fd.woff2']);

async function openArticle(page, failed = false) {
  const session = await page.context().newCDPSession(page);
  // Exercise visitors who do not have the owner's desktop font installed.
  await session.send('CSS.enable').catch(async () => { await session.send('DOM.enable'); await session.send('CSS.enable'); });
  await session.send('CSS.setLocalFontsEnabled', { enabled: false });
  const requests = [];
  await page.route('https://fontsapi.zeoseven.com/293/main/**', route => {
    const name = new URL(route.request().url()).pathname.split('/').pop(); requests.push(name);
    if (failed || !fixtureNames.has(name)) return route.abort();
    return route.fulfill({ body: readFileSync(new URL('../fixtures/fonts/' + name, import.meta.url)), contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
  });
  await page.setContent(`<style>${fontCSS}\n${typography}</style><nav>中文AI</nav><article class="post-single"><h1>中文AI</h1><p>中文AI</p><pre><code>AI</code></pre></article>`);
  await page.evaluate(() => document.fonts.ready);
  return { session, requests };
}

async function fontsFor(session, selector) {
  await session.send('DOM.enable');
  const { root } = await session.send('DOM.getDocument');
  const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  return (await session.send('CSS.getPlatformFontsForNode', { nodeId })).fonts;
}

test('article_prose_uses_actual_WenKai_web_glyphs_and_only_required_subsets', async ({ page }) => {
  const { session, requests } = await openArticle(page);
  const fonts = await fontsFor(session, '.post-single p');
  expect(fonts.filter(font => font.glyphCount > 0).every(font => font.familyName === 'LXGW WenKai Mono' && font.isCustomFont)).toBe(true);
  expect(fonts.reduce((total, font) => total + font.glyphCount, 0)).toBe(4);
  expect(new Set(requests)).toEqual(fixtureNames);
  expect(await page.locator('nav').evaluate(node => getComputedStyle(node).fontFamily)).not.toContain('LXGW');
  expect((await fontsFor(session, 'code')).some(font => font.familyName.includes('WenKai'))).toBe(false);
  await expect(page.locator('.post-single p')).toBeVisible();
});

test('unavailable_web_font_keeps_article_visible_with_system_fallback', async ({ page }) => {
  const { session } = await openArticle(page, true);
  await expect(page.locator('.post-single p')).toBeVisible();
  const fonts = await fontsFor(session, '.post-single p');
  expect(fonts.some(font => font.glyphCount > 0 && !font.isCustomFont)).toBe(true);
  expect(fonts.some(font => font.familyName.includes('WenKai'))).toBe(false);
});
