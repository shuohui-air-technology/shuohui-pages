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

  function containsRenderableMath(source) {
    if (typeof source !== 'string') return false;

    var cleaned = source
      .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '')
      .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, '')
      .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
      .replace(/(`+)[^\n]*?\1/g, '');

    return /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(^|[^\\$])\$(?!\$)[^$\n]+?\$/m.test(cleaned);
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
      var readyMathJax = getReadyMathJax();
      if (readyMathJax) {
        state = 'ready';
        return Promise.resolve(readyMathJax);
      }

      if (loadingPromise) return loadingPromise;

      state = 'loading';
      var script = doc.createElement('script');
      script.src = runtimeUrl;
      script.async = true;

      var failLoading;
      loadingPromise = new Promise(function (resolve, reject) {
        function fail(error) {
          if (script.parentNode) script.parentNode.removeChild(script);
          state = 'failed';
          loadingPromise = null;
          reject(error);
        }
        failLoading = fail;

        script.onload = function () {
          var loadedMathJax = getReadyMathJax();
          if (!loadedMathJax) {
            fail(new Error('MathJax runtime loaded without typesetPromise'));
            return;
          }
          state = 'ready';
          resolve(loadedMathJax);
        };
        script.onerror = function () {
          fail(new Error('Failed to load MathJax runtime'));
        };
      });

      var currentPromise = loadingPromise;
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
