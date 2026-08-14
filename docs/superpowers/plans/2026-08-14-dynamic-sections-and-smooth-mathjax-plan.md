# Dynamic Sections and Smooth MathJax Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hard-coded CMS/Hugo sections with a validated section registry while making MathJax preview rendering debounce, coalesce, and run during browser idle time.

**Architecture:** `data/sections.json` is the source of truth for section names, stable Slugs, order, and the default math flag. A standard-library Python synchronizer validates that registry, generates section `_index.md` files and the Sveltia configuration, and is run before local and CI builds. The existing testable MathJax controller remains the browser boundary; its observation, debounce, idle scheduling, and one-render-at-a-time state machine are tested independently.

**Tech Stack:** Hugo 0.163.2 Extended, PaperMod commit `d3768854d00ad003b0a8dbdba254ce9224377a01`, Python 3 standard library, Node.js built-in `node:test`, Sveltia CMS compatible YAML configuration.

## Global Constraints

- The existing `acgn` URL and article paths remain unchanged while its display name becomes `随笔`.
- New Slugs use lowercase ASCII letters, digits, and hyphens; existing Slugs cannot be changed silently.
- The default article fields remain title, date, math, draft, comments, cover, and body.
- The body editor receives no Markdown or LaTeX example block.
- MathJax rendering may be delayed approximately 500ms to 1s, but formulas remain automatically rendered.
- At most one MathJax render may be in flight; rapid edits keep only the latest follow-up render.
- Existing OAuth routes, Sveltia authentication, public article URLs, and media paths remain compatible.
- No third-party Python dependency is added; use the standard library for registry parsing and generation.
- Do not push, deploy, or modify external production state until the user explicitly confirms after verification.

---

### Task 1: Add the validated section registry and synchronizer

**Files:**
- Create: `data/sections.json`
- Create: `scripts/sync_sections.py`
- Create: `tests/test_sections.py`

**Interfaces:**
- `load_sections(path: Path) -> list[dict[str, object]]` reads the JSON registry.
- `validate_sections(sections: list[dict[str, object]], content_root: Path) -> None` raises `ValueError` with a filename/section-specific message for invalid data.
- `render_section_index(section: dict[str, object]) -> str` returns the generated Hugo section front matter.
- `sync_sections(repo_root: Path) -> None` validates and writes generated section files and CMS configuration in later tasks.

- [ ] **Step 1: Write failing registry tests**

Add `unittest` cases for valid current data, duplicate Slugs, invalid Slugs, non-integer weights, missing names, and a Slug change that leaves an existing `content/<slug>` directory unregistered. The valid fixture must include:

```json
{
  "sections": [
    {"name": "学术推导与笔记", "slug": "math", "weight": 10, "math": true},
    {"name": "随笔", "slug": "acgn", "weight": 20, "math": false}
  ]
}
```

- [ ] **Step 2: Run the focused tests and verify the expected RED state**

Run:

```bash
python3 -m unittest tests.test_sections -v
```

Expected: the new tests fail because `scripts.sync_sections` and the registry do not yet exist.

- [ ] **Step 3: Add the registry and minimal validator**

Create `data/sections.json` with the two current sections and implement the standard-library loader/validator. Validate the registry shape, required fields, `^[a-z0-9]+(?:-[a-z0-9]+)*$` Slug rule, unique Slugs and names, integer non-negative weights, boolean math values, and the set of existing immediate content directories. Ignore `content/_index.md`; every other section directory must be registered.

- [ ] **Step 4: Add deterministic section-index rendering**

Implement `render_section_index()` so the current `acgn` output contains the following semantics without changing its URL:

```yaml
---
title: "随笔"
menu:
  main:
    name: "随笔"
    weight: 20
---
```

Use safe YAML quoting for names and never interpolate a Slug into a path before validation.

- [ ] **Step 5: Run focused tests and inspect the generated result**

Run the focused `unittest` command again and assert that all validation cases pass. Also run:

```bash
python3 -m unittest discover -s tests -v
```

Expected: the registry tests and the existing content/build helper tests pass.

- [ ] **Step 6: Commit the registry foundation**

```bash
git add data/sections.json scripts/sync_sections.py tests/test_sections.py
git commit -m "feat: add validated section registry"
```

---

### Task 2: Generate Hugo section pages and Sveltia collections

**Files:**
- Modify: `scripts/sync_sections.py`
- Create: `static/admin/config.template.yml`
- Modify: `static/admin/config.yml`
- Modify: `content/acgn/_index.md`
- Modify: `content/math/_index.md`
- Modify: `hugo.toml`
- Modify: `tests/test_sections.py`

**Interfaces:**
- `render_admin_config(sections: list[dict[str, object]], template: str) -> str` produces the complete static CMS YAML from one registry.
- `sync_sections(repo_root: Path) -> None` writes `content/<slug>/_index.md` and `static/admin/config.yml` after validation.

- [ ] **Step 1: Write failing generation tests**

Add tests that call `render_admin_config()` and a temporary `sync_sections()` repository. Assert that:

```python
assert 'label: "随笔"' in generated_config
assert 'folder: "content/acgn"' in generated_config
assert 'folder: "content/math"' in generated_config
assert 'title: "随笔"' in (temp_root / "content/acgn/_index.md").read_text()
assert "weight: 20" in (temp_root / "content/acgn/_index.md").read_text()
```

Also add a new temporary `travel` registry entry and assert that the synchronizer creates `content/travel/_index.md` and a `travel` CMS collection with the standard article fields.

- [ ] **Step 2: Run the generation tests and verify RED**

```bash
python3 -m unittest tests.test_sections -v
```

Expected: generation tests fail because the renderer and synchronizer do not yet write section indexes or CMS collections.

- [ ] **Step 3: Add the CMS template and generator**

Create `static/admin/config.template.yml` with the fixed GitHub backend, media settings, and a “板块管理” file collection for `data/sections.json`. The template must contain a clearly delimited article-collection marker. Make `render_admin_config()` replace that marker with one collection per section, using the section name as `label`, the validated folder as `content/<slug>`, and the standard fields.

Use field-level labels that explain the registry format without adding body examples:

```yaml
- label: "板块名称"
  name: "name"
  widget: "string"
- label: "稳定 Slug（例如 travel）"
  name: "slug"
  widget: "string"
  pattern:
    - "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    - "只能使用小写英文、数字和短横线"
- label: "导航排序数字"
  name: "weight"
  widget: "number"
  value_type: "int"
  min: 0
```

Article collections must keep the existing title/date/math/draft/comments/cover/body fields and their current defaults. Do not add Markdown or LaTeX help text to the body field.

- [ ] **Step 4: Generate section indexes and remove static menu duplication**

Make `sync_sections()` write each registered `content/<slug>/_index.md` with title and `menu.main` metadata, update the two current indexes so `acgn` is titled `随笔`, and remove the duplicated `[[menu.main]]` entries from `hugo.toml`. Keep `content/_index.md` untouched.

- [ ] **Step 5: Run focused, build, and output tests**

Run:

```bash
python3 scripts/sync_sections.py
python3 -m unittest tests.test_sections -v
python3 scripts/content_tools.py validate content
hugo --minify --gc --buildFuture --destination /tmp/shuohui-sections-public
python3 scripts/check_build.py --public /tmp/shuohui-sections-public \
  --required index.html \
  --required math/index.html \
  --required acgn/index.html \
  --required admin/index.html
```

Expected: `/acgn/` renders “随笔”, the original article paths remain unchanged, and the generated admin config contains both current collections.

- [ ] **Step 6: Commit dynamic section generation**

```bash
git add data/sections.json scripts/sync_sections.py static/admin/config.template.yml static/admin/config.yml content/acgn/_index.md content/math/_index.md hugo.toml tests/test_sections.py
git commit -m "feat: generate cms sections from registry"
```

---

### Task 3: Make CMS MathJax preview smooth under heavy formula loads

**Files:**
- Modify: `static/admin/mathjax-preview.js`
- Modify: `tests/mathjax-preview.test.mjs`
- Modify: `static/admin/index.html` only if the controller bootstrap needs an explicit scheduling hook

**Interfaces:**
- Preserve `createPreviewController(options)` and `startBrowserController(window)`.
- Extend the injected `schedule` test seam with optional `idle(callback, options)` and `cancelIdle(handle)` functions, falling back to `setTimeout` when unavailable.
- Preserve `poll()` and `stop()` behavior for existing callers.

- [ ] **Step 1: Write failing performance-state tests**

Add deterministic Node tests for:

```js
test('debounces rapid edits into one final typeset', async () => {
  const previewNode = { tagName: 'DIV', innerHTML: 'first' };
  const debounce = createScheduleSpy();
  const idleCallbacks = [];
  const typesetCalls = [];
  const controller = preview.createPreviewController({
    document: { querySelector: () => previewNode },
    mathJax: { typesetPromise: nodes => {
      typesetCalls.push(nodes);
      return Promise.resolve();
    } },
    schedule: {
      set: debounce.schedule,
      clear: debounce.clear,
      idle: fn => { idleCallbacks.push(fn); return fn; },
      cancelIdle: () => {}
    },
    logger: { warn() {} }
  });
  await controller.poll();
  previewNode.innerHTML = 'second';
  await controller.poll();
  previewNode.innerHTML = 'latest';
  await controller.poll();
  await debounce.calls.at(-1).fn();
  await idleCallbacks.at(-1)();
  assert.equal(typesetCalls.length, 1);
});

test('runs typesetting during idle time with a timeout fallback', async () => {
  const idleCallbacks = [];
  const schedule = createScheduleSpy();
  const controller = preview.createPreviewController({
    document: { querySelector: () => ({ tagName: 'DIV', innerHTML: 'formula' }) },
    mathJax: { typesetPromise: () => Promise.resolve() },
    schedule: {
      set: schedule.schedule,
      clear: schedule.clear,
      idle: fn => { idleCallbacks.push(fn); return fn; },
      cancelIdle: () => {}
    },
    logger: { warn() {} }
  });
  await controller.poll();
  await schedule.calls.at(-1).fn();
  assert.equal(idleCallbacks.length, 1);
});
```

Repeat the second case without `schedule.idle`; after the debounce callback, assert that the fallback timer is scheduled and that invoking it calls `typesetPromise()`.

Add a regression that a large unchanged preview does not trigger a second typeset after a successful render, while a render rejection remains retryable.

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
node --test tests/mathjax-preview.test.mjs
```

Expected: the new debounce/idle assertions fail because the current controller renders from its poll schedule without the new idle/debounce seam.

- [ ] **Step 3: Separate observation from render scheduling**

Refactor the controller so polling records the latest node/mode/snapshot, while a separate debounce handle schedules `renderCurrentPreview()`. Do not call MathJax directly from every changed-content poll. Clear both timer handles in `stop()`.

- [ ] **Step 4: Add idle scheduling and coalescing**

Implement one in-flight render and one latest-snapshot queue. The scheduling behavior must be equivalent to:

```js
observeChange(snapshot);
debounce(() => idle(() => {
  if (!renderPending) render(snapshot);
  else queuedSnapshot = snapshot;
}), 500);
```

Use `requestIdleCallback` with a bounded timeout when available, and a `setTimeout` fallback otherwise. Preserve iframe config-before-CDN injection and the current late-load/error retry behavior.

- [ ] **Step 5: Run focused and full tests**

```bash
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs
python3 -m unittest discover -s tests -v
node --check static/admin/mathjax-preview.js
```

Expected: all MathJax tests and the existing Python suite pass, with no duplicate render for unchanged content and no concurrent typeset calls.

- [ ] **Step 6: Commit the preview optimization**

```bash
git add static/admin/mathjax-preview.js tests/mathjax-preview.test.mjs static/admin/index.html
git commit -m "perf: smooth mathjax cms preview rendering"
```

---

### Task 4: Integrate section synchronization into CI and local documentation

**Files:**
- Modify: `.github/workflows/hugo.yml`
- Modify: `README.md`
- Modify: `tests/test_sections.py`
- Modify: `.gitignore` only if a new generated local artifact requires it

- [ ] **Step 1: Write the integration test first**

Add a test that reads `.github/workflows/hugo.yml` and `README.md`, asserting both invoke `python3 scripts/sync_sections.py` before Hugo and that the README documents `data/sections.json`, stable Slugs, and the new rename behavior.

- [ ] **Step 2: Run the integration test and verify RED**

```bash
python3 -m unittest tests.test_sections -v
```

Expected: the consumer checks fail because CI and README do not yet invoke the synchronizer.

- [ ] **Step 3: Wire synchronization into CI and local validation**

Run the synchronizer after theme bootstrap and before content validation/build. Add the same command to the README's normal and release-grade validation sequences. Document that editing the registry changes names/order while preserving existing Slugs, and that invalid Slugs fail before deployment.

- [ ] **Step 4: Run the complete local verification matrix**

```bash
python3 -m unittest discover -s tests -v
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs
node --test cloudflare-gateway/index.test.js
node --check static/admin/mathjax-preview.js
node --check cloudflare-gateway/index.js
python3 scripts/sync_sections.py
python3 scripts/content_tools.py validate content
hugo --minify --gc --buildFuture --destination /tmp/shuohui-final-public
python3 scripts/check_build.py --public /tmp/shuohui-final-public \
  --required index.html \
  --required math/index.html \
  --required acgn/index.html \
  --required admin/index.html \
  --required sitemap.xml \
  --required 'acgn/我们终将走向悲伤-解构主义之殇/index.html'
git diff --check 457f86a..HEAD
```

Expected: all tests pass, the generated `/acgn/` page is titled `随笔`, the existing article URL is present in `sitemap.xml`, and non-math pages do not load MathJax.

- [ ] **Step 5: Commit CI and documentation integration**

```bash
git add .github/workflows/hugo.yml README.md tests/test_sections.py
git commit -m "ci: sync dynamic sections before build"
```

---

### Task 5: Final review and handoff

**Files:**
- Review: all files changed by Tasks 1–4
- Test: existing Python/Node/Worker suites and generated output

- [ ] **Step 1: Inspect the complete diff and tracked artifacts**

```bash
git diff --stat origin/main..HEAD
git status --short
git ls-files | rg '(^|/)(public|themes|\\.hugo_build\\.lock|\\.wrangler|\\.DS_Store)(/|$)' || true
git ls-files '.superpowers/**'
```

Expected: no generated artifacts or internal SDD files are tracked, and only intended source/config/test/docs files changed.

- [ ] **Step 2: Run a clean-checkout-like build**

Archive `HEAD` into a temporary directory, run `scripts/bootstrap_theme.py`, `scripts/sync_sections.py`, Hugo, and `scripts/check_build.py` there. Assert the current article URL, the renamed `/acgn/` title, and the MathJax page scope.

- [ ] **Step 3: Review failure paths**

Confirm invalid registry data stops generation with actionable errors, Slug changes do not silently move content, MathJax rejection remains retryable, and the OAuth code/routes remain untouched except for existing tested behavior.

- [ ] **Step 4: Run final gates**

```bash
python3 -m unittest discover -s tests -v
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs
node --test cloudflare-gateway/index.test.js
git diff --check 457f86a..HEAD
git diff --check 659c5abd4928bca22d6b86cd355ff7be0fe2b227
```

- [ ] **Step 5: Stop before deployment**

Report the verified branch, changed files, test counts, generated routes, and any Hugo deprecation warnings. Do not push or deploy until the user explicitly authorizes it.
