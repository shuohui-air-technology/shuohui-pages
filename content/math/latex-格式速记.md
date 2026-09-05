---
title: LaTeX 格式速记
date: 2026-09-05T16:49:00
math: true
draft: false
comments: true
cover: null
---

# LaTeX Math Cheatsheet

> 看效果 → 找代码 → 复制修改。  

> 面向数学学习、Jupyter Notebook、Markdown 与科研写作的 LaTeX 数学公式速查表。

---

# 0. 最常用结构

## 上下标

代码：

\`\`\`latex

x_i

x^2

x_i^2

x_{ij}^{(k)}

\`\`\`

效果：

$$

x_i,\qquad

x^2,\qquad

x_i^2,\qquad

x_{ij}^{(k)}

$$

## 分数

\`\`\`latex

\frac{a}{b}

\`\`\`

效果：

$$

\frac{a}{b}

$$

## 根号

\`\`\`latex

\sqrt{x}

\`\`\`

效果：

$$

\sqrt{x}

$$

## 求和

\`\`\`latex

\sum_{i=1}^{n}x_i

\`\`\`

效果：

$$

\sum_{i=1}^{n}x_i

$$

## 积分

\`\`\`latex

\int_a^b f(x)\,dx

\`\`\`

效果：

$$

\int_a^b f(x)\,dx

$$

## 极限

\`\`\`latex

\lim_{x\to0}f(x)

\`\`\`

效果：

$$

\lim_{x\to0}f(x)

$$

## 自动大小括号

\`\`\`latex

\left(\frac{a}{b}\right)

\`\`\`

效果：

$$

\left(\frac{a}{b}\right)

$$

## 分段函数

\`\`\`latex

f(x)=

\begin{cases}

x^2, & x\ge0,\\

-x, & x<0.

\end{cases}

\`\`\`

效果：

$$

f(x)=

\begin{cases}

x^2, & x\ge0,\\

-x, & x<0.

\end{cases}

$$

---

# 1. 公式模式

## 行内公式

源码：

\`\`\`markdown

函数 $f(x)=x^2$ 在 $x=0$ 处取得最小值。

\`\`\`

效果：

函数 $f(x)=x^2$ 在 $x=0$ 处取得最小值。

## 独立公式

源码：

\`\`\`markdown

$$

f(x)=x^2

$$

\`\`\`

效果：

$$

f(x)=x^2

$$

## 正式 LaTeX 文档中的独立公式

\`\`\`latex

\[

f(x)=x^2

\]

\`\`\`

## 带编号公式

\`\`\`latex

\begin{equation}

f(x)=x^2

\end{equation}

\`\`\`

---

# 2. 上标与下标

## 下标

\`\`\`latex

x_i

x_{ij}

x_{n+1}

a_{12}

\`\`\`

效果：

$$

x_i,\qquad

x_{ij},\qquad

x_{n+1},\qquad

a_{12}

$$

## 上标

\`\`\`latex

x^2

x^{10}

e^{x+1}

a^{n+1}

\`\`\`

效果：

$$

x^2,\qquad

x^{10},\qquad

e^{x+1},\qquad

a^{n+1}

$$

## 同时使用上下标

\`\`\`latex

x_i^2

x_{ij}^{(k)}

a_n^{m+1}

\`\`\`

效果：

$$

x_i^2,\qquad

x_{ij}^{(k)},\qquad

a_n^{m+1}

$$

## 多字符必须使用花括号

推荐：

\`\`\`latex

x^{10}

x_{10}

x^{n+1}

x_{i+1}

\`\`\`

---

# 3. 分数

## 普通分数

\`\`\`latex

\frac{a}{b}

\`\`\`

效果：

$$

\frac{a}{b}

$$

## 嵌套分数

\`\`\`latex

\frac{1}{1+\frac{1}{x}}

\`\`\`

效果：

$$

\frac{1}{1+\frac{1}{x}}

$$

## 连分式示例

\`\`\`latex

1+\frac{1}{1+\frac{1}{x}}

\`\`\`

效果：

$$

1+\frac{1}{1+\frac{1}{x}}

$$

## 导数

\`\`\`latex

\frac{dy}{dx}

\`\`\`

效果：

$$

\frac{dy}{dx}

$$

## 二阶导数

\`\`\`latex

\frac{d^2y}{dx^2}

\`\`\`

效果：

$$

\frac{d^2y}{dx^2}

$$

## 偏导数

\`\`\`latex

\frac{\partial f}{\partial x}

\`\`\`

效果：

$$

\frac{\partial f}{\partial x}

$$

## 混合偏导

\`\`\`latex

\frac{\partial^2f}{\partial x\,\partial y}

\`\`\`

效果：

$$

\frac{\partial^2f}{\partial x\,\partial y}

$$

---

# 4. 根号

## 平方根

\`\`\`latex

\sqrt{x}

\`\`\`

效果：

$$

\sqrt{x}

$$

## 复杂根式

\`\`\`latex

\sqrt{x^2+y^2}

\`\`\`

效果：

$$

\sqrt{x^2+y^2}

$$

## n 次根

\`\`\`latex

\sqrt[n]{x}

\`\`\`

效果：

$$

\sqrt[n]{x}

$$

## 三次根

\`\`\`latex

\sqrt[3]{8}=2

\`\`\`

效果：

$$

\sqrt[3]{8}=2

$$

---

# 5. 括号与定界符

## 普通圆括号

\`\`\`latex

(a+b)

\`\`\`

效果：

$$

(a+b)

$$

## 普通方括号

\`\`\`latex

[a+b]

\`\`\`

效果：

$$

[a+b]

$$

## 花括号

\`\`\`latex

\{a+b\}

\`\`\`

效果：

$$

\{a+b\}

$$

花括号本身是 LaTeX 语法字符，因此显示花括号需要转义：

\`\`\`latex

\{

\}

\`\`\`

---

# 6. 自动大小括号

## 圆括号

\`\`\`latex

\left(

\frac{a}{b}

\right)

\`\`\`

效果：

$$

\left(

\frac{a}{b}

\right)

$$

## 方括号

\`\`\`latex

\left[

\frac{a+b}{c+d}

\right]

\`\`\`

效果：

$$

\left[

\frac{a+b}{c+d}

\right]

$$

## 花括号

\`\`\`latex

\left\{

\frac{x+1}{x-1}

\right\}

\`\`\`

效果：

$$

\left\{

\frac{x+1}{x-1}

\right\}

$$

## 尖括号

\`\`\`latex

\left\langle

x,y

\right\rangle

\`\`\`

效果：

$$

\left\langle

x,y

\right\rangle

$$

---

# 7. 绝对值与范数

## 绝对值

\`\`\`latex

\lvert x\rvert

\`\`\`

效果：

$$

\lvert x\rvert

$$

## 自动大小绝对值

\`\`\`latex

\left|

\frac{x+1}{x-1}

\right|

\`\`\`

效果：

$$

\left|

\frac{x+1}{x-1}

\right|

$$

## 范数

\`\`\`latex

\lVert x\rVert

\`\`\`

效果：

$$

\lVert x\rVert

$$

## 二范数

\`\`\`latex

\lVert \mathbf{x}\rVert_2

\`\`\`

效果：

$$

\lVert \mathbf{x}\rVert_2

$$

## 一范数

\`\`\`latex

\lVert \mathbf{x}\rVert_1

\`\`\`

效果：

$$

\lVert \mathbf{x}\rVert_1

$$

## 无穷范数

\`\`\`latex

\lVert \mathbf{x}\rVert_\infty

\`\`\`

效果：

$$

\lVert \mathbf{x}\rVert_\infty

$$

---

# 8. 单边定界符

在只需要一侧括号时，用 \`.\` 作为不可见定界符。

\`\`\`latex

\left.

\frac{d}{dx}f(x)

\right|_{x=0}

\`\`\`

效果：

$$

\left.

\frac{d}{dx}f(x)

\right|_{x=0}

$$

另一个例子：

\`\`\`latex

\left\{

\begin{aligned}

x+y&=1\\

x-y&=0

\end{aligned}

\right.

\`\`\`

效果：

$$

\left\{

\begin{aligned}

x+y&=1\\

x-y&=0

\end{aligned}

\right.

$$

---

# 9. 分段函数

## 两段函数

\`\`\`latex

f(x)=

\begin{cases}

x^2, & x\ge0,\\

-x, & x<0.

\end{cases}

\`\`\`

效果：

$$

f(x)=

\begin{cases}

x^2, & x\ge0,\\

-x, & x<0.

\end{cases}

$$

## 三段函数

\`\`\`latex

f(x)=

\begin{cases}

-1, & x<0,\\

0, & x=0,\\

1, & x>0.

\end{cases}

\`\`\`

效果：

$$

f(x)=

\begin{cases}

-1, & x<0,\\

0, & x=0,\\

1, & x>0.

\end{cases}

$$

## 通用模板

\`\`\`latex

\begin{cases}

表达式1, & 条件1,\\

表达式2, & 条件2,\\

表达式3, & 条件3.

\end{cases}

\`\`\`

## 带文字条件

\`\`\`latex

f(x)=

\begin{cases}

x^2, & \text{当 }x\ge0,\\

-x, & \text{当 }x<0.

\end{cases}

\`\`\`

效果：

$$

f(x)=

\begin{cases}

x^2, & \text{当 }x\ge0,\\

-x, & \text{当 }x<0.

\end{cases}

$$

---

# 10. 方程组

\`\`\`latex

\begin{cases}

x+y=3,\\

2x-y=0.

\end{cases}

\`\`\`

效果：

$$

\begin{cases}

x+y=3,\\

2x-y=0.

\end{cases}

$$

## 带说明

\`\`\`latex

\begin{cases}

x+y=3, & \text{第一式},\\

2x-y=0, & \text{第二式}.

\end{cases}

\`\`\`

效果：

$$

\begin{cases}

x+y=3, & \text{第一式},\\

2x-y=0, & \text{第二式}.

\end{cases}

$$

---

# 11. 希腊字母

## 小写希腊字母

| 名称 | 代码 | 渲染 |

|---|---|---|

| alpha | \`\alpha\` | $\alpha$ |

| beta | \`\beta\` | $\beta$ |

| gamma | \`\gamma\` | $\gamma$ |

| delta | \`\delta\` | $\delta$ |

| epsilon | \`\epsilon\` | $\epsilon$ |

| varepsilon | \`\varepsilon\` | $\varepsilon$ |

| zeta | \`\zeta\` | $\zeta$ |

| eta | \`\eta\` | $\eta$ |

| theta | \`\theta\` | $\theta$ |

| vartheta | \`\vartheta\` | $\vartheta$ |

| iota | \`\iota\` | $\iota$ |

| kappa | \`\kappa\` | $\kappa$ |

| lambda | \`\lambda\` | $\lambda$ |

| mu | \`\mu\` | $\mu$ |

| nu | \`\nu\` | $\nu$ |

| xi | \`\xi\` | $\xi$ |

| pi | \`\pi\` | $\pi$ |

| varpi | \`\varpi\` | $\varpi$ |

| rho | \`\rho\` | $\rho$ |

| varrho | \`\varrho\` | $\varrho$ |

| sigma | \`\sigma\` | $\sigma$ |

| varsigma | \`\varsigma\` | $\varsigma$ |

| tau | \`\tau\` | $\tau$ |

| upsilon | \`\upsilon\` | $\upsilon$ |

| phi | \`\phi\` | $\phi$ |

| varphi | \`\varphi\` | $\varphi$ |

| chi | \`\chi\` | $\chi$ |

| psi | \`\psi\` | $\psi$ |

| omega | \`\omega\` | $\omega$ |

## 大写希腊字母

| 名称 | 代码 | 渲染 |

|---|---|---|

| Gamma | \`\Gamma\` | $\Gamma$ |

| Delta | \`\Delta\` | $\Delta$ |

| Theta | \`\Theta\` | $\Theta$ |

| Lambda | \`\Lambda\` | $\Lambda$ |

| Xi | \`\Xi\` | $\Xi$ |

| Pi | \`\Pi\` | $\Pi$ |

| Sigma | \`\Sigma\` | $\Sigma$ |

| Upsilon | \`\Upsilon\` | $\Upsilon$ |

| Phi | \`\Phi\` | $\Phi$ |

| Psi | \`\Psi\` | $\Psi$ |

| Omega | \`\Omega\` | $\Omega$ |

以下大写希腊字母与普通拉丁字母外形相同，通常直接输入拉丁字母：

| 希腊字母 | LaTeX 输入 |

|---|---|

| Alpha | \`A\` |

| Beta | \`B\` |

| Epsilon | \`E\` |

| Zeta | \`Z\` |

| Eta | \`H\` |

| Iota | \`I\` |

| Kappa | \`K\` |

| Mu | \`M\` |

| Nu | \`N\` |

| Omicron | \`O\` |

| Rho | \`P\` |

| Tau | \`T\` |

| Chi | \`X\` |

---

# 12. 求和

## 普通求和

\`\`\`latex

\sum_{i=1}^{n}x_i

\`\`\`

效果：

$$

\sum_{i=1}^{n}x_i

$$

## 双重求和

\`\`\`latex

\sum_{i=1}^{m}

\sum_{j=1}^{n}

a_{ij}

\`\`\`

效果：

$$

\sum_{i=1}^{m}

\sum_{j=1}^{n}

a_{ij}

$$

## 无限级数

\`\`\`latex

\sum_{n=0}^{\infty}

\frac{x^n}{n!}

\`\`\`

效果：

$$

\sum_{n=0}^{\infty}

\frac{x^n}{n!}

$$

## 指定条件求和

\`\`\`latex

\sum_{\substack{i=1\\i\neq j}}^{n}x_i

\`\`\`

效果：

$$

\sum_{\substack{i=1\\i\neq j}}^{n}x_i

$$

---

# 13. 连乘

\`\`\`latex

\prod_{i=1}^{n}x_i

\`\`\`

效果：

$$

\prod_{i=1}^{n}x_i

$$

## 似然函数

\`\`\`latex

L(\theta)

=

\prod_{i=1}^{n}

f(x_i;\theta)

\`\`\`

效果：

$$

L(\theta)

=

\prod_{i=1}^{n}

f(x_i;\theta)

$$

---

# 14. 积分

## 不定积分

\`\`\`latex

\int f(x)\,dx

\`\`\`

效果：

$$

\int f(x)\,dx

$$

## 定积分

\`\`\`latex

\int_a^b f(x)\,dx

\`\`\`

效果：

$$

\int_a^b f(x)\,dx

$$

## 二重积分

\`\`\`latex

\iint_D f(x,y)\,dx\,dy

\`\`\`

效果：

$$

\iint_D f(x,y)\,dx\,dy

$$

## 三重积分

\`\`\`latex

\iiint_V f(x,y,z)\,dV

\`\`\`

效果：

$$

\iiint_V f(x,y,z)\,dV

$$

## 环路积分

\`\`\`latex

\oint_C

\mathbf{F}\cdot d\mathbf{r}

\`\`\`

效果：

$$

\oint_C

\mathbf{F}\cdot d\mathbf{r}

$$

## 多重积分

\`\`\`latex

\idotsint

f(x_1,\dots,x_n)

\,dx_1\cdots dx_n

\`\`\`

效果：

$$

\idotsint

f(x_1,\dots,x_n)

\,dx_1\cdots dx_n

$$

---

# 15. 极限

## 普通极限

\`\`\`latex

\lim_{x\to0}f(x)

\`\`\`

效果：

$$

\lim_{x\to0}f(x)

$$

## 右极限

\`\`\`latex

\lim_{x\to0^+}f(x)

\`\`\`

效果：

$$

\lim_{x\to0^+}f(x)

$$

## 左极限

\`\`\`latex

\lim_{x\to0^-}f(x)

\`\`\`

效果：

$$

\lim_{x\to0^-}f(x)

$$

## 趋向无穷

\`\`\`latex

\lim_{n\to\infty}a_n

\`\`\`

效果：

$$

\lim_{n\to\infty}a_n

$$

## 多变量极限

\`\`\`latex

\lim_{(x,y)\to(0,0)}f(x,y)

\`\`\`

效果：

$$

\lim_{(x,y)\to(0,0)}f(x,y)

$$

---

# 16. 关系符号

| 代码 | 渲染 | 含义 |

|---|---|---|

| \`<\` | $<$ | 小于 |

| \`>\` | $>$ | 大于 |

| \`=\` | $=$ | 等于 |

| \`\le\` | $\le$ | 小于等于 |

| \`\leq\` | $\leq$ | 小于等于 |

| \`\ge\` | $\ge$ | 大于等于 |

| \`\geq\` | $\geq$ | 大于等于 |

| \`\neq\` | $\neq$ | 不等于 |

| \`\approx\` | $\approx$ | 约等于 |

| \`\equiv\` | $\equiv$ | 恒等 / 同余 |

| \`\sim\` | $\sim$ | 相似 / 渐近 / 服从 |

| \`\simeq\` | $\simeq$ | 近似 |

| \`\cong\` | $\cong$ | 全等 / 同构 |

| \`\propto\` | $\propto$ | 正比于 |

| \`\ll\` | $\ll$ | 远小于 |

| \`\gg\` | $\gg$ | 远大于 |

---

# 17. 集合关系

| 代码 | 渲染 | 含义 |

|---|---|---|

| \`\in\` | $\in$ | 属于 |

| \`\notin\` | $\notin$ | 不属于 |

| \`\ni\` | $\ni$ | 包含某元素 |

| \`\subset\` | $\subset$ | 真子集 |

| \`\subseteq\` | $\subseteq$ | 子集 |

| \`\supset\` | $\supset$ | 真超集 |

| \`\supseteq\` | $\supseteq$ | 超集 |

| \`\cup\` | $\cup$ | 并集 |

| \`\cap\` | $\cap$ | 交集 |

| \`\setminus\` | $\setminus$ | 集合差 |

| \`\varnothing\` | $\varnothing$ | 空集 |

---

# 18. 常用数集

| 代码 | 渲染 | 含义 |

|---|---|---|

| \`\mathbb{N}\` | $\mathbb{N}$ | 自然数 |

| \`\mathbb{Z}\` | $\mathbb{Z}$ | 整数 |

| \`\mathbb{Q}\` | $\mathbb{Q}$ | 有理数 |

| \`\mathbb{R}\` | $\mathbb{R}$ | 实数 |

| \`\mathbb{C}\` | $\mathbb{C}$ | 复数 |

---

# 19. 集合描述法

\`\`\`latex

A=

\{x\in\mathbb{R}\mid x>0\}

\`\`\`

效果：

$$

A=

\{x\in\mathbb{R}\mid x>0\}

$$

复杂形式：

\`\`\`latex

A=

\left\{

x\in\mathbb{R}

\,\middle|\,

x^2<1

\right\}

\`\`\`

效果：

$$

A=

\left\{

x\in\mathbb{R}

\,\middle|\,

x^2<1

\right\}

$$

---

# 20. 区间

\`\`\`latex

(a,b)

[a,b]

(a,b]

[a,b)

\`\`\`

效果：

$$

(a,b),\qquad

[a,b],\qquad

(a,b],\qquad

[a,b)

$$

## 无限区间

\`\`\`latex

(-\infty,a]

\`\`\`

效果：

$$

(-\infty,a]

$$

\`\`\`latex

[a,\infty)

\`\`\`

效果：

$$

[a,\infty)

$$

---

# 21. 逻辑符号

| 代码 | 渲染 | 含义 |

|---|---|---|

| \`\forall\` | $\forall$ | 任意 |

| \`\exists\` | $\exists$ | 存在 |

| \`\nexists\` | $\nexists$ | 不存在 |

| \`\neg\` | $\neg$ | 非 |

| \`\land\` | $\land$ | 且 |

| \`\lor\` | $\lor$ | 或 |

示例：

\`\`\`latex

\forall x\in\mathbb{R},

\quad

x^2\ge0

\`\`\`

效果：

$$

\forall x\in\mathbb{R},

\quad

x^2\ge0

$$

---

# 22. 蕴含与等价

| 代码 | 渲染 | 含义 |

|---|---|---|

| \`\Rightarrow\` | $\Rightarrow$ | 推出 |

| \`\Leftarrow\` | $\Leftarrow$ | 由右推出左 |

| \`\Leftrightarrow\` | $\Leftrightarrow$ | 等价 |

| \`\implies\` | $\implies$ | 蕴含 |

| \`\iff\` | $\iff$ | 当且仅当 |

\`\`\`latex

x^2=1

\iff

x=\pm1

\`\`\`

效果：

$$

x^2=1

\iff

x=\pm1

$$

---

# 23. 箭头

| 代码 | 渲染 |

|---|---|

| \`\to\` | $\to$ |

| \`\rightarrow\` | $\rightarrow$ |

| \`\leftarrow\` | $\leftarrow$ |

| \`\leftrightarrow\` | $\leftrightarrow$ |

| \`\Rightarrow\` | $\Rightarrow$ |

| \`\Leftarrow\` | $\Leftarrow$ |

| \`\Leftrightarrow\` | $\Leftrightarrow$ |

| \`\mapsto\` | $\mapsto$ |

| \`\uparrow\` | $\uparrow$ |

| \`\downarrow\` | $\downarrow$ |

| \`\nearrow\` | $\nearrow$ |

| \`\searrow\` | $\searrow$ |

## 函数映射

\`\`\`latex

f:A\to B

\`\`\`

效果：

$$

f:A\to B

$$

\`\`\`latex

x\mapsto x^2

\`\`\`

效果：

$$

x\mapsto x^2

$$

---

# 24. 常见运算符号

| 代码 | 渲染 |

|---|---|

| \`+\` | $+$ |

| \`-\` | $-$ |

| \`\pm\` | $\pm$ |

| \`\mp\` | $\mp$ |

| \`\times\` | $\times$ |

| \`\div\` | $\div$ |

| \`\cdot\` | $\cdot$ |

| \`\ast\` | $\ast$ |

| \`\circ\` | $\circ$ |

---

# 25. 省略号

| 代码 | 渲染 | 用途 |

|---|---|---|

| \`\dots\` | $\dots$ | 一般省略 |

| \`\ldots\` | $\ldots$ | 低位置横向省略 |

| \`\cdots\` | $\cdots$ | 居中横向省略 |

| \`\vdots\` | $\vdots$ | 纵向省略 |

| \`\ddots\` | $\ddots$ | 对角省略 |

\`\`\`latex

x_1,x_2,\dots,x_n

\`\`\`

效果：

$$

x_1,x_2,\dots,x_n

$$

\`\`\`latex

a_1a_2\cdots a_n

\`\`\`

效果：

$$

a_1a_2\cdots a_n

$$

---

# 26. 常用函数

数学函数名推荐使用专用命令，而不是直接输入普通字母。

| 代码 | 渲染 |

|---|---|

| \`\sin x\` | $\sin x$ |

| \`\cos x\` | $\cos x$ |

| \`\tan x\` | $\tan x$ |

| \`\cot x\` | $\cot x$ |

| \`\sec x\` | $\sec x$ |

| \`\csc x\` | $\csc x$ |

| \`\log x\` | $\log x$ |

| \`\ln x\` | $\ln x$ |

| \`\exp x\` | $\exp x$ |

| \`\max x\` | $\max x$ |

| \`\min x\` | $\min x$ |

| \`\sup x\` | $\sup x$ |

| \`\inf x\` | $\inf x$ |

| \`\det A\` | $\det A$ |

| \`\gcd(a,b)\` | $\gcd(a,b)$ |

---

# 27. 三角函数

\`\`\`latex

\sin x

\cos x

\tan x

\cot x

\sec x

\csc x

\`\`\`

效果：

$$

\sin x,\qquad

\cos x,\qquad

\tan x,\qquad

\cot x,\qquad

\sec x,\qquad

\csc x

$$

---

# 28. 反三角函数

\`\`\`latex

\arcsin x

\arccos x

\arctan x

\`\`\`

效果：

$$

\arcsin x,\qquad

\arccos x,\qquad

\arctan x

$$

---

# 29. 指数与对数

## 指数函数

\`\`\`latex

e^x

\`\`\`

效果：

$$

e^x

$$

\`\`\`latex

\exp(x)

\`\`\`

效果：

$$

\exp(x)

$$

## 自然对数

\`\`\`latex

\ln x

\`\`\`

效果：

$$

\ln x

$$

## 一般对数

\`\`\`latex

\log_a x

\`\`\`

效果：

$$

\log_a x

$$

---

# 30. 最大值与最小值

\`\`\`latex

\max_{x\in A}f(x)

\`\`\`

效果：

$$

\max_{x\in A}f(x)

$$

\`\`\`latex

\min_{x\in A}f(x)

\`\`\`

效果：

$$

\min_{x\in A}f(x)

$$

---

# 31. argmax 与 argmin

## 直接写法

\`\`\`latex

\operatorname\*{arg\,max}_{x\in A}f(x)

\`\`\`

效果：

$$

\operatorname\*{arg\,max}_{x\in A}f(x)

$$

\`\`\`latex

\operatorname\*{arg\,min}_{x\in A}f(x)

\`\`\`

效果：

$$

\operatorname\*{arg\,min}_{x\in A}f(x)

$$

## 在正式文档中定义命令

\`\`\`latex

\DeclareMathOperator\*{\argmax}{arg\,max}

\DeclareMathOperator\*{\argmin}{arg\,min}

\`\`\`

之后可以写：

\`\`\`latex

\argmax_{\theta}L(\theta)

\`\`\`

---

# 32. 自定义函数名

没有现成命令的数学函数，可以使用：

\`\`\`latex

\operatorname{rank}(A)

\`\`\`

效果：

$$

\operatorname{rank}(A)

$$

常见示例：

\`\`\`latex

\operatorname{diag}(A)

\operatorname{tr}(A)

\operatorname{rank}(A)

\operatorname{Var}(X)

\operatorname{Cov}(X,Y)

\`\`\`

效果：

$$

\operatorname{diag}(A),\qquad

\operatorname{tr}(A),\qquad

\operatorname{rank}(A),\qquad

\operatorname{Var}(X),\qquad

\operatorname{Cov}(X,Y)

$$

---

# 33. 微分

## 一阶导数

\`\`\`latex

f'(x)

\`\`\`

效果：

$$

f'(x)

$$

## 二阶导数

\`\`\`latex

f''(x)

\`\`\`

效果：

$$

f''(x)

$$

## n 阶导数

\`\`\`latex

f^{(n)}(x)

\`\`\`

效果：

$$

f^{(n)}(x)

$$

## Leibniz 记号

\`\`\`latex

\frac{df}{dx}

\`\`\`

效果：

$$

\frac{df}{dx}

$$

## 二阶 Leibniz 记号

\`\`\`latex

\frac{d^2f}{dx^2}

\`\`\`

效果：

$$

\frac{d^2f}{dx^2}

$$

---

# 34. 偏导数

## 一阶偏导

\`\`\`latex

\frac{\partial f}{\partial x}

\`\`\`

效果：

$$

\frac{\partial f}{\partial x}

$$

## 二阶偏导

\`\`\`latex

\frac{\partial^2f}{\partial x^2}

\`\`\`

效果：

$$

\frac{\partial^2f}{\partial x^2}

$$

## 混合偏导

\`\`\`latex

\frac{\partial^2f}

{\partial x\,\partial y}

\`\`\`

效果：

$$

\frac{\partial^2f}

{\partial x\,\partial y}

$$

---

# 35. 梯度

\`\`\`latex

\nabla f

\`\`\`

效果：

$$

\nabla f

$$

二维梯度：

\`\`\`latex

\nabla f(x,y)

=

\begin{pmatrix}

\frac{\partial f}{\partial x}\\

\frac{\partial f}{\partial y}

\end{pmatrix}

\`\`\`

效果：

$$

\nabla f(x,y)

=

\begin{pmatrix}

\frac{\partial f}{\partial x}\\

\frac{\partial f}{\partial y}

\end{pmatrix}

$$

---

# 36. 拉普拉斯算子

\`\`\`latex

\nabla^2f

\`\`\`

效果：

$$

\nabla^2f

$$

二维形式：

\`\`\`latex

\nabla^2f

=

\frac{\partial^2f}{\partial x^2}

+

\frac{\partial^2f}{\partial y^2}

\`\`\`

效果：

$$

\nabla^2f

=

\frac{\partial^2f}{\partial x^2}

+

\frac{\partial^2f}{\partial y^2}

$$

---

# 37. 向量

## 箭头向量

\`\`\`latex

\vec{x}

\`\`\`

效果：

$$

\vec{x}

$$

## 粗体向量

\`\`\`latex

\mathbf{x}

\`\`\`

效果：

$$

\mathbf{x}

$$

## 单位向量

\`\`\`latex

\hat{\mathbf{x}}

\`\`\`

效果：

$$

\hat{\mathbf{x}}

$$

---

# 38. 粗体希腊字母

普通拉丁字母可以使用：

\`\`\`latex

\mathbf{x}

\`\`\`

希腊字母推荐：

\`\`\`latex

\boldsymbol{\beta}

\`\`\`

效果：

$$

\boldsymbol{\beta}

$$

如果加载：

\`\`\`latex

\usepackage{bm}

\`\`\`

可以统一写：

\`\`\`latex

\bm{x}

\bm{\beta}

\bm{\Sigma}

\`\`\`

效果：

$$

\bm{x},\qquad

\bm{\beta},\qquad

\bm{\Sigma}

$$

---

# 39. 内积

\`\`\`latex

\mathbf{x}^{\mathsf T}\mathbf{y}

\`\`\`

效果：

$$

\mathbf{x}^{\mathsf T}\mathbf{y}

$$

另一种写法：

\`\`\`latex

\langle x,y\rangle

\`\`\`

效果：

$$

\langle x,y\rangle

$$

---

# 40. 矩阵

## 圆括号矩阵

\`\`\`latex

A=

\begin{pmatrix}

1 & 2\\

3 & 4

\end{pmatrix}

\`\`\`

效果：

$$

A=

\begin{pmatrix}

1 & 2\\

3 & 4

\end{pmatrix}

$$

## 方括号矩阵

\`\`\`latex

A=

\begin{bmatrix}

1 & 2\\

3 & 4

\end{bmatrix}

\`\`\`

效果：

$$

A=

\begin{bmatrix}

1 & 2\\

3 & 4

\end{bmatrix}

$$

矩阵中：

\`\`\`latex

&   % 分列

\\  % 换行

\`\`\`

---

# 41. 不同矩阵环境

| 环境 | 效果 |

|---|---|

| \`matrix\` | 无括号 |

| \`pmatrix\` | 圆括号 |

| \`bmatrix\` | 方括号 |

| \`Bmatrix\` | 花括号 |

| \`vmatrix\` | 单竖线 |

| \`Vmatrix\` | 双竖线 |

## 无括号

\`\`\`latex

\begin{matrix}

a & b\\

c & d

\end{matrix}

\`\`\`

效果：

$$

\begin{matrix}

a & b\\

c & d

\end{matrix}

$$

## 花括号矩阵

\`\`\`latex

\begin{Bmatrix}

a & b\\

c & d

\end{Bmatrix}

\`\`\`

效果：

$$

\begin{Bmatrix}

a & b\\

c & d

\end{Bmatrix}

$$

---

# 42. 行列式

\`\`\`latex

\begin{vmatrix}

a & b\\

c & d

\end{vmatrix}

\`\`\`

效果：

$$

\begin{vmatrix}

a & b\\

c & d

\end{vmatrix}

$$

也可以写：

\`\`\`latex

\det(A)

\`\`\`

效果：

$$

\det(A)

$$

---

# 43. 一般矩阵

\`\`\`latex

A=

\begin{pmatrix}

a_{11} & \cdots & a_{1n}\\

\vdots & \ddots & \vdots\\

a_{m1} & \cdots & a_{mn}

\end{pmatrix}

\`\`\`

效果：

$$

A=

\begin{pmatrix}

a_{11} & \cdots & a_{1n}\\

\vdots & \ddots & \vdots\\

a_{m1} & \cdots & a_{mn}

\end{pmatrix}

$$

---

# 44. 向量的矩阵形式

\`\`\`latex

\mathbf{x}

=

\begin{pmatrix}

x_1\\

x_2\\

\vdots\\

x_n

\end{pmatrix}

\`\`\`

效果：

$$

\mathbf{x}

=

\begin{pmatrix}

x_1\\

x_2\\

\vdots\\

x_n

\end{pmatrix}

$$

---

# 45. 转置、逆、单位阵

## 转置

\`\`\`latex

A^{\mathsf T}

\`\`\`

效果：

$$

A^{\mathsf T}

$$

## 逆矩阵

\`\`\`latex

A^{-1}

\`\`\`

效果：

$$

A^{-1}

$$

## 单位阵

\`\`\`latex

I_n

\`\`\`

效果：

$$

I_n

$$

\`\`\`latex

\mathbf{I}_n

\`\`\`

效果：

$$

\mathbf{I}_n

$$

---

# 46. 特征值与特征向量

\`\`\`latex

A\mathbf{v}

=

\lambda\mathbf{v}

\`\`\`

效果：

$$

A\mathbf{v}

=

\lambda\mathbf{v}

$$

特征方程：

\`\`\`latex

\det(A-\lambda I)=0

\`\`\`

效果：

$$

\det(A-\lambda I)=0

$$

---

# 47. 多行公式对齐

## align

\`\`\`latex

\begin{align}

(a+b)^2

&=a^2+2ab+b^2\\

&=a(a+b)+b(a+b)\\

&=(a+b)(a+b)

\end{align}

\`\`\`

其中：

\`\`\`latex

&

\`\`\`

表示对齐位置。

通常：

\`\`\`latex

&=

\`\`\`

让多行等号对齐。

换行使用：

\`\`\`latex

\\

\`\`\`

---

# 48. 不编号的 align

\`\`\`latex

\begin{align\*}

(a+b)^2

&=a^2+2ab+b^2\\

&=(a+b)(a+b)

\end{align\*}

\`\`\`

---

# 49. Jupyter / MathJax 中的 aligned

\`\`\`markdown

$$

\begin{aligned}

f(x)

&=(x+1)^2\\

&=x^2+2x+1

\end{aligned}

$$

\`\`\`

效果：

$$

\begin{aligned}

f(x)

&=(x+1)^2\\

&=x^2+2x+1

\end{aligned}

$$

---

# 50. 长推导示例

\`\`\`latex

\begin{aligned}

(x+y)^3

&=(x+y)(x+y)^2\\

&=(x+y)(x^2+2xy+y^2)\\

&=x^3+3x^2y+3xy^2+y^3.

\end{aligned}

\`\`\`

效果：

$$

\begin{aligned}

(x+y)^3

&=(x+y)(x+y)^2\\

&=(x+y)(x^2+2xy+y^2)\\

&=x^3+3x^2y+3xy^2+y^3.

\end{aligned}

$$

---

# 51. 上横线、帽子、波浪线

| 代码 | 渲染 |

|---|---|

| \`\bar{x}\` | $\bar{x}$ |

| \`\overline{AB}\` | $\overline{AB}$ |

| \`\hat{\theta}\` | $\hat{\theta}$ |

| \`\widehat{\theta}\` | $\widehat{\theta}$ |

| \`\tilde{x}\` | $\tilde{x}$ |

| \`\widetilde{ABC}\` | $\widetilde{ABC}$ |

| \`\vec{x}\` | $\vec{x}$ |

| \`\dot{x}\` | $\dot{x}$ |

| \`\ddot{x}\` | $\ddot{x}$ |

---

# 52. 上划线与均值

\`\`\`latex

\bar{x}

\`\`\`

效果：

$$

\bar{x}

$$

\`\`\`latex

\bar{x}

=

\frac{1}{n}

\sum_{i=1}^{n}x_i

\`\`\`

效果：

$$

\bar{x}

=

\frac{1}{n}

\sum_{i=1}^{n}x_i

$$

---

# 53. 参数估计量

\`\`\`latex

\hat{\theta}

\`\`\`

效果：

$$

\hat{\theta}

$$

\`\`\`latex

\hat{\beta}_0

\`\`\`

效果：

$$

\hat{\beta}_0

$$

\`\`\`latex

\hat{y}

=

\hat{\beta}_0

+

\hat{\beta}_1x

\`\`\`

效果：

$$

\hat{y}

=

\hat{\beta}_0

+

\hat{\beta}_1x

$$

---

# 54. 正态分布

## 概率密度函数

\`\`\`latex

f(x)

=

\frac{1}{\sigma\sqrt{2\pi}}

\exp\left(

-\frac{(x-\mu)^2}{2\sigma^2}

\right)

\`\`\`

效果：

$$

f(x)

=

\frac{1}{\sigma\sqrt{2\pi}}

\exp\left(

-\frac{(x-\mu)^2}{2\sigma^2}

\right)

$$

## 分布记号

\`\`\`latex

X\sim\mathcal{N}(\mu,\sigma^2)

\`\`\`

效果：

$$

X\sim\mathcal{N}(\mu,\sigma^2)

$$

## 标准正态分布

\`\`\`latex

Z\sim\mathcal{N}(0,1)

\`\`\`

效果：

$$

Z\sim\mathcal{N}(0,1)

$$

---

# 55. 概率

\`\`\`latex

\Pr(A)

\`\`\`

效果：

$$

\Pr(A)

$$

## 条件概率

\`\`\`latex

\Pr(A\mid B)

\`\`\`

效果：

$$

\Pr(A\mid B)

$$

## 条件概率公式

\`\`\`latex

\Pr(A\mid B)

=

\frac{\Pr(A\cap B)}

{\Pr(B)}

\`\`\`

效果：

$$

\Pr(A\mid B)

=

\frac{\Pr(A\cap B)}

{\Pr(B)}

$$

---

# 56. 期望

\`\`\`latex

\mathbb{E}[X]

\`\`\`

效果：

$$

\mathbb{E}[X]

$$

## 条件期望

\`\`\`latex

\mathbb{E}[X\mid Y]

\`\`\`

效果：

$$

\mathbb{E}[X\mid Y]

$$

## 离散型随机变量期望

\`\`\`latex

\mathbb{E}[X]

=

\sum_x x\,\Pr(X=x)

\`\`\`

效果：

$$

\mathbb{E}[X]

=

\sum_x x\,\Pr(X=x)

$$

## 连续型随机变量期望

\`\`\`latex

\mathbb{E}[X]

=

\int_{-\infty}^{\infty}

x f_X(x)\,dx

\`\`\`

效果：

$$

\mathbb{E}[X]

=

\int_{-\infty}^{\infty}

x f_X(x)\,dx

$$

---

# 57. 方差

\`\`\`latex

\operatorname{Var}(X)

\`\`\`

效果：

$$

\operatorname{Var}(X)

$$

\`\`\`latex

\operatorname{Var}(X)

=

\mathbb{E}

\left[

(X-\mu)^2

\right]

\`\`\`

效果：

$$

\operatorname{Var}(X)

=

\mathbb{E}

\left[

(X-\mu)^2

\right]

$$

另一种常见形式：

\`\`\`latex

\operatorname{Var}(X)

=

\mathbb{E}[X^2]

-

\mathbb{E}[X]^2

\`\`\`

效果：

$$

\operatorname{Var}(X)

=

\mathbb{E}[X^2]

-

\mathbb{E}[X]^2

$$

---

# 58. 协方差

\`\`\`latex

\operatorname{Cov}(X,Y)

\`\`\`

效果：

$$

\operatorname{Cov}(X,Y)

$$

\`\`\`latex

\operatorname{Cov}(X,Y)

=

\mathbb{E}

\left[

(X-\mu_X)(Y-\mu_Y)

\right]

\`\`\`

效果：

$$

\operatorname{Cov}(X,Y)

=

\mathbb{E}

\left[

(X-\mu_X)(Y-\mu_Y)

\right]

$$

---

# 59. 条件竖线

推荐使用：

\`\`\`latex

\mid

\`\`\`

例如：

\`\`\`latex

f(x\mid\theta)

\`\`\`

效果：

$$

f(x\mid\theta)

$$

而不是直接写普通：

\`\`\`latex

|

\`\`\`

---

# 60. 样本均值

\`\`\`latex

\bar{x}

=

\frac{1}{n}

\sum_{i=1}^{n}

x_i

\`\`\`

效果：

$$

\bar{x}

=

\frac{1}{n}

\sum_{i=1}^{n}

x_i

$$

---

# 61. 样本方差

\`\`\`latex

s^2

=

\frac{1}{n-1}

\sum_{i=1}^{n}

(x_i-\bar{x})^2

\`\`\`

效果：

$$

s^2

=

\frac{1}{n-1}

\sum_{i=1}^{n}

(x_i-\bar{x})^2

$$

---

# 62. t 统计量

\`\`\`latex

t

=

\frac{\bar{x}-\mu_0}

{s/\sqrt{n}}

\`\`\`

效果：

$$

t

=

\frac{\bar{x}-\mu_0}

{s/\sqrt{n}}

$$

---

# 63. 相关系数

\`\`\`latex

r

=

\frac{

\operatorname{Cov}(X,Y)

}{

s_Xs_Y

}

\`\`\`

效果：

$$

r

=

\frac{

\operatorname{Cov}(X,Y)

}{

s_Xs_Y

}

$$

总体相关系数：

\`\`\`latex

\rho_{XY}

=

\frac{

\operatorname{Cov}(X,Y)

}{

\sigma_X\sigma_Y

}

\`\`\`

效果：

$$

\rho_{XY}

=

\frac{

\operatorname{Cov}(X,Y)

}{

\sigma_X\sigma_Y

}

$$

---

# 64. 二项式系数

\`\`\`latex

\binom{n}{k}

\`\`\`

效果：

$$

\binom{n}{k}

$$

## 二项式定理

\`\`\`latex

(a+b)^n

=

\sum_{k=0}^{n}

\binom{n}{k}

a^{n-k}b^k

\`\`\`

效果：

$$

(a+b)^n

=

\sum_{k=0}^{n}

\binom{n}{k}

a^{n-k}b^k

$$

---

# 65. 阶乘

\`\`\`latex

n!

\`\`\`

效果：

$$

n!

$$

组合数：

\`\`\`latex

\frac{n!}{k!(n-k)!}

\`\`\`

效果：

$$

\frac{n!}{k!(n-k)!}

$$

---

# 66. 模运算与整除

## 同余

\`\`\`latex

a\equiv b\pmod n

\`\`\`

效果：

$$

a\equiv b\pmod n

$$

## 整除

\`\`\`latex

a\mid b

\`\`\`

效果：

$$

a\mid b

$$

## 不整除

\`\`\`latex

a\nmid b

\`\`\`

效果：

$$

a\nmid b

$$

## 最大公约数

\`\`\`latex

\gcd(a,b)

\`\`\`

效果：

$$

\gcd(a,b)

$$

---

# 67. 取整

## 向下取整

\`\`\`latex

\lfloor x\rfloor

\`\`\`

效果：

$$

\lfloor x\rfloor

$$

## 向上取整

\`\`\`latex

\lceil x\rceil

\`\`\`

效果：

$$

\lceil x\rceil

$$

---

# 68. 角括号

\`\`\`latex

\langle x,y\rangle

\`\`\`

效果：

$$

\langle x,y\rangle

$$

常用于：

- 内积

- 序列

- 生成结构

- 某些抽象代数表示

---

# 69. 复数

## 虚数单位

\`\`\`latex

i

\`\`\`

效果：

$$

i

$$

论文中也常使用正体：

\`\`\`latex

\mathrm{i}

\`\`\`

效果：

$$

\mathrm{i}

$$

## 欧拉公式

\`\`\`latex

e^{i\pi}+1=0

\`\`\`

效果：

$$

e^{i\pi}+1=0

$$

---

# 70. 实部与虚部

\`\`\`latex

\operatorname{Re}(z)

\`\`\`

效果：

$$

\operatorname{Re}(z)

$$

\`\`\`latex

\operatorname{Im}(z)

\`\`\`

效果：

$$

\operatorname{Im}(z)

$$

---

# 71. 复共轭

\`\`\`latex

\bar{z}

\`\`\`

效果：

$$

\bar{z}

$$

长表达式：

\`\`\`latex

\overline{z_1+z_2}

\`\`\`

效果：

$$

\overline{z_1+z_2}

$$

---

# 72. 数学公式中的文字

数学模式中的普通文字推荐：

\`\`\`latex

\text{...}

\`\`\`

例如：

\`\`\`latex

x=1

\quad

\text{if }x>0

\`\`\`

效果：

$$

x=1

\quad

\text{if }x>0

$$

中文：

\`\`\`latex

x=1

\quad

\text{当 }x>0

\`\`\`

效果：

$$

x=1

\quad

\text{当 }x>0

$$

---

# 73. 数学空格

LaTeX 数学模式中的普通键盘空格通常不起作用。

常见数学空格：

| 代码 | 大致大小 |

|---|---|

| \`\,\` | 很小 |

| \`\:\` | 小 |

| \`\;\` | 中等 |

| \`\quad\` | 大 |

| \`\qquad\` | 很大 |

效果：

\`\`\`latex

a\,b

a\:b

a\;b

a\quad b

a\qquad b

\`\`\`

效果：

$$

a\,b

\qquad

a\:b

\qquad

a\;b

\qquad

a\quad b

\qquad

a\qquad b

$$

积分中推荐：

\`\`\`latex

\int f(x)\,dx

\`\`\`

而不是：

\`\`\`latex

\int f(x)dx

\`\`\`

---

# 74. 负空格

\`\`\`latex

\!

\`\`\`

会减小两个元素之间的间距。

例如：

\`\`\`latex

\int\! f(x)\,dx

\`\`\`

效果：

$$

\int\! f(x)\,dx

$$

一般不需要频繁使用。

---

# 75. 数学字体

## 普通数学变量

\`\`\`latex

x

A

\`\`\`

效果：

$$

x,\qquad A

$$

## 正体

\`\`\`latex

\mathrm{ABC}

\`\`\`

效果：

$$

\mathrm{ABC}

$$

## 粗体

\`\`\`latex

\mathbf{x}

\`\`\`

效果：

$$

\mathbf{x}

$$

## 黑板粗体

\`\`\`latex

\mathbb{R}

\`\`\`

效果：

$$

\mathbb{R}

$$

## 花体

\`\`\`latex

\mathcal{L}

\`\`\`

效果：

$$

\mathcal{L}

$$

## Fraktur

\`\`\`latex

\mathfrak{g}

\`\`\`

效果：

$$

\mathfrak{g}

$$

## 无衬线数学字体

\`\`\`latex

\mathsf{ABC}

\`\`\`

效果：

$$

\mathsf{ABC}

$$

## 打字机字体

\`\`\`latex

\mathtt{ABC}

\`\`\`

效果：

$$

\mathtt{ABC}

$$

---

# 76. 损失函数

\`\`\`latex

\mathcal{L}(\theta)

\`\`\`

效果：

$$

\mathcal{L}(\theta)

$$

---

# 77. 上方与下方说明

## underbrace

\`\`\`latex

\underbrace{a+b+c}_{3\text{ terms}}

\`\`\`

效果：

$$

\underbrace{a+b+c}_{3\text{ terms}}

$$

## overbrace

\`\`\`latex

\overbrace{x+\cdots+x}^{n\text{ times}}

\`\`\`

效果：

$$

\overbrace{x+\cdots+x}^{n\text{ times}}

$$

---

# 78. 箭头上写内容

\`\`\`latex

A\xrightarrow{f}B

\`\`\`

效果：

$$

A\xrightarrow{f}B

$$

箭头下方也可以写：

\`\`\`latex

A

\xrightarrow[n\to\infty]{f_n}

B

\`\`\`

效果：

$$

A

\xrightarrow[n\to\infty]{f_n}

B

$$

---

# 79. 等号上写说明

\`\`\`latex

a

\overset{\text{def}}{=}

b

\`\`\`

效果：

$$

a

\overset{\text{def}}{=}

b

$$

也常写：

\`\`\`latex

a:=b

\`\`\`

效果：

$$

a:=b

$$

---

# 80. 因为与所以

\`\`\`latex

\because

\therefore

\`\`\`

效果：

$$

\because

\qquad

\therefore

$$

通常需要：

\`\`\`latex

\usepackage{amssymb}

\`\`\`

---

# 81. 多元线性回归

\`\`\`latex

\mathbf{y}

=

\mathbf{X}

\boldsymbol{\beta}

+

\boldsymbol{\varepsilon}

\`\`\`

效果：

$$

\mathbf{y}

=

\mathbf{X}

\boldsymbol{\beta}

+

\boldsymbol{\varepsilon}

$$

标量形式：

\`\`\`latex

y_i

=

\beta_0

+

\beta_1x_i

+

\varepsilon_i

\`\`\`

效果：

$$

y_i

=

\beta_0

+

\beta_1x_i

+

\varepsilon_i

$$

---

# 82. 最小二乘法

\`\`\`latex

\hat{\boldsymbol{\beta}}

=

\operatorname\*{arg\,min}_{\boldsymbol{\beta}}

\left\|

\mathbf{y}

-

\mathbf{X}\boldsymbol{\beta}

\right\|_2^2

\`\`\`

效果：

$$

\hat{\boldsymbol{\beta}}

=

\operatorname\*{arg\,min}_{\boldsymbol{\beta}}

\left\|

\mathbf{y}

-

\mathbf{X}\boldsymbol{\beta}

\right\|_2^2

$$

## 闭式解

\`\`\`latex

\hat{\boldsymbol{\beta}}

=

(\mathbf{X}^{\mathsf T}\mathbf{X})^{-1}

\mathbf{X}^{\mathsf T}\mathbf{y}

\`\`\`

效果：

$$

\hat{\boldsymbol{\beta}}

=

(\mathbf{X}^{\mathsf T}\mathbf{X})^{-1}

\mathbf{X}^{\mathsf T}\mathbf{y}

$$

---

# 83. 二次方程求根公式

\`\`\`latex

x

=

\frac{-b\pm\sqrt{b^2-4ac}}

{2a}

\`\`\`

效果：

$$

x

=

\frac{-b\pm\sqrt{b^2-4ac}}

{2a}

$$

---

# 84. 勾股定理

\`\`\`latex

a^2+b^2=c^2

\`\`\`

效果：

$$

a^2+b^2=c^2

$$

---

# 85. 欧拉公式

\`\`\`latex

e^{i\theta}

=

\cos\theta

+

i\sin\theta

\`\`\`

效果：

$$

e^{i\theta}

=

\cos\theta

+

i\sin\theta

$$

特殊情况：

\`\`\`latex

e^{i\pi}+1=0

\`\`\`

效果：

$$

e^{i\pi}+1=0

$$

---

# 86. 泰勒展开

\`\`\`latex

f(x)

=

\sum_{n=0}^{\infty}

\frac{f^{(n)}(a)}

{n!}

(x-a)^n

\`\`\`

效果：

$$

f(x)

=

\sum_{n=0}^{\infty}

\frac{f^{(n)}(a)}

{n!}

(x-a)^n

$$

## 麦克劳林展开

\`\`\`latex

f(x)

=

\sum_{n=0}^{\infty}

\frac{f^{(n)}(0)}

{n!}

x^n

\`\`\`

效果：

$$

f(x)

=

\sum_{n=0}^{\infty}

\frac{f^{(n)}(0)}

{n!}

x^n

$$

---

# 87. 常见函数展开

## 指数函数

\`\`\`latex

e^x

=

\sum_{n=0}^{\infty}

\frac{x^n}{n!}

\`\`\`

效果：

$$

e^x

=

\sum_{n=0}^{\infty}

\frac{x^n}{n!}

$$

## 正弦函数

\`\`\`latex

\sin x

=

\sum_{n=0}^{\infty}

(-1)^n

\frac{x^{2n+1}}

{(2n+1)!}

\`\`\`

效果：

$$

\sin x

=

\sum_{n=0}^{\infty}

(-1)^n

\frac{x^{2n+1}}

{(2n+1)!}

$$

## 余弦函数

\`\`\`latex

\cos x

=

\sum_{n=0}^{\infty}

(-1)^n

\frac{x^{2n}}

{(2n)!}

\`\`\`

效果：

$$

\cos x

=

\sum_{n=0}^{\infty}

(-1)^n

\frac{x^{2n}}

{(2n)!}

$$

---

# 88. 渐近关系

## 渐近等价

\`\`\`latex

f(x)\sim g(x)

\`\`\`

效果：

$$

f(x)\sim g(x)

$$

## 大 O

\`\`\`latex

f(x)=O(g(x))

\`\`\`

效果：

$$

f(x)=O(g(x))

$$

## 小 o

\`\`\`latex

f(x)=o(g(x))

\`\`\`

效果：

$$

f(x)=o(g(x))

$$

---

# 89. 上确界与下确界

\`\`\`latex

\sup A

\`\`\`

效果：

$$

\sup A

$$

\`\`\`latex

\inf A

\`\`\`

效果：

$$

\inf A

$$

带条件：

\`\`\`latex

\sup_{x\in A}f(x)

\`\`\`

效果：

$$

\sup_{x\in A}f(x)

$$

\`\`\`latex

\inf_{x\in A}f(x)

\`\`\`

效果：

$$

\inf_{x\in A}f(x)

$$

---

# 90. 极值

\`\`\`latex

\max_{x\in A}f(x)

\`\`\`

效果：

$$

\max_{x\in A}f(x)

$$

\`\`\`latex

\min_{x\in A}f(x)

\`\`\`

效果：

$$

\min_{x\in A}f(x)

$$

---

# 91. 公式编号

\`\`\`latex

\begin{equation}

E=mc^2

\end{equation}

\`\`\`

## 添加标签

\`\`\`latex

\begin{equation}

E=mc^2

\label{eq:energy}

\end{equation}

\`\`\`

## 引用公式

\`\`\`latex

由式\~\eqref{eq:energy} 可知……

\`\`\`

---

# 92. 多行公式分别编号

\`\`\`latex

\begin{align}

a &= b+c

\label{eq:first}\\

d &= e+f

\label{eq:second}

\end{align}

\`\`\`

---

# 93. 手动指定公式编号

\`\`\`latex

\begin{equation}

E=mc^2

\tag{1}

\end{equation}

\`\`\`

---

# 94. 章节结构

\`\`\`latex

\section{Introduction}

\subsection{Model}

\subsubsection{Estimation}

\`\`\`

中文：

\`\`\`latex

\section{引言}

\subsection{模型}

\subsubsection{参数估计}

\`\`\`

---

# 95. 数学环境中的文字

推荐：

\`\`\`latex

\text{if}

\text{otherwise}

\text{for}

\text{where}

\`\`\`

例如：

\`\`\`latex

f(x)=

\begin{cases}

x^2, & \text{if }x\ge0,\\

0, & \text{otherwise}.

\end{cases}

\`\`\`

效果：

$$

f(x)=

\begin{cases}

x^2, & \text{if }x\ge0,\\

0, & \text{otherwise}.

\end{cases}

$$

---

# 96. 单位

变量默认是数学斜体，单位通常推荐正体。

\`\`\`latex

10\,\mathrm{kg}

\`\`\`

效果：

$$

10\,\mathrm{kg}

$$

\`\`\`latex

20\,\mathrm{m/s}

\`\`\`

效果：

$$

20\,\mathrm{m/s}

$$

\`\`\`latex

30^\circ\mathrm{C}

\`\`\`

效果：

$$

30^\circ\mathrm{C}

$$

---

# 97. 度数

\`\`\`latex

90^\circ

\`\`\`

效果：

$$

90^\circ

$$

---

# 98. 百分号

在正式 LaTeX 中 \`%\` 是注释符，因此显示百分号需要：

\`\`\`latex

50\%

\`\`\`

效果：

$$

50\%

$$

---

# 99. 常见特殊字符转义

以下字符在 LaTeX 中具有特殊含义：

\`\`\`text

# $ % & _ { } \~ ^ \

\`\`\`

常见转义：

| 想显示 | 写法 |

|---|---|

| \`%\` | \`\%\` |

| \`$\` | \`\$\` |

| \`&\` | \`\&\` |

| \`_\` | \`\_\` |

| \`#\` | \`\#\` |

| \`{\` | \`\{\` |

| \`}\` | \`\}\` |

---

# 100. 中文 LaTeX 最小模板

\`\`\`latex

\documentclass[UTF8]{ctexart}

\usepackage{amsmath}

\usepackage{amssymb}

\usepackage{amsfonts}

\usepackage{bm}

\usepackage{mathtools}

\title{数学学习笔记}

\author{Your Name}

\date{\today}

\begin{document}

\maketitle

\tableofcontents

\section{极限}

设函数

\[

f(x)=\frac{\sin x}{x}.

\]

则

\[

\lim_{x\to0}

\frac{\sin x}{x}

=

1.

\]

\section{线性代数}

\[

A=

\begin{pmatrix}

1 & 2\\

3 & 4

\end{pmatrix}.

\]

\end{document}

\`\`\`

---

# 101. 常用数学宏包

\`\`\`latex

\usepackage{amsmath}

\usepackage{amssymb}

\usepackage{amsfonts}

\usepackage{bm}

\usepackage{mathtools}

\`\`\`

| 宏包 | 用途 |

|---|---|

| \`amsmath\` | 多行公式、公式环境 |

| \`amssymb\` | 更多数学符号 |

| \`amsfonts\` | \`\mathbb\` 等数学字体 |

| \`bm\` | 数学粗体 |

| \`mathtools\` | 对 \`amsmath\` 的增强 |

---

# 102. Jupyter Notebook 中使用 LaTeX

## 行内公式

\`\`\`markdown

这是一个行内公式：$f(x)=x^2$。

\`\`\`

## 独立公式

\`\`\`markdown

$$

f(x)=x^2

$$

\`\`\`

## 多行公式

\`\`\`markdown

$$

\begin{aligned}

f(x)

&=(x+1)^2\\

&=x^2+2x+1

\end{aligned}

$$

\`\`\`

---

# 103. 完整 \`.tex\` 文件基本结构

\`\`\`latex

\documentclass{article}

\usepackage{amsmath}

\usepackage{amssymb}

\title{Title}

\author{Author}

\date{\today}

\begin{document}

\maketitle

\section{Introduction}

Text.

\section{Methods}

\[

y=\beta_0+\beta_1x+\varepsilon

\]

\end{document}

\`\`\`

---

# 104. XeLaTeX 编译

\`\`\`bash

xelatex filename.tex

\`\`\`

中文文档推荐使用 XeLaTeX 或 LuaLaTeX。

---

# 105. 常见错误

## 错误：多字符指数不加花括号

不推荐：

\`\`\`latex

x^10

\`\`\`

推荐：

\`\`\`latex

x^{10}

\`\`\`

效果：

$$

x^{10}

$$

## 错误：多字符下标不加花括号

不推荐：

\`\`\`latex

x_10

\`\`\`

推荐：

\`\`\`latex

x_{10}

\`\`\`

效果：

$$

x_{10}

$$

## 错误：\`\left\` 与 \`\right\` 不配对

错误：

\`\`\`latex

\left(x+1

\`\`\`

正确：

\`\`\`latex

\left(x+1\right)

\`\`\`

## 错误：矩阵忘记 \`&\`

错误：

\`\`\`latex

\begin{pmatrix}

1 2

3 4

\end{pmatrix}

\`\`\`

正确：

\`\`\`latex

\begin{pmatrix}

1 & 2\\

3 & 4

\end{pmatrix}

\`\`\`

## 错误：普通字母代替函数命令

不推荐：

\`\`\`latex

sin(x)

\`\`\`

推荐：

\`\`\`latex

\sin(x)

\`\`\`

效果：

$$

\sin(x)

$$

## 错误：正文全部放入数学模式

不推荐：

\`\`\`markdown

$x>0 时函数递增$

\`\`\`

推荐：

\`\`\`markdown

当 $x>0$ 时，函数递增。

\`\`\`

---

# 106. 一页式超级速查表

## 上下标

\`\`\`latex

x_i

x_{ij}

x^2

x^{10}

x_i^2

x_{ij}^{(k)}

\`\`\`

## 分数与根号

\`\`\`latex

\frac{a}{b}

\sqrt{x}

\sqrt[n]{x}

\`\`\`

## 括号

\`\`\`latex

\left( ... \right)

\left[ ... \right]

\left\{ ... \right\}

\lvert x\rvert

\lVert x\rVert

\`\`\`

## 求和、连乘、积分、极限

\`\`\`latex

\sum_{i=1}^{n}x_i

\prod_{i=1}^{n}x_i

\int_a^b f(x)\,dx

\lim_{x\to a}f(x)

\`\`\`

## 小写希腊字母

\`\`\`latex

\alpha

\beta

\gamma

\delta

\epsilon

\varepsilon

\zeta

\eta

\theta

\vartheta

\iota

\kappa

\lambda

\mu

\nu

\xi

\pi

\varpi

\rho

\varrho

\sigma

\varsigma

\tau

\upsilon

\phi

\varphi

\chi

\psi

\omega

\`\`\`

## 大写希腊字母

\`\`\`latex

\Gamma

\Delta

\Theta

\Lambda

\Xi

\Pi

\Sigma

\Upsilon

\Phi

\Psi

\Omega

\`\`\`

## 关系

\`\`\`latex

\le

\ge

\neq

\approx

\equiv

\sim

\simeq

\cong

\propto

\`\`\`

## 集合

\`\`\`latex

\in

\notin

\subset

\subseteq

\supset

\supseteq

\cup

\cap

\setminus

\varnothing

\`\`\`

## 数集

\`\`\`latex

\mathbb{N}

\mathbb{Z}

\mathbb{Q}

\mathbb{R}

\mathbb{C}

\`\`\`

## 逻辑

\`\`\`latex

\forall

\exists

\nexists

\neg

\land

\lor

\Rightarrow

\Leftarrow

\Leftrightarrow

\implies

\iff

\`\`\`

## 箭头

\`\`\`latex

\to

\rightarrow

\leftarrow

\leftrightarrow

\mapsto

\`\`\`

## 常用函数

\`\`\`latex

\sin

\cos

\tan

\cot

\sec

\csc

\arcsin

\arccos

\arctan

\log

\ln

\exp

\max

\min

\sup

\inf

\det

\gcd

\`\`\`

## 自定义函数名

\`\`\`latex

\operatorname{Var}

\operatorname{Cov}

\operatorname{rank}

\operatorname{tr}

\operatorname{diag}

\`\`\`

## 微积分

\`\`\`latex

\frac{dy}{dx}

\frac{d^2y}{dx^2}

\frac{\partial f}{\partial x}

\frac{\partial^2f}

{\partial x\,\partial y}

\nabla f

\nabla^2f

\`\`\`

## 向量

\`\`\`latex

\vec{x}

\mathbf{x}

\boldsymbol{\beta}

\bm{x}

\bm{\beta}

\`\`\`

## 矩阵操作

\`\`\`latex

A^{\mathsf T}

A^{-1}

I_n

\det(A)

\`\`\`

## 圆括号矩阵

\`\`\`latex

\begin{pmatrix}

a & b\\

c & d

\end{pmatrix}

\`\`\`

## 方括号矩阵

\`\`\`latex

\begin{bmatrix}

a & b\\

c & d

\end{bmatrix}

\`\`\`

## 行列式

\`\`\`latex

\begin{vmatrix}

a & b\\

c & d

\end{vmatrix}

\`\`\`

## 分段函数

\`\`\`latex

f(x)=

\begin{cases}

f_1(x), & x<0,\\

f_2(x), & x\ge0.

\end{cases}

\`\`\`

## 方程组

\`\`\`latex

\begin{cases}

x+y=1,\\

x-y=0.

\end{cases}

\`\`\`

## 多行推导

\`\`\`latex

\begin{aligned}

f(x)

&=...\\

&=...\\

&=...

\end{aligned}

\`\`\`

## 数学文字

\`\`\`latex

\text{if}

\text{otherwise}

\text{where}

\mathrm{kg}

\`\`\`

## 概率统计

\`\`\`latex

\Pr(A)

\Pr(A\mid B)

\mathbb{E}[X]

\mathbb{E}[X\mid Y]

\operatorname{Var}(X)

\operatorname{Cov}(X,Y)

X\sim\mathcal{N}(\mu,\sigma^2)

\`\`\`

## 修饰符

\`\`\`latex

\bar{x}

\hat{\theta}

\tilde{x}

\vec{x}

\overline{AB}

\widehat{\theta}

\widetilde{ABC}

\dot{x}

\ddot{x}

\`\`\`

## 组合数学

\`\`\`latex

n!

\binom{n}{k}

\`\`\`

## 数论

\`\`\`latex

a\mid b

a\nmid b

a\equiv b\pmod n

\gcd(a,b)

\`\`\`

## 取整

\`\`\`latex

\lfloor x\rfloor

\lceil x\rceil

\`\`\`

## 渐近分析

\`\`\`latex

f(x)\sim g(x)

f(x)=O(g(x))

f(x)=o(g(x))

\`\`\`

## 极值

\`\`\`latex

\max_{x\in A}f(x)

\min_{x\in A}f(x)

\sup_{x\in A}f(x)

\inf_{x\in A}f(x)

\operatorname\*{arg\,max}_{x\in A}f(x)

\operatorname\*{arg\,min}_{x\in A}f(x)

\`\`\`

---

# 107. 最常复制的数学公式模板

## 平均值

\`\`\`latex

\bar{x}

=

\frac{1}{n}

\sum_{i=1}^{n}x_i

\`\`\`

## 样本方差

\`\`\`latex

s^2

=

\frac{1}{n-1}

\sum_{i=1}^{n}

(x_i-\bar{x})^2

\`\`\`

## 标准差

\`\`\`latex

s

=

\sqrt{

\frac{1}{n-1}

\sum_{i=1}^{n}

(x_i-\bar{x})^2

}

\`\`\`

## 正态分布

\`\`\`latex

X\sim\mathcal{N}(\mu,\sigma^2)

\`\`\`

## 正态分布密度

\`\`\`latex

f(x)

=

\frac{1}{\sigma\sqrt{2\pi}}

\exp\left(

-\frac{(x-\mu)^2}{2\sigma^2}

\right)

\`\`\`

## 条件概率

\`\`\`latex

\Pr(A\mid B)

=

\frac{\Pr(A\cap B)}

{\Pr(B)}

\`\`\`

## 相关系数

\`\`\`latex

\rho_{XY}

=

\frac{

\operatorname{Cov}(X,Y)

}{

\sigma_X\sigma_Y

}

\`\`\`

## 线性回归

\`\`\`latex

y_i

=

\beta_0

+

\beta_1x_i

+

\varepsilon_i

\`\`\`

## 矩阵线性回归

\`\`\`latex

\mathbf{y}

=

\mathbf{X}

\boldsymbol{\beta}

+

\boldsymbol{\varepsilon}

\`\`\`

## 最小二乘闭式解

\`\`\`latex

\hat{\boldsymbol{\beta}}

=

(\mathbf{X}^{\mathsf T}\mathbf{X})^{-1}

\mathbf{X}^{\mathsf T}\mathbf{y}

\`\`\`

## 二次方程

\`\`\`latex

x

=

\frac{-b\pm\sqrt{b^2-4ac}}

{2a}

\`\`\`

## 泰勒展开

\`\`\`latex

f(x)

=

\sum_{n=0}^{\infty}

\frac{f^{(n)}(a)}

{n!}

(x-a)^n

\`\`\`

## 梯度

\`\`\`latex

\nabla f

=

\begin{pmatrix}

\frac{\partial f}{\partial x_1}\\

\frac{\partial f}{\partial x_2}\\

\vdots\\

\frac{\partial f}{\partial x_n}

\end{pmatrix}

\`\`\`

## 特征值问题

\`\`\`latex

A\mathbf{v}

=

\lambda\mathbf{v}

\`\`\`

## 特征方程

\`\`\`latex

\det(A-\lambda I)=0

\`\`\`
