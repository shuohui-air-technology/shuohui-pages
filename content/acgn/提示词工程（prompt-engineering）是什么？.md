---
title: 提示词工程（Prompt engineering）正在死去
date: 2026-09-04T15:43:00
math: false
draft: false
comments: true
cover: null
---
# 什么是提示词工程？现在我们是否还需要它？

*我希望通过撰写这份文章来捋清思路。这些内容大多基于我的经验和理解，也有部分来源于完全公开的资料，我会附上这些资料，供有兴趣的人查阅。*

## 什么是提示词工程？

**让我们举一个简单的例子：**

Google AI Developers 的 Imagen 提示词指南展示了同一个公园场景在逐步增加提示词细节之后的图片输出。[Imagen prompt guide](https://ai.google.dev/gemini-api/docs/imagen#imagen-prompt-guide)

第一条提示词只说明主体和环境：

{{< collapse summary="简短提示词" >}}

~~~text
A park in the spring next to a lake
~~~

{{< /collapse >}}

第二条提示词补充了时间和光线：

{{< collapse summary="加入环境与光线" >}}

~~~text
A park in the spring next to a lake, the sun sets across the lake, golden hour
~~~

{{< /collapse >}}

第三条提示词又加入了更具体的视觉元素：

{{< collapse summary="加入主体细节" >}}

~~~text
A park in the spring next to a lake, the sun sets across the lake, golden hour, red wildflowers
~~~

{{< /collapse >}}

下面三张图片来自 Google 官方文档。它们分别对应上面的三条提示词：

![短提示词对应的 Imagen 图片](https://ai.google.dev/static/gemini-api/docs/images/imagen/0_prompt-writing-basics_park_short.png)

![加入环境与光线后的 Imagen 图片](https://ai.google.dev/static/gemini-api/docs/images/imagen/0_prompt-writing-basics_park_medium.png)

![加入主体细节后的 Imagen 图片](https://ai.google.dev/static/gemini-api/docs/images/imagen/0_prompt-writing-basics_park_long.png)

从这组图片中，我们可以直接看到提示词中的信息怎样进入画面：场景保持在春天的湖边公园，后两条提示词加入了日落、黄金时刻和红色野花，输出也随之增加了这些视觉条件。

更近的学术研究也在讨论类似问题。Datta 等人在 ACL 2024 发表的 Prompt Expansion for Adaptive Text-to-Image Generation 中，让模型把用户的简短查询扩展成一组更具体的图像提示词，再交给文本生成图像模型处理。论文的人类评估显示，Prompt Expansion 生成的图片在审美和多样性上优于基线方法。[Datta et al., 2024](https://aclanthology.org/2024.acl-long.189/)

这里的“详细”也就有了更具体的含义：它可以是主体、环境、光线、构图、风格和动作等信息。重点在于补充画面条件，具体词语只是表达这些条件的方式。

这里提到的**提示词工程**，指的是围绕模型输入进行设计、组织、测试和迭代，使模型在特定任务中产生更符合目标的输出。

**通常而言，这样的设计可以是明确需求，或甚至将原有的提示词直接明确为一份任务清单。**

提示词里可以包含任务目标、背景材料、示例、角色、约束、输出格式、工具说明和验收标准。在聊天窗口中，它通常是一段自然语言；在一个完整的 AI 应用中，它还会和上下文、工具、模型参数、状态管理以及评测系统一起工作。

**让我们举一个简单的例子：**

~~~text
提示 A：
请总结这段会议记录。

提示 B：
请根据下面的会议记录，提取已经确认的决定、负责人和截止日期。
以表格输出；每项决定单独占一行；只使用记录中出现的信息。
~~~

提示 A 把很多决定交给模型自行处理：总结什么、写多长、怎样组织都没有明确说明。提示 B 则给出了字段、格式和证据范围，模型需要自行补全的部分明显少了。

**提示词工程的核心对象是模型输入，核心结果是输出行为的可控性。**

## 它最初指什么？

如果把问题说得简单一些，提示词工程最初关注的是这样一件事：

> 在模型参数保持不变的情况下，怎样通过输入让模型完成一个具体任务？

传统的监督学习通常需要准备任务数据，再通过训练或微调改变模型参数。早期的提示方法把任务说明和少量示例放进输入，让模型根据上下文直接生成结果。

Brown 等人在 2020 年发表的 GPT-3 论文展示了这种用法。GPT-3 拥有 1750 亿个参数，在实验中可以仅通过文本交互完成许多任务。研究者通过任务说明和 few-shot 示例指定任务，整个过程不需要梯度更新或特定任务微调。[Brown et al., 2020](https://arxiv.org/abs/2005.14165)

Liu 等人的综述把这类研究概括为 prompt-based learning。原始输入会经过模板转换，形成包含待填空位的文本，再由语言模型完成预测。[Liu et al., 2023](https://doi.org/10.1145/3560815)

所以，在早期阶段，提示词承担了一个很实际的作用：它把一个已经冻结的模型临时接到一个新任务上。模型从预训练数据中获得了语言模式和知识，提示词负责把这些能力引向当前任务。

## 传统提示词工程包含哪些内容？

早期提示词工程主要围绕自然语言输入展开。为了方便叙述，可以把它拆成下面几部分。

| 内容 | 主要作用 | 典型表现 |
|---|---|---|
| 任务描述 | 指定模型要完成的动作 | 总结、分类、翻译、抽取、改写 |
| 角色设定 | 提供观察问题的视角 | 研究员、编辑、测试工程师 |
| Few-shot 示例 | 展示输入与输出之间的对应关系 | 分类样例、抽取样例、风格样例 |
| 推理提示 | 引导模型展开中间分析 | 分步推理、理由示例、检查步骤 |
| 上下文与分隔 | 区分材料、指令和问题 | 标题、XML 标签、Markdown 区块 |
| 输出约束 | 规定答案的外在结构 | 表格、列表、JSON、固定字段 |

### 任务描述：先把要做的事情说清楚

任务描述是传统提示词中最容易理解的一部分。它把一个宽泛的请求改写成一个可以执行的动作。

“分析这份报告”可能包含摘要、风险识别、数据检查和商业判断。“提取报告中的三个主要风险，并为每个风险列出证据和潜在影响”则把范围收窄了。

这里的差别很直观：提示词提供的信息越完整，模型需要自己补全的编辑决定就越少。

### 角色设定：给模型一个观察角度

“你是一名软件测试工程师”会提醒模型关注异常输入、边界条件和失败路径。角色设定会影响语气和关注点，也会给任务增加一个观察角度。

不过，对现代模型来说，“世界顶级专家”这类称号带来的作用通常低于具体的任务要求、领域材料和输出标准。后文提到的真实提示词研究会给出更直接的证据。

### Few-shot 示例：让模型从案例中理解任务

Few-shot prompting 的意思是在提示词中放入少量输入和输出示例，让模型根据这些案例归纳任务模式。分类、信息抽取、格式转换和风格模仿都经常使用这种方法。

示例可以把很多抽象规则说清楚：标签怎样使用，边界情况怎样处理，答案需要多长，字段之间怎样对应。思维链（Chain-of-Thought，CoT）研究也进一步展示了示例对复杂推理的影响。

### 推理提示：让模型沿着某种步骤处理问题

Wei 等人的研究表明，在足够大的语言模型中，带有中间推理步骤的示例可以提升算术、常识和符号推理任务的表现。论文中的核心做法，是向模型提供少量 chain-of-thought exemplars，让模型参考其中的推理结构。[Wei et al., 2022](https://arxiv.org/abs/2201.11903)

从这里开始，提示词关注的内容又多了一层：它可以描述答案长什么样，也可以描述问题应该怎样被处理。

### 格式约束：让答案方便阅读和使用

格式约束可以把自然语言输出组织成表格、列表、JSON 或固定字段。它会影响阅读，也会影响后续程序能否继续处理这份结果。

早期应用往往直接在提示词中写明格式要求。现在的 API 逐渐提供结构化输出和 JSON Schema，格式控制开始从自然语言描述延伸到接口协议。

## 现代提示词工程又多了什么？

当模型开始参与搜索、编程、办公自动化和智能体任务时，提示词工程处理的内容也随之变多了。

可以用一条流程来表示这种变化：

~~~text
任务目标 → 上下文组织 → 推理或行动流程 → 工具调用 → 结构化输出 → 结果评测
~~~

### 任务规格：把需求写成可以检查的内容

现代提示词越来越像一份任务规格。它需要说清楚目标、对象、输入、边界、成功条件和异常状态。

模型生成一段流畅的文字，只能说明表达顺利完成了。复杂任务还需要检查内容是否覆盖要求、证据是否来自指定材料、格式是否满足接口、结果是否通过测试。

### 上下文组织：决定模型能看到什么

模型看到什么，常常和模型怎样处理同样重要。上下文可能包括文档、数据库记录、对话历史、代码、工具返回值和其他模型的中间结果。

所以，现代提示词工程会关心上下文的选择、顺序、来源优先级、时效性和长度。上下文工程可以理解为：为模型安排它进行判断时能够看到的工作材料。

### 推理流程与工作流：把一次请求拆成几步

复杂任务通常会经历检索、筛选、比较、生成和复核。提示词也就从一次请求变成了一组相互衔接的步骤。

ReAct 论文把推理轨迹和行动结合起来，让模型交替生成思考和任务动作，并通过外部环境或知识源获得新的信息。[Yao et al., 2023](https://arxiv.org/abs/2210.03629)

在这里，提示词描述的内容已经包括模型怎样在信息、行动和反馈之间移动。

### 工具调用与结构化输出：让模型进入一个真实系统

当模型可以搜索网页、运行代码、查询数据库或操作软件时，工具描述也会成为提示系统的一部分。工具的用途、参数、调用条件、权限范围和返回格式都会影响模型的行为。

当前 OpenAI 的模型指南把结果目标、成功标准、推理强度、输出详细程度、结构化输出和工具描述放在同一套应用构建语境中。GPT-5.5 的官方指南明确强调预期结果和成功标准，并建议让模型自行选择详细求解路径，在适合的场景使用 Structured Outputs 和工具描述。[OpenAI GPT-5.5 model guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.5)

到这里，提示词已经同时涉及语言、接口和系统配置。

### 评测与迭代：观察提示词是否真的有效

一次成功的输出只能说明某个输入在某个时刻得到了一个可以接受的结果。重复运行时，还需要看稳定性、错误类型、成本和延迟。

因此，提示词会和任务样本、质量指标、日志、版本比较以及回归测试放在一起。提示词也就成了一个可以被观察和修改的系统组件。

## 提示词工程的对象已经分成了几个层级

前面提到的 CoT、CoVe、RAG、RaR 和注意力引导工程都能影响模型输出，但它们处理的对象并不相同。把它们简单列成一排，读者容易把它们理解成同一层级的提示词技巧。

2024 年的 Prompt Report 也把提示词工程中的术语混用和分类分散视为一个研究问题。它整理了大量语言模型提示方法，并把不同方法放在不同的应用和推理场景中讨论。[Schulhoff et al., 2024](https://arxiv.org/abs/2406.06608)

我更愿意按照提示词工程正在处理的对象来分层。

| 层级 | 代表内容 | 主要处理的问题 | 提示词工程对象的变化 |
|---|---|---|---|
| 提示词文本层 | 任务描述、角色、few-shot、输出格式 | 模型要完成什么 | 从一句请求扩展到任务规格 |
| 推理流程层 | CoT、CoVe、RaR | 模型如何拆解、重述和检查任务 | 从一次生成扩展到多阶段流程 |
| 上下文与知识层 | RAG、上下文组织、提示词压缩 | 模型应该看到哪些信息 | 从提示文本扩展到上下文材料 |
| 行动与接口层 | ReAct、工具调用、结构化输出 | 模型如何获取信息并执行动作 | 从回答扩展到系统交互 |
| 优化与评测层 | OPRO、Prompt Expansion、评测闭环 | 提示词如何被生成和改进 | 从手动撰写扩展到自动搜索与比较 |

这五个层级可以组合使用，也可以单独使用。它们描述的是不同的工作对象，放在一张表里更方便比较。

### 推理流程层：CoT、CoVe 与 RaR

#### 思维链（Chain-of-Thought，CoT）

思维链指让模型把复杂任务拆成几个中间步骤，再根据这些步骤形成答案。Wei 等人的研究显示，少量带有中间推理步骤的示例能够提升大模型在算术、常识和符号推理任务上的表现。[Wei et al., 2022](https://arxiv.org/abs/2201.11903)

在提示词中，思维链通常表现为“先分解问题，再处理各部分，最后汇总”的过程。它处理的是任务的推理结构。

Self-Consistency 和 Tree of Thoughts 可以看作 CoT 的扩展。Self-Consistency 会采样多条推理路径，再根据最终答案的一致性进行选择。[Wang et al., 2023](https://arxiv.org/abs/2203.11171) Tree of Thoughts 则让模型探索多个中间状态，并在需要时回到前面的状态重新选择。[Yao et al., 2023](https://arxiv.org/abs/2305.10601)

它们适合放在 CoT 下面，因为它们继续讨论推理路径如何生成、比较和搜索。单独列成几个顶层类别，会让表格从“工作对象”变成“算法清单”。

#### 验证链（Chain-of-Verification，CoVe）

验证链把生成和核验分成几个阶段：模型先形成初稿，再把其中的事实性断言转换成核验问题，随后独立检查这些问题，最后根据检查结果修订答案。Dhuliawala 等人的研究把这种方法用于降低长答案中的事实性错误。[Dhuliawala et al., 2023](https://arxiv.org/abs/2309.11495)

CoVe 和 CoT 都涉及中间步骤。CoT 主要展开推理过程，CoVe 主要检查已经生成的内容。CoVe 已经接近一个多阶段工作流，作用超出了句子层面的措辞调整。

#### 重述与回应（Rephrase and Respond，RaR）

重述与回应要求模型先用自己的话重述任务，再基于重述后的问题生成回答。相关研究提出，这个中间步骤可以帮助模型识别隐含条件、补足任务结构，并改善一些问答和推理场景中的表现。[Deng et al., 2023](https://arxiv.org/abs/2311.04205)

RaR 关注的是任务表示。模型先把用户的原始表达整理成一个更容易检查的版本，再进行回答。它位于提示词文本层和推理流程层之间。

### 上下文与知识层：RAG、信息布局和提示词压缩

#### 检索增强生成（Retrieval-Augmented Generation，RAG）

RAG 会把外部检索得到的文档、数据库记录或知识片段放入生成过程，让模型依据任务相关材料作答。Lewis 等人的研究把检索器与生成模型结合起来，用于知识密集型自然语言任务。[Lewis et al., 2020](https://arxiv.org/abs/2005.11401)

RAG 严格来说已经超出单条提示词的范围。检索范围、片段排序、来源优先级、上下文长度和提示词组织都会影响最终答案，提示词只是这套系统中的一个接口。

#### 上下文组织与注意力分配

“注意力引导工程”是我用来概括一类实践的描述性术语。它关注标题层级、分隔符、信息顺序、关键约束的位置，以及指令和资料之间的边界。

长上下文研究表明，模型对位于上下文不同位置的信息利用程度并不相同。相关性较强的材料放入上下文之后，位置和排列依然会影响使用效果。[Liu et al., 2023](https://arxiv.org/abs/2307.03172)

我把这一层称为“上下文组织与注意力分配”。它描述的是一个设计方向，和 CoT、RAG 这样的具体方法处于不同层级。

#### 提示词压缩（Prompt Compression）

长提示词会增加推理成本，也会让上下文中真正重要的信息变得难以定位。LLMLingua 研究了如何压缩长提示词，同时尽量保留任务相关信息；论文在多个任务上报告了最高约 20 倍的压缩比例，并观察到较小的性能损失。[Jiang et al., 2023](https://aclanthology.org/2023.emnlp-main.825/)

提示词压缩和上下文组织属于同一大层级。前者处理信息预算，后者处理信息布局。

### 行动与接口层：ReAct、工具调用和结构化输出

#### 推理与行动（ReAct，Reasoning and Acting）

ReAct 让模型在推理轨迹和任务动作之间交替进行，并通过外部环境或知识源获得新的信息。[Yao et al., 2023](https://arxiv.org/abs/2210.03629)

它处理的对象已经从“模型应该怎样回答”扩展到“模型应该怎样获取信息并继续执行”。这也是提示词工程进入智能体系统之后出现的变化。

#### 工具调用与结构化输出（Tool Use & Structured Outputs）

当模型可以搜索网页、运行代码、查询数据库或操作软件时，工具描述会成为提示系统的一部分。工具的用途、参数、调用条件、权限范围和返回格式都会影响模型行为。

结构化输出又把这种约束推进到了接口层。OpenAI 的 Structured Outputs 文档说明，开发者可以用 JSON Schema 规定模型返回的结构，并将结构化结果用于工具调用、数据提取和多步骤工作流。[OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/)

这类能力和自然语言提示词有关，但它们已经属于应用协议。模型是否返回符合接口的参数，部分由 schema 和解码约束决定。

#### 指令层级与输入安全

当模型同时接收系统指令、开发者指令、用户请求和外部文档时，输入之间可能出现冲突。Instruction Hierarchy 研究提出了按照权限区分指令优先级的训练方法，用来提升模型面对 prompt injection 时的鲁棒性。[Wallace et al., 2024](https://arxiv.org/abs/2404.13208)

这一主题适合放在工具调用和智能体系统附近。它讨论的是权限与安全边界，已经超出普通提示词写作的范围。

### 优化与评测层：从人手撰写到自动搜索

#### 自动提示词优化（Automatic Prompt Optimization）

OPRO 把语言模型当作优化器，让模型根据任务目标和已有结果生成新的候选提示词，再通过评测结果推动下一轮优化。[Yang et al., 2023](https://arxiv.org/abs/2309.03409)

这里的工作对象已经变成了“生成提示词的过程”。人仍然需要提供目标、评价标准和任务边界，具体措辞可以交给自动优化过程搜索。

#### 提示扩展（Prompt Expansion）

Datta 等人在 ACL 2024 的研究中，让模型把用户的简短查询扩展成一组更具体的图像提示词，再交给文本生成图像模型处理。论文的人类评估显示，Prompt Expansion 生成的图片在审美和多样性上优于基线方法。[Datta et al., 2024](https://aclanthology.org/2024.acl-long.189/)

这和文章开头的图像例子属于两个层级。开头的例子展示了提示词文本变得更具体之后，画面条件如何变化。Prompt Expansion 讨论的是由模型自动完成这一步扩展。

### 这些层级怎样联系起来？

可以把它们画成一条概念链：

~~~text
任务目标与约束
  ↓
提示词文本与任务规格
  ↓
上下文、证据与信息布局
  ↓
推理、验证与行动流程
  ↓
工具调用与结构化接口
  ↓
评测、反馈与提示词优化
~~~

这条链表示工作对象逐步扩大，不表示每个任务都必须经过所有步骤。一次简单问答可能只需要第一层；一个可重复运行的智能体系统则会同时涉及全部层级。

CoT、CoVe、RaR、RAG、ReAct 和 Prompt Expansion 可以出现在同一张总览表中。表格需要标明它们所在的层级，读者看到的也就会是一张“提示词工程对象地图”。

## 模型越来越强以后，我们还需要多少提示词工程？

写到这里，标题中的第二个问题就出现了：模型已经越来越会理解人话，我们还需要花很多时间研究提示词吗？

“模型变强”其实包含了好几件事：参数规模扩大、预训练数据增加、指令微调、人类反馈训练、推理能力提升以及工具使用能力增强。下面几篇研究能够帮助我们把这些变化分开来看。

### 先变化的是措辞

Ouyang 等人的 InstructGPT 研究给出了一个经典对照。在他们的提示分布上，13 亿参数的 InstructGPT 模型获得的人类偏好高于 1750 亿参数的 GPT-3 模型。论文的核心结论是，模型规模本身不会自动带来更好的用户意图遵循能力；监督微调和 RLHF 让模型更接近人类指令。[Ouyang et al., 2022](https://proceedings.neurips.cc/paper/2022/hash/b1efde53be364a73914f58805a001731-Abstract.html)

这说明，早期提示词里有一部分“教模型如何配合”的工作，后来被训练过程提前吸收了。模型拥有更好的指令理解能力之后，用户对于固定句式、角色称号和反复强调的依赖就会下降。

Zhou 等人在 Nature 发表的研究考察了 GPT、LLaMA 和 BLOOM 等模型家族的变化。他们发现，更大、更加易于指令化的模型通常对提示变化更加稳定；稳定性和可靠性仍然是两个不同的问题，模型在某些情况下会更少表现出谨慎行为，并产生更多错误。[Zhou et al., 2024](https://www.nature.com/articles/s41586-024-07930-y)

Ma 等人分析了 10,538 条真实世界提示词。在 GPT-4 的响应中，单独指定角色带来的提升较为有限，Capability 和 Demonstration 等成分有时能带来更满意的结果。[Ma et al., 2024](https://aclanthology.org/2024.emnlp-main.1227/)

把这几项研究放在一起，可以看到一个变化：称号、语气和固定句式的作用相对变小了，任务内容、示例、上下文和验收标准变得更重要。

### 人需要表达的内容正在变得更具体

Ma 等人在 2025 年提出 Requirement-Oriented Prompt Engineering（ROPE）。他们把提示词中的目标和约束视为人需要持续掌握的部分，把角色、语言流畅度和固定结构等成分视为更适合由提示优化器处理的部分。[Ma et al., 2025](https://doi.org/10.1145/3731756)

这个观点和前面的研究能够接上：模型和优化器可以承担越来越多的表层组织工作，人仍然需要说明具体目标、条件和期望行为。模型越强，需求表达的价值就越集中。

### 现在的先进模型更强调结果和系统配置

从 OpenAI、Google 和 Anthropic 的公开文档中，可以看到一套相近的表达方式：提示中需要说明预期结果和成功标准，模型可以自行选择常规求解路径；输出模式、工具描述、状态管理和结构化输出则由完整的应用系统共同控制。[OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model)

Google 的 Gemini 官方提示文档也把提示设计描述为一个迭代过程，并将清晰指令、上下文、示例、分步链路、聚合响应和工具使用放在同一套方法中。[Google Gemini prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)

Anthropic 面向当前 Claude 模型的官方文档，则把清晰表达、示例、XML 结构、思考、工具使用和智能体系统放在同一套提示实践中。[Claude prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

这些文档共同呈现出一个方向：自然语言交互变得更容易，应用质量越来越依赖目标、上下文、工具、输出协议和评测之间的配合。

### 提示词敏感性仍然存在

模型更强之后，输入结构对结果的影响依然存在。

Sclar 等人在 ICLR 2024 的研究中考察了保持语义不变的提示格式变化。在 LLaMA-2-13B 的 few-shot 评测中，不同格式最多造成 76 个准确率百分点的差异；增加模型规模、示例数量或进行 instruction tuning 后，这种敏感性仍然存在。[Sclar et al., 2024](https://proceedings.iclr.cc/paper_files/paper/2024/hash/6c0e99d736da621403018ca7b32b1a4d-Abstract-Conference.html)

ProSA 研究也发现，大模型整体表现出更强的提示鲁棒性，few-shot 示例可以缓解一部分敏感性，复杂推理任务和主观评价仍然容易受到提示变化影响。[Zhuo et al., 2024](https://aclanthology.org/2024.findings-emnlp.108/)

所以，这里的结论需要说得准确一些：

> **模型能力提升之后，低层措辞的作用变小了，输入结构、示例、上下文和流程仍然会参与决定模型行为。**

## 不同任务对提示词工程的依赖有什么变化？

为了方便叙述，我们可以把不同任务放在一起比较。

| 任务类型 | 主要依赖 | 提示词工程的关注对象 |
|---|---|---|
| 一次性的简单问答 | 模型的默认理解能力 | 任务对象和基本目标 |
| 总结、翻译、改写 | 输出要求与材料组织 | 语气、范围、格式和上下文 |
| 复杂分析与推理 | 上下文、示例和过程结构 | 证据、步骤、检查点和结果标准 |
| 搜索、编程与工具协作 | 工作流和接口协议 | 工具、状态、权限、失败处理 |
| 高风险或重复运行的系统 | 评测与可追踪性 | 版本、日志、回归测试和人工复核 |

从这张表里，可以看到提示词工程的关注对象大致沿着下面的路径移动：

~~~text
固定措辞
  → 任务描述
  → 示例与上下文
  → 推理和行动流程
  → 工具与输出协议
  → 系统评测
~~~

提示词工程的工作对象，从“生成一句更有效的话”逐渐扩展到了“组织一个可以被观察的模型任务”。

## 我们现在还需要提示词工程吗？

现在的模型已经能够理解大量日常表达。对于一次性的简单问答，用户通常只要把问题说清楚，就能得到可以使用的结果。

任务变得复杂以后，情况会发生变化。我们仍然需要说明任务目标，组织上下文，安排必要的步骤，接入外部资料，检查关键结论，并规定结果如何被使用。

弱提示词可以让先进模型完成很多事情，强提示词则会减少任务中的猜测空间。随着模型能力提升，强提示词的作用越来越集中在任务结构、证据范围、检查步骤和验收标准上。

所以，我更愿意把提示词工程理解成一个不断上移的过程。它最初讨论的是怎样选择词语、怎样安排示例、怎样设计格式；现在讨论的是需求怎样被表达，上下文怎样被组织，模型怎样调用工具，输出怎样被检查。

我们越来越少需要寻找一句“神奇的话”，越来越需要理解一个任务是怎样被模型执行的。

## 参考资料

1. Brown, T. B., et al. (2020). [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165). *Advances in Neural Information Processing Systems*.
2. Liu, P., et al. (2023). [*Pre-train, Prompt, and Predict: A Systematic Survey of Prompting Methods in Natural Language Processing*](https://doi.org/10.1145/3560815). *ACM Computing Surveys*, 55(9).
3. Wei, J., et al. (2022). [*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/abs/2201.11903). *Advances in Neural Information Processing Systems*.
4. Ouyang, L., et al. (2022). [*Training Language Models to Follow Instructions with Human Feedback*](https://proceedings.neurips.cc/paper/2022/hash/b1efde53be364a73914f58805a001731-Abstract.html). *Advances in Neural Information Processing Systems*.
5. Yao, S., et al. (2023). [*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629). *International Conference on Learning Representations*.
6. Ma, Y., et al. (2024). [*The Death and Life of Great Prompts: Analyzing the Evolution of LLM Prompts from the Structural Perspective*](https://aclanthology.org/2024.emnlp-main.1227/). *Proceedings of EMNLP 2024*.
7. Zhou, L., et al. (2024). [*Larger and more instructable language models become less reliable*](https://www.nature.com/articles/s41586-024-07930-y). *Nature*, 634, 61-68.
8. Sclar, M., Choi, Y., Tsvetkov, Y., & Suhr, A. (2024). [*Quantifying Language Models’ Sensitivity to Spurious Features in Prompt Design*](https://proceedings.iclr.cc/paper_files/paper/2024/hash/6c0e99d736da621403018ca7b32b1a4d-Abstract-Conference.html). *International Conference on Learning Representations*.
9. Zhuo, J., et al. (2024). [*ProSA: Assessing and Understanding the Prompt Sensitivity of LLMs*](https://aclanthology.org/2024.findings-emnlp.108/). *Findings of EMNLP 2024*, 1950-1976.
10. Ma, Q., et al. (2025). [*What Should We Engineer in Prompts? Training Humans in Requirement-Driven LLM Use*](https://doi.org/10.1145/3731756). *ACM Transactions on Computer-Human Interaction*.
11. Dhuliawala, S., et al. (2023). [*Chain-of-Verification Reduces Hallucination in Large Language Models*](https://arxiv.org/abs/2309.11495). arXiv preprint.
12. Lewis, P., et al. (2020). [*Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401). *Advances in Neural Information Processing Systems*.
13. Deng, Y., et al. (2023). [*Rephrase and Respond: Let Large Language Models Ask Better Questions for Themselves*](https://arxiv.org/abs/2311.04205). arXiv preprint.
14. Liu, N. F., et al. (2023). [*Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172). arXiv preprint.
15. Datta, S., Ku, A., Ramachandran, D., & Anderson, P. (2024). [*Prompt Expansion for Adaptive Text-to-Image Generation*](https://aclanthology.org/2024.acl-long.189/). *Proceedings of ACL 2024*, 3449-3476.
16. Schulhoff, S., et al. (2024). [*The Prompt Report: A Systematic Survey of Prompt Engineering Techniques*](https://arxiv.org/abs/2406.06608). arXiv preprint.
17. Wang, X., et al. (2023). [*Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171). *International Conference on Learning Representations*.
18. Yao, S., et al. (2023). [*Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601). *Advances in Neural Information Processing Systems*.
19. Jiang, H., et al. (2023). [*LLMLingua: Compressing Prompts for Accelerated Inference of Large Language Models*](https://aclanthology.org/2023.emnlp-main.825/). *Proceedings of EMNLP 2023*, 13358-13376.
20. Yang, C., et al. (2023). [*Large Language Models as Optimizers*](https://arxiv.org/abs/2309.03409). arXiv preprint.
21. Wallace, E., et al. (2024). [*The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions*](https://arxiv.org/abs/2404.13208). arXiv preprint.
22. OpenAI. [*GPT-5.5 model guidance*](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.5).
23. OpenAI. [*Latest model guidance*](https://developers.openai.com/api/docs/guides/latest-model).
24. OpenAI. [*Structured Outputs*](https://openai.com/index/introducing-structured-outputs-in-the-api/).
25. Google. [*Gemini prompt design strategies*](https://ai.google.dev/gemini-api/docs/prompting-strategies).
26. Google. [*Imagen prompt guide*](https://ai.google.dev/gemini-api/docs/imagen#imagen-prompt-guide).
27. Anthropic. [*Claude prompting best practices*](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).
