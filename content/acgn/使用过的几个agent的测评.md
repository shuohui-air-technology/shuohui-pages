---
title: 使用过的几个agent的测评
date: 2026-08-14T17:22:00
math: false
draft: false
comments: true
cover: null
---

1.codewhale推荐指数：(3/5)
我最早使用的agent（如果不算上Kimi的Computer功能的话），来自Hmbown的项目：[https://github.com/Hmbown/CodeWhale](https://github.com/Hmbown/CodeWhale)![](/images/20260814-172422.png)

deepseekTUI(后更名为codewhale)
我了解到这个项目是由于那段时间V4刚刚出来，那时候v4-pro作为一个有百万上下文窗口的agent，却没有对这个功能进行原生优化的agent框架，而codewhale在当时则是较先出现的一个针对deepseek-pro的长上下文窗口以及其他机制进行对应优化，使得用户可以获得较原生的agent使用体验的项目
我当时抱着学习的心态使用了codewhale，并做了[https://github.com/shuohui-air-technology/aigc-humanizer-zh](https://github.com/shuohui-air-technology/aigc-humanizer-zh)作为我的练手项目
下面是在这个项目的过程中，我可以感受到codewhale的一些优缺点，（这是在大致半年前的状态，由于该项目是持续更新的，我无法确定现在的情况）
优点：
由于codewhale是针对deepseek进行专门优化的，这使得它的缓存命中率相当高，并且对Prompt Caching（前缀缓存）的利用相当优秀
codewhale完善的安全策略/沙箱环境有效的减少了agnet本地化运行初期经常为人诟病的乱删文件导致不可逆损害的现象，在我的实际使用中，没有出现过任何负面性质的文件删除操作
得益于codewhale是基于rust开发的这一特点，这使得其在占用资源方面显得尤其轻量，对我个人而言，这种轻量化的使用体验是我的一个很大的加分项
缺点：
有趣的是，codewhale的完善的安全策略对我来说也是它的缺点之一,在我的mac运行时，它总是会提醒我它“没有权限调用shell命令”，在我明确要求它可以使用对应工具时，它仍然由于置于prompt前的仓库宪章（constitution.json）而频繁拒绝修改自身的配置文件。我不确定这是否是我个人的技术问题，或是开发者有意为之的设计，但我使用的其余agent确实从未出现过类似的权限问题
codewhale在我使用的时候还有一些非常影响使用体验的问题：它原生的memory功能离奇的不好用，我经常要求它在一段对话完成之后将对话内容写入memory.md文件，但是它经常在下一次对话时无法自主读取memory.md，而且似乎有一些时候，它会写入与项目无关的记忆，而与“我”有关。我阅读后发现这些来源于我的桌面文件中的信息，它可能更倾向试图描绘用户画像，而不是我希望的项目记忆，这导致了我即使明确要求其写入记忆，但最后还是导致了项目进度的丢失。并且mcp以及其安装的skill也存在类似的问题，它在重启对话后经常性的丢失这些功能的具体列表，必须在我提醒后才能找回（但不排除我安装的方式存在问题）
2.trae(4/5)
