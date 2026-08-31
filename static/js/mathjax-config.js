window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true
  },
  loader: {
    load: ['ui/lazy']
  },
  options: {
    lazyMargin: '200px',
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
  }
};
