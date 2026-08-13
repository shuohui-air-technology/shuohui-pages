# shuohui.uk 项目整体优化设计

**日期：** 2026-08-14\
**目标分支：** `codex/shuohui-optimization`\
**基线版本：** 远程 `main` 的 `457f86a`

## 1. 背景与问题

项目是一个 Hugo + PaperMod 静态站点，内容通过 Sveltia CMS 写入 GitHub，GitHub Actions 构建并发布到 GitHub Pages，Cloudflare Worker 为 CMS 提供 GitHub OAuth 网关。

当前已确认的线上问题是：`content/acgn/我们终将走向悲伤-解构主义之殇.md` 的 front matter 使用了 `draft: true`，因此文章被 Hugo 正确地排除，没有进入列表和生成页面。对应的 GitHub Actions 构建与部署本身是成功的，不应通过修改主题或缓存来处理这个问题。

基线构建使用本机 Hugo `v0.163.2 extended`，命令为：

```bash
hugo --minify --gc --buildFuture --destination /tmp/shuohui-optimization-baseline-public
```

结果为 24 个页面、0 个构建错误；现有警告来自 Hugo 对 `languageCode` 和 PaperMod 旧模板 API 的弃用提示。

## 2. 目标

### 2.1 必须达成

1. 修复当前应公开文章的草稿状态，使其可以被正常构建和访问。
2. 让文章 front matter 的日期和布尔字段在进入 Hugo 前可验证、可重复处理。
3. 让 CI 不仅报告“构建成功”，还检查关键文章页面和 sitemap 是否实际生成。
4. 保持主站、分类列表、文章 URL、CMS 地址和 OAuth 路由不变。
5. 降低 CMS MathJax 预览在内联预览、iframe 替换和快速编辑时的重复渲染与竞态风险。
6. 加固 OAuth 状态校验、Token 交换错误处理和回调页面消息来源限制。
7. 为内容处理、CMS 预览纯逻辑和 OAuth 边界增加可重复的自动化检查。

### 2.2 非目标

- 不迁移 Hugo、PaperMod、Sveltia CMS、GitHub Pages 或 Cloudflare。
- 不改变文章 URL、菜单名称、站点视觉风格或 CMS 使用流程。
- 不自动把所有草稿强制改成公开；`draft: true` 仍然表示作者有意暂存。
- 不在本次任务中轮换外部账号凭据；凭据轮换作为独立的运维动作提示用户完成。
- 不把本地构建产物、Cloudflare 本地状态或用户已有删除操作带入优化提交。

## 3. 外部契约与不变量

以下接口必须保持兼容：

| 接口 | 保持内容 |
|---|---|
| 主站 | `https://shuohui.uk/` |
| 内容分区 | `/math/`、`/acgn/` |
| CMS | `https://shuohui.uk/admin/` |
| OAuth 发起 | `https://shuohui-cms-oauth.shuohui.workers.dev/auth` |
| OAuth 回调 | `https://shuohui-cms-oauth.shuohui.workers.dev/callback` |
| Sveltia 消息协议 | `authorization:github:success:{"token":"..."}` |
| 数学定界符 | `$...$`、`$$...$$`、`\(...\)`、`\[...\]` |

文章发布语义保持明确：

- `draft: false`：允许进入公开构建。
- `draft: true`：保留在仓库，但不生成公开页面。
- 日期缺少秒数：构建前标准化为 `YYYY-MM-DDTHH:mm:ss`，避免 CMS 输出导致 Hugo 构建失败。

## 4. 分阶段架构

### 阶段一：发布链路可靠性

数据流：

```text
Sveltia CMS
    -> GitHub main
    -> front matter 校验
    -> 日期标准化
    -> 固定版本的 Hugo 构建
    -> 生成 public/ 和 sitemap
    -> 关键页面冒烟检查
    -> GitHub Pages 部署
```

设计要点：

- 将当前内嵌在 `.github/workflows/hugo.yml` 中的 Python 正则处理提取为可测试脚本。
- 校验 `title`、`date`、`draft`、`math`、`comments` 的类型和可解析性。
- 校验脚本区分“合法草稿”和“非法 front matter”，不因作者有意保存草稿而让 CI 失败。
- 在构建后检查当前文章的公开页面、至少一个已有文章页面、两个分区列表和 sitemap。
- 将 `hugo-version: latest` 改为明确版本，并把 PaperMod clone 固定到明确 commit，避免上游漂移。
- Hugo 固定为已验证的 `0.163.2`，PaperMod 固定为当前基线 clone 的 commit `d3768854d00ad003b0a8dbdba254ce9224377a01`。
- 当前文章的 `draft` 修复作为内容变更单独记录，不在校验脚本中偷偷改写作者选择。

### 阶段二：CMS MathJax 预览

职责拆分：

1. 共享配置：主站和 CMS 使用同一份 MathJax 定界符配置。
2. 预览控制器：只负责发现预览节点、识别内联/iframe 模式、追踪内容变化和安排 typeset。
3. 渲染适配器：分别调用主文档或 iframe 内的 MathJax。

控制器状态规则：

- 预览节点身份或模式变化时清空旧快照，并允许重新注入 MathJax。
- 内容未变化时不调用 `typesetPromise()`。
- 渲染进行中到来的变化只合并为下一次渲染，不产生并发调用。
- iframe 尚未加载完成时短间隔重试；空闲时使用较长间隔降低 CPU 占用。
- 异常通过带前缀的 `console.warn` 暴露，不能静默导致无法排查。

将 `hugo.toml` 中的全局 `math = true` 改为 `math = false`，依靠数学文章自身的 `math: true` 按页面加载 MathJax；不含公式的首页和随笔页不再加载数学引擎。确认主站和 CMS 均已迁移到 MathJax 后，删除未被引用的旧 KaTeX partial，避免两套渲染实现继续并存。

### 阶段三：OAuth 网关

保持 `/auth` 和 `/callback` 路由及 Sveltia 消息协议不变，在内部加入：

- `/auth` 生成随机一次性 `state`，通过 `Secure`、`HttpOnly`、`SameSite=Lax` Cookie 保存，同时传给 GitHub。
- `/callback` 必须同时收到匹配的 `state` 和有效 `code`，否则返回 400。
- 使用 `URL`/`searchParams` 构造授权地址，不手写拼接查询字符串。
- 检查 GitHub Token API 的 HTTP 状态、JSON 解析结果和 access token 是否存在。
- 回调页面使用固定目标来源 `https://shuohui.uk` 调用 `postMessage`，不再使用通配符 `*`。
- Token 序列化后再注入脚本，并加入 `Cache-Control: no-store`、CSP、`X-Content-Type-Options` 和 `Referrer-Policy`。
- 缺失环境变量、GitHub 错误和 opener 不存在时返回不泄露凭据的可理解错误。

该阶段需要重新部署 Worker，但不需要修改 CMS 的 `base_url` 或回调地址。

## 5. 文件边界

预期变更集中在以下文件：

- `.github/workflows/hugo.yml`：调用固定、可测试的内容处理脚本和构建后冒烟检查。
- `scripts/`：内容 front matter 校验、日期标准化和生成产物检查。
- `tests/`：Python 标准库测试及不依赖网络的内容处理测试。
- `static/admin/index.html`：只保留 CMS 启动和脚本引用。
- `static/js/mathjax-config.js`：统一主站和 CMS 的 MathJax 配置。
- `static/admin/mathjax-preview.js`：CMS 预览控制器。
- `layouts/partials/extend_head.html`：引用共享 MathJax 配置。
- `cloudflare-gateway/index.js`：OAuth 安全和错误处理。
- `cloudflare-gateway/index.test.js`：Worker 纯逻辑和请求边界测试。
- `layouts/partials/math.html`：确认无引用后删除。
- `content/acgn/我们终将走向悲伤-解构主义之殇.md`：将明确应公开的文章设为 `draft: false`。
- `README.md`：补充本地校验、构建和 Worker 测试命令。

不纳入优化提交：`public/`、`themes/`、`.hugo_build.lock`、`cloudflare-gateway/.wrangler/`、用户已有的图片删除和本地 `.DS_Store`。

## 6. 测试与验收

每一阶段遵循红-绿-重构：先写能捕获目标行为的失败测试，再写最小实现，最后运行完整回归。

验收命令包括：

```bash
python3 -m unittest discover -s tests -v
node --test cloudflare-gateway/index.test.js
node --check static/admin/mathjax-preview.js
hugo --minify --gc --buildFuture --destination /tmp/shuohui-final-public
```

构建验收需要确认：

- 当前公开文章生成独立 HTML 页面。
- 草稿文章不生成公开页面。
- `/math/` 和 `/acgn/` 列表页生成。
- `sitemap.xml` 包含所有公开文章且不包含草稿文章。
- MathJax 脚本只在需要的页面加载。
- OAuth 测试不输出真实 Token 或环境变量值。

最终还要检查 `git diff --check`、完整构建输出、测试失败数为 0，以及工作树中没有把本地构建产物误加入提交。

## 7. 交付与回滚

实现按三个阶段分别提交，每个阶段都可独立回滚。默认只在隔离分支完成本地提交，不自动推送或部署；需要上线时由用户确认后再执行推送和 Worker 部署。

若任一阶段引入外部行为差异，优先回滚该阶段提交，不修改文章内容或删除历史文件来掩盖问题。
