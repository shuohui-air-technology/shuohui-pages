# Obsidian 式写作编辑器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付简洁的单栏实时预览写作体验，保存作者原始 Markdown，兼容现有文章与公开分享链接。

**Architecture:** 保留 Hugo、PaperMod、Sveltia 的管理/登录/提交链路，以 CodeMirror 文本状态和只读装饰实现新正文组件。对专用 Markdown 格式增加最小的无损读写适配；旧页面采用内容摘要限定的冻结兼容结果，路由历史在临时构建内容中生成 aliases，不改作者源文件。

**Tech Stack:** Hugo 0.163.2 Extended；现有 PaperMod 锁定提交；Sveltia 0.232.0 锁定源码及 MIT 许可的本地构建；CodeMirror 6、markdown-it、DOMPurify、yaml、esbuild；Python 构建脚本；Node 内置测试和 Playwright 浏览器测试。Node 24 用于新的编辑器/CMS 构建任务；新增依赖在安装时使用精确版本并提交 lockfile，数学仍为 MathJax 3.2.2。

**Spec:** `docs/superpowers/specs/2026-10-08-obsidian-style-writing-design.md`。执行前完整阅读本计划和设计；当前只交付计划，步骤尚未执行。

## Global Constraints

- 默认单栏实时预览，不以左右分栏或源码文本框替代最终交付。
- 原文正文、反斜杠、空格、LF/CRLF 和尾部换行保持一致；元数据序列化风格可变，值和未知已有字段不能丢失。
- 输入辅助默认开启，可关闭、可撤销；中文 composition 期间不切换活跃块结构或自动补符号。
- 公式约 500ms 停顿合并，单一队列、可见区域优先，过期结果丢弃，不阻止保存。
- 测量环境：本机 Chrome、约 1440px、CPU 不限速；15 万字符/2000 个公式、连续输入 30 秒；输入到下一帧 p95 ≤ 50ms，无预览造成的超过 200ms 的持续卡住。
- 编辑器专属 JS 压缩传输量 ≤ 300KB；数学/重型语言延迟加载，CMS 单独统计。
- 文章 Slug 使用 `^[a-z0-9]+(?:[-_][a-z0-9]+)*$`；留空不重命名文件，板块规则不变。
- 写作模式保留原生保存/发布按钮；所有字段维持原顶层结构，不修改 OAuth、凭据、日期时区及现有草稿语义。
- 临时准备内容和测试只在隔离工作区/临时目录运行，禁止在 `/Users/pc/Desktop/shuohui-pages` 的脏 checkout 执行规范化、重置或清理。
- 不自动推送、合并、部署；真实输入法测试未完成时必须报告，不能用合成事件冒充。

## Review Focus

1. 图片异步上传期间继续输入、移动光标或切换文章：不能覆盖新文字或把图片插入另一篇文章（Task 8）。
2. 同样的正文值被 CMS 重复传回、属性与模式来回切换：不能重建文档、丢选区或清空历史（Task 5、8）。
3. 已有 YAML 未知字段、首尾空白、CRLF 和特殊分隔符：即使不编辑正文，CMS 文件读写层也不得裁剪（Task 1、8）。
4. 正文中展示 shortcode、美元金额或危险 HTML 的代码示例：只显示，不执行；不能误变成公式/折叠（Task 4、6）。
5. 未部署保存、浅 Git 历史或并发改名导致路由清单过时：不能宣称已上线或覆盖有效路径（Task 3、9）。

---

## 文件与接口约定

新增源码在 `editor/src/`，单元测试在 `editor/test/unit/`，浏览器测试在 `editor/test/browser/`。生成资源进入 `static/admin/editor/`；CMS 本地资源进入 `static/admin/vendor/`，保留许可声明。`editor/package.json` 提供 `build`、`test:unit`、`test:browser`、`check:bundle` 脚本。

Python 新模块：`scripts/editor_baseline.py`（冻结旧排版）、`scripts/article_routes.py`（路由历史/冲突）、`scripts/prepare_content.py`（临时构建内容）、`scripts/build_cms.py`（固定源码与补丁的可重复构建）、`scripts/check_editor_build.py`（资源与基线对比）。原有模块只改相关入口，不重写 OAuth 或前台主题。

基线在 `data/editor/legacy-markdown.json` 与 `data/editor/routes-baseline.json`；完整 HTML 对照在忽略的 `.editor-validation/`，不把整份生成站点加入 Git。公开的 `/admin/editor/route-manifest.json` 和兼容预览记录只包含当前公开文章，身份是仓库路径的 SHA-256，不列出草稿。

公共类型：

- `SourceEnvelope = { frontMatter: object, body: string, separator: string, eol: '\n'|'\r\n', headRaw: string }`；`headRaw` 包含开始与结束 YAML 标记及中间元数据，但不含结束标记后的换行；`separator` 仅为该处原始换行（或文件结束时的空串）。`body` 为其后全部原始字符，包括开头空行和尾部空白，不能 `trim()`，也不能重复添加分隔符。
- `PreviewBlock = { from: number, to: number, kind: string, source: string }`；偏移使用 CodeMirror/JS UTF-16 位置，不能把 Python 字符位置直接用于光标。
- `RouteRecord = { id: string, sourcePath: string, canonical: string, aliases: string[], draft: boolean }`；公开清单不输出 `sourcePath` 或草稿。
- `BaselineEntry = { id: string, bodyHash: string, mathPolicy: object, renderedMarkdown: string }`；仅记录当前公开文章中确有旧规范化差异的条目。

任务按 1→2→3→4→5→6→7→8→9→10 执行。Task 2/3 是同一个发布兼容边界的一部分，不拆成独立产品；Task 4–7 在接入前可用测试入口独立运行。每个代码任务遵循失败测试→最小实现→通过测试→小提交，不允许先接入半成品再补验证。

### Task 1: 无损 Markdown 文件边界及固定 CMS 构建

**Files:** Create `editor/package.json`, `editor/package-lock.json`, `editor/src/source-format.mjs`, `editor/test/unit/source-format.test.mjs`, `scripts/build_cms.py`, `vendor/sveltia/manifest.json`, `vendor/sveltia/lossless-markdown.patch`, `vendor/sveltia/LICENSE`, `tests/test_build_cms.py`; Modify `.gitignore`；Generate `static/admin/vendor/sveltia-cms.js`。新增框架依赖与构建工具只在本任务及后续需要它的模块中配置。

**Interfaces:** Produces `parseSourceFile(text: string): SourceEnvelope`, `serializeSourceFile(envelope: SourceEnvelope, data: object): string`, `registerSourceFormat(CMS): void`；CMS 格式名固定为 `shuohui-markdown-lossless`。`serializeSourceFile` 从 `data.body` 写正文，合并原有未知元数据，剔除仅在编辑状态中使用的 `_shuohui_source_snapshot`。

- [ ] **Step 1:** 写 `no_edit_roundtrip_is_exact`、`metadata_edit_preserves_body_and_unknown_fields`、`custom_format_receives_raw_crlf`，包括正文尾部空格、多个尾部换行、无尾部换行、包含 `---` 的正文，以及用户字段名占用保留内部键时明确报错。精确断言示例：`assert.equal(serializeSourceFile(parseSourceFile(source), data), source)`；修改 `title` 后断言 `body === originalBody` 且 `unknownField` 原值存在。
- [ ] **Step 2:** 建立精确锁定的测试依赖后运行 `node --test editor/test/unit/source-format.test.mjs` 与 `python3 -m unittest discover -s tests -p test_build_cms.py -v`；确认失败来自缺失实现或 stock CMS 的裁剪行为，而非导入/网络配置错误。保存失败证据。
- [ ] **Step 3:** 实现上述三个接口。专用格式通过隐藏的临时快照字段携带原分隔符/头部/换行信息，`toFile` 永不持久化内部快照。`build_cms.py --output PATH [--check]` 在临时目录获取并验证 v0.232.0 对应提交及源码摘要，仅对该格式移除解析前的裁剪/换行统一和定制格式写出的裁剪，其他格式维持上游行为。不可在压缩 JS 上做字符串替换；失败拒绝输出新资源。
- [ ] **Step 4:** 重跑两个测试命令；新增断言 YAML/JSON 等非专用格式行为不变，源码摘要不匹配时构建拒绝，原有 unknown 字段和临时快照区分正确。执行两次 CMS 构建比较摘要和许可清单；PASS 才进入后续任务。
- [ ] **Step 5:** 只提交本任务文件，提交信息 `feat: add lossless Markdown file boundary`；不接入正式后台入口。

### Task 2: 冻结旧排版并准备不写回源文件的内容

**Files:** Create `scripts/editor_baseline.py`, `scripts/prepare_content.py`, `tests/test_editor_baseline.py`, `tests/test_prepare_content.py`, `data/editor/legacy-markdown.json`；Modify `.gitignore`。

**Interfaces:** Consumes 当前规范化函数（仅在临时基线生成中运行）；Produces `capture_baseline(root: Path, revision: str, output: Path): dict`, `compatible_body(path: str, body: str, math_policy: dict, baseline: dict): str`, `prepare_content(root: Path, destination: Path, baseline: dict, routes: list[RouteRecord]): dict`。`capture` 必须校验 revision；构建基线允许使用原有主题和固定 Hugo，但不得修改 root/content。

- [ ] **Step 1:** 写 `test_baseline_does_not_write_source`、`test_unchanged_body_uses_frozen_output`、`test_one_character_edit_bypasses_legacy_rules`、`test_metadata_only_edit_keeps_compatibility`、`test_draft_not_in_public_baseline`。断言 `compatible_body(..., changedBody, ...)==changedBody`，原文件 bytes 前后完全一致；有效公式策略改变必须使兼容记录失效。
- [ ] **Step 2:** 运行 `python3 -m unittest discover -s tests -p test_editor_baseline.py -v`、`python3 -m unittest discover -s tests -p test_prepare_content.py -v`；确认失败。
- [ ] **Step 3:** 在 `mktemp` 等价的临时目录中重现当前部署的 sync→normalize→Hugo 链路，建立源正文摘要与静态正文 HTML 对照。冻结结果只在路径、正文和 math 策略全部匹配时使用。`prepare_content` 复制源文件、只在 destination 生成兼容 Markdown/日期构建值/aliases，保持仓库内容不变；拒绝 destination 与源 content 目录相同、包含或被包含。此任务用固定 RouteRecord fixture 验证 aliases 输入，实际历史 records 由 Task 3 提供。
- [ ] **Step 4:** 重跑测试。对实际全部文章生成基线；基线 commit 必须仍包含当前文章内容，若远端文章已变化先更新隔离工作区并重新采集，不冻结过时版本。确认草稿不进入可公开兼容记录。
- [ ] **Step 5:** 提交代码和小型基线 JSON，信息 `feat: preserve legacy rendering without rewriting sources`；忽略完整基线 HTML。

### Task 3: 公开路由历史、下划线与别名冲突

**Files:** Create `scripts/article_routes.py`, `tests/test_article_routes.py`, `tests/fixtures/article-slugs.json`, `data/editor/routes-baseline.json`, `requirements-build.txt`；Modify `scripts/content_tools.py`, `tests/test_content_tools.py`, `scripts/check_content_outputs.py`, `tests/test_content_outputs.py`。

**Interfaces:** Produces `collect_routes(root: Path, baseline_revision: str): list[RouteRecord]`, `validate_routes(records: list[RouteRecord], reserved_paths: set[str]): list[str]`, `public_route_manifest(records: list[RouteRecord], revision: str): dict`。Task 2 的 `prepare_content` 接受 records，并以有效 aliases 合并原字段；最终 canonical 使用 Hugo inventory 校验，不把手写规则当成唯一真相。

- [ ] **Step 1:** 共用 Slug 样例接受 `what_is_agent`、`what-is-agent`、空值，拒绝域名、`../`、`a__b`、尾分隔符；写 `test_slug_conflicts_with_filename_fallback`、`test_history_a_b_c_redirects_directly_to_c`、`test_revert_has_no_self_alias`、`test_shallow_history_fails_closed`、`test_draft_has_no_alias_or_manifest_entry`。assert 冲突错误包含两个来源和同一网址，不覆盖输出文件。
- [ ] **Step 2:** 运行 `python3 -m unittest discover -s tests -p test_article_routes.py -v` 和现有 content 工具测试，确认新用例失败。
- [ ] **Step 3:** 修改文章校验正则，不放宽板块规则；提取基线至当前 Git 历史中的非草稿地址并直接合并到当前地址。处理 merge 中的重复版本，完整历史不足时报错；文件重命名未显式关联身份时报错。采用安全 YAML 解析读取 aliases，不用现有仅支持标量的解析器猜测列表；将所需构建依赖精确锁定在 `requirements-build.txt`，保留原文件片段写出而非整体重排。保留已有 aliases，检查系统、板块、canonical 和全部别名。
- [ ] **Step 4:** 重跑测试，并用固定 Hugo 对临时测试仓库比较中文回退、下划线/短横线、`url` override、绝对/相对 aliases 和输出路径。别名为静态 meta refresh，不宣称 HTTP 301；公开清单不能含草稿 title/body/sourcePath。
- [ ] **Step 5:** 提交，信息 `feat: unify public slugs and protect historical routes`。

### Task 4: 只读 Markdown、数学与 collapse 解析

**Files:** Create `editor/src/preview-parser.mjs`, `editor/src/reading-preview.mjs`, `editor/test/unit/preview-parser.test.mjs`。

**Interfaces:** Consumes `SourceEnvelope.body`；Produces `parsePreviewBlocks(source: string): PreviewBlock[]`, `renderReading(source: string, options: { getAsset, legacyBody? }): { html: string, blocks: PreviewBlock[] }`。`legacyBody` 只影响只读阅读显示，不传回文本状态；所有渲染部件携带源码范围。

- [ ] **Step 1:** 写 `math_backslashes_survive_parser`、`fenced_shortcode_stays_literal`、`currency_not_math`、`nested_collapse_has_correct_ranges`、`unknown_shortcode_visible`、`dangerous_html_never_executes`、`emoji_offsets_are_utf16`。断言代码围栏中的 `{{< collapse >}}` 没有 details 节点，公式 `\\int_0^1 x^2\\,dx` 内容精确保留，源字符串渲染前后相等，源码范围切片与 block.source 相等。
- [ ] **Step 2:** 运行 `node --test editor/test/unit/preview-parser.test.mjs`，确认失败。
- [ ] **Step 3:** 用 markdown-it 的 inline/block 规则保护数学并解析 collapse，保留未知语法；DOMPurify 消毒阅读 HTML，图片 getAsset 路径保持作者原值。嵌套查找忽略 fenced code，不通过对全文粗略替换来处理 shortcode。
- [ ] **Step 4:** 重跑测试；在阅读模式的浏览器 fixture 比较现有两篇随笔及 LaTeX 速记的标题、表格、公式数量/内容、折叠嵌套，不修改三篇源文件。
- [ ] **Step 5:** 提交，信息 `feat: add read-only Markdown and shortcode previews`。

### Task 5: 文本状态、IME 与可撤销辅助

**Files:** Create `editor/src/document-state.mjs`, `editor/src/input-assistance.mjs`, `editor/src/preferences.mjs`, `editor/test/unit/document-state.test.mjs`, `editor/test/browser/input.spec.mjs`；Create 必需的 `editor/playwright.config.mjs`, `editor/test/fixtures/editor.html`, `editor/test/fixtures/harness.mjs`。

**Interfaces:** Produces `createDocument({ parent, value, onChange, preferences }): { view, getSource(), syncValue(value), setMode(mode), destroy() }`，mode 为 `live|source|read`；`createAssistance(preferences): Extension[]`；`readPreferences(storage): { continueLists: boolean, pairBrackets: boolean }`。`syncValue` 返回 `unchanged|applied|conflict`；view 必须跨模式持续存在。

- [ ] **Step 1:** 写 `same_value_keeps_history`、`external_value_conflict_is_not_overwritten`、`composition_defers_structure_changes`、`assistance_off_is_literal`、`one_undo_reverts_assistance`、`mode_toggle_does_not_emit_change`。浏览器断言中文 composition 期间原 DOM 输入节点不被替换，组词完成后正文与期望一致；美元输入不盲目配对。
- [ ] **Step 2:** 运行 `node --test editor/test/unit/document-state.test.mjs`、`npm --prefix editor run test:browser -- input.spec.mjs`；先验证失败，再实现。
- [ ] **Step 3:** 配置 LF/CRLF 文档序列化、history、列表 Enter 与括号键绑定；偏好本地持久化失败时内存兜底，不把设置写进文章。组词期间不做自动事务或显示结构变化；外部差异按文档身份/来源判断，不能把慢响应当成作者的新值。
- [ ] **Step 4:** 重跑，补测空列表退出、选择包裹、转义字符、粘贴多行、撤销跨模式和存储不可用。所有测试 fixture 与临时保存隔离，不登录真实后台或提交真实文章。
- [ ] **Step 5:** 提交，信息 `feat: add stable Markdown input and undoable assistance`。

### Task 6: 单栏实时预览与可达的源码

**Files:** Create `editor/src/live-preview.mjs`, `editor/src/outline.mjs`, `editor/src/editor.css`, `editor/test/browser/live-preview.spec.mjs`。

**Interfaces:** Consumes Task 4 blocks 和 Task 5 view；Produces `createLivePreview({ getBlocks, renderBlock, isComposing }): Extension`, `buildOutline(source: string): { label: string, from: number, level: number }[]`。显示装饰不可 dispatch 文本变更；点击预览只发选区/滚动事务。

- [ ] **Step 1:** 写 `inactive_block_previews_active_block_shows_source`、`cross_block_selection_reveals_all_selected_source`、`preview_click_maps_to_source`、`copy_returns_markdown`、`collapse_toggle_does_not_change_document`。assert 退出一个标题后显示排版，点击标题再次出现其原 `##`；模式及折叠变更 onChange 次数为零。
- [ ] **Step 2:** 运行 `npm --prefix editor run test:browser -- live-preview.spec.mjs`，确认失败。
- [ ] **Step 3:** 使用 CodeMirror 状态装饰/部件，以可见块和选区为边界更新；跨行 replacement 采用符合 CodeMirror 约束的状态装饰，不在 viewport 插件中非法替换跨行。代码、表格、公式、collapse 激活时显示完整源码单元；大纲默认收起，点击只定位，读模式复制排版文本是显式独立操作。
- [ ] **Step 4:** 重跑，检查键盘上下跨部件、移动端窄屏、未闭合语法、框选复制和循环切换。不允许以“只能切到源码才能正常输入”作为实时预览完成。
- [ ] **Step 5:** 提交，信息 `feat: add single-pane live preview and source navigation`。

### Task 7: MathJax 可见区调度与清理

**Files:** Create `editor/src/math-scheduler.mjs`, `editor/test/unit/math-scheduler.test.mjs`, `editor/test/browser/math-preview.spec.mjs`；Reuse `static/admin/mathjax-loader.js`, `static/js/mathjax-config.js`。

**Interfaces:** Produces `createMathScheduler({ ensureMathJax, clock, maxCacheEntries: 256 }): { request(node, source, version), setVisible(nodes), invalidate(version), destroy() }`；`ensureMathJax` 来自既有 loader 适配，不启动第二个 runtime。缓存 key 包含公式/有效配置，MathJax 输出节点用独立实例而不是在两个位置移动同一个 DOM。

- [ ] **Step 1:** 写 `rapid_input_debounces_500ms`、`max_one_typeset_in_flight`、`stale_version_never_applies`、`offscreen_not_prioritized`、`destroy_cancels_tasks`、`failure_keeps_source`。fake clock 499ms 无新排版，500ms 后仅最新版进入队列；缓存超过 256 项淘汰旧项。
- [ ] **Step 2:** 运行 `node --test editor/test/unit/math-scheduler.test.mjs`，确认失败。
- [ ] **Step 3:** 单飞+idle 预算调度，只提交有限可见节点；观察器、定时器和断开节点统一清理；数学下载失败可重试但不形成忙轮询。live/read 共用调度器，源码模式不做离屏整篇扫描。
- [ ] **Step 4:** 重跑并执行 `npm --prefix editor run test:browser -- math-preview.spec.mjs`；断言 MathJax 3.2.2 只加载一次，代码块/金额不排版、旧异步结果不覆盖新版本、退回源码仍可保存。
- [ ] **Step 5:** 提交，信息 `perf: schedule visible math previews without blocking input`。

### Task 8: CMS 接入、简洁布局、图片与保存

**Files:** Create `editor/src/cms-adapter.mjs`, `editor/src/layout-adapter.mjs`, `editor/src/media-insertion.mjs`, `editor/src/index.mjs`, `editor/build.mjs`, `editor/test/browser/cms-roundtrip.spec.mjs`, `editor/test/browser/media.spec.mjs`, `editor/test/browser/layout.spec.mjs`；Modify `static/admin/index.html`, `static/admin/config.template.yml`, `scripts/sync_sections.py`, `static/admin/markdown-format.js`, `tests/markdown-format.test.mjs`, `tests/mathjax-config.test.mjs`, `tests/test_sections.py`；Generate `static/admin/config.yml`, `static/admin/editor/editor.js`, `static/admin/editor/editor.css`, 许可文件。

**Interfaces:** Consumes Tasks 1、4–7；Produces `registerEditor(CMS): void`（字段 `source-markdown`）、`attachWritingLayout({ root, fieldRoot }): { setPropertiesVisible(show), destroy() }`, `insertMedia({ view, pickFile, addFile, entryId }): Promise<void>`。保留 CMS.React 公共组件协议与原生保存入口，布局不访问内部 store。

- [ ] **Step 1:** 写 `all_existing_articles_roundtrip`、`unknown_frontmatter_survives`、`missing_bundle_falls_back_losslessly`、`media_completion_after_switch_does_not_insert`、`typing_while_uploading_is_preserved`、`validation_error_reveals_properties`。用真实固定 CMS 的本地测试 backend/被完全拦截的 mock GitHub API 验证最终保存文件，不只比较 onChange 值；测试账户不能有真实 GitHub 写入能力。
- [ ] **Step 2:** 运行相关浏览器 spec 和既有 Node/Python CMS 配置测试，确认新断言失败。保存的精确 bytes 与 Task 1 fixture 对比；真实 CMS 若还有其他裁剪位置，在对应边界先添失败测试再做最小专用格式修正。
- [ ] **Step 3:** 设置 CMS_MANUAL_INIT，加载固定本地 CMS，注册格式/字段后 init；模板与生成器同步切换正文控件和专用格式，并声明 `_shuohui_source_snapshot` 为隐藏、非必填的编辑状态字段，确保 CMS 不因未知字段处理丢掉快照。快照不显示、不写入文章；真实文章占用该键时明确报告冲突。停止自动注册正文 preSave 格式化，不删除用于旧基线验证的纯函数。源码 fallback 也走无损格式。保留原有评论、封面、日期、math、draft 和 save/publish 行为。
- [ ] **Step 4:** 实现独立布局和媒体定位事务：异步插入位置跟踪编辑变化，文章身份已切换就取消；布局目标不足立即撤回并显示原表单，属性切换不卸载正文。启动布局时恢复 native header 及错误控件，不依赖生成类名。
- [ ] **Step 5:** 重跑浏览器/配置测试；新增临时 `travel` 板块应生成格式 `shuohui-markdown-lossless` 和正文 `source-markdown`，正式注册表不变。命中旧兼容记录后首次修改正文，必须只提醒一次“本篇原有自动排版将不再套用，请检查发布预览”，不注入正文。`npm --prefix editor run build`、`npm --prefix editor run check:bundle` 均通过；提交 `feat: integrate focused writing into CMS without source conversion`。

### Task 9: 完整公开链接预览和无源文件改写的 CI

**Files:** Create `editor/src/public-route.mjs`, `editor/test/unit/public-route.test.mjs`, `editor/test/browser/public-route.spec.mjs`, `scripts/check_editor_build.py`, `tests/test_check_editor_build.py`；Modify `scripts/sync_sections.py`, `scripts/check_build.py`, `tests/test_sections.py`, `tests/test_check_build.py`, `.github/workflows/hugo.yml`, `README.md`；Generate 配置和后台公开清单。

**Interfaces:** Consumes Task 3 records；Produces `previewPublicRoute({ entryPath, sectionPath, slug, baseURL, urlOverride }): { url, editable, reason? }`，`check_editor_build(public: Path, baseline: Path, inventory: Path): list[str]`。CMS 字段仍是 `data.slug`，标签“公开链接名称”，信息“预计网址；部署成功后生效”。

- [ ] **Step 1:** 写 `underscore_slug_previews_public_url`、`blank_uses_filename_without_renaming`、`url_override_disables_ineffective_slug_edit`、`saved_not_deployed_never_says_live`；Python 测试断言未改页面正文/路由一致、每个 alias meta refresh/canonical 指向目标、草稿无别名/清单项，CI 不再在 source/content 上运行 normalize。
- [ ] **Step 2:** 运行 `node --test editor/test/unit/public-route.test.mjs`、相关浏览器 spec 与 `python3 -m unittest discover -s tests -p test_check_editor_build.py -v`，确认失败。
- [ ] **Step 3:** 实现公开网址字段预览和冲突提示，使用共享样例验证 JS/Python 正则一致。CI checkout 获取必要完整 Git 历史、Node 24、构建 Python 依赖；先 validate 原文，再 prepare 临时内容，通过 Hugo `--contentDir` 构建。库存检查、内容输出检查也指向同一临时目录，不能检查另一套原文路由后误判成功。CMS 本地资源与生成 bundle 的一致性检查纳入流程。
- [ ] **Step 4:** 在临时目录运行新链路与基线比对，再执行 `python3 -m unittest discover -s tests -v`、原有 Node 测试及全部 editor 测试。验证旧 `_` 链接、新 `-` 链接、A→B→C 与 drafts；更新 README，删除建议在用户源目录规范化正文的默认操作，讲清仅保存与发布的区别。
- [ ] **Step 5:** 提交，信息 `feat: validate public routes and source-preserving builds`。

### Task 10: 实际浏览器验收、压力测试与独立审查

**Files:** Create `editor/test/browser/performance.spec.mjs`, `editor/test/performance-report.mjs`, `docs/superpowers/reports/2026-10-08-obsidian-editor-verification.md`；必要修复仅针对被证明失败的边界，每项仍走失败测试/通过测试。

**Interfaces:** Consumes 所有前述任务；Produces 运行证据与最终审查报告，不把截图或合成测试宣称为真实输入法/正式站部署证据。

- [ ] **Step 1:** 写性能 fixture、原文差异检查与测试报告生成：记录实际最长文章、15 万字符/2000 公式、30 秒连续输入 p95/max、首开时长、gzip 资源大小、网络 MathJax 次数和长任务。断言 `p95Ms <= 50`、无预览造成的 `blockingMs > 200`、专属 gzip JS `<= 300*1024`；固定环境信息一起保存。
- [ ] **Step 2:** 运行完整单元、实际 CMS 浏览器与性能测试；在有界面浏览器中实际编辑现有三篇回归文章的临时副本，验证就地预览、折叠、图片、公开网址和保存 bytes。使用本机中文输入法检查组词/取消/候选/光标；若工具无法验证真实 IME，报告该项待人工验收，不能写“全部输入 bug 已解决”。
- [ ] **Step 3:** 对任何失败使用 systematic-debugging 找到具体边界并修复，重跑相关用例及完整回归；不删测试、不改压力样例、不放宽阈值来冒充通过。无法达到目标或需要改变设计时先报告实际数据和取舍。
- [ ] **Step 4:** 用子代理做独立只读全分支审查，重点正文无损、XSS、IME/媒体竞态、未知字段、历史链接和草稿保护；主代理核实反馈后修复，再全量验证。审查者不能自行提交真实文章或更改用户 checkout。
- [ ] **Step 5:** 本地小提交完善报告，列明已验证/未验证项目、基线差异为零的证据、代码改动和回退办法；交付测试后的分支。后续只有获得推送/部署授权，才执行发布并验证正式站，不能将本地浏览器成功写成已上线。

## 自审与执行交接

设计第 3–6 节由 Tasks 1、4–8、10 覆盖；旧排版保护由 Task 2/9 覆盖；公开链接由 Task 3/9 覆盖；配置生成及未来板块由 Task 8/9 覆盖。五项 Review Focus 均在对应任务有测试。新增无损 CMS 读写适配落实原设计的原文保证，不改变账号或部署权限。

当前计划步骤全未执行。用户审阅并确认本计划后，在当前会话按 `executing-plans` 实施，最终使用子代理独立审查；若用户希望改为逐任务子代理实施，应在执行前提出。计划确认也不等于推送、合并或部署授权。
