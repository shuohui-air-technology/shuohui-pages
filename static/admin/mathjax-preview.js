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
  var DEBOUNCE_MS = 500;
  var IDLE_RENDER_TIMEOUT_MS = 1000;
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
    var scheduleIdle = typeof schedule.idle === 'function'
      ? schedule.idle
      : function (fn) { return setTimer(fn, 0); };
    var cancelScheduledIdle = typeof schedule.cancelIdle === 'function'
      ? schedule.cancelIdle
      : clearTimer;
    var logger = options.logger || console;
    var getMathJax = typeof options.getMathJax === 'function'
      ? options.getMathJax
      : function () { return options.mathJax || null; };
    var pollHandle = null;
    var debounceHandle = null;
    var idleHandle = null;
    var debounceScheduled = false;
    var idleScheduled = false;
    var stopped = false;
    var observed = { node: null, mode: 'none', snapshot: '' };
    var rendered = { node: null, mode: 'none', snapshot: '' };
    var rendering = null;
    var queuedSnapshot = null;
    var injectedIframe = null;

    function warn(error) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn(LOG_PREFIX, error);
      }
    }

    function scheduleNext(changed) {
      if (stopped) return;
      if (pollHandle) clearTimer(pollHandle);
      pollHandle = setTimer(function () {
        pollHandle = null;
        return poll();
      }, getPollDelay(changed, ACTIVE_POLL_MS, IDLE_POLL_MS));
    }

    function cancelDebounce() {
      if (!debounceScheduled) return;
      if (debounceHandle) clearTimer(debounceHandle);
      debounceHandle = null;
      debounceScheduled = false;
    }

    function cancelIdle() {
      if (!idleScheduled) return;
      if (idleHandle) cancelScheduledIdle(idleHandle);
      idleHandle = null;
      idleScheduled = false;
    }

    function scheduleIdleRender() {
      if (stopped || idleScheduled) return;
      idleScheduled = true;
      idleHandle = scheduleIdle(function () {
        idleHandle = null;
        idleScheduled = false;
        return renderCurrentPreview();
      }, { timeout: IDLE_RENDER_TIMEOUT_MS });
    }

    function scheduleDebouncedRender(reset) {
      if (stopped || observed.mode === 'none') return;
      if (rendering && !shouldTypeset(rendering, observed)) return;

      if (reset) {
        cancelDebounce();
        cancelIdle();
      } else if (debounceScheduled || idleScheduled) {
        return;
      }

      debounceScheduled = true;
      debounceHandle = setTimer(function () {
        debounceHandle = null;
        debounceScheduled = false;
        scheduleIdleRender();
      }, DEBOUNCE_MS);
    }

    function injectIframeMathJax(iframe) {
      if (!iframe || injectedIframe === iframe) return;
      var iframeDocument = iframe.contentDocument;
      if (!iframeDocument || !iframeDocument.head) return;
      appendIframeMathJaxScripts(iframeDocument.head);
      injectedIframe = iframe;
    }

    function finishRender(snapshot, succeeded) {
      rendering = null;

      if (succeeded && !stopped && !shouldTypeset(snapshot, observed)) {
        rendered = snapshot;
      }

      var next = queuedSnapshot;
      queuedSnapshot = null;
      if (!stopped && next && next.mode !== 'none' && shouldTypeset(rendered, next)) {
        scheduleIdleRender();
      }

      return succeeded;
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

        rendering = snapshot;
        return Promise.resolve(promise).then(function () {
          return finishRender(snapshot, true);
        }, function (error) {
          warn(error);
          return finishRender(snapshot, false);
        });
      } catch (error) {
        warn(error);
        rendering = null;
        return Promise.resolve(false);
      }
    }

    function renderCurrentPreview() {
      if (stopped || observed.mode === 'none') return Promise.resolve(false);
      if (rendering) {
        if (shouldTypeset(rendering, observed)) queuedSnapshot = observed;
        return Promise.resolve(false);
      }
      if (!shouldTypeset(rendered, observed)) return Promise.resolve(false);

      return renderPreview(observed);
    }

    function poll() {
      if (stopped) return Promise.resolve(false);

      var changed = false;

      try {
        var node = doc.querySelector(PREVIEW_SELECTOR);
        var mode = getPreviewMode(node);

        if (node !== observed.node) {
          injectedIframe = null;
        }

        if (mode === 'iframe') {
          injectIframeMathJax(node);
        }

        var current = {
          node: node,
          mode: mode,
          snapshot: readSnapshot(node, mode)
        };

        changed = shouldTypeset(observed, current);
        observed = current;
        if (mode === 'none') {
          cancelDebounce();
          cancelIdle();
          queuedSnapshot = null;
          rendered = current;
        } else if (shouldTypeset(rendered, current)) {
          scheduleNext(true);
          scheduleDebouncedRender(changed);
          return Promise.resolve(false);
        }

        scheduleNext(changed);
        return Promise.resolve(false);
      } catch (error) {
        warn(error);
        scheduleNext(changed);
        return Promise.resolve(false);
      }
    }

    function stop() {
      stopped = true;
      queuedSnapshot = null;
      if (pollHandle) clearTimer(pollHandle);
      pollHandle = null;
      cancelDebounce();
      cancelIdle();
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
        },
        idle: function (fn, options) {
          if (typeof hostWindow.requestIdleCallback === 'function') {
            return hostWindow.requestIdleCallback(fn, options);
          }
          return hostWindow.setTimeout(fn, 0);
        },
        cancelIdle: function (handle) {
          if (typeof hostWindow.cancelIdleCallback === 'function') {
            hostWindow.cancelIdleCallback(handle);
            return;
          }
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
