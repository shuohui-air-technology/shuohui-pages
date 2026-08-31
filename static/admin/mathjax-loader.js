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

  function hasStrongMathSyntax(body) {
    return /\\[A-Za-z]+|[{}^_=<>()[\]]/.test(body)
      || /\S\s*[+\-*/]\s*\S/.test(body)
      || /(?:\d\s*[A-Za-z]|[A-Za-z]\s*\d)/.test(body);
  }

  function isCurrencyBridgeBody(body) {
    var match = /^(?:\d+(?:[.,]\d+)?|\.\d+)([\s\S]*)$/.exec(body.trim());
    if (!match) return false;

    var tail = match[1].trim();
    if (!tail) return true;
    if (/^(?:USD|EUR|GBP|美元|美金|元)(?:[\s…~～\-–—/.,;:]*)$/i.test(tail)) {
      return true;
    }
    if (/[\u3400-\u9fff，。！？；：、…]/.test(tail)) {
      return !hasStrongMathSyntax(body);
    }
    return /^[\s~～\-–—/.,;:]+$/.test(tail);
  }

  function findInlineDollarPositions(source) {
    var positions = [];
    for (var index = 0; index < source.length; index += 1) {
      if (source.charAt(index) !== '$') continue;
      if (isEscapedDollar(source, index)) continue;
      positions.push(index);
    }
    return positions;
  }

  function isLikelyInlineMath(source, openingIndex, closingIndex) {
    var body = source.slice(openingIndex + 1, closingIndex);
    if (!body.trim() || body.indexOf('\n') !== -1) return false;

    var openingIsCurrency = isCurrencyLikeDollar(source, openingIndex);
    var closingIsCurrency = isCurrencyLikeDollar(source, closingIndex);
    var strongMath = hasStrongMathSyntax(body);
    var currencyBridge = isCurrencyBridgeBody(body);

    if (strongMath && !currencyBridge) return true;
    if (openingIsCurrency && closingIsCurrency) return false;
    if (openingIsCurrency && currencyBridge) return false;
    return true;
  }

  function containsInlineDollarMath(source) {
    var positions = findInlineDollarPositions(source);
    for (var index = 0; index < positions.length - 1;) {
      var openingIndex = positions[index];
      var closingIndex = positions[index + 1];
      if (isLikelyInlineMath(source, openingIndex, closingIndex)) return true;

      var isCurrencyPair = isCurrencyLikeDollar(source, openingIndex)
        && isCurrencyLikeDollar(source, closingIndex);
      var nextCanOpenMath = index + 2 < positions.length
        && isLikelyInlineMath(source, closingIndex, positions[index + 2]);
      index += isCurrencyPair && !nextCanOpenMath ? 2 : 1;
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
        function succeed(loadedMathJax) {
          if (settled) return;
          if (!loadedMathJax) {
            fail(new Error('MathJax runtime loaded without typesetPromise'));
            return;
          }
          settled = true;
          state = 'ready';
          if (loadingPromise === currentPromise) loadingPromise = null;
          resolve(loadedMathJax);
        }
        failLoading = fail;

        script.onload = function () {
          if (settled) return;
          try {
            var loadedMathJax = getReadyMathJax();
            if (loadedMathJax) {
              succeed(loadedMathJax);
              return;
            }

            var mathJax = hostWindow && hostWindow.MathJax;
            var startupPromise = mathJax && mathJax.startup
              && mathJax.startup.promise;
            if (startupPromise && typeof startupPromise.then === 'function') {
              Promise.resolve(startupPromise).then(function () {
                succeed(getReadyMathJax());
              }, fail);
              return;
            }
            fail(new Error('MathJax runtime loaded without typesetPromise'));
          } catch (error) {
            fail(error);
          }
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
