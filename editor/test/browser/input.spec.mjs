import { test, expect } from '@playwright/test';
import { mount } from '../fixtures/harness.mjs';

test('one_undo_reverts_assistance_and_empty_list_exits', async ({ page }) => {
  await mount(page, '- item');
  await page.evaluate(() => doc.view.dispatch({ selection: { anchor: doc.view.state.doc.length } }));
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => doc.getSource())).toBe('- item\n- ');
  await page.keyboard.press('Meta+z');
  expect(await page.evaluate(() => doc.getSource())).toBe('- item');
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => doc.getSource())).toBe('- item\n');
});
test('assistance_off_is_literal_and_currency_does_not_pair', async ({ page }) => {
  await mount(page, '', { continueLists: false, pairBrackets: false });
  await page.keyboard.type('($5');
  expect(await page.evaluate(() => doc.getSource())).toBe('($5');
  await mount(page, '');
  await page.keyboard.type('$5');
  expect(await page.evaluate(() => doc.getSource())).toBe('$5');
});
test('composition_defers_structure_changes_without_replacing_input_node', async ({ page }) => {
  await mount(page, '# 原始标题');
  const result = await page.evaluate(() => {
    const element = doc.view.contentDOM;
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    doc.view.dispatch({ changes: { from: doc.view.state.doc.length, insert: '中文' } });
    const composing = doc.isComposing();
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '中文' }));
    return { composing, same: doc.view.contentDOM === element, source: doc.getSource() };
  });
  expect(result).toEqual({ composing: true, same: true, source: '# 原始标题中文' });
});
test('mode_switch_keeps_selection_history_and_multiline_paste', async ({ page }) => {
  await mount(page, 'initial');
  await page.evaluate(() => { doc.view.dispatch({ changes: { from: 7, insert: '\n\n$x_1\\alpha$\n' }, selection: { anchor: 9 } }); doc.setMode('read'); doc.setMode('source'); doc.setMode('live'); });
  expect(await page.evaluate(() => doc.view.state.selection.main.head)).toBe(9);
  await page.keyboard.press('Meta+z');
  expect(await page.evaluate(() => doc.getSource())).toBe('initial');
});
test('selection_wrap_and_escaped_bracket_are_undoable', async ({ page }) => {
  await mount(page, 'word');
  await page.evaluate(() => doc.view.dispatch({ selection: { anchor: 0, head: 4 } }));
  await page.keyboard.type('(');
  expect(await page.evaluate(() => doc.getSource())).toBe('(word)');
  await page.keyboard.press('Meta+z');
  expect(await page.evaluate(() => doc.getSource())).toBe('word');
  await mount(page, '\\');
  await page.evaluate(() => doc.view.dispatch({ selection: { anchor: 1 } }));
  await page.keyboard.type('(');
  expect(await page.evaluate(() => doc.getSource())).toBe('\\(');
});
