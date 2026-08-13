# shuohui.uk Project Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Hugo publishing chain deterministic, reduce CMS MathJax preview races, and harden the OAuth Worker while preserving all existing public URLs, CMS routes, visual behavior, and Sveltia message contracts.

**Architecture:** Keep the existing Hugo + PaperMod + Sveltia CMS + Cloudflare Worker architecture. Move content normalization and build checks into tested Python scripts, share MathJax configuration through one static asset, isolate preview state in a browser controller with pure testable helpers, and expose small OAuth helper functions for Node tests while retaining the existing `/auth` and `/callback` handlers.

**Tech Stack:** Hugo Extended `0.163.2`, PaperMod commit `d3768854d00ad003b0a8dbdba254ce9224377a01`, Python 3 standard library plus `unittest`, Node.js built-in `node:test`, Cloudflare Worker Web APIs, GitHub Actions, no new runtime dependencies.

## Global Constraints

- Preserve `https://shuohui.uk/`, `/math/`, `/acgn/`, `/admin/`, `/auth`, and `/callback`.
- Preserve Sveltia’s `authorization:github:success:{"token":"..."}` message format.
- Preserve `$...$`, `$$...$$`, `\(...\)`, and `\[...\]` MathJax delimiters.
- `draft: true` remains a valid intentional draft; only the identified article is changed to `draft: false`.
- Do not add secrets, log OAuth tokens, or rotate external credentials in code changes.
- Do not stage `public/`, `themes/`, `.hugo_build.lock`, `.wrangler/`, `.DS_Store`, or the user’s existing image deletions.
- Every production-code task follows RED → GREEN → REFACTOR: write a failing test, run it and observe the expected failure, implement the smallest change, rerun the focused test, then run the relevant regression suite.
- Every task ends with `git diff --check`, a focused verification command, and an intentional commit.

---

### Task 1: Add tested content front matter tools

**Files:**

- Create: `scripts/content_tools.py`
- Create: `tests/test_content_tools.py`

**Interfaces:**

- `normalize_date_text(text: str) -> str`: add `:00` only to a top-level `date: YYYY-MM-DDTHH:MM` line and leave full-second dates unchanged.
- `parse_front_matter(text: str) -> dict[str, object]`: parse the scalar top-level fields between the first and second `---` markers; support strings, `true`, `false`, and `null`.
- `validate_front_matter(path: pathlib.Path) -> list[str]`: return human-readable errors for missing title/date, invalid date, non-boolean `draft`/`math`/`comments`, or missing front matter; return an empty list for valid drafts and valid published pages.
- `iter_markdown_files(content_dir: pathlib.Path) -> Iterator[pathlib.Path]`: yield sorted `*.md` files recursively.
- `normalize_files(content_dir: pathlib.Path) -> int`: rewrite only date lines missing seconds and return the number of changed files.
- `validate_files(content_dir: pathlib.Path) -> list[str]`: aggregate file-scoped validation errors.
- CLI: `python3 scripts/content_tools.py normalize content` and `python3 scripts/content_tools.py validate content`; validation exits `0` for valid drafts and `1` for invalid front matter.

- [ ] **Step 1: Write the failing tests.**

Create `tests/test_content_tools.py` with temporary-file tests for the public interfaces:

```python
import tempfile
import unittest
from pathlib import Path

from scripts.content_tools import (
    normalize_date_text,
    parse_front_matter,
    validate_front_matter,
)


class ContentToolsTests(unittest.TestCase):
    def test_normalize_date_text_adds_missing_seconds(self):
        source = "---\ndate: 2026-06-15T20:37\n---\n"
        self.assertIn("date: 2026-06-15T20:37:00", normalize_date_text(source))

    def test_normalize_date_text_preserves_existing_seconds(self):
        source = "---\ndate: 2026-06-15T20:37:00\n---\n"
        self.assertEqual(source, normalize_date_text(source))

    def test_parse_front_matter_reads_scalar_types(self):
        parsed = parse_front_matter(
            "---\ntitle: Example\ndraft: false\nmath: true\ncover: null\n---\n"
        )
        self.assertEqual(parsed["title"], "Example")
        self.assertIs(parsed["draft"], False)
        self.assertIs(parsed["math"], True)
        self.assertIsNone(parsed["cover"])

    def test_validate_front_matter_allows_intentional_draft(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "draft.md"
            path.write_text(
                "---\ntitle: Draft\ndate: 2026-06-09T10:24:00\n"
                "draft: true\nmath: false\n---\ntext\n",
                encoding="utf-8",
            )
            self.assertEqual(validate_front_matter(path), [])

    def test_validate_front_matter_rejects_invalid_date_and_boolean(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.md"
            path.write_text(
                "---\ntitle: Invalid\ndate: 2026-06-09T10:24\n"
                "draft: maybe\n---\ntext\n",
                encoding="utf-8",
            )
            errors = validate_front_matter(path)
            self.assertTrue(any("date" in error for error in errors))
            self.assertTrue(any("draft" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the focused tests and verify RED.**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_content_tools.py' -v
```

Expected: FAIL because `scripts.content_tools` and its functions do not exist yet. Fix only test import/setup errors before continuing; do not add implementation before observing the expected missing-module failure.

- [ ] **Step 3: Implement the smallest content tool module.**

Implement the listed interfaces using only `pathlib`, `re`, `datetime`, `argparse`, and `sys`. Limit the front matter parser to scalar top-level fields; preserve nested `cover` lines by ignoring indented keys. Normalize exactly one top-level date line per file. Report errors as `<path>: <field>: <reason>` and return the CLI exit codes defined above.

- [ ] **Step 4: Run focused and full Python tests.**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_content_tools.py' -v
python3 -m unittest discover -s tests -v
```

Expected: all discovered tests pass with zero failures.

- [ ] **Step 5: Commit the content tooling.**

```bash
git diff --check
git add scripts/content_tools.py tests/test_content_tools.py
git commit -m "test: add front matter validation tools"
```

---

### Task 2: Publish the identified article with a regression test

**Files:**

- Modify: `content/acgn/我们终将走向悲伤-解构主义之殇.md:5`
- Modify: `tests/test_content_tools.py`

**Interfaces:**

- The article remains in `content/acgn/` with its current title, date, cover, and body.
- The regression test reads the real content file and asserts that this explicitly identified article is not a draft.

- [ ] **Step 1: Add the failing regression test.**

Append a test that reads the repository file relative to the test file and asserts the parsed `draft` value is `False`:

```python
    def test_identified_latest_acgn_article_is_published(self):
        repository_root = Path(__file__).resolve().parents[1]
        article = repository_root / "content/acgn/我们终将走向悲伤-解构主义之殇.md"
        self.assertIs(parse_front_matter(article.read_text(encoding="utf-8"))["draft"], False)
```

- [ ] **Step 2: Run the regression test and verify RED.**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_content_tools.py' -v
```

Expected: exactly this test fails because the remote `main` content currently has `draft: true`.

- [ ] **Step 3: Change only the article’s draft flag.**

Change:

```yaml
draft: true
```

to:

```yaml
draft: false
```

Do not alter the article body, date, image path, or title.

- [ ] **Step 4: Run the regression and content checks.**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_content_tools.py' -v
python3 scripts/content_tools.py validate content
```

Expected: the regression passes and validation exits `0`.

- [ ] **Step 5: Commit the publication fix.**

```bash
git diff --check
git add 'content/acgn/我们终将走向悲伤-解构主义之殇.md' tests/test_content_tools.py
git commit -m "fix: publish latest acgn article"
```

---

### Task 3: Add generated-output smoke checks and stabilize Hugo CI

**Files:**

- Create: `scripts/check_build.py`
- Create: `tests/test_check_build.py`
- Modify: `.github/workflows/hugo.yml`

**Interfaces:**

- `check_build(public_dir: pathlib.Path, required: Iterable[str], forbidden: Iterable[str]) -> list[str]`: return missing required paths and present forbidden paths using paths relative to `public_dir`.
- CLI: `python3 scripts/check_build.py --public public --required <path> ... --forbidden <path> ...`; print all errors and exit `1` if any exist.

- [ ] **Step 1: Write failing output-check tests.**

Create tests using `TemporaryDirectory`:

```python
import tempfile
import unittest
from pathlib import Path

from scripts.check_build import check_build


class BuildCheckTests(unittest.TestCase):
    def test_required_and_forbidden_paths_are_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            (public / "acgn").mkdir()
            (public / "acgn/index.html").write_text("ok", encoding="utf-8")
            errors = check_build(
                public,
                required=["acgn/index.html"],
                forbidden=["acgn/draft/index.html"],
            )
            self.assertEqual(errors, [])

    def test_missing_required_path_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            errors = check_build(Path(directory), ["sitemap.xml"], [])
            self.assertEqual(errors, ["missing required output: sitemap.xml"])

    def test_present_forbidden_path_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            (public / "draft/index.html").parent.mkdir()
            (public / "draft/index.html").write_text("draft", encoding="utf-8")
            errors = check_build(public, [], ["draft/index.html"])
            self.assertEqual(errors, ["forbidden output exists: draft/index.html"])
```

- [ ] **Step 2: Run the focused tests and verify RED.**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_check_build.py' -v
```

Expected: FAIL with an import error because `scripts.check_build` does not exist.

- [ ] **Step 3: Implement the checker and CLI.**

Use `Path.is_file()` for each normalized relative path. Preserve required/forbidden argument order in error output and exit `0` only when the error list is empty.

- [ ] **Step 4: Update the workflow with deterministic versions and checks.**

In `.github/workflows/hugo.yml`:

1. Clone PaperMod and check out commit `d3768854d00ad003b0a8dbdba254ce9224377a01`.
2. Set `hugo-version: '0.163.2'`.
3. Replace the inline Python loop with:

```yaml
      - name: Normalize and validate content
        run: |
          python3 scripts/content_tools.py normalize content
          python3 scripts/content_tools.py validate content
```

4. Keep `hugo --minify --gc --buildFuture` as the build command.
5. Add a post-build check:

```yaml
      - name: Check generated outputs
        run: |
          python3 scripts/check_build.py --public public \
            --required acgn/index.html \
            --required math/index.html \
            --required sitemap.xml \
            --required 'acgn/我们终将走向悲伤-解构主义之殇/index.html'
```

The unit tests cover forbidden-output behavior using temporary directories; the production workflow checks required public outputs and leaves intentional drafts governed by the content validator.

- [ ] **Step 5: Run all content/build checks and commit.**

Run:

```bash
python3 -m unittest discover -s tests -v
python3 scripts/content_tools.py validate content
hugo --minify --gc --buildFuture --destination /tmp/shuohui-task3-public
python3 scripts/check_build.py --public /tmp/shuohui-task3-public \
  --required acgn/index.html \
  --required math/index.html \
  --required sitemap.xml \
  --required 'acgn/我们终将走向悲伤-解构主义之殇/index.html'
```

Expected: Python tests pass, Hugo exits `0`, and all required outputs exist.

- [ ] **Step 6: Commit the release-chain hardening.**

```bash
git diff --check
git add scripts/check_build.py tests/test_check_build.py .github/workflows/hugo.yml
git commit -m "ci: validate content and generated pages"
```

---

### Task 4: Share MathJax configuration and make loading page-scoped

**Files:**

- Create: `static/js/mathjax-config.js`
- Create: `tests/mathjax-config.test.mjs`
- Modify: `layouts/partials/extend_head.html`
- Modify: `static/admin/index.html`
- Modify: `hugo.toml`

**Interfaces:**

- `static/js/mathjax-config.js` assigns `window.MathJax` with the existing inline/display delimiters and processing options before the CDN script loads.
- Both the main-site partial and `/admin/` include `/js/mathjax-config.js` before loading MathJax.
- `hugo.toml` changes `[params].math` from `true` to `false`; math articles retain `math: true` in their front matter/archetype.

- [ ] **Step 1: Write the failing configuration test.**

Create `tests/mathjax-config.test.mjs` using `node:test`, `node:fs`, `node:path`, and `node:vm`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('shared MathJax config defines the four supported delimiters', () => {
  const source = fs.readFileSync('static/js/mathjax-config.js', 'utf8');
  const window = {};
  vm.runInNewContext(source, { window });
  assert.deepEqual(window.MathJax.tex.inlineMath, [['$', '$'], ['\\(', '\\)']]);
  assert.deepEqual(window.MathJax.tex.displayMath, [['$$', '$$'], ['\\[', '\\]']]);
  assert.equal(window.MathJax.tex.processEscapes, true);
  assert.equal(window.MathJax.tex.processEnvironments, true);
});
```

- [ ] **Step 2: Run the test and verify RED.**

Run:

```bash
node --test tests/mathjax-config.test.mjs
```

Expected: FAIL because `static/js/mathjax-config.js` does not exist.

- [ ] **Step 3: Implement the shared config and wire both consumers.**

Put the existing MathJax options into `static/js/mathjax-config.js`. Replace the inline configuration in `layouts/partials/extend_head.html` with a `/js/mathjax-config.js` script tag followed by the CDN tag. Replace the inline configuration in `static/admin/index.html` with the same shared config tag before the CDN tag. Keep the CDN URL and async behavior unchanged.

- [ ] **Step 4: Make math loading page-scoped.**

Change only the global `math` parameter in `hugo.toml` to `false`. Keep `math: true` in `archetypes/math.md` and all existing math articles. Do not add `math: true` to non-math articles unless a test proves they contain supported math delimiters.

- [ ] **Step 5: Verify config, source references, and build output.**

Run:

```bash
node --test tests/mathjax-config.test.mjs
rg -n 'math\.html|katex|mathjax-config\.js' layouts static/admin hugo.toml
hugo --minify --gc --buildFuture --destination /tmp/shuohui-task4-public
```

Expected: the shared config test passes; main templates and admin reference the shared config; the Hugo build exits `0`; math pages contain the MathJax CDN tag while the home page does not.

- [ ] **Step 6: Commit the shared MathJax configuration.**

```bash
git diff --check
git add static/js/mathjax-config.js tests/mathjax-config.test.mjs layouts/partials/extend_head.html static/admin/index.html hugo.toml
git commit -m "refactor: share mathjax config and load it per page"
```

---

### Task 5: Extract and test the CMS preview controller

**Files:**

- Create: `static/admin/mathjax-preview.js`
- Create: `tests/mathjax-preview.test.mjs`
- Modify: `static/admin/index.html`
- Delete: `layouts/partials/math.html` after reference verification

**Interfaces:**

- `getPreviewMode(element) -> 'none' | 'inline' | 'iframe'`.
- `getPollDelay(changed: boolean, activeMs = 500, idleMs = 2000) -> number`.
- `shouldTypeset(previous: {node, mode, snapshot}, current: {node, mode, snapshot}) -> boolean`.
- `createPreviewController({document, mathJax, schedule, logger}) -> { poll(), stop() }`.
- The browser bundle exposes the helpers through `module.exports` when loaded by Node tests and attaches the controller starter to `window` when loaded in `/admin/`; this dual mode is required to avoid a browser-only test dependency.

- [ ] **Step 1: Write failing pure-logic tests.**

Create `tests/mathjax-preview.test.mjs` with tests for mode detection, adaptive delay, and state transitions:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const preview = require('../static/admin/mathjax-preview.js');

test('getPreviewMode distinguishes missing, inline, and iframe previews', () => {
  assert.equal(preview.getPreviewMode(null), 'none');
  assert.equal(preview.getPreviewMode({ tagName: 'DIV' }), 'inline');
  assert.equal(preview.getPreviewMode({ tagName: 'IFRAME' }), 'iframe');
});

test('getPollDelay uses the active interval only after a change', () => {
  assert.equal(preview.getPollDelay(true), 500);
  assert.equal(preview.getPollDelay(false), 2000);
});

test('shouldTypeset detects node, mode, and content changes', () => {
  const node = {};
  const same = { node, mode: 'inline', snapshot: 'a' };
  assert.equal(preview.shouldTypeset(same, same), false);
  assert.equal(preview.shouldTypeset(same, { ...same, snapshot: 'b' }), true);
  assert.equal(preview.shouldTypeset(same, { ...same, mode: 'iframe' }), true);
  assert.equal(preview.shouldTypeset(same, { ...same, node: {} }), true);
});
```

- [ ] **Step 2: Run the tests and verify RED.**

Run:

```bash
node --test tests/mathjax-preview.test.mjs
```

Expected: FAIL because the extracted module does not exist.

- [ ] **Step 3: Implement the controller with explicit state ownership.**

Move the current polling behavior out of `static/admin/index.html` and implement these rules:

1. Discover `[role="document"]` on every poll.
2. Reset `node`, `mode`, `snapshot`, and iframe-injection state when the preview node changes.
3. For inline previews, compare `innerHTML`; for iframe previews, compare the iframe body `innerHTML`.
4. Inject MathJax once per iframe node, not once for the lifetime of the page.
5. Keep one pending `typesetPromise()` per controller; changes during a pending render set a queued flag and run once after completion.
6. Schedule 500 ms after a change and 2000 ms while idle.
7. On exceptions, call `logger.warn('[Shuohui CMS MathJax]', error)` and continue polling.
8. `stop()` cancels the next scheduled timer and prevents further typesetting.

- [ ] **Step 4: Run focused tests and syntax verification.**

Run:

```bash
node --test tests/mathjax-preview.test.mjs
node --check static/admin/mathjax-preview.js
```

Expected: all preview helper tests pass and Node reports no syntax errors.

- [ ] **Step 5: Reduce `static/admin/index.html` to orchestration.**

Keep the CMS startup script and shared MathJax/CDN tags. Remove the inline `PREVIEW_SEL`, polling, iframe injection, and typeset functions. Add the extracted preview script after the Sveltia CMS script and call its browser starter once the document is ready.

- [ ] **Step 6: Remove the unused KaTeX partial after proving no references.**

Run:

```bash
references=$(rg -n 'partials/math|katex|math\.html' layouts static hugo.toml -g '!math.html' || true)
test -z "$references"
```

If no active reference exists, delete `layouts/partials/math.html` with `apply_patch`. If a reference exists, keep the partial and record the reference in the task review instead of deleting it.

- [ ] **Step 7: Run CMS-related regression checks and commit.**

Run:

```bash
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs
node --check static/admin/mathjax-preview.js
hugo --minify --gc --buildFuture --destination /tmp/shuohui-task5-public
```

Expected: all Node tests pass, the preview script parses, and Hugo exits `0`.

```bash
git diff --check
git add static/admin/mathjax-preview.js tests/mathjax-preview.test.mjs static/admin/index.html
git add -u layouts/partials/math.html
git commit -m "refactor: isolate cms mathjax preview controller"
```

---

### Task 6: Harden the OAuth Worker without changing its routes

**Files:**

- Create: `cloudflare-gateway/package.json`
- Create: `cloudflare-gateway/index.test.js`
- Modify: `cloudflare-gateway/index.js`

**Interfaces:**

- `parseCookies(cookieHeader: string | null) -> Record<string, string>`.
- `buildAuthorizeUrl(requestUrl: string, clientId: string, state: string) -> string`.
- `buildStateCookie(state: string, maxAgeSeconds = 600) -> string`.
- `buildCallbackCookie() -> string` that expires the state cookie.
- `createSuccessHtml(accessToken: string, targetOrigin: string) -> string`.
- The default Worker export remains `{ fetch(request, env) }` and continues to serve `/auth`, `/callback`, and 404 for other paths.

- [ ] **Step 1: Add the minimal module metadata for Node tests.**

Create `cloudflare-gateway/package.json`:

```json
{
  "private": true,
  "type": "module"
}
```

This adds no runtime dependency and only tells Node to interpret the existing Worker file as an ES module.

- [ ] **Step 2: Write failing OAuth tests.**

Create `cloudflare-gateway/index.test.js` with tests for the helper contracts and default handler:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  buildAuthorizeUrl,
  buildCallbackCookie,
  buildStateCookie,
  createSuccessHtml,
  parseCookies,
} from './index.js';

test('parseCookies reads the state cookie without decoding unrelated values', () => {
  assert.deepEqual(parseCookies('oauth_state=abc; other=value'), {
    oauth_state: 'abc',
    other: 'value',
  });
});

test('buildAuthorizeUrl preserves the callback route and encodes state', () => {
  const url = new URL(buildAuthorizeUrl(
    'https://shuohui-cms-oauth.shuohui.workers.dev/auth',
    'client-id',
    'state value',
  ));
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/login/oauth/authorize');
  assert.equal(url.searchParams.get('client_id'), 'client-id');
  assert.equal(url.searchParams.get('state'), 'state value');
  assert.equal(url.searchParams.get('scope'), 'repo,user');
});

test('state cookies are secure and expire after the callback', () => {
  assert.match(buildStateCookie('abc'), /HttpOnly/);
  assert.match(buildStateCookie('abc'), /Secure/);
  assert.match(buildStateCookie('abc'), /SameSite=Lax/);
  assert.match(buildCallbackCookie(), /Max-Age=0/);
});

test('success HTML posts only to the CMS origin', () => {
  const html = createSuccessHtml('test-token', 'https://shuohui.uk');
  assert.match(html, /https:\\/\\/shuohui\\.uk/);
  assert.doesNotMatch(html, /postMessage\([^,]+,\s*["']\*["']\)/);
});

test('auth returns an authorization redirect and state cookie', async () => {
  const response = await worker.fetch(
    new Request('https://shuohui-cms-oauth.shuohui.workers.dev/auth'),
    { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
  );
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location'), /github\.com\/login\/oauth\/authorize/);
  assert.match(response.headers.get('set-cookie'), /oauth_state=/);
});

test('callback rejects a mismatched state before contacting GitHub', async () => {
  const response = await worker.fetch(
    new Request(
      'https://shuohui-cms-oauth.shuohui.workers.dev/callback?code=code&state=wrong',
      { headers: { Cookie: 'oauth_state=expected' } },
    ),
    { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
  );
  assert.equal(response.status, 400);
});
```

Add these two tests to the same file before running the RED command. The success test must save and restore `globalThis.fetch` with `try/finally`; the failure test must use the same pattern:

```javascript
test('callback exchanges a valid code and returns the Sveltia success message', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ access_token: 'test-token' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
    const response = await worker.fetch(
      new Request(
        'https://shuohui-cms-oauth.shuohui.workers.dev/callback?code=code&state=expected',
        { headers: { Cookie: 'oauth_state=expected' } },
      ),
      { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
    );
    assert.equal(response.status, 200);
    assert.match(await response.text(), /authorization:github:success:/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('callback hides upstream OAuth errors', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: 'bad_verification_code' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
    const response = await worker.fetch(
      new Request(
        'https://shuohui-cms-oauth.shuohui.workers.dev/callback?code=code&state=expected',
        { headers: { Cookie: 'oauth_state=expected' } },
      ),
      { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'secret' },
    );
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /bad_verification_code/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

- [ ] **Step 3: Run the tests and verify RED.**

Run:

```bash
node --test cloudflare-gateway/index.test.js
```

Expected: FAIL because the helper exports and state validation do not exist yet.

- [ ] **Step 4: Implement the smallest secure Worker change.**

Implement the helpers and update the handler as follows:

1. Return `500` with a generic message when either GitHub secret is missing.
2. On `/auth`, generate a random state with `crypto.getRandomValues`, set `oauth_state=<state>; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`, and add the state to the GitHub authorize URL. Derive the callback URI from the Worker request origin and keep `scope=repo,user`.
3. On `/callback`, require `code`, `state`, and a matching `oauth_state` cookie before calling GitHub. Clear the state cookie in every terminal callback response.
4. Check `tokenResponse.ok`, parse JSON in a guarded block, require a non-empty `access_token`, and return `502` without including the upstream body on failure.
5. Generate callback HTML using JSON serialization plus escaping of `<`, `>`, `&`, U+2028, and U+2029. Use `window.opener.postMessage(message, 'https://shuohui.uk')` and handle a missing opener in the page body.
6. Set `Content-Type`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and a CSP that permits only the callback’s nonce-bearing inline script.
7. Never log `client_secret`, `code`, `state`, or `access_token`.

- [ ] **Step 5: Run Worker tests and syntax checks.**

Run:

```bash
node --test cloudflare-gateway/index.test.js
node --check cloudflare-gateway/index.js
```

Expected: all Worker tests pass and the module parses without errors. Restore `globalThis.fetch` in each test with `try/finally` so tests do not leak stubs.

- [ ] **Step 6: Commit the Worker hardening.**

```bash
git diff --check
git add cloudflare-gateway/package.json cloudflare-gateway/index.js cloudflare-gateway/index.test.js
git commit -m "security: harden cms oauth gateway"
```

---

### Task 7: Add repository hygiene, documentation, and full verification

**Files:**

- Create or modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**

- The repository ignores local-only build and worktree artifacts.
- README commands match the scripts and versions introduced by Tasks 1–6.

- [ ] **Step 1: Add the repository hygiene test/check.**

Before changing files, run:

```bash
git status --short
git ls-files public themes .hugo_build.lock cloudflare-gateway/.wrangler
```

Expected: generated directories are not tracked. The check must not stage or delete any existing user file.

- [ ] **Step 2: Add `.gitignore` entries with `apply_patch`.**

Ensure the root `.gitignore` contains exactly these local-only patterns, preserving any existing entries:

```gitignore
.DS_Store
.hugo_build.lock
public/
themes/
cloudflare-gateway/.wrangler/
.worktrees/
```

- [ ] **Step 3: Update README without changing runtime behavior.**

Document these commands and invariants:

```bash
python3 -m unittest discover -s tests -v
python3 scripts/content_tools.py validate content
python3 scripts/content_tools.py normalize content
hugo --minify --gc --buildFuture --destination /tmp/shuohui-public
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs
node --test cloudflare-gateway/index.test.js
```

State that `draft: true` is intentional and that publishing requires `draft: false`; document the pinned Hugo version `0.163.2` and PaperMod commit.

- [ ] **Step 4: Run the complete local verification suite.**

Run each command separately and record exit status:

```bash
python3 -m unittest discover -s tests -v
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs
node --test cloudflare-gateway/index.test.js
node --check static/admin/mathjax-preview.js
node --check cloudflare-gateway/index.js
hugo --minify --gc --buildFuture --destination /tmp/shuohui-final-public
python3 scripts/check_build.py --public /tmp/shuohui-final-public \
  --required acgn/index.html \
  --required math/index.html \
  --required sitemap.xml \
  --required 'acgn/我们终将走向悲伤-解构主义之殇/index.html'
git diff --check
```

Confirm that the final generated directory contains the published article, does not contain any intentionally drafted fixture, and that `sitemap.xml` includes the published article URL.

- [ ] **Step 5: Inspect the final diff and commit hygiene/docs.**

Run:

```bash
git status --short
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Stage only `.gitignore` and `README.md` for this task, then commit:

```bash
git add .gitignore README.md
git commit -m "docs: document project checks and local hygiene"
```

- [ ] **Step 6: Request code review before any push or deployment.**

Use the `superpowers:requesting-code-review` workflow with:

- Base SHA: `457f86a`.
- Head SHA: `git rev-parse HEAD` after Task 7.
- Requirements: this plan and `docs/superpowers/specs/2026-08-14-shuohui-project-optimization-design.md`.
- Review focus: preserved URLs/protocols, front matter semantics, no secrets in output, correct state-cookie handling, MathJax no-concurrent-render guarantee, and accidental generated-file inclusion.

Resolve all Critical and Important findings, rerun the complete verification suite, and only then offer the branch for user review. Do not push, deploy the Worker, or publish to GitHub Pages without explicit user confirmation.
