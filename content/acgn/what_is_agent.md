---
title: 什么是 Agent？脚手架（harness）、上下文(context engineering)、MCP、Skill 与协作系统
slug: what-is-agent
date: 2026-09-12T22:36:00
math: false
draft: false
comments: true
cover: null
---

_这篇文章撰写的内容更加详细,这篇文章的内容将适合与我有类似心理的人，我们希望更加有效的使用 ai，但在此基础上，我们也期待做的比这更好。_

## 出于习俗，让我们继续这样引入

**一个简单的例子：**

我们让一个 AI 帮忙修复代码仓库中的一个 bug。

{{< collapse summary="用户给出的任务" >}}

~~~text

请检查这个项目中导致 CSV（Comma-Separated Values，逗号分隔值）文件导入失败的问题，
定位原因，修改代码，运行相关测试，
最后告诉我修改了哪些文件以及测试结果。
~~~

{{< /collapse >}}

如果聊天环境没有接入项目文件和执行工具，模型通常会先解释常见原因，再给出一段修复建议。它能够围绕问题生成回答，却无法自动读取本地仓库、修改文件并把结果写回项目；聊天产品一旦提供文件、终端或代码工具，系统边界就会随之扩展。

但让我们试想这样一种可能：如果模型能够直接参与这项任务，它应该怎么做才能达成这样的效果？

### 如果系统要真正完成这项任务，模型就需要不断读取环境信息，再决定下一步

~~~text
读取任务与项目背景
        ↓
查看目录、代码和测试文件
        ↓
判断下一步应该读取什么或运行什么
        ↓
调用文件读取工具、终端工具或测试工具
        ↓
读取工具返回结果
        ↓
继续判断、修改代码并运行测试
        ↓
报告最终结果与留下的文件
~~~

这条流程里的输入会随着任务推进而变化。任务要求、项目规则、文件内容和测试结果，会在不同阶段进入上下文。

模型根据当前看到的材料提出下一步，执行相应动作，再把结果送回上下文。

而下一轮判断又建立在上一轮行动留下的信息上。

**后文提到的模型、工具、上下文和运行时，都会参与这条循环。**

### 看完这个例子后，让我们回到正题

## 什么是 Agent？

能够完成上述任务的产品是一种 Agent,即**代理**,是代我们完成某事的一种产品。Agent 在不同环境下经常有着细微的语义上的差别，例如：

从研究框架看，CoALA（Cognitive Architectures for Language Agents，语言 Agent 的认知架构）将语言 Agent 描述为由模块化记忆、结构化行动空间和通用决策过程组成的系统。

从工程实现看，OpenAI 的实用指南把最基本的 Agent 拆成 Model、Tools 和 Instructions：模型负责推理与决策，工具扩展系统的行动能力，指令规定系统的行为方式。

### 本文采用一个便于后文讨论的定义

**Agent 以语言模型或多模态模型为决策核心，读取上下文，选择下一步动作，调用工具，再根据环境反馈继续运行。**

### 一次 Agent 任务通常按照这样的过程运行

~~~text
当前上下文
    ↓
模型根据上下文决定下一步
    ↓
工具执行读取、搜索、修改或测试等动作
    ↓
环境发生变化并返回新的结果
    ↓
结果进入更新后的上下文
    ↓
模型继续决定下一步，直到验证任务是否完成
~~~

让我们仍然以 CSV 导入失败为例。第一次调用时，模型可能只看到用户的任务、项目目录和测试命令，于是提出“读取导入函数”的工具请求。运行时执行读取操作，把函数内容放回上下文。模型看到代码后，可能发现解析器把带引号的字段处理错了，再提出运行某个测试或查看样例文件的请求。测试结果返回之后，模型才有条件决定应该修改代码，还是继续收集信息。

这种“模型提出动作、运行时执行动作、结果回到模型”的往返，才让任务从一次回答转变为一个持续运行的过程。

模型负责主要的判断和生成，Agent 的实际表现还取决于工具、上下文、权限和运行时怎样组合。

![CoALA 论文中的语言 Agent 架构：从普通语言模型到带有环境反馈、记忆和决策过程的 Agent](https://arxiv.org/html/2309.02427v3/fig1-lang-agent.png)

_图 1｜CoALA 原论文 Figure 1。图中依次展示普通语言模型、与环境交互的语言 Agent，以及能够管理内部状态和推理过程的认知语言 Agent。三者的差别，体现在环境交互、内部状态管理和推理过程逐步加入系统。来源：_[_Cognitive Architectures for Language Agents_](https://arxiv.org/abs/2309.02427)_。_

## Agent 和 Workflow 有什么区别？

在 Anthropic 的官方工程文章《Building Effective AI Agents》中，Workflow 被定义为由预先写好的代码路径组织模型和工具的系统；Agent 则由模型在运行过程中动态决定下一步过程和工具使用。

例如，一份扫描文档的固定 Workflow 可以预先规定：先识别文字，再判断文档类别，最后生成摘要。

~~~text

先调用 OCR（Optical Character Recognition，光学字符识别）
再调用分类器
最后调用摘要模型
~~~

在这种环境下，模型实际上只在某一步起到作用，而不能自己承担整个流程

### Agent 的路径更像这样

~~~text
先查看文件
→ 根据文件类型选择解析方式
→ 发现信息不足，继续搜索
→ 发现异常，运行测试
→ 根据测试结果决定是否修改
~~~

Agent 的下一步取决于上一轮返回了什么，由模型本身决定下一步执行什么，整个流程是由模型自己决定的，我们可以这么说：

**Workflow 的流程是固定的，死板的，它因此只适合处理某一类的任务，并且往往对同类型的任务处理相对更加稳定，也可能更加快速**

**而 Agent 则流程更加灵活，它的处理能力也更加广泛，但是它对于某个新的事项的处理手法更加不稳定**

_我们稍后会提到怎么消除这种“不稳定性”_

把这两个例子放回 CSV 修复任务，差别会更明显。一个固定 Workflow 可以规定“先运行导入测试，再读取报错位置，最后调用代码修改步骤”。它的路径稳定，成本和权限也更容易预测。项目结构发生变化时，预先写好的路径可能无法到达真正的问题位置。Agent 会先查看目录，再根据目录结果决定搜索哪个文件。测试提示编码错误时，它继续检查编码处理；测试提示字段解析错误时，它转向解析器和样例数据。

## Agent 怎样工作（\*\*_How it work?_\*\*）：模型、上下文和运行循环

### 模型只是运行系统的一部分

模型可以提出工具调用请求，也可以读取工具返回的结构化结果。真正执行函数的是运行时（runtime），工具结果随后会回到下一轮上下文。

_我希望在此说明：runtime 指的是**负责让 Agent 真正运行起来的程序环境和控制逻辑,它的一个更加容易理解的翻译为“调度层**”_

Function Calling（函数调用）描述了这次往返过程：模型根据工具说明生成工具名称和参数，运行时检查请求并执行对应函数，工具再把成功结果或错误信息返回给模型。

一次标准的 Function Calling 会经过三个角色：模型生成调用请求，运行时检查工具名称、参数结构、权限和审批条件，工具执行动作并返回结果。运行时收到结果后，将结果放进下一轮上下文，模型再根据新信息决定下一步。

要让这类调用稳定运行，模型还需要知道工具接受哪些参数、每个参数采用什么类型，这就是 Tool Schema（工具模式）的作用。

Tool Schema 和 Structured Output（结构化输出）都可以使用 JSON Schema（用于描述 JSON 字段、类型和约束的格式），但它们约束的对象不同。

Tool Schema 约束模型发送给工具的调用参数；Structured Output 约束模型交给应用的最终结果。

在 API 中，应用通常通过 response_format（响应格式参数）规定最终结果采用普通文本、JSON 或指定的 JSON Schema。

以 CSV 任务为例，run_tests 工具可以要求模型提供测试路径和详细程度。模型根据 Tool Schema 生成调用请求，运行时检查请求是否符合参数要求，再决定是否执行测试。

工具执行也可能失败。参数路径不存在时，运行时可以返回参数错误；测试失败时，工具可以返回失败日志；测试通过时，工具可以返回通过状态和相关输出。

运行时会把这些结果作为新的上下文交给模型，模型再决定修复代码、调整参数、继续读取文件，或者结束任务。

### Harness：Agent的骨架

Harness 是围绕模型组织起来的运行时系统。它负责准备当前上下文、调用模型、接收模型的工具请求、检查权限与审批条件、执行工具、保存会话状态，并记录任务轨迹。

Agent Loop 是 Harness 内部推动任务前进的核心循环。它按照观察上下文、选择行动、执行工具、读取结果的顺序反复运行，直到任务完成或满足停止条件。

### 让我们再次以 CSV 修复任务为例

在一个典型的 Harness 中，系统会先创建会话，把用户要求、项目规则和可用工具提供给模型。模型请求读取导入函数后，Harness 检查这个动作是否符合权限要求，调用文件工具，再把文件内容作为工具结果放回上下文。模型读取新的上下文后继续判断下一步，Harness 则继续负责调用模型、执行工具、处理错误和记录过程。

### 因此，在 Agent 工程中经常会看到这样的表达

**Agent = Model + Harness**

这里的等号表示系统组成关系。Model 负责理解任务、进行推理并提出下一步行动，Harness 负责让这些行动在真实环境中持续执行。工具、上下文、权限、审批、会话状态和任务轨迹，都由 Harness 负责组织和管理。

### 所以我经常倾向于让你这样想象

**Model是 Agent 的大脑，而 Harness 是 Agent 的骨架**

而这其中的将上下文决定模型能看到什么，这也是为什么上下文管理实际上在 Agent 中起到远超大多数人想象的重要作用

模型每一次推理都只能处理当前送入的上下文。这个上下文里可能有：

- 系统指令和任务要求；
- 用户消息和历史对话；
- 文件、数据库记录和检索结果；
- 工具说明、参数结构和工具返回值；
- 其他 Agent 留下的摘要；
- 之前的错误、测试结果和中间决策。

### 上下文工程（Context Engineering）

_我认为上下文工程远比提示词工程更加重要，但人们常常忽略掉它，因为在现代的 Agent框架中，对上下文的管理几乎是隐形的/自动的，这使得它的影响远不如提示词一样直观_

Anthropic 在《[Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)》中，将上下文理解为模型每一轮生成时实际能够看到的全部信息。它包括系统指令、任务要求、工具说明、外部资料、对话历史、记忆和工具返回结果。

上下文工程处理的对象，也就从一段提示词扩展成了模型每一轮真正接收到的信息集合。Agent 每运行一轮，能够进入上下文的内容都会发生变化。

### 可以把 Agent 的上下文拆成几类

| 组成部分 | 主要内容 | CSV 修复任务中的例子 |
| --- | --- | --- |
| 任务与指令 | 目标、约束、输出要求、成功条件 | 修复 CSV 导入问题，并报告修改文件和测试结果 |
| 项目与环境信息 | 文件结构、项目规则、依赖和配置 | 项目目录、测试命令、编码约定 |
| 工具信息 | 工具用途、参数、返回格式和调用条件 | 读取文件、搜索代码、运行测试 |
| 外部资料 | 从文件、数据库、网页或知识库取得的证据 | 导入函数、样例 CSV、测试日志 |
| 对话与运行历史 | 用户消息、模型判断、工具请求和返回结果 | 已经读取过哪些文件、运行过哪些测试 |
| 任务状态与记忆 | 已完成事项、当前问题、未解决事项和后续计划 | 已确认问题位于解析器，仍需检查带引号字段 |

这些内容在每一轮中的重要程度并不相同。上下文管理的核心，就是持续判断哪些信息需要保留，哪些信息应该在需要时再加载，哪些信息可以压缩成更短的状态记录。

#### 先固定任务目标和关键约束

任务目标、项目规则、权限要求和验收标准通常属于稳定信息。它们可以在任务开始时进入上下文，并在后续轮次中持续保留。

### 以 CSV 修复任务为例，模型需要持续知道

- 任务目标是修复 CSV 导入失败；
- 修改后需要运行相关测试；
- 最终需要说明修改了哪些文件；
- 文件操作必须发生在当前项目范围内。

这些信息构成任务的稳定骨架。工具返回的代码片段和测试日志会不断变化，任务目标和验收条件则需要保持清晰。

#### 让工具和外部资料按需进入上下文

工具说明本身也是上下文的一部分。模型需要知道工具可以完成什么、需要哪些参数、返回什么结果，以及什么情况下适合调用它。

工具数量过多、功能重叠或返回内容过长，都会增加模型选择和理解的负担。因此，工具设计也参与上下文管理。一个读取文件的工具可以支持路径和行号范围，让模型只获取当前需要的部分；测试工具可以返回失败用例、错误位置和关键日志，而不必把全部运行输出一次性放入上下文。

外部资料通常适合采用按需加载的方式。系统可以先把文件路径、数据库查询或网页链接提供给模型，模型确定需要哪一部分之后，再通过工具读取具体内容。

在 CSV 任务中，第一次判断时，模型可以先看到项目目录、导入模块的位置和相关测试。模型请求读取导入函数后，运行时再把函数代码加入上下文。测试出现编码错误后，系统再补充错误日志、配置文件和样例数据。

这种方式让模型逐步建立对任务的理解，也让每一轮上下文保持在与当前判断直接相关的范围内。

#### 管理上下文中的顺序和重点

相同的信息采用不同的组织顺序，也可能产生不同的效果。任务目标、关键约束和当前需要解决的问题通常需要放在明显位置。相关证据可以紧接在对应问题之后。较早的背景信息、重复的工具输出和已经解决的错误，可以放入摘要或外部记录中。

### 上下文可以按照下面的结构组织

1. 当前任务和成功条件；
2. 必须遵守的项目规则；
3. 当前已经确认的事实；
4. 最近一次行动及其结果；
5. 尚未解决的问题；
6. 下一步可以使用的工具或资料。

在 CSV 修复任务中，模型刚读取导入函数时，函数代码和相关测试比项目中无关的文档更重要。测试失败之后，错误日志的优先级会上升；问题确认之后，早期的目录遍历结果就可以压缩成一句状态说明。

#### 用压缩保留任务连续性

长任务会不断积累消息、工具请求和工具结果。上下文接近容量上限时，系统可以将已有内容压缩成一份状态摘要，再用摘要开启后续判断。

### 高质量的摘要需要保留

- 已经确认的原因；
- 已经完成的修改；
- 仍未解决的问题；
- 重要的架构决定；
- 最近一次失败的原因；
- 下一步需要检查的内容。

重复的文件内容、已经处理完的日志和无关的中间输出，则可以从当前上下文中移出。

### 例如，CSV 修复任务运行多轮测试后，系统可以把前面的过程压缩为

> 已确认问题位于 CSV 解析器的带引号字段处理逻辑，已修改 `parser.py`，普通字段测试通过，带引号字段测试仍然失败，下一步检查转义字符处理。

这条摘要比保留数十轮完整工具输出更适合支持下一步判断。

_通常，这部分的工作都是由 agent 所在的框架自动执行的，大多数情况下它们都会表现的不错，以至于你实际上不需要参与上下文的管理，但在某些长期的项目中，我们必须采取一些额外的措施来保证模型不会遗忘项目中的重要信息_

#### 用外部记忆保存跨轮次信息

有些信息需要跨越当前上下文继续存在，例如任务计划、项目约定、长期记忆和阶段性结论。这些内容可以写入文件、数据库或其他外部存储，之后在需要时重新加载。

_因此，我通常建议人们在使用 agent时让其撰写一份 progress.md 文件，记录上述的内容供 agent 查阅，这是一个有效的小技巧_

### 在 CSV 修复任务中，系统可以维护一份任务记录

- 当前问题；
- 已检查的文件；
- 已运行的测试；
- 已确认的失败原因；
- 待处理事项。

这样，即使当前上下文经过压缩，模型仍然可以从任务记录中恢复工作状态。`Session`、`History`、`Memory` 和 `Context` 的区别，也可以在这里看得更清楚：History 保存发生过的过程，Memory 保存未来还可能有用的信息，Context 则是模型这一轮实际收到的内容。

#### 用独立上下文控制复杂任务

复杂任务可以拆分给不同的 Subagent。每个 Subagent 在独立上下文中处理一个明确问题，主 Agent 最后只接收经过整理的结果。

### 例如，主 Agent 可以把 CSV 任务拆成三个部分

- 一个 Subagent 检查解析器；
- 一个 Subagent 检查测试覆盖；
- 一个 Subagent 检查项目配置。

每个 Subagent 都可以读取大量相关资料，但主 Agent 只需要接收结论、证据和未解决问题。详细搜索过程留在对应的独立上下文中，主 Agent 的上下文则保持集中。

#### 上下文工程的核心

### 上下文工程持续处理四个问题

- 当前这一轮需要哪些信息；
- 哪些信息应该现在加载；
- 哪些信息应该保留到后续轮次；
- 哪些信息可以压缩、外置或移出当前上下文。

因此，在 CSV 修复任务中，模型每一轮看到的内容都可能不同：开始时是任务要求和项目目录，随后是导入函数和工具说明，再之后是测试结果、修改记录和验收条件。

模型的能力决定它能够怎样理解这些信息，上下文工程决定它在每一轮能够看到哪些信息、以什么顺序看到这些信息，以及哪些信息会持续保留下来。
Anthropic 将这一原则概括为：在有限的上下文和注意力资源中，选择能够最大程度支持当前任务的高信号信息。

### Session、History 和 Memory

_在某种程度上，我反对使用类似“记忆”/“遗忘”之类的词来形容模型，因为这总是会产生模型与人类一样拥有“记住”每件事情的能力的暗示，将模型视为一个固定的概率函数有利于你理解这部分的本质_

为了便于说明 Agent 的运行过程，我们把这几个词区分为不同范围的信息。Session 指一次任务或会话的运行范围，History 记录其中产生的消息和事件，Memory 保存之后还可能继续调用的信息。Context 则只指模型当前这一轮真正收到的输入。

RAG（Retrieval-Augmented Generation，检索增强生成）关注怎样把外部资料检索出来并加入当前生成过程。Memory 关注一项信息是否需要被保存，以及之后还要使用多久。两者可以同时出现：知识库文档可以通过 RAG 进入上下文，长期记忆也可以借助相似的检索方法被取回。区分它们时，可以同时观察信息的用途、保存周期和取回方式。

这次 CSV 修复从开始到结束属于一个 Session。期间产生的用户消息、模型判断、工具调用和测试结果属于 History。模型这一轮真正收到的内容，则属于当前 Context。

如果系统把“这个项目使用 pytest”“CSV 文件统一采用 UTF-8”保存下来，供下一次任务继续使用，这些内容进入 Memory。模型需要查找项目文档、Python 解析器说明或内部知识库时，系统先从资料库中检索相关内容，再把结果加入当前 Context，这属于 RAG。无论信息来自 History、Memory 还是外部知识库，只有进入当前 Context，才会影响这一轮判断。

![RAG 原论文中的检索增强生成架构](https://ar5iv.labs.arxiv.org/html/2005.11401/assets/RAG-Architecture.svg)

_图 2｜RAG 原论文 Figure 1。该架构将检索器、文档索引和生成模型连接在一起。来源：_[_Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks_](https://arxiv.org/abs/2005.11401)_。_

RAG 解决的是“需要时从外部资料中取回什么”。如果问题变成“上下文太长时，系统怎样保存和移动已有信息”，就进入记忆管理的范围。

MemGPT 论文把有限上下文看成一种需要管理的工作内存，并通过分层记忆和数据移动来处理超出上下文窗口的内容。对 Agent 来说，记忆就是保存信息，在需要时取回，再放进当前上下文。

## Agent 的手：Tool、Schema 和执行环境

### 模型怎样提出 Tool 请求

读取文件、搜索网页、查询数据库、发送邮件、运行测试，都是工具可能提供的动作。

一个工具至少需要说明用途和参数。若返回结果需要被程序继续处理，系统还可以声明输出结构。

~~~json
{
  "name": "run_tests",
  "arguments": {

    "path": "tests/test_import.py"
  }
}
~~~

这里的 JSON 只表示“请求调用什么以及传入什么参数”。真正的测试仍然由运行时执行，工具返回的结果也需要被再次放回上下文。

一次工具调用会经过这几步：模型依据工具说明生成请求；运行时验证请求、检查权限并调度函数；工具读取文件、运行测试或改变环境；结果最后回到上下文，供模型决定下一步。Schema 影响模型怎样提出请求，运行时决定请求能否执行，返回值则影响 Agent 的下一步。

如果 Schema 只写“运行测试”，却没有说明测试路径应该是什么格式，模型就需要自行猜测参数。如果工具返回一大段没有结构的日志，模型也更难判断哪些内容代表失败、哪些内容只是提示。结构化的输入和输出可以缩小这种猜测空间，但它们仍然不能替代权限检查和真正的任务验证。

### Tool 怎样改变环境

工具提供动作，环境承载动作发生后的状态。

以 SWE-agent 这项软件工程 Agent 研究为例，作者把语言模型当作一种新的软件使用者，并为它设计了 Agent-Computer Interface（Agent 与计算机之间的操作接口），使它能够浏览代码仓库、编辑文件、运行测试和执行程序。

如果工具能够执行代码、读写文件或访问网络，运行时还需要提供 Sandbox 和权限边界。Permission 决定 Agent 可以访问什么，Approval 决定哪些动作需要人确认，Sandbox 决定动作在哪个受控环境中发生。

这三种控制共同约束一次行动，Guardrail（护栏或约束检查）还可以检查输入、模型输出、工具参数或交接结果。

以删除文件为例，Agent 可能有读取项目文件的 Permission，却没有删除权限；即使 Approval 已确认删除，Sandbox 仍然决定动作发生在真实项目、临时副本还是受限容器中。

这项研究还说明，模型与计算机之间的接口本身就是系统设计的一部分。模型能否看到清晰的目录结果、能否用合适的命令编辑文件、能否及时获得测试反馈，都会影响它的下一步判断。Agent 的可靠性还取决于接口返回的信息是否清楚。

## MCP 是什么？

假设一个 Agent 需要查询数据库。模型本身没有数据库连接，运行时也需要一种统一方式知道有哪些查询工具、参数怎样填写、结果怎样返回。MCP（Model Context Protocol，模型上下文协议）处理的就是这部分连接问题。它是一套让 Agent 发现和连接外部工具、数据与提示模板的开放协议。

### 一次 MCP 连接通常会涉及三个角色

- Host：承载模型和整体应用；
- Client：代表 Host 与某一个 MCP Server 建立连接；
- Server：向 Client 暴露工具、资源和提示模板。

### 当前 MCP 规范将服务端的三类核心 primitives（原语）概括为

- Tools：模型可以调用的动作；
- Resources：应用可以读取并放入上下文的数据；
- Prompts：可以由用户选择的预定义提示模板。

这三类原语由不同一方控制：Tools 通常由模型决定是否调用，Resources 由应用决定何时读取并加入上下文，Prompts 通常由用户或应用选择。

以数据库查询为例，调用过程是这样的。Agent 启动时，Host 让 MCP Client 与数据库 Server 建立连接。Client 通过协议获取 Server 的能力声明和可用列表，Host 或运行时再决定哪些工具提供给模型、哪些资源加入上下文，以及哪些提示模板展示给用户。

模型看到“可以执行 SQL（Structured Query Language，结构化查询语言）查询”以及对应参数后，决定调用某个工具。Client 把调用请求转交给 Server，Server 访问数据库并返回结果，结果再回到模型的上下文中。

这次调用中，Host 承载应用，Client 负责连接，Server 提供数据库能力。Tools、Resources 和 Prompts 分别对应动作、资料和提示模板。

Tool 是具体动作，MCP 负责让 Agent 发现这些动作、建立连接并接收结果。

MCP 把能力发现、参数传递和结果返回标准化，却不会自动保证工具可信、数据正确或操作已经得到授权。这些问题仍然需要权限、审批、服务端安全和结果验证共同处理。

## Skill 是什么？

Skill 有两层常见含义。广义上，它是一套可复用的任务方法；在 Agent Skills 规范中，它特指以目录和 `SKILL.md` 文件组织起来的一套格式。为了便于理解，可以先把它看成一份可以按需加载的岗位手册：它把完成一类任务所需的指令、背景知识、脚本、参考资料、模板和检查步骤组织在一起。

按照 Agent Skills 规范，一个 Skill 首先是一个目录。目录中必须有一个 `SKILL.md`，还可以根据任务需要放入脚本、参考资料和其他资源。一个代码审查 Skill 可能长这样：

~~~text
code-review/

├── SKILL.md              # 必需：Skill 的说明和执行方法

├── scripts/              # 可选：辅助脚本

├── references/           # 可选：需要时查阅的文档

└── assets/               # 可选：模板、图片或数据文件
~~~

这里最重要的文件是 `SKILL.md`。它由两部分组成：文件开头的 YAML frontmatter，以及后面的 Markdown 指令正文。YAML 是一种用键和值记录信息的文本格式；在这里，它承担“告诉 Agent 这份 Skill 是什么、什么时候应该使用”的职责。Markdown 正文承担“使用 Skill 时具体怎么做”的职责。

### 一个最小的 `SKILL.md` 可以写成这样

~~~markdown

***

name: code-review

description: Review code changes for logic errors and missing tests. Use when reviewing a code change.

***

# Code review

1. Read the project rules.
2. Inspect the changes.
3. Run the relevant tests.

~~~

开头和结尾的 `---` 标记出 YAML frontmatter 的范围。`name` 是 Skill 的机器可读名称，按照规范需要与目录名匹配，并使用适合目录和检索的命名方式。`description` 用一句话说明 Skill 能完成什么任务，以及什么情况下应该使用它。Agent 可以先读取这两项信息，判断当前任务是否与代码审查有关。

第二个 `---` 后面的内容就是 Markdown 正文。它可以写任务目标、执行顺序、输入和输出示例、常见错误、检查标准，以及何时读取某个辅助脚本或参考资料。正文越具体，Agent 在执行任务时需要自行猜测的部分就越少。规范还允许在 YAML 中加入 `license`、`compatibility`、`metadata` 和实验性的 `allowed-tools` 等可选字段，用来说明许可、运行环境、其他元数据，以及预先允许使用的工具。即使 Skill 声明了 `allowed-tools`，它也不能单独扩大运行时的权限边界，工具最终能否执行仍由运行环境检查。

### 这就构成了 Skill 的渐进式披露过程

1. **发现阶段**：宿主或运行时先读取 Skill 的元数据，再把 `name` 和 `description` 提供给模型；模型据此判断它是否与当前任务相关；
2. **激活阶段**：任务确实需要代码审查时，Agent 再加载完整的 `SKILL.md`，读取检查顺序、输出格式和验收条件；
3. **资源阶段**：正文要求生成变更摘要或查阅编码规范时，Agent 才继续读取 `scripts/` 或 `references/` 中的文件。

这样安排可以让 Agent 在任务无关时只接触简短的元数据，在任务相关时再加载完整方法，最后按需读取更具体的资料。Skill 因此同时具有目录结构、机器可读的元数据、任务执行说明和可选资源这几层内容。

例如，普通的 `README.md` 可以介绍一个项目怎样使用；代码审查 Skill 则可以规定先读取哪些规则、再检查哪些文件、运行哪些测试，以及最后采用什么格式报告结果。

### 以代码审查为例，一个 Skill 可能会把检查步骤写成这样

~~~text
任务目标：检查代码变更中的逻辑错误和测试遗漏
检查顺序：先读项目规则，再查看变更，再运行相关测试
输出格式：按严重程度列出问题，并附上文件位置
辅助脚本：生成变更摘要、运行静态检查
参考资料：项目编码规范和安全要求
~~~

![Agent Skills 的渐进式披露示意图](https://www.anthropic.com/_next/image?q=75&url=https%3A%2F%2Fwww-cdn.anthropic.com%2Fimages%2F4zrzovbb%2Fwebsite%2Fa3bca2763d7892982a59c28aa4df7993aaae55ae-2292x673.jpg&w=3840)

_图 3｜Skill 的渐进式披露。Agent 先接触目录和概要信息，再按任务需要加载 SKILL.md 以及附加资料。来源：_[_Equipping agents for the real world with Agent Skills_](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)_。_

渐进式披露的关键在于分阶段加载信息。在支持这种机制的实现中，首次加载阶段通常只需要知道 Skill 的名称和用途，例如“代码仓库审查”。当当前任务确实属于代码修复或代码审查时，运行时再加载完整的 `SKILL.md`，让模型了解任务顺序、输出要求和检查条件。只有在需要某个辅助脚本或参考资料时，相关文件才继续进入上下文。

假设当前任务是修复 CSV 导入问题，一个代码审查 Skill 可能要求先读取项目规则，再检查导入函数，然后运行相关测试；如果测试失败，还要记录失败用例和修改位置。Skill 改变的是任务执行顺序和检查标准。Tool 提供“读取文件”或“运行测试”的动作，Skill 决定这些动作应该怎样组合，最终输出则按照 Skill 规定的格式返回。

Tool 提供动作，Skill 规定这些动作怎样组合成一类任务的执行方法。文件、网络或终端能否访问，由运行时决定。

在一些具体 Agent 平台中，项目规则文件、Skill、Hook 和 Plugin 通常承担不同作用。项目规则文件，例如 `AGENTS.md`，记录目录、测试和构建约定；Skill 组织任务方法；Hook 是在会话创建、工具调用或任务结束等生命周期事件发生时触发的逻辑；Plugin 则是把一组能力或配置打包、分发的扩展单元。

它们的共同点是都可以影响 Agent 的运行过程，作用方式却不同。规则文件提供约束，Skill 提供任务方法，Hook 响应事件，Plugin 负责组织和分发配置。这些名称在不同平台中的实现可能不同。

在本文的例子里，`AGENTS.md` 就属于前面说的项目规则文件；它通常记录项目结构、构建命令、测试方法和目录要求。

## Agent 如何决定下一步？

### Planning（规划）和 Task Decomposition（任务分解）

复杂任务通常需要拆成若干子目标。修复一个 bug 可能包含定位入口、重现问题、检查相关逻辑、修改代码、运行测试和总结结果。

Planning 可以由程序预先规定，也可以由模型在运行过程中生成。它属于控制策略，既可以由单个 Agent 执行，也可以和 Skill 或 Multi-Agent 架构结合。

计划也不一定是一张一次写完的清单。初始计划可能是“找到导入函数、复现失败、修改代码、运行测试”。如果读取目录后发现项目没有单独的导入模块，Agent 就需要调整计划，先搜索 CSV 处理入口；如果测试结果显示问题来自编码处理，它又会把配置和样例文件加入后续步骤。计划会随着工具返回结果继续变化。固定 Workflow 的路径通常提前确定，Planning 则允许 Agent 根据当前结果调整后续步骤。

### ReAct：推理和行动交错

ReAct（Reasoning and Acting，推理与行动）把推理轨迹和外部行动交织起来。模型先形成当前判断，再执行动作，随后根据环境返回结果更新行动计划。

~~~text
判断：需要先确认导入函数的输入格式
行动：读取导入函数和对应测试
观察：测试使用了带引号的字段
判断：需要检查解析器对引号的处理
行动：运行单个测试并查看失败信息
~~~

ReAct 可以运行在 Agent Loop 中，为模型提供“判断、行动、观察、再判断”的处理方式。Agent Loop 是运行机制，ReAct 是其中一种决策方法。模型可以利用行动获得新的信息。

在 CSV 修复任务中，ReAct 的“行动”可以是读取文件、搜索字段名或运行一个测试，“观察”则是工具返回的代码片段、搜索结果和失败日志。模型根据这些观察更新判断，再提出下一步行动。

### Reflection（反思）和 Verification（验证）

Reflection（反思）让 Agent 根据反馈总结错误，并把总结用于后续决策。Reflexion 则是一个具体的方法和论文框架，它让 Agent 把任务反馈转化为语言形式的反思，再保存到情节记忆中，供之后的尝试使用。两者承担相近的功能，但指代范围不同。

Verification 则更关注结果是否满足条件。它可以表现为运行测试、检查文件是否生成、核对引用、比较数据库状态，或让另一个模型审查结果。

Planning、ReAct、Reflection 和 Verification 位于同一条执行过程中，但分别承担不同职责。

Planning 形成或更新计划。ReAct 让判断与外部行动交替发生。Reflection 根据失败和反馈，整理下一次可以怎样改进。Verification 则检查结果是否满足明确的条件。

Reflection 产生的自我解释还需要外部证据来核对。在代码任务中，“我认为问题已经修复”属于反思或判断；测试通过、目标文件发生预期变化，才提供更强的验证证据。

测试失败后，Agent 可以记录“当前修改只处理了逗号分隔文件，没有覆盖带引号字段”，这属于 Reflection。再次运行测试、检查目标文件是否生成、确认所有相关用例通过，则属于 Verification。前者帮助系统更新判断，后者检查任务结果是否满足条件。

CoT（Chain-of-Thought，思维链）、CoVe（Chain-of-Verification，验证链）、Tree of Thoughts（思维树）和 Self-Consistency（自洽性采样）都是可选的模型级推理或输出控制方法。CoT 让模型把一个问题展开为连续的中间步骤。Tree of Thoughts 保留多个候选推理路径，再对这些路径进行比较。Self-Consistency 针对同一个问题生成多条推理路径，再根据结果的一致性选择答案。CoVe 则先生成初稿，再根据其中的事实断言规划核验问题，独立回答这些问题，最后据此生成经过核验的答案。

它们改变的是模型处理一次问题的方式，属于方法层。MCP、Skill 和 A2A（Agent-to-Agent，Agent 间通信协议）处理连接、能力封装和 Agent 间通信，处于不同层级。

放回 CSV 修复任务中，Planning 负责安排“先定位、再修改、最后测试”的任务流程。CoT 处理模型在某一步怎样展开判断。Tree of Thoughts 可以比较“修改解析器”和“修改输入预处理”两条路径。Self-Consistency 可以为同一个判断生成多条推理路径，再根据候选结果的一致性进行选择。CoVe 则适合核对最终报告中的文件名、测试结果和修改说明。在这个任务里，Planning 组织整体流程，CoT、Tree of Thoughts、Self-Consistency 和 CoVe 作用于具体判断，工具和协议则决定 Agent 能接触什么、执行什么。

## Subagent、Multi-Agent 和 A2A

### Subagent(子代理)

在许多 Agent 平台中，Subagent(子代理)由主 Agent 委派任务，并使用单独创建或由主 Agent 提供的上下文。只要一个子任务能够相对独立地完成，例如资料筛选、代码审查或测试运行，就可以采用这种方式。

独立上下文可以减少主 Agent 的信息负担，也可以让不同执行单元使用不同的工具和权限。

主 Agent 可以把“检查 CSV 导入测试”连同相关文件和检查标准交给 Subagent。Subagent 在自己的上下文中读取文件、运行测试，最后返回一份摘要或问题清单。这个上下文可以是独立创建的，也可以是主 Agent 筛选后提供的；它使用什么模型、工具和权限，则由具体运行时决定。主 Agent 再把结果加入自己的上下文，决定是否修改代码。它返回一段经过独立处理的任务结果。

### Multi-Agent

Multi-Agent System 关注多个 Agent 如何分工、通信和汇总。例如，一个 Agent 负责规划，另一个负责搜索，第三个负责审查结果。

多个 Agent 也会带来具体代价：通信、状态同步、权限管理和错误传播都会变复杂。任务边界和评价标准，决定了这种架构有没有必要。

如果主 Agent 临时委派一次“检查测试文件”的任务，这更接近 Subagent。若系统长期设计为多个 Agent 分别负责规划、搜索和审查，并规定它们之间的通信和汇总方式，就进入了 Multi-Agent System 的范围。前者强调一次任务中的执行隔离，后者强调整个系统的分工结构。

### A2A

A2A（Agent-to-Agent，Agent 间通信协议）面向彼此不了解内部实现的 Agent。它们可以通过协议发现能力、发送消息、跟踪任务和交换结果。Agent Card、Task、Message 和 Artifact，分别用于描述能力、记录任务、传递消息和承载结果。

除了连接工具和其他 Agent，Agent 还需要把运行状态和结果传递给用户界面。AG-UI（Agent–User Interaction Protocol，Agent—用户交互协议）是一种面向 Agent 与用户界面的事件传递协议。

### 三种连接关系可以这样区分

~~~text
Agent ↔ Tool / Data：MCP
Agent ↔ Agent：A2A
Agent ↔ User / UI：AG-UI
~~~

一个 Agent 可以通过 MCP 使用数据库，也可以通过 A2A 委派给另一个远程 Agent。前者连接能力，后者连接执行系统。

在一次远程协作中，主 Agent 可以先通过 Agent Card 了解远程 Agent 能处理什么任务，再创建一个 Task。双方通过 Message 传递请求和进度，远程 Agent 完成后返回 Artifact，例如测试报告或代码审查结果。主 Agent 再根据结果决定是否继续推进任务。MCP 把请求发给工具或数据服务，A2A 把请求发给另一个 Agent。两者都包含能力发现、请求和结果返回，但协作对象不同。

在用户界面一侧，这类协议可以把 Agent 的运行状态、工具调用进度和最终结果传回界面。它关注的是 Agent 状态怎样呈现给用户，任务本身怎样执行仍由 Agent Runtime 负责。

Subagent 是执行关系，Multi-Agent 是系统架构，A2A 是跨 Agent 通信协议。本地 Subagent 可以由同一个 Harness 调度，不使用 A2A；Multi-Agent 系统也可以通过共享数据库或消息队列通信。

## 安全、轨迹和评测

当 Agent 开始调用工具并改变外部状态，安全问题就同时落到回答内容和实际操作上。

先看“清理临时文件”这个任务。Agent 可能有读取项目目录的 Permission，却没有删除生产目录的权限；即使某个删除工具可以被调用，Approval 也可以要求用户先确认目标路径。Guardrail（护栏或约束检查）可以检查命令是否包含危险目录，Sandbox 可以把清理动作限制在临时副本中。Prompt Injection 可能来自 README、网页或工具返回内容，试图诱导 Agent 偏离原任务；Tool Poisoning 也可能通过恶意工具描述或返回结果影响模型判断。前者强调外部内容伪装成指令，后者强调工具接口或数据来源被污染。

### 本文按这些名称在 Agent 运行中的具体功能区分

- Permission：允许访问哪些资源；
- Approval：哪些动作需要人确认；
- Sandbox：把代码和文件操作限制在受控环境；
- Guardrail：在输入、输出、工具调用或 Agent 交接点执行检查；
- Prompt Injection：外部内容诱导 Agent 偏离原任务；
- Tool Poisoning：恶意工具描述或返回结果影响 Agent 判断的一类风险；
- Trace：记录模型调用、工具调用、交接和状态变化；
- Outcome：环境最终达到的状态；
- Eval：根据任务和评分标准检验系统质量。

这些控制点作用在不同阶段。Permission 和 Sandbox 先限制动作边界，Approval 在敏感动作发生前介入，Guardrail 检查输入、输出和工具请求。Trace 记录运行过程，Outcome 描述环境最后变成的状态。

模型返回“清理完成”后，系统仍能根据这些记录检查它访问了哪些目录、执行了哪些命令，以及文件是否真的达到预期状态。

当 Agent 能够真实执行动作，评测就需要同时观察回答、运行路径和环境状态。AgentBench 是一个面向 Agent 的多环境评测基准，它把 Agent 放进多个交互环境中，观察连续决策、环境反馈和指令遵循。

在 Anthropic 的《Demystifying Evals for AI Agents》中，作者将任务、试次、评分器、轨迹和最终结果分别列出，为这种多阶段评测提供了更清楚的组织方式。

在这里，任务是要完成的目标，试次是一次完整运行，评分器把运行轨迹或最终状态映射为分数，轨迹记录执行过程，最终结果表示任务结束时环境达到的状态。

一次 CSV 修复的 Trace 可以记录模型读过哪些文件、调用过哪些工具、运行过几次测试，以及每次测试返回了什么。Outcome 关注任务结束时项目是否真的被修改、测试是否通过、目标文件是否能够正常导入。Eval 再根据一组任务和评分规则，比较不同 Agent 版本的成功率、错误类型、运行成本和稳定性。单次任务的验证回答“这次是否完成”，系统评测回答“这个版本在一批任务上表现如何”。

![Agent 评测的组成：任务、工具、环境、运行轨迹和评分器](https://www.anthropic.com/_next/image?q=75&url=https%3A%2F%2Fwww-cdn.anthropic.com%2Fimages%2F4zrzovbb%2Fwebsite%2Fbd42e7b2f3e9bb5218142796d3ede4816588dec0-4584x2834.png&w=3840)

_图 4｜Agent 评测结构。复杂评测同时观察任务输入、工具调用、环境变化、运行轨迹和最终评分。来源：_[_Demystifying evals for AI agents_](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)_。_

Agent 系统与普通聊天界面的差别，可以从结果检查中看出来。一句“已经完成”只是一段文本，文件、代码、数据库或任务状态的实际变化才是可以核对的结果。

## 把这些概念放回一个 Agent 系统

### 前面介绍的这些组件、运行机制和协作协议，可以放回同一个 Agent 系统中观察

~~~text
任务与验收：用户目标、成功条件、Verification
        │

        ├─ 系统形态与编排：Model、Agent、Workflow
        │

        ├─ 决策方法：Planning、ReAct、Reflection
        │

        ├─ 运行基础：Agent Loop、Harness、Context Engineering

        │      └─ Session、History、Memory、RAG
        │

        ├─ 能力接口：Tool、Function Calling、Schema
        │      └─ MCP 等外部能力连接协议
        │
        ├─ 任务方法与执行单元：Skill、Subagent
        │
        ├─ 协作架构与协议：Multi-Agent、A2A
        │

        └─ 执行控制：Environment、Sandbox、Permission、Approval、Guardrail

运行过程中持续产生：Trace；任务结束时形成 Outcome；跨任务比较依靠 Eval
~~~

### 这张图按功能分层展示概念之间的关系

Model 是 Agent 使用的决策模型；Agent 是把模型、工具、上下文和运行时组合起来的系统；Workflow 则表示其中一种预先编排的任务路径。

在运行的过程中，Context Engineering 组织每轮输入，MCP 连接工具和外部数据，Permission、Approval、Guardrail 与 Trace 贯穿调用过程，Eval 根据运行记录和最终 Outcome 检查系统表现。

与对话式 ai 不同，提示词只占 Agent 系统的一部分。上下文、工具、循环、权限和评测，都会影响Agent 整体的性能

### 结语

这些内容我写到最后，因为如果你认真的读完了上述的内容，你实际上已经具备了现代 ai 的大部分知识

现在我们可以讨论这样的内容了：**不要使用 Agent**或者至少**不要依赖 Agent**，这样的观点可能有点突兀，尤其是在你已经费心学习完了上述的内容后

### 我想要表达的观点是这样的

使用Agent的人通常会产生某种幻觉，即：他们会认为所构筑的产品确实由他们的能力所达成，但作为旁观者我们知道事实并非如此

它确实过于便捷，以至于我们在使用它的时候不再需要培养获得的成果相对应的能力或技能，即使这样的事情在我看来比我们所获得的结果更加富有意义

我一直秉持这样的观念，在使用 ai 前，你应该具备判断 ai 输出的正确性的能力或者知识。同时，判断何时应该使用它的能力也是必要的

对于已经完整读完这篇文章的你，而言，我想这样的能力已经是具备了的了。

 *The Truth must dazzle gradually，
Or every man be blind
真理必须由浅入深、渐渐照彻，
否则人人都会在骤亮中盲目

——艾米莉·狄金森（Emily Dickinson）第 1129 首* 

## 参考资料

1. Wang, L., et al. (2023). [A Survey on Large Language Model based Autonomous Agents](https://arxiv.org/abs/2308.11432).
2. Sumers, T. R., Yao, S., Narasimhan, K., & Griffiths, T. L. (2024). [Cognitive Architectures for Language Agents](https://arxiv.org/abs/2309.02427).
3. Yao, S., et al. (2023). [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629).
4. Schick, T., et al. (2023). [Toolformer: Language Models Can Teach Themselves to Use Tools](https://arxiv.org/abs/2302.04761).
5. Lewis, P., et al. (2020). [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401).
6. Packer, C., et al. (2023). [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560).
7. Shinn, N., et al. (2023). [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366).
8. Yang, J., et al. (2024). [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793).
9. Liu, X., et al. (2023). [AgentBench: Evaluating LLMs as Agents](https://arxiv.org/abs/2308.03688).
10. Guo, T., et al. (2024). [Large Language Model based Multi-Agents: A Survey of Progress and Challenges](https://arxiv.org/abs/2402.01680).
11. Anthropic. [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents).
12. OpenAI. [A Practical Guide to Building AI Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf).
13. Model Context Protocol. [Server Features, MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25/server/index).
14. Agent Skills. [Specification](https://agentskills.io/specification).
15. A2A Project. [A2A Protocol Specification](https://github.com/a2aproject/A2A/blob/main/docs/specification.md).
16. Anthropic. [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
17. Anthropic. [Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).
18. AGENTS.md. [A README for agents](https://agents.md/).
19. AG-UI. [Introduction](https://docs.ag-ui.com/introduction).
20. Claude Code. [Features Overview](https://code.claude.com/docs/en/features-overview).
21. Anthropic. [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
22. Wei, J., et al. (2022). [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903).
23. Dhuliawala, S., et al. (2023). [Chain-of-Verification Reduces Hallucination in Large Language Models](https://arxiv.org/abs/2309.11495).
24. Yao, S., et al. (2023). [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601).
25. Wang, X., et al. (2023). [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171).
26. Model Context Protocol. [Architecture, MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18/architecture).
27. OWASP. [MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html).
28. OpenAI. [Introducing Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/).
