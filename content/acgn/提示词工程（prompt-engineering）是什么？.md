---
title: 提示词工程（Prompt engineering）正在死去
date: 2026-09-04T15:43:00
math: false
draft: false
comments: true
cover: null
---

> _我希望通过撰写这份文章来捋清思路，并为更多 0 基础者提供帮助，这些内容大多基于我的经验和理解，也有部分来源于完全公开的资料，我会附上这些资料以供有兴趣的人进行查阅_

### 什么是提示词工程？

这里提到的提示词工程指的是围绕模型输入进行设计、组织、测试和迭代，使模型在特定任务中产生更符合目标的输出

**_通常而言，这样的设计可以是明确需求，或甚至将原有的提示词直接明确为一份任务清单_**

**让我们举一个简单的例子：我们采用下列的两种提示词，让 ai 帮助我们使用 Python 绘制一份论文的结果图像**

_模型均选择 gpt5.6-sol （medium）_ 

{{< collapse summary="低精细度提示词" >}}

请使用 Python 和 Matplotlib 绘制一张论文实验结果图，概括 Sclar 等人发表于 ICLR 2024 的论文《Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design》关于提示词格式敏感性的主要实验发现。

只使用 Python 3、Matplotlib 和本地文件操作完成任务，不调用任何 skill

论文链接

https://proceedings.iclr.cc/paper_files/paper/2024/hash/6c0e99d736da621403018ca7b32b1a4d-Abstract-Conference.html

请先阅读论文，再自行选择合适的图形类型和布局，准确呈现论文中的核心结果。

请在当前工作目录生成以下文件

sclar_low_figure.py

sclar_low_figure.png

sclar_low_figure.svg

sclar_low_figure.pdf

{{< /collapse >}}

![](/images/20260907-104846.png)

**_低精度提示词得到的对应图像_**

{{< collapse summary="高精细度提示词" >}}

请使用 Python 3 和 Matplotlib，制作一张论文实验结果图，解释 Sclar、Choi、Tsvetkov 和 Suhr 在 ICLR 2024 论文中关于 prompt formatting sensitivity 的定量结果。

### 论文

Sclar, M., Choi, Y., Tsvetkov, Y., & Suhr, A. (2024).

Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design.

ICLR 2024.

### 论文链接

https://proceedings.iclr.cc/paper_files/paper/2024/file/6c0e99d736da621403018ca7b32b1a4d-Paper-Conference.pdf

只使用 Python 3、Matplotlib 和本地文件操作，不调用任何 skill，也不调用其他代理。

### 图形的核心结论是

只改变语义等价的 prompt formatting，也可能显著改变模型测得的准确率。单一格式得到的准确率只是格式空间中的一个点估计。

请依据论文中的真实数据绘图，不制作抽象的概念示意图，不使用没有数据依据的 persistence matrix，不把所有结果压缩成一张拥挤的信息海报。

论文 Table 2 中提供了以下真实数据。这些数据全部来自 LLaMA-2-7B、probability ranking accuracy，并比较同一任务在两种 prompt formats 下的表现：

- task280：Format 1 = 4.3%，Format 2 = 82.6%，差值 = 78.3 points；
- task317：Format 1 = 7.6%，Format 2 = 63.8%，差值 = 56.2 points；
- task190：Format 1 = 36.0%，Format 2 = 61.4%，差值 = 25.4 points；
- task904：Format 1 = 41.8%，Format 2 = 61.6%，差值 = 19.8 points；
- task320：Format 1 = 36.1%，Format 2 = 47.6%，差值 = 11.5 points；
- task322：Format 1 = 61.4%，Format 2 = 71.4%，差值 = 10.0 points；
- task279：Format 1 = 37.2%，Format 2 = 44.1%，差值 = 6.9 points。

### 请将图形设计为最多两个面板

(a) Hero panel：使用水平 dumbbell plot 或 paired dot plot 展示上述七个任务。横轴为 Accuracy (%)，每一行代表一个任务，两个端点分别表示 Format 1 和 Format 2，用连接线表示同一任务中的格式变化，并直接标注 accuracy difference。任务按照差值从大到小排序。

(b) Supporting panel：使用简洁的横向点图展示论文报告的整体 spread 结果：

- LLaMA-2-13B 的最高差异：76 accuracy points；
- 53 个任务、每个任务随机采样 10 个格式时，模型与 few-shot 条件下的 median spread：7.5 accuracy points；
- GPT-3.5 在 320 个 formats、53 个任务上的 median spread：6.4 accuracy points；
- GPT-3.5 的 maximum spread：56.2 accuracy points。

在辅助面板中清楚区分不同实验上下文，避免把这些数值误解为同一批样本或同一种统计量。median、maximum 和 lower-bound 等统计量使用不同标记，并在图中标注数据来源。

### 图形类型必须服从数据结构

- 成对格式比较使用 dumbbell plot 或 paired dot plot；
- 不同实验条件的离散统计量使用横向点图；
- 只有在横轴具有自然顺序时才使用折线图；
- 不要把无序的模型类别直接用折线连接；
- 不要添加论文没有提供的误差线、置信区间、均值、方差、p 值或连续数值序列。

### 配色采用克制的多色方案

- Format 1 使用蓝色；
- Format 2 使用橙色；
- 统计摘要可以使用青绿色或紫色；
- 连接线、网格线和背景信息使用灰色；
- 保持颜色数量有限，避免彩虹色；
- 颜色需要具有明确的语义，并在小尺寸和灰度打印中保持可区分。

### 版面要求

- 画布尺寸为 183 mm × 130 mm；
- 白色背景；
- 以 hero panel 为视觉中心；
- 辅助面板明显小于主面板；
- 不在数据区域覆盖图例或长段说明；
- 使用直接标注，减少不必要的图例；
- 面板标签使用 (a) 和 (b)；
- 图注注明数据来自论文 Table 2、Abstract 和 Section 4.5；
- 明确区分 reported value 与不同实验设置下的数值。

### 代码要求

- 显式设置字体优先级为 Arial、PingFang SC、DejaVu Sans、Liberation Sans；
- SVG 保留可编辑文字；
- PDF 使用矢量输出；
- PNG 以 600 dpi 导出；
- 在 Python 脚本中保留实际绘图数据、单位转换和每组数据的来源；
- 实际运行脚本并检查图形是否存在文字重叠、标签截断、图例遮挡和坐标轴单位错误。

### 请在当前工作目录生成以下文件

sclar_high_figure.py

sclar_high_figure.png

sclar_high_figure.svg

sclar_high_figure.pdf

{{< /collapse >}}

![](/images/20260907-104923.png)

**_高精度提示词得到的对应图像_**

我们不难发现

**两者差别不大，甚至在某些部分，低精度的提示词得到的效果比高精度提示词得到的更好**

是什么原因导致了这个现象？
