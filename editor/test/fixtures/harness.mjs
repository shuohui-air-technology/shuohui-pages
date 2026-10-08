import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

export async function mount(page, value, preferences = { continueLists: true, pairBrackets: true }) {
  await page.setContent(readFileSync(new URL('./editor.html', import.meta.url), 'utf8'));
  const output = await build({ entryPoints: [new URL('../../src/document-state.mjs', import.meta.url).pathname], bundle: true, write: false, format: 'iife', globalName: 'DocumentApi' });
  await page.addScriptTag({ content: output.outputFiles[0].text });
  await page.evaluate(({ value, preferences }) => {
    window.changes = [];
    window.doc = DocumentApi.createDocument({ parent: document.querySelector('#editor'), value, preferences, onChange: value => changes.push(value) });
    doc.view.focus();
  }, { value, preferences });
}
