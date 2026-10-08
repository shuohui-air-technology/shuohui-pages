# shuohui.uk

Hugo + PaperMod 网站，Sveltia CMS 后台，以及独立部署的 Cloudflare OAuth Worker。

## 固定工具链

- Hugo `0.163.2 extended`；PaperMod `d3768854d00ad003b0a8dbdba254ce9224377a01`。
- 编辑器：CodeMirror 6，具体版本见 `editor/package-lock.json`；Node 24。
- Sveltia CMS `v0.232.0`：来源、原始文件哈希和专用无损格式补丁见 `vendor/sveltia/`。
- Python 3.11+ 与 `requirements-build.txt`；浏览器测试使用本机 Google Chrome。

## 写作与公开链接

文章默认使用单栏实时预览：正在编辑的 Markdown 块显示原文，其余块就地排版。源码、实时预览、阅读模式共用一个文档和撤销历史。文章属性、图片、折叠内容、大纲和输入辅助在工具栏按需展开。列表续接与括号配对可关闭；美元符号不自动配对。Obsidian 本体不是开源项目，此编辑器独立实现相似交互，不包含其私有代码。

正文按作者输入保存，不在保存或部署时自动补空行、改标题或修正符号。预览是只读显示，不往返转换正文。固定 CMS 的专用格式保留首尾空白、LF/CRLF、反斜线和未知属性；加载失败时回退到源码输入框。显示改造不替换原生保存、授权、日期、草稿、评论或封面逻辑。

“公开链接名称”对应文章 front matter 的 `slug`，不是后台文件名，也不是板块 slug。支持小写英文、数字、短横线、下划线，例如 `what_is_agent`。留空沿用原文件名，不重命名文件。显示的是预计完整网址，部署成功后才生效。存在 `url` 或自定义路由时提示不要做无效修改；已有公开网址和历史别名冲突会在部署前被拒绝。构建从固定基线后的完整 Git 历史收集旧地址，并直接重定向到当前文章，避免 A→B→C 链式跳转。文件重命名或删除必须先提供明确的文章身份迁移方案，不能静默猜测。

`data/sections.json` 是板块名称、顺序和默认公式开关的唯一来源。更改 `name`、`weight` 后生成导航；保持既有板块 slug 稳定。新板块自动获得相同正文编辑器、公开链接字段和无损格式。`admin` 不能作为板块 slug。

## 保存、发布与草稿

- Save 提交但带 `[skip ci]`，不会立即部署。
- Save and Publish 提交并触发 Pages 工作流。
- 需要长期隐藏的文章必须保持 `draft: true`；普通 Save 不等于私密，下一次未跳过 CI 的部署可能一起发布已保存的非草稿。
- 草稿不生成页面、公开清单或历史跳转。日期、`math`、`draft`、`comments` 等配置错误会给出具体校验信息，不静默覆盖作者意图。

## 本地验证（不发布）

在仓库根目录执行：

```bash
python3 -m pip install -r requirements-build.txt
npm ci --prefix editor
python3 scripts/bootstrap_theme.py
python3 scripts/sync_sections.py
python3 scripts/sync_sections.py --check
python3 scripts/content_tools.py validate content
npm --prefix editor run check:bundle
python3 scripts/build_cms.py --check
python3 -m unittest discover -s tests -v
node --test tests/*.test.mjs editor/test/unit/*.test.mjs cloudflare-gateway/index.test.js
npm --prefix editor run test:browser
python3 scripts/build_editor_site.py --public /tmp/shuohui-verified-public
```

输出目录必须全新或为空；不要指向源文件目录。最后一条命令复制到临时目录，处理日期和历史跳转，再让构建及库存检查使用同一份临时内容。它检查原文未改、旧文章正文 HTML 一致、别名直达、草稿不公开、页面资源及编辑器/CMS 哈希。基线 Git 历史必须完整，因此 CI 使用 `fetch-depth: 0`。旧的 Markdown 整理纯函数只用于固定迁移基线，不作为作者源文件的默认操作。

更改编辑器后运行 `npm --prefix editor run build`，更改 CMS 补丁后运行 `python3 scripts/build_cms.py`；生成资源、版本查询参数和依赖许可证一起提交。后台公开路由清单由已验证构建生成，不包含文章源路径或草稿。公式使用原有 MathJax 3.2.2，延迟 500ms 合并输入、优先可见区域、单飞排版，最多缓存 256 个结果；显示失败不改变源码。

以上命令不推送、不部署 Worker、不发布 Pages；外部发布另需明确授权。`themes/PaperMod`、`public/`、`.editor-validation/`、本地 Wrangler 状态和工作树暂存目录不提交。真实中文输入法验收与合成 composition 测试应分别记录，不能相互替代。
