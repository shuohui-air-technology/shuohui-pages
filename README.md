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
python3 scripts/sync_sections.py --check
python3 scripts/content_tools.py normalize content
python3 scripts/content_tools.py validate content
hugo --minify --gc --buildFuture --destination /tmp/shuohui-public
node --test tests/mathjax-config.test.mjs tests/mathjax-preview.test.mjs tests/markdown-format.test.mjs
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
python3 scripts/sync_sections.py --check
hugo --minify --gc --buildFuture --destination /tmp/shuohui-final-public
  python3 scripts/check_build.py --public /tmp/shuohui-final-public \
  --sections data/sections.json \
  --required acgn/index.html \
  --required math/index.html \
  --required admin/index.html \
  --required admin/config.yml \
  --required admin/markdown-format.js \
  --required admin/mathjax-preview.js \
  --required js/mathjax-config.js \
  --required sitemap.xml
hugo list all > /tmp/shuohui-hugo-list.csv
python3 scripts/check_content_outputs.py \
  --public /tmp/shuohui-final-public \
  --hugo-list /tmp/shuohui-hugo-list.csv
```

After the smoke check, confirm that:

- every Hugo page with `draft: false` has a generated HTML output
- every Hugo page with `draft: true` is absent from the generated output
- `sitemap.xml` follows the same published/draft split

## Content and deployment expectations

- 普通保存（Save）：提交到 `main`，但该次 commit 会加入 `[skip ci]`，因此不会立即发布；这是当前后台的默认草稿保存方式。
- 保存并发布（Save and Publish）：提交到 `main` 并触发当前 GitHub Actions，按正常流程部署。
- `draft: true`：Hugo 构建时不会生成公开页面。要公开文章，必须取消“是否为草稿”，再选择“保存并发布”；当前验证工具不会静默覆盖作者的发布意图。
- 未发布保存仍然会提交到仓库；如果之后发生一次未跳过 CI 的部署，这些提交可能一起发布，因此需要长期隐藏的文章必须保留 `draft: true`。
- 后台保存文章时会自动整理常见 Markdown 结构：补齐段落空行、将类似 `1.Agent` 的编号标题规范为标题、将独立的“优点：”类标签整理为小标题；数学文章和代码块保持原样。部署前还会再次规范化并校验，无法安全判断的情况会给出具体行号。
- 文章必须显式写出 `draft`、`math`、`comments` 三个布尔字段；校验还会拒绝重复的顶层 front matter 键、缺失的本地图片，以及与板块注册表不一致的生成配置。
- 生成后的 HTML 会检查根路径静态资源是否存在，并强制检查 CMS 入口、CMS 配置、格式化脚本、预览脚本和共享 MathJax 配置，避免“页面打开但后台脚本 404”的配置问题。
- The local validation and build commands in this README do not push, deploy the Worker, or publish GitHub Pages; any of those actions require explicit user confirmation.
- GitHub Pages deployment is expected to run the normalize, validate, Hugo build, and generated-output smoke checks before uploading `public/`.
- The Cloudflare Worker should be validated with `node --test cloudflare-gateway/index.test.js` before any separate Worker deployment.
