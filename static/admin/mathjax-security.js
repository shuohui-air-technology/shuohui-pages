// Admin-only policy; author TeX remains literal in saved Markdown.
window.MathJax.loader.load.push('ui/safe');
window.MathJax.options.safeOptions = {
  allow: { URLs: 'safe', classes: 'safe', cssIDs: 'safe', styles: 'safe' },
  safeProtocols: { http: true, https: true, file: false, javascript: false, data: false }
};
