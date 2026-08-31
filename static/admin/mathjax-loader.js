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
    var amount = /^\$(?:\d+(?:[.,]\d+)?|\.\d+)/.exec(source.slice(index));
    if (!amount) return false;
    return source.charAt(index + amount[0].length) !== '$';
  }

  function isEscapedDollar(source, index) {
    var backslashCount = 0;
    for (var cursor = index - 1; cursor >= 0 && source.charAt(cursor) === '\\'; cursor -= 1) {
      backslashCount += 1;
    }
    return backslashCount % 2 === 1;
  }

  function findInlineDollarPositions(source) {
    var positions = [];
    for (var index = 0; index < source.length; index += 1) {
      if (source.charAt(index) !== '$') continue;
      if (source.charAt(index - 1) === '$' || source.charAt(index + 1) === '$') continue;
      if (isEscapedDollar(source, index)) continue;
      positions.push(index);
    }
    return positions;
  }

  function containsInlineDollarMath(source) {
    var positions = findInlineDollarPositions(source);
    for (var index = 0; index < positions.length - 1; index += 1) {
      var openingIndex = positions[index];
      var closingIndex = positions[index + 1];
      var body = source.slice(openingIndex + 1, closingIndex);
      if (!body || body.indexOf('\n') !== -1) continue;
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
