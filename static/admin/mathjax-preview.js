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
    var observed = { node: null, mode: 'none', snapshot: '' };
    var rendered = { node: null, mode: 'none', snapshot: '' };
    var rendering = null;
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

    function renderPreview(snapshot) {
      if (stopped || snapshot.mode === 'none') return Promise.resolve(false);

      try {
        var promise = null;

        if (snapshot.mode === 'inline') {
          var mathJax = getMathJax();
          if (!mathJax || typeof mathJax.typesetPromise !== 'function') return Promise.resolve(false);
          promise = mathJax.typesetPromise([snapshot.node]);
        } else if (snapshot.mode === 'iframe') {
          injectIframeMathJax(snapshot.node);
          var iframeWindow = snapshot.node && snapshot.node.contentWindow;
          if (!iframeWindow || !iframeWindow.MathJax || typeof iframeWindow.MathJax.typesetPromise !== 'function') {
            return Promise.resolve(false);
          }
          promise = iframeWindow.MathJax.typesetPromise();
        }

        if (!promise || typeof promise.then !== 'function') return Promise.resolve(false);

        pending = true;
        rendering = snapshot;
        return Promise.resolve(promise).catch(function (error) {
          warn(error);
          return false;
        }).then(function (result) {
          pending = false;
          rendering = null;
          if (result !== false && !stopped && !shouldTypeset(snapshot, observed)) {
            rendered = snapshot;
          }
          if (queued && !stopped) {
            queued = false;
            if (shouldTypeset(rendered, observed)) {
              return renderPreview(observed).then(function () {
                return result;
              });
            }
            return Promise.resolve(result);
          }
          queued = false;
          return result;
        }, function (error) {
          pending = false;
          rendering = null;
          warn(error);
          return false;
        });
      } catch (error) {
        pending = false;
        rendering = null;
        warn(error);
        return Promise.resolve(false);
      }
    }

    function queueIfRenderingCurrentChanged(current) {
      if (!pending) return false;
      if (!rendering || shouldTypeset(rendering, current)) {
        queued = true;
        return true;
      }
      return false;
    }

    function renderCurrentPreview(current) {
      if (stopped || current.mode === 'none') return Promise.resolve(false);
      if (queueIfRenderingCurrentChanged(current)) {
        return Promise.resolve(false);
      }
      if (pending) return Promise.resolve(false);

      return renderPreview(current);
    }

    function poll() {
      if (stopped) return Promise.resolve(false);

      var changed = false;

      try {
        var node = doc.querySelector(PREVIEW_SELECTOR);
        var mode = getPreviewMode(node);

        if (node !== observed.node) {
          injectedIframe = null;
          observed = { node: node, mode: mode, snapshot: '' };
        }

        if (mode === 'iframe') {
          injectIframeMathJax(node);
        }

        var current = {
          node: node,
          mode: mode,
          snapshot: readSnapshot(node, mode)
        };

        observed = current;
        changed = shouldTypeset(rendered, current);
        if (mode === 'none') {
          rendered = current;
        }

        if (!changed) {
          scheduleNext(false);
          return Promise.resolve(false);
        }

        var renderPromise = renderCurrentPreview(current);
        scheduleNext(true);
        return renderPromise;
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
