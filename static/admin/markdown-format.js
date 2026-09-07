(function (root, factory) {
  var api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === 'object') {
    root.ShuohuiMarkdownFormat = api;
    if (root.CMS) api.registerPreSaveFormatter(root.CMS);
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var MALFORMED_ORDERED_TITLE_RE = /^(\s*)(\d+)[.)、](\S.*)$/;
  var STANDALONE_LABEL_RE = /^\s*(?![#>*`-])(?!.*[。！？!?；;])[^\s].{0,38}[：:]\s*$/;
  var HEADING_RE = /^\s{0,3}#{1,6}\s+\S/;
  var LIST_ITEM_RE = /^\s{0,3}(?:[-*+]\s+|\d+[.)、]\s+)\S/;
  var ESCAPED_TILDE_FENCE_RE = /^([ \t]{0,3})((?:\\~){3,})(.*)$/;

  function canonicalizeEscapedFenceMarker(line) {
    var match = line.match(ESCAPED_TILDE_FENCE_RE);
    if (!match) return line;
    return match[1] + match[2].replace(/\\~/g, '~') + match[3];
  }

  function isFence(line) {
    var stripped = line.trim();
    return stripped.indexOf('```') === 0 || stripped.indexOf('~~~') === 0;
  }

  function normalizeFenceMarkers(body) {
    var newline = body.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
    var hadTrailingNewline = /(?:\r\n|\n|\r)$/.test(body);
    var lines = body.replace(/\r\n/g, '\n').split('\n');
    if (hadTrailingNewline && lines[lines.length - 1] === '') lines.pop();
    lines = collapseTableBlankLines(lines);

    var normalized = [];
    var inFence = false;
    lines.forEach(function (line) {
      var candidate = canonicalizeEscapedFenceMarker(line);
      if (!inFence) {
        normalized.push(candidate);
        if (isFence(candidate)) inFence = true;
        return;
      }

      var normalizedLine = isFence(candidate) ? candidate : line;
      normalized.push(normalizedLine);
      if (isFence(candidate)) inFence = false;
    });

    return normalized.join(newline) + (hadTrailingNewline ? newline : '');
  }

  function isHeading(line) {
    return HEADING_RE.test(line);
  }

  function isListItem(line) {
    return LIST_ITEM_RE.test(line);
  }

  function isTableRow(line) {
    var stripped = line.trim();
    return stripped.indexOf('|') >= 0 && (
      stripped.indexOf('|') === 0 || stripped.lastIndexOf('|') === stripped.length - 1
    );
  }

  function collapseTableBlankLines(lines) {
    var normalized = [];
    var index = 0;
    while (index < lines.length) {
      if (lines[index].trim() !== '') {
        normalized.push(lines[index]);
        index += 1;
        continue;
      }

      var end = index;
      while (end < lines.length && lines[end].trim() === '') end += 1;
      var previous = normalized.length ? normalized[normalized.length - 1] : '';
      var following = end < lines.length ? lines[end] : '';
      if (isTableRow(previous) && isTableRow(following)) {
        index = end;
        continue;
      }
      while (index < end) normalized.push(lines[index++]);
    }
    return normalized;
  }

  function looksLikeParagraphBoundary(current, following) {
    if (isTableRow(current) || isTableRow(following)) return false;
    if (current.length > 48 || following.length < 30) return false;
    if (/^(?:#|>|-|\*|```|\$\$|!\[)/.test(current)) return false;
    if (MALFORMED_ORDERED_TITLE_RE.test(current)) return true;
    if (/[。！？!?；;：:]$/.test(current)) return false;
    return true;
  }

  function normalizeMarkdownBody(body, options) {
    options = options || {};
    if (typeof body !== 'string') return body;
    if (options.math === true) return normalizeFenceMarkers(body);

    var newline = body.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
    var hadTrailingNewline = /(?:\r\n|\n|\r)$/.test(body);
    var lines = body.replace(/\r\n/g, '\n').split('\n');
    if (hadTrailingNewline && lines[lines.length - 1] === '') lines.pop();
    lines = collapseTableBlankLines(lines);

    var transformed = [];
    var inFence = false;
    lines.forEach(function (line) {
      var canonicalLine = canonicalizeEscapedFenceMarker(line);
      var stripped = canonicalLine.trim();
      if (inFence) {
        transformed.push(isFence(canonicalLine) ? canonicalLine : line);
        if (isFence(canonicalLine)) {
          inFence = false;
        }
        return;
      }
      if (isFence(canonicalLine)) {
        transformed.push(canonicalLine);
        inFence = true;
        return;
      }
      if (isTableRow(canonicalLine)) {
        transformed.push(canonicalLine);
        return;
      }

      var titleMatch = line.match(MALFORMED_ORDERED_TITLE_RE);
      if (titleMatch && titleMatch[3].trim().length <= 80) {
        line = titleMatch[1] + '## ' + titleMatch[2] + '. ' + titleMatch[3].trim();
      } else if (STANDALONE_LABEL_RE.test(line)) {
        line = '### ' + stripped.slice(0, -1).trim();
      }
      transformed.push(line);
    });

    var normalized = [];
    transformed.forEach(function (line, index) {
      var stripped = line.trim();
      if (!stripped) {
        normalized.push(line);
        return;
      }

      var previous = index ? transformed[index - 1] : '';
      var previousStripped = previous.trim();
      var last = normalized[normalized.length - 1];
      var needsBlank = normalized.length > 0 && last.trim() !== '' && (
        isHeading(line)
        || isHeading(previous)
        || (isListItem(previous) && !isListItem(line))
        || looksLikeParagraphBoundary(previousStripped, stripped)
      );
      if (needsBlank) normalized.push('');
      normalized.push(line);
    });

    return normalized.join(newline) + (hadTrailingNewline ? newline : '');
  }

  function readEntryValue(entry, path) {
    if (!entry) return undefined;
    if (typeof entry.getIn === 'function') return entry.getIn(path);
    var value = entry;
    path.forEach(function (key) {
      value = value && value[key];
    });
    return value;
  }

  function writeEntryValue(entry, path, value) {
    if (entry && typeof entry.setIn === 'function') return entry.setIn(path, value);
    if (!entry || typeof entry !== 'object') return entry;
    var next = Object.assign({}, entry);
    next.data = Object.assign({}, entry.data, { body: value });
    return next;
  }

  function registerPreSaveFormatter(CMS) {
    if (!CMS || typeof CMS.registerEventListener !== 'function') return false;
    CMS.registerEventListener({
      name: 'preSave',
      handler: function (event) {
        var entry = event && event.entry;
        var body = readEntryValue(entry, ['data', 'body']);
        var math = readEntryValue(entry, ['data', 'math']);
        if (typeof body !== 'string') return entry;
        var normalized = normalizeMarkdownBody(body, { math: math === true });
        return normalized === body
          ? entry
          : writeEntryValue(entry, ['data', 'body'], normalized);
      }
    });
    return true;
  }

  return {
    normalizeMarkdownBody: normalizeMarkdownBody,
    registerPreSaveFormatter: registerPreSaveFormatter
  };
});
