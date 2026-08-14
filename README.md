# shuohui.uk

This repository hosts the Hugo site for [shuohui.uk](https://shuohui.uk/) and the Cloudflare Worker used by the CMS OAuth flow.

## Pinned toolchain

- Hugo: `0.163.2 extended`
- PaperMod: `d3768854d00ad003b0a8dbdba254ce9224377a01`

The shared bootstrap script obtains PaperMod locally in `themes/PaperMod` during CI and local builds. That directory, Hugo's lockfile, generated `public/`, local Wrangler state, and worktree scratch space are intentionally local-only and should not be committed.

## Local validation

Run these commands from the repository root:

```bash
python3 -m unittest discover -s tests -v
python3 scripts/bootstrap_theme.py
python3 scripts/sync_sections.py
python3 scripts/content_tools.py normalize content
python3 scripts/content_tools.py validate content
hugo --minify --gc --buildFuture --destination /tmp/shuohui-public
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs
node --test cloudflare-gateway/index.test.js
```

`data/sections.json` is the single source of truth for section names, order, and
slugs. When renaming or reordering a section, change `name` and `weight` as
needed; keep existing `slug` values stable so existing URLs do not change. An
invalid `slug` value fails during synchronization before deployment.

For a release-grade smoke check, build and verify the generated output explicitly:

```bash
python3 scripts/bootstrap_theme.py
python3 scripts/sync_sections.py
hugo --minify --gc --buildFuture --destination /tmp/shuohui-final-public
python3 scripts/check_build.py --public /tmp/shuohui-final-public \
  --required acgn/index.html \
  --required math/index.html \
  --required sitemap.xml \
  --required 'acgn/我们终将走向悲伤-解构主义之殇/index.html'
```

After the smoke check, confirm that:

- the published article exists at `acgn/我们终将走向悲伤-解构主义之殇/index.html`
- intentionally drafted fixtures do not appear in the generated output
- `sitemap.xml` includes the published article URL

## Content and deployment expectations

- `draft: true` is intentional and keeps content out of the public build.
- Publishing requires `draft: false`; the current validation tools do not silently override author intent.
- The local validation and build commands in this README do not push, deploy the Worker, or publish GitHub Pages; any of those actions require explicit user confirmation.
- GitHub Pages deployment is expected to run the normalize, validate, Hugo build, and generated-output smoke checks before uploading `public/`.
- The Cloudflare Worker should be validated with `node --test cloudflare-gateway/index.test.js` before any separate Worker deployment.
