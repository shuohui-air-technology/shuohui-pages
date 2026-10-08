export const validArticleSlug = value => value === '' || (typeof value === 'string' && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value));
export function previewPublicRoute({ entryPath = '', sectionPath, slug = '', baseURL, urlOverride }) {
  try {
    const base = new URL(baseURL);
    if (!/^https?:$/.test(base.protocol)) throw Error();
    if (urlOverride) {
      if (typeof urlOverride !== 'string' || !urlOverride.startsWith('/') || urlOverride.startsWith('//') || /[\\?#]/.test(urlOverride)) throw Error();
      return { url: new URL(urlOverride, base).href, editable: false, reason: '文章使用自定义 url；修改此名称不会改变该网址' };
    }
    if (!validArticleSlug(slug)) return { url: null, editable: true, reason: '只用小写英文、数字、短横线或下划线；不能以符号结尾' };
    const filename = entryPath.split('/').at(-1)?.replace(/\.md$/i, '') ?? '';
    const name = slug || filename.toLowerCase().replace(/\s+/g, '-');
    if (!name) return { url: null, editable: true, reason: '新文章尚无文件名，请填写公开链接名称' };
    if (!sectionPath?.startsWith('/') || /[\\?#]/.test(sectionPath) || sectionPath.startsWith('//')) throw Error();
    return { url: new URL(`${sectionPath.replace(/\/$/, '')}/${encodeURIComponent(name)}/`, base).href, editable: true };
  } catch { return { url: null, editable: false, reason: '无法安全确定公开网址，请检查自定义 url 或站点配置' }; }
}

export function registerPublicRoute(CMS) {
  const React = CMS.React;
  let manifest;
  function Control(props) {
    const [routes, setRoutes] = React.useState(null), [id, setId] = React.useState(null);
    const initial = React.useRef(props.value ?? '');
    const path = props.entry?.get('path') ?? '';
    React.useEffect(() => {
      let alive = true;
      manifest ??= fetch('/admin/editor/public-routes.json').then(response => response.ok ? response.json() : null).catch(() => null);
      void manifest.then(value => { if (alive) setRoutes(value); });
      void crypto.subtle.digest('SHA-256', new TextEncoder().encode(path)).then(bytes => { if (alive) setId([...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')); });
      return () => { alive = false; };
    }, [path]);
    const args = { entryPath: path, sectionPath: `/${props.entry?.get('collection') ?? ''}/`, baseURL: props.field?.get('base_url') ?? location.origin, urlOverride: props.entry?.getIn(['data', 'url']) };
    const result = previewPublicRoute({ ...args, slug: props.value ?? '' });
    const record = routes?.entries?.find(entry => entry.id === id);
    const original = previewPublicRoute({ ...args, slug: initial.current });
    const custom = record && original.url && new URL(original.url).pathname !== new URL(record.canonical, args.baseURL).pathname;
    const conflict = result.url && routes?.entries?.some(entry => entry.id !== id && [entry.canonical, ...entry.aliases].some(route => new URL(route, args.baseURL).href === result.url));
    const reason = custom ? '实际网址使用自定义路由；请先检查路由配置，避免无效修改' : conflict ? '与已有文章或历史链接冲突；请换一个名称，部署校验也会拒绝冲突' : result.reason;
    return React.createElement('div', null,
      React.createElement('input', { id: props.forID, value: props.value ?? '', disabled: props.readonly || !result.editable || !!custom, spellCheck: false, autoCapitalize: 'off', autoCorrect: 'off', 'aria-label': '公开链接名称', 'aria-invalid': !!props.invalid || !validArticleSlug(props.value ?? '') || !!conflict, onChange: event => props.onChange(event.target.value) }),
      React.createElement('p', null, '预计网址；部署成功后生效'),
      result.url && React.createElement('p', null, result.url),
      reason && React.createElement('p', { role: 'alert' }, reason),
      !routes && React.createElement('small', null, '链接占用情况尚未核实；正式部署会检查冲突'));
  }
  CMS.registerFieldType('public-slug', Control);
}
