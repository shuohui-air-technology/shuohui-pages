---
title: 使用过的几个agent的测评
date: 2026-08-14T17:22:00
math: false
draft: false
comments: true
cover: null
---

## 1. CodeWhale

推荐指数：(3/5)

我最早使用的 agent（如果不算上 Kimi 的 Computer 功能的话），来自 Hmbown 的项目：[CodeWhale](https://github.com/Hmbown/CodeWhale)。

![CodeWhale 项目截图](/images/20260814-172422.png)

### 项目背景

deepseekTUI（后更名为 CodeWhale）。

我了解到这个项目，是由于那段时间 V4 刚刚出来。那时候，V4-Pro 作为一个拥有百万上下文窗口的 agent，却没有对这个功能进行原生优化的 agent 框架；而 CodeWhale 在当时则是较早出现的、针对 DeepSeek-Pro 的长上下文窗口以及其他机制进行优化的项目，使得用户可以获得较为接近原生的 agent 使用体验。

我当时抱着学习的心态使用了 CodeWhale，并做了 [AIGC Humanizer ZH](https://github.com/shuohui-air-technology/aigc-humanizer-zh) 作为我的练手项目。

下面是在这个项目的过程中，我可以感受到的 CodeWhale 的一些优缺点。这是大致半年前的使用体验，由于该项目仍在持续更新，我无法确定现在的情况。

### 优点

- 由于 CodeWhale 是针对 DeepSeek 进行专门优化的，这使得它的缓存命中率相当高，并且对 Prompt Caching（前缀缓存）的利用相当优秀。
- CodeWhale 完善的安全策略和沙箱环境，有效减少了 agent 本地化运行初期经常被诟病的乱删文件导致不可逆损害的现象。在我的实际使用中，没有出现过任何负面性质的文件删除操作。
- 得益于 CodeWhale 基于 Rust 开发的这一特点，它在资源占用方面尤其轻量。对我个人而言，这种轻量化的使用体验是一个很大的加分项。

### 缺点

- 有趣的是，CodeWhale 完善的安全策略对我来说也是它的缺点之一。在我的 Mac 运行时，它总是会提醒我“没有权限调用 shell 命令”。在我明确要求它可以使用对应工具时，它仍然由于置于 prompt 前的仓库宪章（`constitution.json`）而频繁拒绝修改自身的配置文件。我不确定这是我个人的技术问题，还是开发者有意为之的设计，但我使用的其余 agent 确实从未出现过类似的权限问题。
- CodeWhale 在我使用的时候还有一些非常影响使用体验的问题：它原生的 memory 功能离奇地不好用。我经常要求它在一段对话完成之后将对话内容写入 `memory.md` 文件，但是它经常在下一次对话时无法自主读取 `memory.md`；而且似乎有一些时候，它会写入与项目无关的记忆，而与“我”有关。我阅读后发现这些来源于我的桌面文件中的信息，它可能更倾向于试图描绘用户画像，而不是我希望的项目记忆。这导致了我即使明确要求其写入记忆，最后仍然导致了项目进度的丢失。并且 MCP 以及其安装的 skill 也存在类似的问题：它在重启对话后经常丢失这些功能的具体列表，必须在我提醒后才能找回（但不排除我安装的方式存在问题）。

## 2. Trae

推荐指数：(4/5)
