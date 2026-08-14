# Website Configuration Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent common content, section-configuration, asset-reference, dependency, and deployment-workflow errors from reaching the public site.

**Architecture:** Keep `data/sections.json` as the section source of truth, extend the existing Python validation layer to enforce explicit article metadata and local asset references, and add regression checks for generated CMS configuration. Harden GitHub Actions triggers and third-party runtime URLs without changing the publishing meaning of `draft: true`.

**Tech Stack:** Python `unittest`, Node.js built-in test runner, Hugo `0.163.2 extended`, PaperMod pinned commit, GitHub Actions YAML, Sveltia CMS, MathJax.

## Global Constraints

- Preserve stable section slugs and existing public URLs.
- Preserve intentional `draft: true`; never silently publish drafts.
- Do not add Markdown/LaTeX example text to the CMS editor.
- Do not change OAuth credentials, token handling, or external secrets.
- Keep mathematical content and fenced code outside automatic prose formatting.
- Run the complete Python tests, Node tests, Hugo build, generated-output checks, and live deployment checks before claiming completion.

### Task 1: Make article metadata explicit

**Files:**
- Modify: `scripts/content_tools.py`
- Modify: `content/math/2026-06-07-两个ladr中涉及-range及-null-的证明时常用的公式.md`
- Modify: `content/math/内积空间的定义与性质及施密特正交化的步骤.md`
- Modify: `archetypes/default.md`
- Test: `tests/test_content_tools.py`

**Interfaces:**
- `validate_front_matter(path)` continues to return human-readable error strings.
- Article files must explicitly contain boolean `draft`, `math`, and `comments`; `_index.md` files remain exempt.

- [ ] Add failing tests for missing `draft`, `math`, and `comments` on an article fixture.
- [ ] Run `python3 -m unittest tests.test_content_tools` and confirm the new test fails because the fields are currently optional.
- [ ] Require those fields for non-`_index.md` Markdown files, while retaining existing type checks and draft semantics.
- [ ] Add the missing explicit fields to the two existing articles and set the generic archetype default to `math: false` with `comments: true`.
- [ ] Run the focused tests and confirm existing valid content still passes.

### Task 2: Validate local image references and generated CMS configuration

**Files:**
- Modify: `scripts/content_tools.py`
- Modify: `scripts/sync_sections.py`
- Modify: `tests/test_content_tools.py`
- Modify: `tests/test_sections.py`

**Interfaces:**
- `validate_files(content_dir)` also checks local `/images/...` references against `content_dir.parent / static`.
- `sync_sections.py` exposes a deterministic generated-config comparison helper or check mode used by tests and CI.

- [ ] Add failing tests for a Markdown image and a `cover.image` that point to missing local files.
- [ ] Add a failing test showing that a tracked `static/admin/config.yml` can drift from the registry/template output.
- [ ] Implement reference validation for local image paths while ignoring external URLs and leaving math formulas untouched.
- [ ] Implement a deterministic config/index comparison after section synchronization; report the first mismatched generated file clearly.
- [ ] Run focused content and section tests and verify current images/configuration pass.
- [ ] Add a generated-HTML check that every root-relative `src` asset resolves inside `public/`, including query-string URLs used for cache busting.
- [ ] Require the CMS entrypoint, generated CMS config, formatter, preview helper, and shared MathJax config in the Pages smoke check.

### Task 3: Harden build and image-optimization workflows

**Files:**
- Modify: `.github/workflows/hugo.yml`
- Modify: `.github/workflows/image-optimizer.yml`
- Modify: `tests/test_sections.py` or a focused workflow test module

**Interfaces:**
- Hugo deployment continues to run on `main` pushes and manual dispatch.
- Image optimization runs only for image changes, uses explicit write permission, and does not re-run for its own bot commit.

- [ ] Add failing assertions for image workflow path filtering, pinned action references, and the bot-loop guard.
- [ ] Add `paths: [static/images/**]`, `permissions: contents: write`, `if: github.actor != 'github-actions[bot]'`, checkout v4, and the verified Image Actions v1.5.0 commit SHA.
- [ ] Keep Hugo's content synchronization and output checks in their current order; set deployment concurrency to prefer the newest build.
- [ ] Run workflow/configuration tests and inspect the resulting YAML text for accidental trigger changes.

### Task 4: Remove project-owned Hugo deprecations and pin MathJax

**Files:**
- Modify: `hugo.toml`
- Modify: `layouts/partials/extend_head.html`
- Modify: `themes/PaperMod/layouts/baseof.html` only if the pinned theme cannot be updated safely; otherwise update `scripts/bootstrap_theme.py` to a verified compatible PaperMod commit.
- Modify: `static/admin/index.html`
- Modify: `static/admin/mathjax-preview.js`
- Modify: `tests/mathjax-config.test.mjs`

**Interfaces:**
- The site remains monolingual Chinese at the same root URL.
- All MathJax loaders use the same exact `3.2.2` URL and shared delimiter configuration.

- [ ] Add/adjust tests that assert the exact MathJax URL and that project configuration uses `locale` instead of deprecated `languageCode`.
- [ ] Replace the project-owned language setting with `locale = "zh-CN"` and verify the generated HTML language/OG/RSS output remains correct.
- [ ] Pin MathJax to `3.2.2` in the site, CMS, and iframe preview loader.
- [ ] Resolve remaining PaperMod deprecation warnings through a compatible pinned theme update or narrow project template overrides, without editing ignored generated theme files.
- [ ] Run Hugo with path/deprecation diagnostics and confirm no project-owned deprecation warning remains.

### Task 5: Full verification and deployment

**Files:**
- Modify: `README.md` with the new audit commands and invariants.

- [ ] Run `python3 -m unittest discover -s tests -v`.
- [ ] Run all Node test files, including Cloudflare gateway and Markdown formatter tests.
- [ ] Run section synchronization, content normalization/validation, Hugo build, `check_build.py`, and `check_content_outputs.py`.
- [ ] Confirm published pages exist, drafts are absent, section navigation labels match `data/sections.json`, and referenced assets exist.
- [ ] Commit and push the hardening changes, wait for the Pages workflow to succeed, and verify the live admin configuration and representative article URLs.
