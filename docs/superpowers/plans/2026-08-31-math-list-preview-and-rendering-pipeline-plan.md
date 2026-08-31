# Math List Preview and Rendering Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render LaTeX inside the existing two-line article-list summaries while loading and typesetting MathJax only where needed, and harden CMS editing plus CI against future configuration drift.

**Architecture:** Propagate each section's `math` flag from `data/sections.json` into its generated `_index.md`, then let the Hugo head partial fall back to child-article flags for mixed sections. Use MathJax 3.2.2 `ui/lazy` and list-only CSS for compact public previews. Add a focused CMS runtime loader so plain-text editing does not download MathJax, while preserving the existing debounced, idle, single-flight preview controller.

**Tech Stack:** Hugo 0.163.2 Extended, PaperMod pinned at `d3768854d00ad003b0a8dbdba254ce9224377a01`, MathJax 3.2.2, vanilla JavaScript/UMD, Python 3 standard library and `unittest`, Node.js built-in test runner, Sveltia CMS, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-31-math-list-preview-and-rendering-pipeline-design.md`

## Global Constraints

- Preserve `/`, `/math/`, `/acgn/`, every existing article URL, and the stable `math` and `acgn` Slugs.
- Preserve all user content from `origin/main`, including `content/acgn/使用过的几个agent的测评.md` and the two `20260819-*.png` images.
- Keep list summaries at two visual lines on desktop and mobile.
- Keep MathJax pinned to exactly `3.2.2` and preserve `$...$`, `$$...$$`, `\(...\)`, and `\[...\]`.
- Do not introduce KaTeX, a server-side math renderer, a manual render button, editor examples, or a pinned/downgraded Sveltia version.
- Keep CMS debounce near 500 ms, idle scheduling, at most one in-flight typeset, latest-snapshot coalescing, retry, and `stop()` cleanup semantics.
- Follow strict TDD for every behavior change: write the behavior test, observe the expected failure, write the minimum implementation, then run focused and full tests.
- Do not push or deploy until all local tests, Hugo output checks, and real-browser checks pass.

---

### Task 1: Propagate section math configuration into generated indexes

**Files:**
- Modify: `tests/test_sections.py`
- Modify: `scripts/sync_sections.py`
- Regenerate: `content/math/_index.md`
- Regenerate: `content/acgn/_index.md`

**Interfaces:**
- Consumes: section records shaped as `{"name": str, "slug": str, "weight": int, "math": bool}`.
- Produces: `render_section_index(section) -> str` with an explicit top-level `math: true|false` YAML field.
- Preserves: existing title, menu name, menu weight, directory, and URL behavior.

- [ ] **Step 1: Change the section-index behavior tests first**

Update `test_render_section_index_matches_current_acgn_semantics` to expect `math: false`, and add a mathematical-section case:

```python
def test_render_section_index_propagates_math_rendering_default(self):
    rendered = render_section_index(
        {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": True}
    )

    self.assertEqual(
        rendered,
        '---\n'
        'title: "学术推导与笔记"\n'
        'math: true\n'
        'menu:\n'
        '  main:\n'
        '    name: "学术推导与笔记"\n'
        '    weight: 10\n'
        '---\n',
    )
```

Update the existing sync expectations for `acgn` and `travel` to include `math: false`. Add an assertion that the generated `math/_index.md` contains `math: true`.

- [ ] **Step 2: Run the focused tests and observe RED**

Run:

```bash
python3 -m unittest \
  tests.test_sections.SectionRegistryTests.test_render_section_index_matches_current_acgn_semantics \
  tests.test_sections.SectionRegistryTests.test_render_section_index_propagates_math_rendering_default \
  tests.test_sections.SectionRegistryTests.test_sync_sections_generates_indexes_and_admin_config_from_registry -v
```

Expected: failures show that generated section indexes do not contain a `math` field.

- [ ] **Step 3: Implement the minimal generator change**

In `scripts/sync_sections.py`, require the existing boolean and render it immediately after `title`:

```python
def render_section_index(section: dict[str, object]) -> str:
    title = _yaml_quote(_require_string(section, "name"))
    weight = _require_weight(section)
    math_default = _yaml_bool(_require_math(section))
    return (
        "---\n"
        f"title: {title}\n"
        f"math: {math_default}\n"
        "menu:\n"
        "  main:\n"
        f"    name: {title}\n"
        f"    weight: {weight}\n"
        "---\n"
    )
```

- [ ] **Step 4: Regenerate and verify GREEN**

Run:

```bash
python3 scripts/sync_sections.py
python3 scripts/sync_sections.py --check
python3 -m unittest tests.test_sections -v
```

Expected: all section tests pass; `content/math/_index.md` has `math: true`; `content/acgn/_index.md` has `math: false`.

- [ ] **Step 5: Commit Task 1**

```bash
git add scripts/sync_sections.py tests/test_sections.py content/math/_index.md content/acgn/_index.md
git commit -m "fix: propagate section math settings"
```

---

### Task 2: Load and lazily typeset MathJax on public list pages

**Files:**
- Create: `tests/test_hugo_math_loading.py`
- Modify: `tests/mathjax-config.test.mjs`
- Modify: `layouts/partials/extend_head.html`
- Modify: `static/js/mathjax-config.js`
- Modify: `assets/css/extended/custom.css`

**Interfaces:**
- Consumes: current page `.Params.math`, global `site.Params.math`, and child-page `Params.math` for section pages.
- Produces: MathJax configuration containing `loader.load = ['ui/lazy']` and `options.lazyMargin = '200px'`.
- Produces: list-only CSS that makes display formulas compact without changing single-page formula layout.

- [ ] **Step 1: Add a real Hugo integration test for page-scoped loading**

Create `tests/test_hugo_math_loading.py`. Build the real site once into a temporary directory and assert observable generated HTML:

```python
from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path


class HugoMathLoadingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo_root = Path(__file__).resolve().parents[1]
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.public_dir = Path(cls.temp_dir.name) / "public"
        result = subprocess.run(
            [
                "hugo",
                "--minify",
                "--gc",
                "--buildFuture",
                "--destination",
                str(cls.public_dir),
            ],
            cwd=cls.repo_root,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            raise AssertionError(result.stderr or result.stdout)

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    def _html(self, relative_path: str) -> str:
        return (self.public_dir / relative_path).read_text(encoding="utf-8")

    def test_math_section_loads_mathjax_without_opening_an_article(self):
        source = self._html("math/index.html")
        self.assertIn("/js/mathjax-config.js", source)
        self.assertIn("mathjax@3.2.2/es5/tex-mml-chtml.js", source)
        self.assertIn(r"$$\sin\alpha + \sin\beta", source)

    def test_non_math_pages_do_not_load_mathjax(self):
        for relative_path in ("index.html", "acgn/index.html"):
            source = self._html(relative_path)
            self.assertNotIn("mathjax@3.2.2", source)
```

Add this isolated mixed-section test to the same class. It uses the real project templates and configuration but replaces only the content tree:

```python
    def test_mixed_section_loads_mathjax_when_a_child_enables_math(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture_root = Path(directory)
            content_dir = fixture_root / "content"
            section_dir = content_dir / "mixed"
            section_dir.mkdir(parents=True)
            (content_dir / "_index.md").write_text(
                '---\ntitle: "Fixture"\n---\n', encoding="utf-8"
            )
            (section_dir / "_index.md").write_text(
                '---\ntitle: "Mixed"\nmath: false\n---\n', encoding="utf-8"
            )
            (section_dir / "formula.md").write_text(
                '---\n'
                'title: "Formula"\n'
                'date: 2026-08-31T00:00:00+08:00\n'
                'draft: false\n'
                'math: true\n'
                'comments: false\n'
                '---\n\n$x+y$\n',
                encoding="utf-8",
            )
            public_dir = fixture_root / "public"
            result = subprocess.run(
                [
                    "hugo",
                    "--minify",
                    "--gc",
                    "--buildFuture",
                    "--contentDir",
                    str(content_dir),
                    "--destination",
                    str(public_dir),
                ],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            source = (public_dir / "mixed" / "index.html").read_text(
                encoding="utf-8"
            )
            self.assertIn("/js/mathjax-config.js", source)
            self.assertIn("mathjax@3.2.2/es5/tex-mml-chtml.js", source)
```

Also add a single-page guard to the real-site build:

```python
    def test_math_article_still_loads_mathjax(self):
        source = self._html("math/和差化积/index.html")
        self.assertIn("/js/mathjax-config.js", source)
        self.assertIn("mathjax@3.2.2/es5/tex-mml-chtml.js", source)
```

These tests catch removal of the child-page fallback and accidental regression of the existing single-article behavior.

- [ ] **Step 2: Add the lazy-configuration test**

Extend the first test in `tests/mathjax-config.test.mjs`:

```javascript
assert.deepEqual(config.loader.load, ['ui/lazy']);
assert.equal(config.options.lazyMargin, '200px');
```

Keep all existing delimiter and runtime-pin assertions.

- [ ] **Step 3: Run focused tests and observe RED**

Run:

```bash
python3 -m unittest tests.test_hugo_math_loading -v
node --test tests/mathjax-config.test.mjs
```

Expected: the mathematical section/mixed-section loading test and lazy-configuration assertions fail against the current implementation.

- [ ] **Step 4: Implement section-child detection in the head partial**

Replace the single current condition in `layouts/partials/extend_head.html` with:

```go-html-template
{{- $needsMath := or .Params.math site.Params.math -}}
{{- if and (not $needsMath) .IsSection -}}
  {{- $mathPages := where .RegularPages "Params.math" true -}}
  {{- $needsMath = gt (len $mathPages) 0 -}}
{{- end -}}
{{- if $needsMath }}
<script src="/js/mathjax-config.js?v=lazy-1"></script>
<script type="text/javascript" id="MathJax-script" async
  src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js"></script>
{{- end }}
```

Do not inspect all site pages from the homepage; child scanning is section-only.

- [ ] **Step 5: Enable official lazy typesetting in the shared config**

Extend `window.MathJax` in `static/js/mathjax-config.js`:

```javascript
loader: {
  load: ['ui/lazy']
},
options: {
  lazyMargin: '200px',
  skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
}
```

Preserve the existing `tex` block exactly.

- [ ] **Step 6: Keep rendered list formulas inside the two-line summary**

Append list-scoped rules to `assets/css/extended/custom.css`:

```css
.list .entry-content mjx-container,
.list .entry-content mjx-container[display="true"] {
    display: inline !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    font-size: 0.96em;
}

.list .entry-content mjx-container[display="true"] mjx-math {
    display: inline !important;
}
```

Do not change the global single-page `mjx-container[display="true"]` overflow rule.

- [ ] **Step 7: Verify focused and regression tests GREEN**

Run:

```bash
python3 -m unittest tests.test_hugo_math_loading tests.test_sections -v
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs
```

Expected: public list, mixed-section fallback, non-math exclusion, pinned runtime, lazy config, and existing CMS preview tests all pass.

- [ ] **Step 8: Commit Task 2**

```bash
git add tests/test_hugo_math_loading.py tests/mathjax-config.test.mjs \
  layouts/partials/extend_head.html static/js/mathjax-config.js \
  assets/css/extended/custom.css
git commit -m "perf: lazily render math in list previews"
```

---

### Task 3: Load the CMS MathJax runtime only when preview content needs it

**Files:**
- Create: `static/admin/mathjax-loader.js`
- Create: `tests/mathjax-loader.test.mjs`
- Modify: `static/admin/mathjax-preview.js`
- Modify: `tests/mathjax-preview.test.mjs`
- Modify: `static/admin/index.html`
- Modify: `tests/mathjax-config.test.mjs`

**Interfaces:**
- Produces: `ShuohuiMathJaxLoader.containsRenderableMath(source: string) -> boolean`.
- Produces: `ShuohuiMathJaxLoader.createRuntimeLoader(options) -> { ensure(): Promise<object>, getState(): string }`.
- Imports in CommonJS and consumes in the browser: `ShuohuiMathJaxLoader.MATHJAX_RUNTIME_URL`; the preview module must not define a second runtime URL literal.
- Consumes in preview controller: optional `containsRenderableMath(content)` and `ensureMathJax()` dependencies.
- Preserves: `startBrowserController`, iframe injection, debounce, idle scheduling, single-flight typesetting, retries, and cleanup.

- [ ] **Step 1: Write the loader behavior tests before creating the loader**

Create `tests/mathjax-loader.test.mjs` with literal examples:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const loader = require('../static/admin/mathjax-loader.js');

test('detects complete supported math and ignores incomplete or code-only delimiters', () => {
  assert.equal(loader.containsRenderableMath('结果为 $x^2$。'), true);
  assert.equal(loader.containsRenderableMath('$$\\int_0^1 x dx$$'), true);
  assert.equal(loader.containsRenderableMath('\\(x+y\\)'), true);
  assert.equal(loader.containsRenderableMath('价格是 $100'), false);
  assert.equal(loader.containsRenderableMath('孤立的 $ 符号'), false);
  assert.equal(loader.containsRenderableMath('<pre>$$x$$</pre>正文'), false);
  assert.equal(loader.containsRenderableMath('```text\n$$x$$\n```'), false);
});
```

Define the loader option shape as
`createRuntimeLoader({ hostWindow, document, runtimeUrl? })`, then use this fixture and literal tests:

```javascript
function createRuntimeFixture(ready = false) {
  const appended = [];
  const removed = [];
  const hostWindow = {
    MathJax: ready ? { typesetPromise() { return Promise.resolve(); } } : {}
  };
  const head = {
    appendChild(node) {
      node.parentNode = head;
      appended.push(node);
      return node;
    },
    removeChild(node) {
      removed.push(node);
      node.parentNode = null;
      return node;
    }
  };
  const document = {
    head,
    createElement(tagName) {
      return { tagName: tagName.toUpperCase(), async: false, src: "" };
    }
  };
  return { appended, removed, hostWindow, document };
}

test('coalesces concurrent runtime requests into one script and one promise', async () => {
  const fixture = createRuntimeFixture();
  const runtime = loader.createRuntimeLoader(fixture);
  const first = runtime.ensure();
  const second = runtime.ensure();

  assert.equal(first, second);
  assert.equal(fixture.appended.length, 1);
  assert.equal(fixture.appended[0].src, loader.MATHJAX_RUNTIME_URL);
  assert.equal(fixture.appended[0].async, true);
  fixture.hostWindow.MathJax = {
    typesetPromise() { return Promise.resolve(); }
  };
  fixture.appended[0].onload();
  assert.equal(await first, fixture.hostWindow.MathJax);
  assert.equal(runtime.getState(), 'ready');
});

test('rejects an onload without a ready API and allows a later retry', async () => {
  const fixture = createRuntimeFixture();
  const runtime = loader.createRuntimeLoader(fixture);
  const first = runtime.ensure();
  fixture.appended[0].onload();
  await assert.rejects(first, /typesetPromise/);
  assert.equal(runtime.getState(), 'failed');
  assert.deepEqual(fixture.removed, [fixture.appended[0]]);

  const second = runtime.ensure();
  assert.notEqual(second, first);
  assert.equal(fixture.appended.length, 2);
  fixture.hostWindow.MathJax = {
    typesetPromise() { return Promise.resolve(); }
  };
  fixture.appended[1].onload();
  assert.equal(await second, fixture.hostWindow.MathJax);
});

test('removes a failed script and retries after a network error', async () => {
  const fixture = createRuntimeFixture();
  const runtime = loader.createRuntimeLoader(fixture);
  const first = runtime.ensure();
  fixture.appended[0].onerror(new Error('offline'));
  await assert.rejects(first, /MathJax runtime/);
  assert.equal(runtime.getState(), 'failed');
  assert.deepEqual(fixture.removed, [fixture.appended[0]]);
  runtime.ensure();
  assert.equal(fixture.appended.length, 2);
});

test('returns an already-ready MathJax without appending a script', async () => {
  const fixture = createRuntimeFixture(true);
  const runtime = loader.createRuntimeLoader(fixture);
  assert.equal(await runtime.ensure(), fixture.hostWindow.MathJax);
  assert.equal(fixture.appended.length, 0);
  assert.equal(runtime.getState(), 'ready');
});
```

- [ ] **Step 2: Run the new test and observe RED**

Run:

```bash
node --test tests/mathjax-loader.test.mjs
```

Expected: module-not-found failure because `static/admin/mathjax-loader.js` does not exist.

- [ ] **Step 3: Implement the focused UMD loader**

Create `static/admin/mathjax-loader.js` with no DOM polling or preview logic. It should:

```javascript
var MATHJAX_RUNTIME_URL =
  'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js';

function containsRenderableMath(source) {
  if (typeof source !== 'string') return false;
  var cleaned = source
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '')
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, '')
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
  return /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(^|[^\\$])\$(?!\$)[^$\n]+?\$/m.test(cleaned);
}
```

`createRuntimeLoader` owns exactly one promise while loading. On failure it clears that promise so a later call retries. It identifies readiness using `typeof hostWindow.MathJax.typesetPromise === 'function'`, not merely the presence of the configuration object.

- [ ] **Step 4: Verify the loader tests GREEN**

Run:

```bash
node --test tests/mathjax-loader.test.mjs
```

Expected: all detection, single-injection, readiness, failure, and retry tests pass.

- [ ] **Step 5: Add failing controller integration tests**

Extend `tests/mathjax-preview.test.mjs` with two observable controller behaviors:

```javascript
test('plain preview changes settle without loading or typesetting MathJax', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>plain text</p>' };
  const idleSchedule = createIdleScheduleSpy();
  let loaderCalls = 0;
  let typesetCalls = 0;
  const controller = preview.createPreviewController({
    document: { querySelector() { return previewNode; } },
    containsRenderableMath() { return false; },
    ensureMathJax() { loaderCalls += 1; return Promise.resolve(null); },
    mathJax: {
      typesetPromise() { typesetCalls += 1; return Promise.resolve(); }
    },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );
  await controller.poll();
  assert.equal(loaderCalls, 0);
  assert.equal(typesetCalls, 0);
  assert.equal(idleSchedule.schedule.calls.at(-1).delay, 2000);
});

test('math preview loads once and typesets only the latest debounced snapshot', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: '<p>$a$</p>' };
  const idleSchedule = createIdleScheduleSpy();
  const renderedSnapshots = [];
  let loaderCalls = 0;
  let readyMathJax = null;
  const loadedMathJax = {
    typesetPromise(nodes) {
      renderedSnapshots.push(nodes[0].innerHTML);
      return Promise.resolve();
    }
  };
  const controller = preview.createPreviewController({
    document: { querySelector() { return previewNode; } },
    containsRenderableMath(source) { return source.includes('$'); },
    ensureMathJax() {
      loaderCalls += 1;
      readyMathJax = loadedMathJax;
      return Promise.resolve(loadedMathJax);
    },
    getMathJax() { return readyMathJax; },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  const firstPoll = controller.poll();
  previewNode.innerHTML = '<p>$b$</p>';
  assert.equal(controller.poll(), firstPoll);
  previewNode.innerHTML = '<p>$c$</p>';
  assert.equal(controller.poll(), firstPoll);
  await idleSchedule.schedule.calls.at(-1).fn();
  await idleSchedule.idleCallbacks.at(-1).fn();
  await firstPoll;

  assert.equal(loaderCalls, 1);
  assert.deepEqual(renderedSnapshots, ['<p>$c$</p>']);
});

test('plain iframe preview does not inject MathJax scripts', async () => {
  const appended = [];
  const iframe = {
    tagName: 'IFRAME',
    contentDocument: {
      head: {
        ownerDocument: {
          createElement(tag) { return { tagName: tag.toUpperCase() }; }
        },
        appendChild(node) { appended.push(node); return node; }
      },
      body: { innerHTML: '<p>plain text</p>' }
    },
    contentWindow: {}
  };
  const idleSchedule = createIdleScheduleSpy();
  const controller = preview.createPreviewController({
    document: { querySelector() { return iframe; } },
    containsRenderableMath() { return false; },
    schedule: idleSchedule.config,
    logger: { warn() {} }
  });

  await runScheduledPoll(
    controller,
    idleSchedule.schedule,
    idleSchedule.idleCallbacks
  );
  assert.deepEqual(appended, []);
});
```

The production mutation these tests catch is removal of the math-content gate or accidental eager/repeated runtime loading.

- [ ] **Step 6: Run controller tests and observe RED**

Run:

```bash
node --test tests/mathjax-preview.test.mjs
```

Expected: the controller has no `containsRenderableMath`/`ensureMathJax` boundary and cannot satisfy the new behavior.

- [ ] **Step 7: Integrate the loader without changing preview scheduling semantics**

In `static/admin/mathjax-preview.js`:

- change the UMD wrapper so CommonJS uses `require('./mathjax-loader.js')` and the browser uses `root.ShuohuiMathJaxLoader`, then pass that dependency into the factory;
- accept `containsRenderableMath` and `ensureMathJax` options;
- before either an inline or iframe render, treat plain content as a successful no-op so unchanged text is not polled at active speed forever and no iframe scripts are injected;
- when math exists and no ready MathJax is present, await `ensureMathJax()`, reacquire `getMathJax()`, then call the existing single-flight `typesetPromise([node])` path;
- move iframe injection out of `poll()` and into the math-only render path; keep configuration-before-runtime ordering, failure retry, and replacement-iframe behavior;
- require and use `mathJaxLoader.MATHJAX_RUNTIME_URL` for iframe injection instead of duplicating the URL;
- catch loader failures through the existing warning/retry path.

In `startBrowserController`, construct one host loader and pass its methods to the controller.

- [ ] **Step 8: Remove eager CMS runtime loading and version local assets**

Update `static/admin/index.html` to load, in order:

```html
<script src="/js/mathjax-config.js?v=lazy-1"></script>
<script src="https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js"></script>
<script src="/admin/markdown-format.js?v=2e8ea2f"></script>
<script src="/admin/mathjax-loader.js?v=lazy-1"></script>
<script src="/admin/mathjax-preview.js?v=lazy-1"></script>
```

Remove the unconditional MathJax CDN `<script>`. Keep Sveltia unpinned as required by the accepted design.

Update `tests/mathjax-config.test.mjs` so the literal pinned-runtime check covers `layouts/partials/extend_head.html` and `static/admin/mathjax-loader.js`; it must no longer require the runtime URL in `static/admin/index.html` or duplicate it in `static/admin/mathjax-preview.js`. Keep the existing iframe behavior tests, which prove that the preview module appends `mathjaxLoader.MATHJAX_RUNTIME_URL` after the shared configuration script.

- [ ] **Step 9: Verify all CMS tests GREEN**

Run:

```bash
node --test tests/mathjax-loader.test.mjs tests/mathjax-preview.test.mjs \
  tests/mathjax-config.test.mjs tests/markdown-format.test.mjs
```

Expected: all tests pass with no timer leaks, duplicate injections, repeated unchanged renders, or unhandled rejection output.

- [ ] **Step 10: Commit Task 3**

```bash
git add static/admin/mathjax-loader.js static/admin/mathjax-preview.js \
  static/admin/index.html tests/mathjax-loader.test.mjs \
  tests/mathjax-preview.test.mjs tests/mathjax-config.test.mjs
git commit -m "perf: load cms mathjax only for formulas"
```

---

### Task 4: Enforce math loading scope and tests in the deployment pipeline

**Files:**
- Modify: `tests/test_check_build.py`
- Modify: `scripts/check_build.py`
- Modify: `tests/test_sections.py`
- Modify: `.github/workflows/hugo.yml`
- Modify: `README.md`

**Interfaces:**
- Extends: `check_build(..., content_dir: Path | None = None)` and CLI `--content`.
- Consumes: generated section HTML, `data/sections.json`, and article front matter under `content/<slug>`.
- Produces: actionable errors for missing required MathJax assets or unexpected MathJax on non-math sections.

- [ ] **Step 1: Add failing build-contract tests**

In `tests/test_check_build.py`, add these constants and helper above the test class:

```python
MATHJAX_CONFIG_TAG = '<script src="/js/mathjax-config.js?v=lazy-1"></script>'
MATHJAX_RUNTIME_TAG = (
    '<script src="https://cdn.jsdelivr.net/npm/'
    'mathjax@3.2.2/es5/tex-mml-chtml.js"></script>'
)


def _write_math_page(
    public: Path,
    relative_path: str,
    *,
    config: bool,
    runtime: bool,
) -> None:
    scripts = (MATHJAX_CONFIG_TAG if config else "") + (
        MATHJAX_RUNTIME_TAG if runtime else ""
    )
    _write_html(public, relative_path, f"<html><head>{scripts}</head></html>")
    if config:
        config_path = public / "js" / "mathjax-config.js"
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text("window.MathJax = {};", encoding="utf-8")
```

Add these literal tests inside `BuildCheckTests`:

```python
def test_math_section_requires_mathjax_assets(self):
    sections = [
        {"name": "Math", "slug": "math", "weight": 10, "math": True}
    ]
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        public = root / "public"
        content = root / "content"
        public.mkdir()
        content.mkdir()
        _write_math_page(
            public, "math/index.html", config=False, runtime=False
        )
        errors = check_build(
            public,
            required=[],
            forbidden=[],
            sections=sections,
            navigation_pages=[],
            content_dir=content,
        )
    self.assertEqual(
        errors,
        [
            "missing MathJax config: math/index.html",
            "missing MathJax runtime: math/index.html",
        ],
    )

def test_non_math_section_rejects_unnecessary_mathjax_assets(self):
    sections = [
        {"name": "Essays", "slug": "acgn", "weight": 20, "math": False}
    ]
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        public = root / "public"
        content = root / "content"
        public.mkdir()
        content.mkdir()
        _write_math_page(
            public, "acgn/index.html", config=False, runtime=True
        )
        errors = check_build(
            public,
            required=[],
            forbidden=[],
            sections=sections,
            navigation_pages=[],
            content_dir=content,
        )
    self.assertEqual(
        errors,
        ["unexpected MathJax runtime: acgn/index.html"],
    )

def test_mixed_section_allows_mathjax_when_a_published_child_enables_math(self):
    sections = [
        {"name": "Mixed", "slug": "mixed", "weight": 30, "math": False}
    ]
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        public = root / "public"
        content = root / "content"
        public.mkdir()
        article = content / "mixed" / "formula.md"
        article.parent.mkdir(parents=True)
        article.write_text(
            '---\n'
            'title: "Formula"\n'
            'draft: false\n'
            'math: true\n'
            '---\n\n$x$\n',
            encoding="utf-8",
        )
        _write_math_page(
            public, "mixed/index.html", config=True, runtime=True
        )
        errors = check_build(
            public,
            required=[],
            forbidden=[],
            sections=sections,
            navigation_pages=[],
            content_dir=content,
        )
    self.assertEqual(errors, [])

def test_draft_math_child_does_not_enable_a_non_math_section(self):
    sections = [
        {"name": "Mixed", "slug": "mixed", "weight": 30, "math": False}
    ]
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        public = root / "public"
        content = root / "content"
        public.mkdir()
        article = content / "mixed" / "draft.md"
        article.parent.mkdir(parents=True)
        article.write_text(
            '---\ntitle: "Draft"\ndraft: true\nmath: true\n---\n',
            encoding="utf-8",
        )
        _write_math_page(
            public, "mixed/index.html", config=True, runtime=True
        )
        errors = check_build(
            public,
            required=[],
            forbidden=[],
            sections=sections,
            navigation_pages=[],
            content_dir=content,
        )
    self.assertEqual(
        errors,
        [
            "unexpected MathJax config: mixed/index.html",
            "unexpected MathJax runtime: mixed/index.html",
        ],
    )
```

The tests deliberately pass `navigation_pages=[]` so their result contains only the math-scope contract. Expectations are literal error strings, not values computed by the implementation.

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```bash
python3 -m unittest \
  tests.test_check_build.BuildCheckTests.test_math_section_requires_mathjax_assets \
  tests.test_check_build.BuildCheckTests.test_non_math_section_rejects_unnecessary_mathjax_assets \
  tests.test_check_build.BuildCheckTests.test_mixed_section_allows_mathjax_when_a_published_child_enables_math \
  tests.test_check_build.BuildCheckTests.test_draft_math_child_does_not_enable_a_non_math_section -v
```

Expected: the current build checker has no math-loading contract or content-directory input.

- [ ] **Step 3: Implement the minimal math-scope checker**

Import `parse_front_matter` from `scripts.content_tools`. Add constants
`MATHJAX_CONFIG_PATH = "/js/mathjax-config.js"` and
`MATHJAX_RUNTIME_FRAGMENT = "mathjax@3.2.2/es5/tex-mml-chtml.js"`. Add these helpers:

```python
def _published_section_has_math(content_dir: Path, slug: str) -> bool:
    section_dir = content_dir / slug
    if not section_dir.is_dir():
        return False
    for path in sorted(section_dir.rglob("*.md")):
        if path.name == "_index.md":
            continue
        front_matter = parse_front_matter(path.read_text(encoding="utf-8"))
        if front_matter.get("draft") is not True and front_matter.get("math") is True:
            return True
    return False


def _check_math_loading_scope(
    public_dir: Path,
    sections: Iterable[dict[str, object]],
    content_dir: Path,
) -> list[str]:
    errors: list[str] = []
    for section in sections:
        relative_path = f"{section['slug']}/index.html"
        output_path = public_dir / relative_path
        if not output_path.is_file():
            continue
        needs_math = section.get("math") is True
        if not needs_math:
            needs_math = _published_section_has_math(
                content_dir, str(section["slug"])
            )
        source = output_path.read_text(encoding="utf-8")
        has_config = MATHJAX_CONFIG_PATH in source
        has_runtime = MATHJAX_RUNTIME_FRAGMENT in source
        if needs_math and not has_config:
            errors.append(f"missing MathJax config: {relative_path}")
        if needs_math and not has_runtime:
            errors.append(f"missing MathJax runtime: {relative_path}")
        if not needs_math and has_config:
            errors.append(f"unexpected MathJax config: {relative_path}")
        if not needs_math and has_runtime:
            errors.append(f"unexpected MathJax runtime: {relative_path}")
    return errors
```

The helpers must:

1. determine section need from `section['math']` or any non-draft child Markdown with parsed `math: true`;
2. read `public/<slug>/index.html`;
3. require both shared config and runtime when needed;
4. reject either asset when not needed.

Use the four literal error formats asserted above. Missing section output remains the responsibility of the existing `missing section index` check and must not produce duplicate MathJax errors. Extend `check_build` with a final optional keyword parameter `content_dir: Path | None = None`, expose `--content content` on the CLI, and pass it from `.github/workflows/hugo.yml` and README release commands. Call `_check_math_loading_scope` only when both `sections` and `content_dir` are supplied. This keeps existing library callers backward-compatible while making CI's explicit `--content content` opt into the registry-plus-child-article contract.

- [ ] **Step 4: Add a failing workflow-order test**

Extend `test_ci_and_readme_sync_sections_before_validation_and_build` to require these exact workflow commands before the Hugo build:

```text
python3 -m unittest discover -s tests -v
node --test tests/mathjax-config.test.mjs tests/mathjax-loader.test.mjs tests/mathjax-preview.test.mjs tests/markdown-format.test.mjs cloudflare-gateway/index.test.js
```

Also require `--content content` in the generated-output check and release-grade README block.

- [ ] **Step 5: Run the workflow test and observe RED**

Run:

```bash
python3 -m unittest \
  tests.test_sections.SectionRegistryTests.test_ci_and_readme_sync_sections_before_validation_and_build -v
```

Expected: the current workflow does not run unit tests and the build checker call lacks `--content content`.

- [ ] **Step 6: Update CI and README**

After Hugo setup and before normalization/build, add one test step:

```yaml
- name: Run unit tests
  run: |
    python3 -m unittest discover -s tests -v
    node --test tests/mathjax-config.test.mjs tests/mathjax-loader.test.mjs tests/mathjax-preview.test.mjs tests/markdown-format.test.mjs cloudflare-gateway/index.test.js
```

Pass `--content content` to `check_build.py`. Document the new loader test, mixed-section behavior, lazy list previews, and release command in README.

- [ ] **Step 7: Verify Task 4 GREEN**

Run:

```bash
python3 -m unittest tests.test_check_build tests.test_sections -v
python3 scripts/sync_sections.py --check
```

Expected: all build-contract, generated-config, workflow-order, and existing navigation/static-asset tests pass.

- [ ] **Step 8: Commit Task 4**

```bash
git add scripts/check_build.py tests/test_check_build.py tests/test_sections.py \
  .github/workflows/hugo.yml README.md
git commit -m "test: enforce math rendering scope in builds"
```

---

### Task 5: Full verification, independent reviews, deployment, and internal handoff

**Files:**
- Review: every file changed since `cafe81d`
- Update after successful deployment: `/Users/pc/Desktop/shuohui-pages/shuohui-uk-项目全信息汇总.md` (local internal file in the primary checkout; keep it untracked)

**Interfaces:**
- Consumes: all Task 1–4 commits.
- Produces: verified local build, independent review findings resolved, successful GitHub Pages deployment, live browser evidence, and updated internal handoff documentation.

- [ ] **Step 1: Run fresh full automated verification**

Run:

```bash
python3 -m unittest discover -s tests -v
node --test tests/mathjax-config.test.mjs tests/mathjax-loader.test.mjs \
  tests/mathjax-preview.test.mjs tests/markdown-format.test.mjs \
  cloudflare-gateway/index.test.js
python3 scripts/sync_sections.py
python3 scripts/sync_sections.py --check
python3 scripts/content_tools.py normalize content
python3 scripts/content_tools.py validate content
build_dir=$(mktemp -d)
hugo --minify --gc --buildFuture --printPathWarnings --destination "$build_dir"
hugo list all > /tmp/shuohui-hugo-list-math-preview.csv
python3 scripts/check_build.py --public "$build_dir" \
  --sections data/sections.json --content content \
  --required acgn/index.html --required math/index.html \
  --required admin/index.html --required admin/config.yml \
  --required admin/markdown-format.js --required admin/mathjax-loader.js \
  --required admin/mathjax-preview.js --required js/mathjax-config.js \
  --required sitemap.xml
python3 scripts/check_content_outputs.py --public "$build_dir" \
  --hugo-list /tmp/shuohui-hugo-list-math-preview.csv
git diff --check
```

Expected: all commands exit `0`; Hugo emits no warnings; published pages exist; drafts do not; all required CMS assets exist.

- [ ] **Step 2: Dispatch independent review agents**

Use two fresh, isolated subagents with no shared implementation context:

1. specification reviewer: compare `cafe81d` spec line by line with the diff and report missing/extra behavior;
2. code-quality reviewer: inspect Hugo semantics, loader races, regex edge cases, CSS containment, CI ordering, and test honesty.

Neither reviewer edits files. The main agent verifies every finding against code and tests. Resolve confirmed findings with a new failing test before implementation; rerun Step 1 afterward.

- [ ] **Step 3: Verify the real local site in a browser**

Start Hugo on an available loopback port. In a real browser, verify:

- desktop `/math/`: first-card LaTeX becomes MathJax without clicking, summary remains two lines, metadata/card spacing stays stable;
- mobile viewport near 390 px: same two-line and containment behavior;
- scroll: later formulas typeset near viewport while far-off cards initially have no generated `mjx-container`;
- `/` and `/acgn/`: no MathJax runtime network request;
- single math article: display equations remain block-level and horizontally scrollable;
- `/admin/`: initial plain editor load has no MathJax runtime request; opening math content loads one runtime; rapid edits settle on the latest formula; console has no uncaught errors.

Record computed card heights and request counts before declaring success. If any check fails, add a regression test where feasible, fix, and repeat Tasks 5.1–5.3.

- [ ] **Step 4: Confirm remote state and push**

Run:

```bash
git fetch origin main
git log --oneline HEAD..origin/main
git status -sb
```

If remote has new commits, integrate them without discarding user changes and repeat Step 1. When clean and current:

```bash
git push origin HEAD:main
```

- [ ] **Step 5: Monitor deployment and verify production**

Wait for the GitHub Pages workflow associated with the pushed SHA. Require `completed/success`; inspect logs and continue fixing if it fails.

On `https://shuohui.uk`, repeat the public browser checks and confirm `/admin/index.html`, `/admin/mathjax-loader.js`, `/admin/mathjax-preview.js`, and `/js/mathjax-config.js` return `200`. Confirm the production page contains the expected pinned runtime and no old list behavior.

- [ ] **Step 6: Update the desktop internal project summary**

Using `apply_patch`, update `/Users/pc/Desktop/shuohui-pages/shuohui-uk-项目全信息汇总.md` with:

- the public list MathJax data flow;
- the generated section `math` field;
- lazy rendering and two-line CSS behavior;
- CMS conditional runtime loading and preserved 500 ms/single-flight behavior;
- new CI commands and build checks;
- final test counts, commit SHA, Actions run URL, and live verification result.

Preserve all existing internal tokens and secret-related notes as requested by the user.
Do not add this local internal file to Git or modify the former Desktop-level copy.

- [ ] **Step 7: Final clean-state verification**

Run:

```bash
git status -sb
git log --oneline --decorate -8
```

Expected: branch matches `origin/main`, no uncommitted repository changes, desktop summary saved, and production verification evidence is ready for the final report.
