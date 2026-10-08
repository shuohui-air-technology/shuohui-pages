import { registerSourceFormat } from './source-format.mjs';
const scriptURL = document.currentScript.src;
const CMS = window.CMS;
registerSourceFormat(CMS);
async function start() {
  try {
    const editor = await import(new URL(`editor.js?v=${__EDITOR_VERSION__}`, scriptURL).href);
    editor.registerEditor(CMS);
    editor.registerPublicRoute(CMS);
  } catch {
    const React = CMS.React;
    function SourceFallback(props) {
      const original = String(props.value ?? ''), newline = original.includes('\r\n') ? '\r\n' : '\n';
      return React.createElement('div', { className: 'shuohui-writing' },
        React.createElement('p', { role: 'status' }, '源码模式：编辑器加载失败，正文已保留；刷新可重试'),
        React.createElement('textarea', { id: props.forID, value: original, 'aria-label': '正文源码', spellCheck: false, autoCorrect: 'off', autoCapitalize: 'off', onChange: event => props.onChange(event.target.value.replace(/\r\n/g, '\n').replace(/\n/g, newline)) }));
    }
    CMS.registerFieldType('source-markdown', SourceFallback);
    CMS.registerFieldType('public-slug', CMS.getFieldType('string').control);
  }
  CMS.init();
}
void start();
