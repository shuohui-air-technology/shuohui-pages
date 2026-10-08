// Optional preview failure must keep the same external-value/permission contract.
export function mountSourceFallback({ root, props }) {
  let latest = props, source = String(props.value ?? ''), dirty = false, composing = false;
  let newline = source.includes('\r\n') ? '\r\n' : '\n';
  const status = root.ownerDocument.createElement('p'); status.setAttribute('role', 'status');
  status.textContent = '源码模式：预览初始化失败，正文已保留';
  const input = root.ownerDocument.createElement('textarea'); input.value = source; input.readOnly = !!props.readonly;
  input.id = props.forID ?? ''; input.setAttribute('aria-label', '正文源码');
  input.spellcheck = false; input.setAttribute('autocorrect', 'off'); input.setAttribute('autocapitalize', 'off');
  const adopt = root.ownerDocument.createElement('button'); adopt.type = 'button'; adopt.textContent = '采用外部版本'; adopt.hidden = true;
  function apply(next) { source = next; newline = next.includes('\r\n') ? '\r\n' : '\n'; input.value = next; dirty = false; adopt.hidden = true; }
  function changed() {
    if (latest.readonly) return;
    source = input.value.replace(/\r\n/g, '\n').replace(/\n/g, newline);
    dirty = true; latest.onChange(source);
  }
  const begin = () => { composing = true; }, end = () => { composing = false; };
  const accept = () => { if (composing || latest.readonly) return; apply(String(latest.value ?? '')); latest.onChange(source); status.textContent = '已采用外部正文'; };
  input.addEventListener('input', changed); input.addEventListener('compositionstart', begin); input.addEventListener('compositionend', end); adopt.addEventListener('click', accept);
  root.replaceChildren(status, input, adopt);
  return {
    update(next) {
      latest = next; input.readOnly = !!next.readonly;
      const value = String(next.value ?? '');
      if (value === source) return;
      if (dirty || composing) { status.textContent = '检测到外部正文差异，未覆盖当前输入；请确认后采用'; adopt.hidden = !!next.readonly; return; }
      apply(value);
    },
    destroy() { input.removeEventListener('input', changed); input.removeEventListener('compositionstart', begin); input.removeEventListener('compositionend', end); adopt.removeEventListener('click', accept); },
  };
}
