(function (root, factory) {
  var api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.ShuohuiMathJaxLoader = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var MATHJAX_RUNTIME_URL =
    'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js';

  function isCurrencyLikeDollar(source, index) {
    return /^\$(?:\d+(?:[.,]\d+)?|\.\d+)(?=$|[\s,.;:!?，。！？、；：~～\-–—)\]}])/.test(
      source.slice(index)
    );
  }

  function containsInlineDollarMath(source) {
    var pattern = /(^|[^\\$])\$(?!\$)([^$\n]+?)\$/gm;
    var match;

    while ((match = pattern.exec(source))) {
      var openingIndex = match.index + match[1].length;
      var closingIndex = openingIndex + match[2].length + 1;
      if (!isCurrencyLikeDollar(source, openingIndex)
          || !isCurrencyLikeDollar(source, closingIndex)) return true;
    }

    return false;
  }

  function containsRenderableMath(source) {
    if (typeof source !== 'string') return false;

    var cleaned = source
      .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '')
      .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, '')
      .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
      .replace(/(`+)[^\n]*?\1/g, '');

    return /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)/.test(cleaned)
      || containsInlineDollarMath(cleaned);
  }

  function createRuntimeLoader(options) {
    var hostWindow = options.hostWindow;
    var doc = options.document;
    var runtimeUrl = options.runtimeUrl || MATHJAX_RUNTIME_URL;
    var state = 'idle';
    var loadingPromise = null;

    function getReadyMathJax() {
      var mathJax = hostWindow && hostWindow.MathJax;
      return mathJax && typeof mathJax.typesetPromise === 'function'
        ? mathJax
        : null;
    }

    function ensure() {
      if (loadingPromise) return loadingPromise;

      var readyMathJax = getReadyMathJax();
      if (readyMathJax) {
        state = 'ready';
        return Promise.resolve(readyMathJax);
      }

      state = 'loading';
      var script = doc.createElement('script');
      script.src = runtimeUrl;
      script.async = true;

      var failLoading;
      var currentPromise;
      var settled = false;
      loadingPromise = new Promise(function (resolve, reject) {
        function fail(error) {
          if (settled) return;
          settled = true;
          if (script.parentNode) script.parentNode.removeChild(script);
          state = 'failed';
          if (loadingPromise === currentPromise) loadingPromise = null;
          reject(error);
        }
        failLoading = fail;

        script.onload = function () {
          if (settled) return;
          var loadedMathJax = getReadyMathJax();
          if (!loadedMathJax) {
            fail(new Error('MathJax runtime loaded without typesetPromise'));
            return;
          }
          settled = true;
          state = 'ready';
          if (loadingPromise === currentPromise) loadingPromise = null;
          resolve(loadedMathJax);
        };
        script.onerror = function () {
          fail(new Error('Failed to load MathJax runtime'));
        };
      });

      currentPromise = loadingPromise;
      try {
        doc.head.appendChild(script);
      } catch (error) {
        failLoading(error);
      }

      return currentPromise;
    }

    function getState() {
      return state;
    }

    return {
      ensure: ensure,
      getState: getState
    };
  }

  return {
    MATHJAX_RUNTIME_URL: MATHJAX_RUNTIME_URL,
    containsRenderableMath: containsRenderableMath,
    createRuntimeLoader: createRuntimeLoader
  };
});
