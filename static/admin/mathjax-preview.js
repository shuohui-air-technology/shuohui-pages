(function (root, factory) {
  var api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.ShuohuiMathJaxPreview = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var PREVIEW_SELECTOR = '[role="document"]';
  var ACTIVE_POLL_MS = 500;
  var IDLE_POLL_MS = 2000;
  var LOG_PREFIX = '[Shuohui CMS MathJax]';
  var IFRAME_MATHJAX_CDN = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
  var MATHJAX_CONFIG_PATH = '/js/mathjax-config.js';

  function getPreviewMode(element) {
    if (!element) return 'none';
    return String(element.tagName).toUpperCase() === 'IFRAME' ? 'iframe' : 'inline';
  }

  function getPollDelay(changed, activeMs, idleMs) {
    return changed ? (activeMs || ACTIVE_POLL_MS) : (idleMs || IDLE_POLL_MS);
  }

  function shouldTypeset(previous, current) {
    if (!previous || !current) return true;
    return previous.node !== current.node
      || previous.mode !== current.mode
      || previous.snapshot !== current.snapshot;
  }

  function appendIframeMathJaxCdn(head) {
    var script = head.ownerDocument.createElement('script');
    script.src = IFRAME_MATHJAX_CDN;
    script.async = true;
    head.appendChild(script);
  }

  function appendIframeMathJaxScripts(head) {
    var cdnAppended = false;

    function appendCdnOnce() {
      if (cdnAppended) return;
      cdnAppended = true;
      appendIframeMathJaxCdn(head);
    }

    var configScript = head.ownerDocument.createElement('script');
    configScript.src = MATHJAX_CONFIG_PATH;
    configScript.onload = appendCdnOnce;
    configScript.onerror = appendCdnOnce;
    head.appendChild(configScript);
  }

  function readSnapshot(node, mode) {
    if (!node || mode === 'none') return '';
    if (mode === 'inline') return node.innerHTML || '';
    var body = node.contentDocument && node.contentDocument.body;
    return body ? (body.innerHTML || '') : '';
  }

  function createPreviewController(options) {
    var doc = options.document;
    var schedule = options.schedule || {};
    var setTimer = schedule.set || function (fn, delay) { return setTimeout(fn, delay); };
    var clearTimer = schedule.clear || function (handle) { clearTimeout(handle); };
    var logger = options.logger || console;
    var getMathJax = typeof options.getMathJax === 'function'
      ? options.getMathJax
      : function () { return options.mathJax || null; };
    var timerHandle = null;
    var stopped = false;
    var pending = false;
    var queued = false;
    var state = { node: null, mode: 'none', snapshot: '' };
    var injectedIframe = null;

    function warn(error) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn(LOG_PREFIX, error);
      }
    }

    function scheduleNext(changed) {
      if (stopped) return;
      if (timerHandle) clearTimer(timerHandle);
      timerHandle = setTimer(poll, getPollDelay(changed, ACTIVE_POLL_MS, IDLE_POLL_MS));
    }

    function injectIframeMathJax(iframe) {
      if (!iframe || injectedIframe === iframe) return;
      var iframeDocument = iframe.contentDocument;
      if (!iframeDocument || !iframeDocument.head) return;
      appendIframeMathJaxScripts(iframeDocument.head);
      injectedIframe = iframe;
    }

    function renderCurrentPreview() {
      if (stopped || state.mode === 'none') return Promise.resolve(false);
      if (pending) {
        queued = true;
        return Promise.resolve(false);
      }

      try {
        var promise = null;

        if (state.mode === 'inline') {
          var mathJax = getMathJax();
          if (!mathJax || typeof mathJax.typesetPromise !== 'function') return Promise.resolve(false);
          promise = mathJax.typesetPromise([state.node]);
        } else if (state.mode === 'iframe') {
          injectIframeMathJax(state.node);
          var iframeWindow = state.node && state.node.contentWindow;
          if (!iframeWindow || !iframeWindow.MathJax || typeof iframeWindow.MathJax.typesetPromise !== 'function') {
            return Promise.resolve(false);
          }
          promise = iframeWindow.MathJax.typesetPromise();
        }

        if (!promise || typeof promise.then !== 'function') return Promise.resolve(false);

        pending = true;
        return Promise.resolve(promise).catch(function (error) {
          warn(error);
          return false;
        }).then(function (result) {
          pending = false;
          if (queued && !stopped) {
            queued = false;
            return renderCurrentPreview().then(function () {
              return result;
            });
          }
          queued = false;
          return result;
        });
      } catch (error) {
        pending = false;
        warn(error);
        return Promise.resolve(false);
      }
    }

    function poll() {
      if (stopped) return Promise.resolve(false);

      var changed = false;

      try {
        var node = doc.querySelector(PREVIEW_SELECTOR);
        var mode = getPreviewMode(node);

        if (node !== state.node) {
          injectedIframe = null;
          state = { node: node, mode: mode, snapshot: '' };
        }

        if (mode === 'iframe') {
          injectIframeMathJax(node);
        }

        var current = {
          node: node,
          mode: mode,
          snapshot: readSnapshot(node, mode)
        };

        changed = shouldTypeset(state, current);
        state = current;

        if (!changed) {
          scheduleNext(false);
          return Promise.resolve(false);
        }

        return renderCurrentPreview().then(function (result) {
          scheduleNext(true);
          return result;
        }, function (error) {
          warn(error);
          scheduleNext(true);
          return false;
        });
      } catch (error) {
        warn(error);
        scheduleNext(changed);
        return Promise.resolve(false);
      }
    }

    function stop() {
      stopped = true;
      queued = false;
      if (timerHandle) {
        clearTimer(timerHandle);
        timerHandle = null;
      }
    }

    return {
      poll: poll,
      stop: stop
    };
  }

  function startBrowserController(win) {
    var hostWindow = win || (typeof window !== 'undefined' ? window : null);
    if (!hostWindow || !hostWindow.document) return null;

    var controller = createPreviewController({
      document: hostWindow.document,
      getMathJax: function () {
        return hostWindow.MathJax;
      },
      logger: hostWindow.console,
      schedule: {
        set: function (fn, delay) {
          return hostWindow.setTimeout(fn, delay);
        },
        clear: function (handle) {
          hostWindow.clearTimeout(handle);
        }
      }
    });

    controller.poll();
    return controller;
  }

  return {
    appendIframeMathJaxCdn: appendIframeMathJaxCdn,
    appendIframeMathJaxScripts: appendIframeMathJaxScripts,
    createPreviewController: createPreviewController,
    getPollDelay: getPollDelay,
    getPreviewMode: getPreviewMode,
    shouldTypeset: shouldTypeset,
    startBrowserController: startBrowserController
  };
});
