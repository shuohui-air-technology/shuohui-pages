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
invalid `slug` value fails during synchronization before deployment. The slug
`admin` is reserved for the CMS route and cannot be registered as a section.

For a release-grade smoke check, build and verify the generated output explicitly:

```bash
python3 scripts/bootstrap_theme.py
python3 scripts/sync_sections.py
hugo --minify --gc --buildFuture --destination /tmp/shuohui-final-public
python3 scripts/check_build.py --public /tmp/shuohui-final-public \
  --sections data/sections.json \
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

- 普通保存（Save）：提交到 `main` 并触发当前 GitHub Actions，按正常流程部署。
- 保存但不发布（Save without Publishing）：仍然提交内容，但该次 commit 会加入 `[skip ci]`，因此暂不触发部署；后续另一次未跳过 CI 的部署可能会将这次内容一并发布。
- `draft: true`：Hugo 构建时不会生成公开页面。要公开文章，必须清除 `draft`，并进行一次未跳过 CI 的部署；当前验证工具不会静默覆盖作者的发布意图。
- The local validation and build commands in this README do not push, deploy the Worker, or publish GitHub Pages; any of those actions require explicit user confirmation.
- GitHub Pages deployment is expected to run the normalize, validate, Hugo build, and generated-output smoke checks before uploading `public/`.
- The Cloudflare Worker should be validated with `node --test cloudflare-gateway/index.test.js` before any separate Worker deployment.
