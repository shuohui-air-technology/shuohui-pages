---
title: 提示词工程（Prompt engineering）正在死去
date: 2026-09-04T15:43:00
math: false
draft: true
comments: true
cover: null
---

> _我希望通过撰写这份文章来捋清思路，并为更多 0 基础者提供帮助，这些内容大多基于我的经验和理解，也有部分来源于完全公开的资料，我会附上这些资料以供有兴趣的人进行查阅_

### 什么是提示词工程？

这里提到的提示词工程指的是围绕模型输入进行设计、组织、测试和迭代，使模型在特定任务中产生更符合目标的输出

**_通常而言，这样的设计可以是明确需求，或甚至将原有的提示词直接明确为一份任务清单_**

**让我们举一个简单的例子：我们采用下列的两种提示词，让 ai 帮助我们使用 Python 绘制一份论文的结果图像**



{{< collapse summary="低精细度提示词" >}}


请使用 Python 和 Matplotlib 绘制一张论文实验结果图，概括 Sclar 等人发表于 ICLR 2024 的论文《Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design》关于提示词格式敏感性的主要实验发现。

只使用 Python 3、Matplotlib 和本地文件操作完成任务，不调用任何 skill

### 论文链接

https://proceedings.iclr.cc/paper_files/paper/2024/hash/6c0e99d736da621403018ca7b32b1a4d-Abstract-Conference.html

请先阅读论文，再自行选择合适的图形类型和布局，准确呈现论文中的核心结果。

### 请在当前工作目录生成以下文件

sclar_low_figure.py

sclar_low_figure.png

sclar_low_figure.svg

sclar_low_figure.pdf


$$

\int_0^1 x^2\,dx

$$



{{< /collapse >}}
