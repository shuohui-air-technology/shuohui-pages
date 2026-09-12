---
title: 什么是 Agent？从模型、工具到 MCP 与 Skill
slug: what-is-agent
date: 2026-09-12T22:36:00
math: false
draft: false
comments: true
cover: null
---

_我希望通过撰写这份文章来捋清思路，也把最近经常出现的 Agent、MCP、Skill、RAG、Memory 和 Subagent 放回它们各自的位置。这些概念来自论文、协议规范和公开的工程文档，参考资料统一列在文章结尾。_

## 先看一个具体任务

**让我们举一个简单的例子：**

我们让一个 AI 帮忙修复代码仓库中的一个 bug。

{{< collapse summary="用户给出的任务" >}}

~~~text
请检查这个项目中导致 CSV 文件导入失败的问题，
定位原因，修改代码，运行相关测试，
最后告诉我修改了哪些文件以及测试结果。
~~~

{{< /collapse >}}

这句话放进普通的聊天框，模型可能会先解释常见原因，再给出一段修复建议。回答可以写得很完整，仓库、测试和修改结果却还没有真正发生变化。

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

这条流程里的输入会随着任务推进而变化。任务要求、项目规则、文件内容和测试结果，会在不同阶段进入上下文。模型根据当前看到的材料提出下一步，运行时执行这个动作，再把结果送回上下文。下一轮判断就建立在上一轮行动留下的信息上。

回到这个任务，模型要判断下一步该做什么，工具负责读取文件和运行测试，上下文保存已经获得的信息。每次行动结束后，结果都会进入下一轮判断。权限和沙箱限制能够执行的操作，验证则检查修改是否满足任务要求。

**后文提到的模型、工具、上下文和运行时，都会参与这条循环。**

## 什么是 Agent？

在这篇文章里，我把 Agent 作为一种工作定义：它以语言模型或多模态模型为决策核心，读取上下文，选择下一步动作，调用工具，再根据环境反馈继续运行。

CoALA 论文把语言 Agent 组织为几个相互连接的部分：记忆、行动空间和决策过程。OpenAI 的工程指南也把模型、工具和指令列为 Agent 的基本组成，并进一步讨论编排、状态和护栏。

把刚才的任务拆开，可以看到几个不同的问题。下面几项不属于同一层级，它们只是从一次任务中可以分别观察到的角色和过程：

~~~text
模型：下一步可以怎么想、怎么表达
工具：下一步可以做什么
上下文：下一步能够看到什么
循环：下一步什么时候继续
环境：行动会改变什么
验证：当前任务是否满足条件
评测：系统在一组任务上的整体表现
~~~

仍然以 CSV 导入失败为例。第一次调用时，模型可能只看到用户的任务、项目目录和测试命令，于是提出“读取导入函数”的工具请求。运行时执行读取操作，把函数内容放回上下文。模型看到代码后，可能发现解析器把带引号的字段处理错了，再提出运行某个测试或查看样例文件的请求。测试结果返回之后，模型才有条件决定应该修改代码，还是继续收集信息。

模型的输出可能直接展示给用户，也可能交给运行时执行。文件是否改变，取决于运行时是否允许工具执行这个请求；工具结果返回后，模型再决定下一步。

模型负责主要的判断和生成，Agent 的实际表现还取决于工具、上下文、权限和运行时怎样组合。文件权限、网络访问、数据库连接和长期记忆，都需要由运行时另外提供。

![CoALA 论文中的语言 Agent 架构：从普通语言模型到带有环境反馈、记忆和决策过程的 Agent](https://arxiv.org/html/2309.02427v3/fig1-lang-agent.png)

_图 1｜CoALA 原论文 Figure 1。图中依次展示普通语言模型、与环境交互的语言 Agent，以及能够管理内部状态和推理过程的认知语言 Agent。三者的差别，体现在环境交互、内部状态管理和推理过程逐步加入系统。来源：_[_Cognitive Architectures for Language Agents_](https://arxiv.org/abs/2309.02427)_。_

## Agent 和 Workflow 有什么区别？

Anthropic 把 Workflow 解释为由预先写好的代码路径组织模型和工具，把 Agent 解释为由模型动态决定过程和工具使用。

### 固定流程可以写成这样

~~~text
先调用 OCR
再调用分类器
最后调用摘要模型
~~~

每个步骤的顺序由程序提前写好。模型可以负责某一步的内容生成，但整体路径已经确定。

### Agent 的路径更像这样

~~~text
先查看文件
→ 根据文件类型选择解析方式
→ 发现信息不足，继续搜索
→ 发现异常，运行测试
→ 根据测试结果决定是否修改
~~~

Agent 的下一步取决于上一轮返回了什么。真实系统经常把这几种方式放在一起：固定步骤由程序执行，具体判断交给模型，危险操作则需要人确认。

把这两个例子放回 CSV 修复任务，差别会更明显。一个固定 Workflow 可以规定“先运行导入测试，再读取报错位置，最后调用代码修改步骤”。它的路径稳定，成本和权限也更容易预测。项目结构发生变化时，预先写好的路径可能无法到达真正的问题位置。Agent 会先查看目录，再根据目录结果决定搜索哪个文件。测试提示编码错误时，它继续检查编码处理；测试提示字段解析错误时，它转向解析器和样例数据。

这类系统的边界通常这样划分：高风险动作、固定格式转换和最终验收写成确定步骤，文件搜索和后续判断交给模型处理。

## Agent 怎样工作：模型、上下文和运行循环

### 模型只是运行系统的一部分

模型可以提出工具调用请求，也可以读取工具返回的结构化结果。真正执行函数的是运行时，工具结果随后会回到下一轮上下文。

Function Calling 就是这样工作的：模型输出符合规定格式的调用请求，程序执行对应函数，再把结果返回给模型。

一次 Function Calling 会经过三个角色。模型读取工具说明，生成“调用哪个工具、传入哪些参数”的请求。运行时检查工具名称、参数结构、权限和审批条件，再决定是否执行。工具完成动作后，把成功结果或错误信息返回给运行时，运行时再将结果放进下一轮上下文。

所以，模型输出合法 JSON，只能说明它生成了一份符合格式的请求。工具是否执行成功，还要看运行时检查和真实环境的结果。

Tool Schema 和 [Structured Output](https://openai.com/index/introducing-structured-outputs-in-the-api/) 都可能使用 JSON Schema，但它们约束的对象不同。Tool Schema 主要规定模型怎样提出一次工具调用，例如 `run_tests` 需要哪些参数。Structured Output 主要规定模型生成的结构化输出应具有怎样的字段和结构。在 `response_format` 场景下，它通常用于约束最终回答，也可以用于工具调用中的结构化参数。前者位于“准备行动”的接口上，后者通常位于“交付结果”的接口上。

在 CSV 任务中，模型可能返回类似“调用 `run_tests`，参数是 `tests/test_import.py`”的结构化请求。这个请求只是模型对下一步的建议，真正的运行时还要检查工具名称是否存在、参数是否符合 Schema、当前会话是否有权限执行，以及这个动作是否需要用户确认。检查通过后，运行时才会调用测试程序。

工具执行也可能失败。参数路径不存在时，运行时可以返回参数错误；测试失败时，工具可以返回失败日志；测试通过时，工具可以返回通过状态和相关输出。运行时把这些结果作为新的上下文交给模型，模型再决定修复代码、调整参数、继续读取文件，或者结束任务。

Function Calling 让模型用结构化请求参与执行循环，真正的函数调用仍由运行时完成。Toolformer 进一步研究了模型怎样选择工具、决定调用时机、组织参数并吸收返回结果。工具使用因此成为语言模型研究中的一个独立问题。

工具选择本身也会影响任务结果。同一个模型既可能先读取源代码，再运行测试，也可能一开始就调用测试工具。前一种路径通常能先建立项目背景，后一种路径更快获得失败信息。模型能否选对动作，取决于运行时、工具描述和任务上下文。因此，工具调用需要和这些部分一起设计。

### Agent Loop 和 Harness

Agent Loop 是“观察上下文、选择行动、读取结果、继续运行”的控制循环。要让这个循环真正跑起来，还需要 Harness。本文把 Harness 用作一个工程概念，指承载 Agent 循环的运行时支架。它可以连接模型、工具、上下文、权限、审批和日志，具体实现不一定包含全部功能。Agent Loop 描述循环怎样运行，Harness 描述这套循环由什么系统承载。Agent SDK 或 Framework 通常提供创建这类运行时的开发接口。

在 CSV 修复任务中，Harness 可以先创建一次会话，把用户要求、项目规则和可用工具交给模型。模型请求读取导入函数后，Harness 检查这个读取动作是否在权限范围内，调用文件工具，再把文件内容标记为工具结果并放回上下文。之后每一次模型调用、工具调用、错误返回和人工确认，都可以由 Harness 记录下来。任务结束时，它还可以整理出一份运行轨迹，供用户查看或供评测系统使用。

### 上下文决定模型能看到什么

模型每一次推理都只能处理当前送入的上下文。这个上下文里可能有：

- 系统指令和任务要求；
- 用户消息和历史对话；
- 文件、数据库记录和检索结果；
- 工具说明、参数结构和工具返回值；
- 其他 Agent 留下的摘要；
- 之前的错误、测试结果和中间决策。

Anthropic 把持续选择、组织、压缩和更新这些信息的工作称为 Context Engineering。它处理的内容包括系统指令、工具说明、外部资料、对话历史和记忆，范围比一段提示词更大。

资料已经存在，并不意味着模型这一轮就能看到它。上下文长度有限，运行时需要决定哪些内容保留，哪些内容截断，哪些内容压缩成摘要，哪些内容重新排列或检索后注入。CSV 任务中的项目规则、导入函数、测试失败信息和上一次修改结果，只有被选入当前上下文，才会参与下一步判断。

放回 CSV 修复任务，第一次判断时，模型可能只需要看到任务要求、项目目录和相关测试。读取到导入函数之后，系统再把函数代码和测试结果加入上下文。

随着任务变长，早期无关的工具输出可以被压缩成摘要，最近一次失败日志可能需要保留原文；项目规则和当前任务目标通常需要持续放在模型可见的位置。Context Engineering 具体处理的，就是每一轮决定哪些信息进入上下文、按照什么顺序排列，以及哪些旧内容可以被压缩或移出。

上下文的变化也会改变模型的工作范围。模型没有看到某个配置文件时，它只能根据现有材料猜测；配置文件进入上下文之后，它可以把猜测换成基于文件内容的判断。信息越多也不一定越好，无关日志、重复文档和互相冲突的指令都会占用上下文空间，并增加模型判断时需要处理的噪声。

### Session、History 和 Memory

这几个词描述的是不同范围的信息。Session 指一次任务或会话的运行范围，History 记录其中产生的消息和事件，Memory 保存之后还可能继续调用的信息。Context 则只指模型当前这一轮真正收到的输入。

RAG 关注怎样把外部资料检索出来并加入当前生成过程。Memory 关注一项信息是否需要被保存，以及之后还要使用多久。两者可以同时出现：知识库文档可以通过 RAG 进入上下文，长期记忆也可以借助相似的检索方法被取回。区分它们时，可以同时观察信息的用途、保存周期和取回方式。

这次 CSV 修复从开始到结束属于一个 Session。期间产生的用户消息、模型判断、工具调用和测试结果属于 History。模型这一轮真正收到的内容，则属于当前 Context。

如果系统把“这个项目使用 pytest”“CSV 文件统一采用 UTF-8”保存下来，供下一次任务继续使用，这些内容进入 Memory。模型需要查找项目文档、Python 解析器说明或内部知识库时，系统先从资料库中检索相关内容，再把结果加入当前 Context，这属于 RAG。无论信息来自 History、Memory 还是外部知识库，只有进入当前 Context，才会影响这一轮判断。

![RAG 原论文中的检索增强生成架构](https://ar5iv.labs.arxiv.org/html/2005.11401/assets/RAG-Architecture.svg)

_图 2｜RAG 原论文 Figure 1。该架构将检索器、文档索引和生成模型连接在一起。来源：_[_Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks_](https://arxiv.org/abs/2005.11401)_。_

RAG 解决的是“需要时从外部资料中取回什么”。如果问题变成“上下文太长时，系统怎样保存和移动已有信息”，就进入记忆管理的范围。

MemGPT 把有限上下文看成一种需要管理的工作内存，并通过分层记忆和数据移动来处理超出上下文窗口的内容。对 Agent 来说，记忆就是保存信息，在需要时取回，再放进当前上下文。

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

SWE-agent 把语言模型当作一种新的软件使用者，并为它设计 Agent-Computer Interface，使它能够浏览代码仓库、编辑文件、运行测试和执行程序。这个研究关注的也包括模型与计算机之间的接口。

如果工具能够执行代码、读写文件或访问网络，运行时还需要提供 Sandbox 和权限边界。Permission 决定 Agent 可以访问什么，Approval 决定哪些动作需要人确认，Sandbox 决定动作在哪个受控环境中发生。

这三种控制共同约束一次行动，Guardrail 还可以检查输入、模型输出、工具参数或交接结果。

以删除文件为例，Agent 可能有读取项目文件的 Permission，却没有删除权限；即使 Approval 已确认删除，Sandbox 仍然决定动作发生在真实项目、临时副本还是受限容器中。

SWE-agent 还说明，模型与计算机之间的接口本身就是系统设计的一部分。模型能否看到清晰的目录结果、能否用合适的命令编辑文件、能否及时获得测试反馈，都会影响它的下一步判断。工具名称本身不会自动带来可靠的 Agent 行为，接口返回的信息是否足够清楚同样重要。

## MCP 是什么？

假设一个 Agent 需要查询数据库。模型本身没有数据库连接，运行时也需要一种统一方式知道有哪些查询工具、参数怎样填写、结果怎样返回。MCP 处理的就是这部分连接问题，它是一套让 Agent 发现和连接外部工具、数据与提示模板的开放协议。

### 一次 MCP 连接通常会涉及三个角色

- Host：承载模型和整体应用；
- Client：代表 Host 与某一个 MCP Server 建立连接；
- Server：向 Client 暴露工具、资源和提示模板。

### 当前 MCP 规范将服务端的三类核心 primitives（原语）概括为

- Tools：模型可以调用的动作；
- Resources：应用可以读取并放入上下文的数据；
- Prompts：可以由用户选择的预定义提示模板。

以数据库查询为例，调用过程是这样的。Agent 启动时，Host 让 MCP Client 连接数据库 Server。Client 先获取 Server 提供的工具和资源说明，再把这些能力交给运行时。

模型看到“可以执行 SQL 查询”以及对应参数后，决定调用某个工具。Client 把调用请求转交给 Server，Server 访问数据库并返回结果，结果再回到模型的上下文中。

这次调用中，Host 承载应用，Client 负责连接，Server 提供数据库能力。Tools、Resources 和 Prompts 分别对应动作、资料和提示模板。

Tool 是具体动作，MCP 负责让 Agent 发现这些动作、建立连接并接收结果。

MCP 把能力发现、参数传递和结果返回标准化，却不会自动保证工具可信、数据正确或操作已经得到授权。这些问题仍然需要权限、审批、服务端安全和结果验证共同处理。

## Skill 是什么？

Skill 是一份可以按需加载的岗位手册。它把完成一类任务所需的指令、背景知识、脚本、参考资料、模板和检查步骤组织在一起。

Agent Skills 的开放规范要求 Skill 目录包含一个 SKILL.md 文件，也允许附带 scripts、references 和 assets。规范还采用渐进式披露：Agent 先看到 Skill 的名称和描述，确定需要使用后，再加载完整说明和相关资源。

Skill 的内核仍然是一份 Markdown 文件。普通 Markdown 文件主要供人阅读，项目规则文件主要告诉协作者应该遵守什么；Skill 则额外拥有名称、描述、目录位置和可选资源等运行时约定，Agent 可以先根据描述判断是否需要它，再加载完整的 `SKILL.md`、脚本和参考资料。Skill 的作用取决于它能否被 Agent 发现、按需加载，并在执行过程中与工具、脚本、参考资料和检查步骤组合起来。文件后缀和文字数量本身并不能决定它怎样工作。

例如，普通的 `README.md` 可以介绍一个项目怎样使用；代码审查 Skill 则可以规定先读取哪些规则、再检查哪些文件、运行哪些测试，以及最后采用什么格式报告结果。

“skill”可以泛指可复用的任务方法；Agent Skills 指一种目录和 `SKILL.md` 格式；具体产品还可能采用自己的加载规则。Skill 本身不会凭空创造文件、网络或数据库权限。它可以指导 Agent 使用现有工具，也可以附带脚本和模板，但这些资源最终能否执行，仍由 Harness、工具和权限环境决定。

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

渐进式披露的关键在于分阶段加载信息。Agent 第一次只需要知道 Skill 的名称和用途，例如“代码仓库审查”。当当前任务确实属于代码修复或代码审查时，它再读取完整的 `SKILL.md`，了解任务顺序、输出要求和检查条件。只有在需要某个辅助脚本或参考资料时，相关文件才继续进入上下文。

假设当前任务是修复 CSV 导入问题，一个代码审查 Skill 可能要求先读取项目规则，再检查导入函数，然后运行相关测试；如果测试失败，还要记录失败用例和修改位置。Skill 改变的是任务执行顺序和检查标准。Tool 提供“读取文件”或“运行测试”的动作，Skill 决定这些动作应该怎样组合，最终输出则按照 Skill 规定的格式返回。

Tool 提供动作，Skill 规定这些动作怎样组合成一类任务的执行方法。它是否能直接访问文件、网络或终端，则取决于运行时实现。

在具体 Agent 平台中，项目规则文件、Skill、Hook 和 Plugin 通常承担不同作用。项目规则文件，例如 `AGENTS.md`，记录目录、测试和构建约定。Skill 组织任务方法，Hook 响应生命周期事件，Plugin 则常用于打包和分发 Skill、Hook、Agent 配置或 MCP 配置。

它们的共同点是都可以影响 Agent 的运行过程，作用方式却不同。规则文件提供约束，Skill 提供任务方法，Hook 响应事件，Plugin 负责组织和分发配置。这些名称在不同平台中的实现可能不同。

在本文的例子里，`AGENTS.md` 就属于前面说的项目规则文件；它通常记录项目结构、构建命令、测试方法和目录要求。

## Agent 如何决定下一步？

### Planning 和 Task Decomposition

复杂任务通常需要拆成若干子目标。修复一个 bug 可能包含定位入口、重现问题、检查相关逻辑、修改代码、运行测试和总结结果。

Planning 可以由程序预先规定，也可以由模型在运行过程中生成。它属于控制策略，既可以由单个 Agent 执行，也可以和 Skill 或 Multi-Agent 架构结合。

计划也不一定是一张一次写完的清单。初始计划可能是“找到导入函数、复现失败、修改代码、运行测试”。如果读取目录后发现项目没有单独的导入模块，Agent 就需要调整计划，先搜索 CSV 处理入口；如果测试结果显示问题来自编码处理，它又会把配置和样例文件加入后续步骤。计划会随着工具返回结果继续变化。固定 Workflow 的路径通常提前确定，Planning 则允许 Agent 根据当前结果调整后续步骤。

### ReAct：推理和行动交错

ReAct 把推理轨迹和外部行动交织起来。模型先形成当前判断，再执行动作，随后根据环境返回结果更新行动计划。

~~~text
判断：需要先确认导入函数的输入格式
行动：读取导入函数和对应测试
观察：测试使用了带引号的字段
判断：需要检查解析器对引号的处理
行动：运行单个测试并查看失败信息
~~~

ReAct 可以运行在 Agent Loop 中，为模型提供“判断、行动、观察、再判断”的处理方式。Agent Loop 是运行机制，ReAct 是其中一种决策方法。模型不必一次猜中完整方案，它可以利用行动获得新的信息。

在 CSV 修复任务中，ReAct 的“行动”可以是读取文件、搜索字段名或运行一个测试，“观察”则是工具返回的代码片段、搜索结果和失败日志。模型根据这些观察更新判断，再提出下一步行动。它不需要在第一次调用时就写出最终修复方案，外部环境提供的信息会参与后续决策。

### Reflection 和 Verification

Reflection 让 Agent 根据反馈总结错误，并把总结用于后续决策。Reflexion 论文让 Agent 把任务反馈转化为语言形式的反思，再保存到情节记忆中，供之后的尝试使用。

Verification 更关注结果是否满足条件。它可以表现为运行测试、检查文件是否生成、核对引用、比较数据库状态，或让另一个模型审查结果。

Planning、ReAct、Reflection 和 Verification 位于同一条执行过程中，却承担不同职责。Planning 形成或更新计划。ReAct 让判断与外部行动交替发生。Reflection 根据失败和反馈，整理下一次可以怎样改进。Verification 则检查结果是否满足明确的条件。

Reflection 产生的自我解释还需要外部证据来核对。在代码任务中，“我认为问题已经修复”属于反思或判断；测试通过、目标文件发生预期变化，才提供更强的验证证据。

测试失败后，Agent 可以记录“当前修改只处理了逗号分隔文件，没有覆盖带引号字段”，这属于 Reflection。再次运行测试、检查目标文件是否生成、确认所有相关用例通过，则属于 Verification。前者帮助系统更新判断，后者检查任务结果是否满足条件。

CoT、CoVe、Tree of Thoughts 和 Self-Consistency 都属于模型推理或输出控制方法。CoT 让模型把一个问题展开为连续的中间步骤。Tree of Thoughts 保留多个候选推理路径，再对这些路径进行比较。Self-Consistency 针对同一个问题生成多条推理路径，再根据结果的一致性选择答案。CoVe 则先列出初稿中的事实断言，再逐项检查和修订。

它们改变的是模型处理一次问题的方式，属于方法层。MCP、Skill 和 A2A 处理连接、能力封装和 Agent 间通信，处于不同层级。

放回 CSV 修复任务中，Planning 负责安排“先定位、再修改、最后测试”的任务流程。CoT 处理模型在某一步怎样展开判断。Tree of Thoughts 可以比较“修改解析器”和“修改输入预处理”两条路径。Self-Consistency 可以为同一个判断生成多条推理路径，再根据候选结果的一致性进行选择。CoVe 则适合核对最终报告中的文件名、测试结果和修改说明。在这个任务里，Planning 组织整体流程，CoT、Tree of Thoughts、Self-Consistency 和 CoVe 作用于具体判断，工具和协议则决定 Agent 能接触什么、执行什么。

## Subagent、Multi-Agent 和 A2A

### Subagent：一种常见的隔离执行方式

在许多 Agent 平台中，Subagent 由主 Agent 委派任务，并使用单独创建或由主 Agent 提供的上下文。只要一个子任务能够相对独立地完成，例如资料筛选、代码审查或测试运行，就可以采用这种方式。

独立上下文可以减少主 Agent 的信息负担，也可以让不同执行单元使用不同的工具和权限。

主 Agent 可以把“检查 CSV 导入测试”连同相关文件和检查标准交给 Subagent。Subagent 在自己的上下文中读取文件、运行测试，最后返回一份摘要或问题清单。这个上下文可以是独立创建的，也可以是主 Agent 筛选后提供的；它使用什么模型、工具和权限，则由具体运行时决定。主 Agent 再把结果加入自己的上下文，决定是否修改代码。它返回的是一段经过独立处理的任务结果，不只是一次简单的文件读取或函数调用。

### Multi-Agent 是一种系统架构

Multi-Agent System 关注多个 Agent 如何分工、通信和汇总。例如，一个 Agent 负责规划，另一个负责搜索，第三个负责审查结果。

多个 Agent 也会带来具体代价：通信、状态同步、权限管理和错误传播都会变复杂。任务边界和评价标准，决定了这种架构有没有必要。

如果主 Agent 临时委派一次“检查测试文件”的任务，这更接近 Subagent。若系统长期设计为多个 Agent 分别负责规划、搜索和审查，并规定它们之间的通信和汇总方式，就进入了 Multi-Agent System 的范围。前者强调一次任务中的执行隔离，后者强调整个系统的分工结构。

### A2A 是 Agent 与 Agent 之间的协议

A2A 面向彼此不了解内部实现的 Agent。它们可以通过协议发现能力、发送消息、跟踪任务和交换结果。Agent Card、Task、Message 和 Artifact，分别用于描述能力、记录任务、传递消息和承载结果。

### 三种连接关系可以这样区分

~~~text
Agent ↔ Tool / Data：MCP
Agent ↔ Agent：A2A
Agent ↔ User / UI：AG-UI
~~~

一个 Agent 可以通过 MCP 使用数据库，也可以通过 A2A 委派给另一个远程 Agent。前者连接能力，后者连接执行系统。
这里的 AG-UI 指一种连接 Agent 与用户界面应用的开放协议方向，它是具体协议的例子，不代表所有 Agent 产品都采用同一种界面协议。

在一次远程协作中，主 Agent 可以先通过 Agent Card 了解远程 Agent 能处理什么任务，再创建一个 Task。双方通过 Message 传递请求和进度，远程 Agent 完成后返回 Artifact，例如测试报告或代码审查结果。主 Agent 再根据结果决定是否继续推进任务。MCP 把请求发给工具或数据服务，A2A 把请求发给另一个 Agent。两者都包含能力发现、请求和结果返回，但协作对象不同。

在用户界面一侧，AG-UI 一类协议可以把 Agent 的运行状态、工具调用进度和最终结果传回界面。它关注的是 Agent 状态怎样呈现给用户，任务本身怎样执行仍由 Agent Runtime 负责。

Subagent 是执行关系，Multi-Agent 是系统架构，A2A 是跨 Agent 通信协议。本地 Subagent 可以由同一个 Harness 调度，不使用 A2A；Multi-Agent 系统也可以通过共享数据库或消息队列通信。采用 A2A 只能说明系统支持跨 Agent 交换任务和结果，分工是否合理、结果是否准确仍要单独评估。

## 安全、轨迹和评测

当 Agent 开始调用工具并改变外部状态，安全问题就同时落到回答内容和实际操作上。

先看“清理临时文件”这个任务。Agent 可能有读取项目目录的 Permission，却没有删除生产目录的权限；即使某个删除工具可以被调用，Approval 也可以要求用户先确认目标路径。Guardrail 可以检查命令是否包含危险目录，Sandbox 可以把清理动作限制在临时副本中。Prompt Injection 可能来自 README、网页或工具返回内容，试图诱导 Agent 偏离原任务；Tool Poisoning 也可能通过恶意工具描述或返回结果影响模型判断。

### 后面的术语分别对应权限、安全控制、运行记录和结果评价

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

当 Agent 能够真实执行动作，评测就需要同时观察回答、运行路径和环境状态。AgentBench 把 Agent 放进多个交互环境中评测，同时观察连续决策、环境反馈和指令遵循。

Anthropic 对 Agent 评测的拆解把任务、试次、评分器、轨迹和最终结果分别列出来，为这种多阶段评测提供了更清楚的组织方式。

一次 CSV 修复的 Trace 可以记录模型读过哪些文件、调用过哪些工具、运行过几次测试，以及每次测试返回了什么。Outcome 关注任务结束时项目是否真的被修改、测试是否通过、目标文件是否能够正常导入。Eval 再根据一组任务和评分规则，比较不同 Agent 版本的成功率、错误类型、运行成本和稳定性。单次任务的验证回答“这次是否完成”，系统评测回答“这个版本在一批任务上表现如何”。

![Agent 评测的组成：任务、工具、环境、运行轨迹和评分器](https://www.anthropic.com/_next/image?q=75&url=https%3A%2F%2Fwww-cdn.anthropic.com%2Fimages%2F4zrzovbb%2Fwebsite%2Fbd42e7b2f3e9bb5218142796d3ede4816588dec0-4584x2834.png&w=3840)

_图 4｜Agent 评测结构。复杂评测同时观察任务输入、工具调用、环境变化、运行轨迹和最终评分。来源：_[_Demystifying evals for AI agents_](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)_。_

Agent 系统与普通聊天界面的差别，可以从结果检查中看出来。一句“已经完成”只是一段文本，文件、代码、数据库或任务状态的实际变化才是可以核对的结果。

## 把这些概念放回一个 Agent 系统

### 可以把它们画成下面这样的分层关系

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

运行时，Context Engineering 组织每轮输入，MCP 连接工具和外部数据，Permission、Approval、Guardrail 与 Trace 贯穿调用过程，Eval 根据运行记录和最终 Outcome 检查系统表现。

提示词只占 Agent 系统的一部分。上下文、工具、循环、权限和评测，都会影响任务能否真正完成。

## 参考资料

本文将学术论文、协议规范和官方工程文档统一编号。MCP、Agent Skills 和 A2A 都有公开的协议或格式资料，但它们的实现方式和生态仍在快速演化，具体术语以对应规范为准。

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
12. OpenAI. [A Practical Guide to Building AI Agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/).
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
