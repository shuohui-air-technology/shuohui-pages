# 文章字体

文章标题和正文匹配站点所有者本机 Codex 的自定义聊天字体：**LXGW WenKai Mono / 霞鹜文楷等宽，1.522**。这不是 Codex 默认字体，也不是其单独配置的代码字体。导航、文章列表、后台、代码块和数学公式不在此次字体变更范围内。

本机安装该字体时优先使用 `local()`；未安装时按 `unicode-range` 加载需要的 WOFF2 分片，不下载完整 25 MB TTF。字体声明由本站提供，Hugo 合并、压缩、指纹化并附 SRI，只在文章详情页加载；分片来自字体作者认可的 [ZSFT](https://fonts.zeoseven.com/items/293/)，保留其版权声明。`font-display: swap` 与系统字体回退保证分片服务不可用时正文仍可阅读。外部字体服务依然是运行时依赖，离线时不保证自定义字体生效。

字体 [OFL 1.1 授权](https://github.com/lxgw/LxgwWenKai/blob/v1.522/OFL.txt) 副本随站点发布到 `/fonts/lxgw-wenkai-mono/OFL.txt`。没有复制 Codex 应用字体或修改字体字形。常规网页分片仅提供 400 字重，强调及标题使用浏览器合成字重；不另外下载整套粗体字体。

来源：`https://fontsapi.zeoseven.com/293/main/result.css`，版本 1.522。快照原文 SHA-256：`c4e9fa059eb759d3d853caf88eeeb68295f3d2fa0dadd8447b439cc155bcfe03`。通过 `scripts/vendor_article_font.py CSS文件 OFL文件` 机械改写相对 URL 为原服务的绝对 URL；升级必须确认版本、许可和 URL 格式，再生成快照。

验证：Python 静态规则测试；Chrome 禁用本地字体后以真实分片验证中英文实际使用 WenKai 字形、只请求必要分片，以及分片失败后的系统回退。浏览器测试使用两个未改写的上游 WOFF2 分片作固定测试样本，其余字符覆盖仍由完整 237 条声明提供，不按照现有文章裁减。
