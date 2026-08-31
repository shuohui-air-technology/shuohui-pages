(function (root, factory) {
  var mathJaxLoader = typeof module !== 'undefined' && module.exports
    ? require('./mathjax-loader.js')
    : root && root.ShuohuiMathJaxLoader;
  var api = factory(mathJaxLoader);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.ShuohuiMathJaxPreview = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (mathJaxLoader) {
  var PREVIEW_SELECTOR = '[role="document"]';
  var ACTIVE_POLL_MS = 500;
  var IDLE_POLL_MS = 2000;
  var DEBOUNCE_MS = 500;
  var IDLE_RENDER_TIMEOUT_MS = 1000;
  var LOG_PREFIX = '[Shuohui CMS MathJax]';
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

  function appendIframeMathJaxCdn(head, handlers) {
    var script = head.ownerDocument.createElement('script');
    script.src = mathJaxLoader.MATHJAX_RUNTIME_URL;
    script.async = true;
    if (handlers) {
      if (typeof handlers.onload === 'function') {
        script.onload = function (event) {
          handlers.onload(event, script);
        };
      }
      if (typeof handlers.onerror === 'function') {
        script.onerror = function (error) {
          handlers.onerror(error, script);
        };
      }
    }
    try {
      head.appendChild(script);
    } catch (error) {
      if (handlers && typeof handlers.onerror === 'function') {
        handlers.onerror(error, script);
      } else {
        throw error;
      }
    }
    return script;
  }

  function appendIframeMathJaxScripts(head, handlers) {
    var cdnAppended = false;

    function appendCdnOnce() {
      if (cdnAppended) return;
      cdnAppended = true;
      var runtimeHandlers = null;
      if (handlers) {
        runtimeHandlers = {};
        if (typeof handlers.onload === 'function') {
          runtimeHandlers.onload = function (event, runtimeScript) {
            handlers.onload(event, runtimeScript, configScript);
          };
        }
        if (typeof handlers.onerror === 'function') {
          runtimeHandlers.onerror = function (error, runtimeScript) {
            handlers.onerror(error, runtimeScript, configScript);
          };
        }
      }
      appendIframeMathJaxCdn(head, runtimeHandlers);
    }

    var configScript = head.ownerDocument.createElement('script');
    configScript.src = MATHJAX_CONFIG_PATH;
    configScript.onload = appendCdnOnce;
    configScript.onerror = appendCdnOnce;
    head.appendChild(configScript);
    return configScript;
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
    var containsRenderableMath = typeof options.containsRenderableMath === 'function'
      ? options.containsRenderableMath
      : function () { return true; };
    var ensureMathJax = typeof options.ensureMathJax === 'function'
      ? options.ensureMathJax
      : null;
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
    var renderCompletion = null;
    var injectedIframe = null;

    function warn(error) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn(LOG_PREFIX, error);
      }
    }

    function removeIframeScript(script) {
      if (!script || !script.parentNode
          || typeof script.parentNode.removeChild !== 'function') return;
      try {
        script.parentNode.removeChild(script);
      } catch (error) {
        warn(error);
      }
    }

    function failIframeInjection(iframe, error, runtimeScript, configScript) {
      removeIframeScript(runtimeScript);
      removeIframeScript(configScript);
      if (injectedIframe === iframe) injectedIframe = null;
      warn(error);
    }

    function ensureRenderCompletion() {
      if (renderCompletion) return renderCompletion.promise;

      var resolve;
      var promise = new Promise(function (complete) {
        resolve = complete;
      });
      renderCompletion = { promise: promise, resolve: resolve };
      return promise;
    }

    function resolveRenderCompletion(result) {
      if (!renderCompletion) return;
      var completion = renderCompletion;
      renderCompletion = null;
      completion.resolve(result);
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
      injectedIframe = iframe;
      try {
        appendIframeMathJaxScripts(iframeDocument.head, {
          onload: function (event, runtimeScript, configScript) {
            try {
              var iframeWindow = iframe.contentWindow;
              if (!iframeWindow || !isReadyMathJax(iframeWindow.MathJax)) {
                throw new Error('MathJax runtime loaded without typesetPromise');
              }
            } catch (error) {
              failIframeInjection(iframe, error, runtimeScript, configScript);
            }
          },
          onerror: function (error, runtimeScript, configScript) {
            failIframeInjection(iframe, error, runtimeScript, configScript);
          }
        });
      } catch (error) {
        if (injectedIframe === iframe) injectedIframe = null;
        throw error;
      }
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
        return succeeded ? undefined : false;
      }

      if (!succeeded || stopped) {
        resolveRenderCompletion(succeeded && !stopped ? undefined : false);
        return succeeded ? undefined : false;
      }

      if (shouldTypeset(rendered, observed)) {
        if (!debounceScheduled && !idleScheduled) scheduleDebouncedRender(false);
        return undefined;
      }

      resolveRenderCompletion(undefined);

      return undefined;
    }

    function failScheduledRender() {
      resolveRenderCompletion(false);
      return Promise.resolve(false);
    }

    function isReadyMathJax(mathJax) {
      return Boolean(mathJax && typeof mathJax.typesetPromise === 'function');
    }

    function trackRender(snapshot, promise) {
      rendering = snapshot;
      return Promise.resolve(promise).then(function () {
        return finishRender(snapshot, true);
      }, function (error) {
        warn(error);
        return finishRender(snapshot, false);
      });
    }

    function renderPreview(snapshot) {
      if (stopped || snapshot.mode === 'none') return Promise.resolve(false);

      try {
        if (!containsRenderableMath(snapshot.snapshot)) {
          return Promise.resolve(finishRender(snapshot, true));
        }

        if (snapshot.mode === 'inline') {
          var mathJax = getMathJax();
          if (isReadyMathJax(mathJax)) {
            var inlinePromise = mathJax.typesetPromise([snapshot.node]);
            if (!inlinePromise || typeof inlinePromise.then !== 'function') return failScheduledRender();
            return trackRender(snapshot, inlinePromise);
          }

          if (!ensureMathJax) return failScheduledRender();

          var loadingPromise = ensureMathJax();
          return trackRender(snapshot, Promise.resolve(loadingPromise).then(function () {
            if (stopped) return false;
            var loadedMathJax = getMathJax();
            if (!isReadyMathJax(loadedMathJax)) {
              throw new Error('MathJax runtime loaded without typesetPromise');
            }
            var loadedTypesetPromise = loadedMathJax.typesetPromise([snapshot.node]);
            if (!loadedTypesetPromise || typeof loadedTypesetPromise.then !== 'function') {
              throw new Error('MathJax typesetPromise did not return a promise');
            }
            return loadedTypesetPromise;
          }));
        } else if (snapshot.mode === 'iframe') {
          injectIframeMathJax(snapshot.node);
          var iframeWindow = snapshot.node && snapshot.node.contentWindow;
          if (!iframeWindow || !isReadyMathJax(iframeWindow.MathJax)) {
            return failScheduledRender();
          }
          var iframePromise = iframeWindow.MathJax.typesetPromise();
          if (!iframePromise || typeof iframePromise.then !== 'function') return failScheduledRender();
          return trackRender(snapshot, iframePromise);
        }

        return failScheduledRender();
      } catch (error) {
        warn(error);
        rendering = null;
        return failScheduledRender();
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
          resolveRenderCompletion(false);
        } else if (shouldTypeset(rendered, current)) {
          var completion = ensureRenderCompletion();
          scheduleNext(true);
          scheduleDebouncedRender(changed);
          return completion;
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
      resolveRenderCompletion(false);
    }

    return {
      poll: poll,
      stop: stop
    };
  }

  function startBrowserController(win) {
    var hostWindow = win || (typeof window !== 'undefined' ? window : null);
    if (!hostWindow || !hostWindow.document) return null;
    var runtimeLoader = mathJaxLoader.createRuntimeLoader({
      hostWindow: hostWindow,
      document: hostWindow.document
    });

    var controller = createPreviewController({
      containsRenderableMath: mathJaxLoader.containsRenderableMath,
      document: hostWindow.document,
      ensureMathJax: runtimeLoader.ensure,
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
