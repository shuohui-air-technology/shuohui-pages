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
> 面向数学学习、Jupyter Notebook、Markdown、Hugo 博客与科研写作的 LaTeX 数学公式速查表。

# 0. 最常用结构

## 上下标

代码：

```plain
 x_i
 x^2
 x_i^2
 x_{ij}^{(k)}
```

效果：

$$
x_i,\qquad x^2,\qquad x_i^2,\qquad x_{ij}^{(k)}
$$

## 分数

```plain
 \frac{a}{b}
```

效果：

$$
\frac{a}{b}
$$

## 根号

```plain
 \sqrt{x}
```

效果：

$$
\sqrt{x}
$$

## 求和

```plain
 \sum_{i=1}^{n}x_i
```

效果：

$$
\sum_{i=1}^{n}x_i
$$

## 积分

```plain
 \int_a^b f(x)\,dx
```

效果：

$$
\int_a^b f(x),dx
$$

## 极限

```plain
 \lim_{x\to0}f(x)
```

效果：

$$
\lim_{x\to0}f(x)
$$

## 自动大小括号

```plain
 \left(\frac{a}{b}\right)
```

效果：

$$
\left(\frac{a}{b}\right)
$$

## 分段函数

```plain
 f(x)=
 \begin{cases}
 x^2, & x\ge0,\
 -x, & x<0.
 \end{cases}
```

效果：

$$
f(x)= 
$$

# 1. 公式模式

## 行内公式

源码：

```plain
函数 
```

效果：

函数 f(x)=x^2 在 x=0 处取得最小值。

## 独立公式

源码：

```plain
$$
f(x)=x^2
$$
```

效果：

$$
f(x)=x^2
$$

## 正式 LaTeX 文档中的独立公式

```plain
\[
f(x)=x^2
\]
```

## 带编号公式

```plain
\begin{equation}
f(x)=x^2
\end{equation}
```

# 2. 上标与下标

## 下标

```plain
x_i
x_{ij}
x_{n+1}
a_{12}
```

效果：

$$
x_i,\qquad x_{ij},\qquad x_{n+1},\qquad a_{12}
$$

## 上标

```plain
x^2
x^{10}
e^{x+1}
a^{n+1}
```

效果：

$$
x^2,\qquad x^{10},\qquad e^{x+1},\qquad a^{n+1}
$$

## 同时使用

```plain
x_i^2
x_{ij}^{(k)}
a_n^{m+1}
```

效果：

$$
x_i^2,\qquad x_{ij}^{(k)},\qquad a_n^{m+1}
$$

> 多字符上下标建议始终使用 `{}`，例如 `x^{10}`、`x_{10}`。

# 3. 分数

## 普通分数

```plain
\frac{a}{b}
```

效果：

$$
\frac{a}{b}
$$

## 嵌套分数

```plain
\frac{1}{1+\frac{1}{x}}
```

效果：

$$
\frac{1}{1+\frac{1}{x}}
$$

## 导数

```plain
\frac{dy}{dx}
```

效果：

$$
\frac{dy}{dx}
$$

## 二阶导数

```plain
\frac{d^2y}{dx^2}
```

效果：

$$
\frac{d^2y}{dx^2}
$$

## 偏导数

```plain
\frac{\partial f}{\partial x}
```

效果：

$$
\frac{\partial f}{\partial x}
$$

## 混合偏导

```plain
\frac{\partial^2 f}{\partial x\,\partial y}
```

效果：

$$
\frac{\partial^2 f}{\partial x,\partial y}
$$

# 4. 根号

```plain
\sqrt{x}
\sqrt{x^2+y^2}
\sqrt[n]{x}
\sqrt[3]{8}
```

效果：

$$
\sqrt{x},\qquad \sqrt{x^2+y^2},\qquad \sqrt[n]{x},\qquad \sqrt[3]{8}
$$

# 5. 括号与定界符

## 普通括号

```plain
(a+b)
[a+b]
\{a+b\}
```

效果：

$$
(a+b),\qquad [a+b],\qquad {a+b}
$$

## 自动调整大小

```plain
\left(\frac{a}{b}\right)
```

效果：

$$
\left(\frac{a}{b}\right)
$$

```plain
\left[
\frac{a+b}{c+d}
\right]
```

效果：

$$
\left[ \frac{a+b}{c+d} \right]
$$

```plain
\left\{
\frac{x+1}{x-1}
\right\}
```

效果：

$$
\left{ \frac{x+1}{x-1} \right}
$$

## 绝对值

```plain
\lvert x\rvert
```

效果：

$$
\lvert x\rvert
$$

## 范数

```plain
\lVert x\rVert
\lVert \mathbf{x}\rVert_1
\lVert \mathbf{x}\rVert_2
\lVert \mathbf{x}\rVert_\infty
```

效果：

$$
\lVert x\rVert,\qquad \lVert \mathbf{x}\rVert_1,\qquad \lVert \mathbf{x}\rVert_2,\qquad \lVert \mathbf{x}\rVert_\infty
$$

## 单边定界符

```plain
\left.
\frac{d}{dx}f(x)
\right|_{x=0}
```

效果：

$$
\left. \frac{d}{dx}f(x) \right|_{x=0}
$$

`.` 表示不可见定界符。

# 6. 分段函数与方程组

## 分段函数

```plain
f(x)=
\begin{cases}
x^2, & x\ge0,\
-x, & x<0.
\end{cases}
```

效果：

$$
f(x)= 
$$

## 三段函数

```plain
f(x)=
\begin{cases}
-1, & x<0,\
0, & x=0,\
1, & x>0.
\end{cases}
```

效果：

$$
f(x)= 
$$

## 方程组

```plain
\begin{cases}
x+y=3,\
2x-y=0.
\end{cases}
```

效果：

$$
\begin{cases} x+y=3,\ 2x-y=0. \end{cases}
$$

## 带文字说明

```plain
\begin{cases}
x+y=3, & \text{第一式},\
2x-y=0, & \text{第二式}.
\end{cases}
```

效果：

$$
\begin{cases} x+y=3, & \text{第一式},\ 2x-y=0, & \text{第二式}. \end{cases}
$$

# 7. 希腊字母

## 小写希腊字母

| 名称 | 代码 | 渲染 |
| --- | --- | --- |
| alpha | `\alpha` | \alpha |
| beta | `\beta` | \beta |
| gamma | `\gamma` | \gamma |
| delta | `\delta` | \delta |
| epsilon | `\epsilon` | \epsilon |
| varepsilon | `\varepsilon` | \varepsilon |
| zeta | `\zeta` | \zeta |
| eta | `\eta` | \eta |
| theta | `\theta` | \theta |
| vartheta | `\vartheta` | \vartheta |
| iota | `\iota` | \iota |
| kappa | `\kappa` | \kappa |
| lambda | `\lambda` | \lambda |
| mu | `\mu` | \mu |
| nu | \`\nu\` | u |
| xi | `\xi` | \xi |
| pi | `\pi` | \pi |
| varpi | `\varpi` | \varpi |
| rho | `\rho` | \rho |
| varrho | `\varrho` | \varrho |
| sigma | `\sigma` | \sigma |
| varsigma | `\varsigma` | \varsigma |
| tau | `\tau` | \tau |
| upsilon | `\upsilon` | \upsilon |
| phi | `\phi` | \phi |
| varphi | `\varphi` | \varphi |
| chi | `\chi` | \chi |
| psi | `\psi` | \psi |
| omega | `\omega` | \omega |

## 大写希腊字母

| 名称 | 代码 | 渲染 |
| --- | --- | --- |
| Gamma | `\Gamma` | \Gamma |
| Delta | `\Delta` | \Delta |
| Theta | `\Theta` | \Theta |
| Lambda | `\Lambda` | \Lambda |
| Xi | `\Xi` | \Xi |
| Pi | `\Pi` | \Pi |
| Sigma | `\Sigma` | \Sigma |
| Upsilon | `\Upsilon` | \Upsilon |
| Phi | `\Phi` | \Phi |
| Psi | `\Psi` | \Psi |
| Omega | `\Omega` | \Omega |

部分大写希腊字母与拉丁字母外形相同，通常直接输入：

| 希腊字母 | 输入 |
| --- | --- |
| Alpha | `A` |
| Beta | `B` |
| Epsilon | `E` |
| Zeta | `Z` |
| Eta | `H` |
| Iota | `I` |
| Kappa | `K` |
| Mu | `M` |
| Nu | `N` |
| Omicron | `O` |
| Rho | `P` |
| Tau | `T` |
| Chi | `X` |

# 8. 求和、连乘、积分与极限

## 求和

```plain
\sum_{i=1}^{n}x_i
```

效果：

$$
\sum_{i=1}^{n}x_i
$$

## 双重求和

```plain
\sum_{i=1}^{m}\sum_{j=1}^{n}a_{ij}
```

效果：

$$
\sum_{i=1}^{m}\sum_{j=1}^{n}a_{ij}
$$

## 无限级数

```plain
\sum_{n=0}^{\infty}\frac{x^n}{n!}
```

效果：

$$
\sum_{n=0}^{\infty}\frac{x^n}{n!}
$$

## 连乘

```plain
\prod_{i=1}^{n}x_i
```

效果：

$$
\prod_{i=1}^{n}x_i
$$

## 不定积分

```plain
\int f(x)\,dx
```

效果：

$$
\int f(x),dx
$$

## 定积分

```plain
\int_a^b f(x)\,dx
```

效果：

$$
\int_a^b f(x),dx
$$

## 二重积分

```plain
\iint_D f(x,y)\,dx\,dy
```

效果：

$$
\iint_D f(x,y),dx,dy
$$

## 三重积分

```plain
\iiint_V f(x,y,z)\,dV
```

效果：

$$
\iiint_V f(x,y,z),dV
$$

## 环路积分

```plain
\oint_C \mathbf{F}\cdot d\mathbf{r}
```

效果：

$$
\oint_C \mathbf{F}\cdot d\mathbf{r}
$$

## 极限

```plain
\lim_{x\to0}f(x)
\lim_{x\to0^+}f(x)
\lim_{x\to0^-}f(x)
\lim_{n\to\infty}a_n
```

效果：

$$
\lim_{x\to0}f(x),\qquad \lim_{x\to0^+}f(x),\qquad \lim_{x\to0^-}f(x),\qquad \lim_{n\to\infty}a_n
$$

# 9. 关系符号

| 代码 | 渲染 | 含义 |
| --- | --- | --- |
| `<` | < | 小于 |
| `>` | > | 大于 |
| `=` | = | 等于 |
| `\le` | \le | 小于等于 |
| `\ge` | \ge | 大于等于 |
| \`\neq\` | eq | 不等于 |
| `\approx` | \approx | 约等于 |
| `\equiv` | \equiv | 恒等 / 同余 |
| `\sim` | \sim | 相似 / 渐近 / 服从 |
| `\simeq` | \simeq | 近似 |
| `\cong` | \cong | 全等 / 同构 |
| `\propto` | \propto | 正比于 |
| `\ll` | \ll | 远小于 |
| `\gg` | \gg | 远大于 |

# 10. 集合

## 集合关系

| 代码 | 渲染 | 含义 |
| --- | --- | --- |
| `\in` | \in | 属于 |
| \`\notin\` | otin | 不属于 |
| \`\ni\` | i | 包含某元素 |
| `\subset` | \subset | 真子集 |
| `\subseteq` | \subseteq | 子集 |
| `\supset` | \supset | 真超集 |
| `\supseteq` | \supseteq | 超集 |
| `\cup` | \cup | 并集 |
| `\cap` | \cap | 交集 |
| `\setminus` | \setminus | 集合差 |
| `\varnothing` | \varnothing | 空集 |

## 常用数集

| 代码 | 渲染 | 含义 |
| --- | --- | --- |
| `\mathbb{N}` | \mathbb{N} | 自然数 |
| `\mathbb{Z}` | \mathbb{Z} | 整数 |
| `\mathbb{Q}` | \mathbb{Q} | 有理数 |
| `\mathbb{R}` | \mathbb{R} | 实数 |
| `\mathbb{C}` | \mathbb{C} | 复数 |

## 集合描述法

```plain
A=\{x\in\mathbb{R}\mid x>0\}
```

效果：

$$
A={x\in\mathbb{R}\mid x>0}
$$

## 区间

```plain
(a,b)
[a,b]
(a,b]
[a,b)
(-\infty,a]
[a,\infty)
```

效果：

$$
(a,b),\quad [a,b],\quad (a,b],\quad [a,b),\quad (-\infty,a],\quad [a,\infty)
$$

# 11. 逻辑与箭头

## 逻辑符号

| 代码 | 渲染 | 含义 |
| --- | --- | --- |
| `\forall` | \forall | 任意 |
| `\exists` | \exists | 存在 |
| \`\nexists\` | exists | 不存在 |
| \`\neg\` | eg | 非 |
| `\land` | \land | 且 |
| `\lor` | \lor | 或 |

## 蕴含与等价

| 代码 | 渲染 | 含义 |
| --- | --- | --- |
| `\Rightarrow` | \Rightarrow | 推出 |
| `\Leftarrow` | \Leftarrow | 由右推出左 |
| `\Leftrightarrow` | \Leftrightarrow | 等价 |
| `\implies` | \implies | 蕴含 |
| `\iff` | \iff | 当且仅当 |

## 箭头

| 代码 | 渲染 |
| --- | --- |
| `\to` | \to |
| `\rightarrow` | \rightarrow |
| `\leftarrow` | \leftarrow |
| `\leftrightarrow` | \leftrightarrow |
| `\mapsto` | \mapsto |
| `\uparrow` | \uparrow |
| `\downarrow` | \downarrow |
| \`\nearrow\` | earrow |
| `\searrow` | \searrow |

函数映射：

```plain
f:A\to B
```

效果：

$$
f:A\to B
$$

```plain
x\mapsto x^2
```

效果：

$$
x\mapsto x^2
$$

# 12. 常见运算符号

| 代码 | 渲染 |
| --- | --- |
| `+` | + |
| `-` | - |
| `\pm` | \pm |
| `\mp` | \mp |
| `\times` | \times |
| `\div` | \div |
| `\cdot` | \cdot |
| `\ast` | \ast |
| `\circ` | \circ |

# 13. 省略号

| 代码 | 渲染 | 用途 |
| --- | --- | --- |
| `\dots` | \dots | 一般省略 |
| `\ldots` | \ldots | 低位置横向省略 |
| `\cdots` | \cdots | 居中横向省略 |
| `\vdots` | \vdots | 纵向省略 |
| `\ddots` | \ddots | 对角省略 |

示例：

```plain
x_1,x_2,\dots,x_n
```

效果：

$$
x_1,x_2,\dots,x_n
$$

# 14. 常用函数

数学函数名推荐使用专用命令，而不是直接输入普通字母。

| 代码 | 渲染 |
| --- | --- |
| `\sin x` | \sin x |
| `\cos x` | \cos x |
| `\tan x` | \tan x |
| `\cot x` | \cot x |
| `\sec x` | \sec x |
| `\csc x` | \csc x |
| `\arcsin x` | \arcsin x |
| `\arccos x` | \arccos x |
| `\arctan x` | \arctan x |
| `\log x` | \log x |
| `\ln x` | \ln x |
| `\exp x` | \exp x |
| `\max x` | \max x |
| `\min x` | \min x |
| `\sup x` | \sup x |
| `\inf x` | \inf x |
| `\det A` | \det A |
| `\gcd(a,b)` | \gcd(a,b) |

## 自定义函数名

```plain
\operatorname{rank}(A)
\operatorname{diag}(A)
\operatorname{tr}(A)
\operatorname{Var}(X)
\operatorname{Cov}(X,Y)
```

效果：

$$
\operatorname{rank}(A),\qquad \operatorname{diag}(A),\qquad \operatorname{tr}(A),\qquad \operatorname{Var}(X),\qquad \operatorname{Cov}(X,Y)
$$

# 15. 最大值、最小值、argmax 与 argmin

```plain
\max_{x\in A}f(x)
\min_{x\in A}f(x)
\sup_{x\in A}f(x)
\inf_{x\in A}f(x)
```

效果：

$$
\max_{x\in A}f(x),\qquad \min_{x\in A}f(x),\qquad \sup_{x\in A}f(x),\qquad \inf_{x\in A}f(x)
$$

## argmax

```plain
\operatorname*{arg\,max}_{x\in A}f(x)
```

效果：

$$
\operatorname\*{arg,max}_{x\in A}f(x)
$$

## argmin

```plain
\operatorname*{arg\,min}_{x\in A}f(x)
```

效果：

$$
\operatorname\*{arg,min}_{x\in A}f(x)
$$

正式文档可以定义：

```plain
\DeclareMathOperator*{\argmax}{arg\,max}
\DeclareMathOperator*{\argmin}{arg\,min}
```

之后直接写：

```plain
\argmax_{\theta}L(\theta)
```

# 16. 微积分

## 导数

```plain
f'(x)
f''(x)
f^{(n)}(x)
```

效果：

$$
f'(x),\qquad f''(x),\qquad f^{(n)}(x)
$$

## Leibniz 记号

```plain
\frac{df}{dx}
\frac{d^2f}{dx^2}
```

效果：

$$
\frac{df}{dx},\qquad \frac{d^2f}{dx^2}
$$

## 偏导数

```plain
\frac{\partial f}{\partial x}
\frac{\partial^2f}{\partial x^2}
\frac{\partial^2f}{\partial x\,\partial y}
```

效果：

$$
\frac{\partial f}{\partial x},\qquad \frac{\partial^2f}{\partial x^2},\qquad \frac{\partial^2f}{\partial x,\partial y}
$$

## 梯度

```plain
\nabla f
```

效果：

$$
\nabla f
$$

```plain
\nabla f(x,y)
=
\begin{pmatrix}
\frac{\partial f}{\partial x}\
\frac{\partial f}{\partial y}
\end{pmatrix}
```

效果：

$$
\nabla f(x,y) = 
$$

## 拉普拉斯算子

```plain
\nabla^2f
=
\frac{\partial^2f}{\partial x^2}
+
\frac{\partial^2f}{\partial y^2}
```

效果：

$$
\nabla^2f = \frac{\partial^2f}{\partial x^2} + \frac{\partial^2f}{\partial y^2}
$$

# 17. 向量与矩阵

## 向量

```plain
\vec{x}
\mathbf{x}
```

效果：

$$
\vec{x},\qquad \mathbf{x}
$$

## 粗体希腊字母

```plain
\boldsymbol{\beta}
```

效果：

$$
\boldsymbol{\beta}
$$

加载：

```plain
\usepackage{bm}
```

之后可以写：

```plain
\bm{x}
\bm{\beta}
\bm{\Sigma}
```

效果：

$$
\bm{x},\qquad \bm{\beta},\qquad \bm{\Sigma}
$$

## 内积

```plain
\mathbf{x}^{\mathsf T}\mathbf{y}
```

效果：

$$
\mathbf{x}^{\mathsf T}\mathbf{y}
$$

```plain
\langle x,y\rangle
```

效果：

$$
\langle x,y\rangle
$$

# 18. 矩阵环境

## 圆括号矩阵

```plain
A=
\begin{pmatrix}
1 & 2\
3 & 4
\end{pmatrix}
```

效果：

$$
A= 
$$

## 方括号矩阵

```plain
A=
\begin{bmatrix}
1 & 2\
3 & 4
\end{bmatrix}
```

效果：

$$
A= 
$$

## 不同矩阵环境

| 环境 | 含义 |
| --- | --- |
| `matrix` | 无括号 |
| `pmatrix` | 圆括号 |
| `bmatrix` | 方括号 |
| `Bmatrix` | 花括号 |
| `vmatrix` | 单竖线 |
| `Vmatrix` | 双竖线 |

矩阵中：

```plain
&   % 分列
\  % 换行
```

# 19. 行列式与一般矩阵

## 行列式

```plain
\begin{vmatrix}
a & b\
c & d
\end{vmatrix}
```

效果：

$$
\begin{vmatrix} a & b\ c & d \end{vmatrix}
$$

也可以：

```plain
\det(A)
```

效果：

$$
\det(A)
$$

## 一般矩阵

```plain
A=
\begin{pmatrix}
a_{11} & \cdots & a_{1n}\
\vdots & \ddots & \vdots\
a_{m1} & \cdots & a_{mn}
\end{pmatrix}
```

效果：

$$
A= 
$$

## 列向量

```plain
\mathbf{x}
=
\begin{pmatrix}
x_1\
x_2\
\vdots\
x_n
\end{pmatrix}
```

效果：

$$
\mathbf{x} = 
$$

# 20. 矩阵操作

## 转置

```plain
A^{\mathsf T}
```

效果：

$$
A^{\mathsf T}
$$

## 逆矩阵

```plain
A^{-1}
```

效果：

$$
A^{-1}
$$

## 单位矩阵

```plain
I_n
```

效果：

$$
I_n
$$

## 特征值与特征向量

```plain
A\mathbf{v}
=
\lambda\mathbf{v}
```

效果：

$$
A\mathbf{v} = \lambda\mathbf{v}
$$

## 特征方程

```plain
\det(A-\lambda I)=0
```

效果：

$$
\det(A-\lambda I)=0
$$

# 21. 多行公式

## align

```plain
\begin{align}
(a+b)^2
&=a^2+2ab+b^2\
&=a(a+b)+b(a+b)\
&=(a+b)(a+b)
\end{align}
```

其中：

```plain
&
```

用于指定对齐位置。

换行：

```plain
\
```

## 不编号

```plain
\begin{align*}
(a+b)^2
&=a^2+2ab+b^2\
&=(a+b)(a+b)
\end{align*}
```

## Jupyter / MathJax 常用 aligned

```plain
$$
\begin{aligned}
f(x)
&=(x+1)^2\
&=x^2+2x+1
\end{aligned}
$$
```

效果：

$$
\begin{aligned} f(x) &=(x+1)^2\ &=x^2+2x+1 \end{aligned}
$$

# 22. 修饰符

| 代码 | 渲染 |
| --- | --- |
| `\bar{x}` | \bar{x} |
| `\overline{AB}` | \overline{AB} |
| `\hat{\theta}` | \hat{\theta} |
| `\widehat{\theta}` | \widehat{\theta} |
| `\tilde{x}` | \tilde{x} |
| `\widetilde{ABC}` | \widetilde{ABC} |
| `\vec{x}` | \vec{x} |
| `\dot{x}` | \dot{x} |
| `\ddot{x}` | \ddot{x} |

# 23. 概率统计

## 正态分布

```plain
X\sim\mathcal{N}(\mu,\sigma^2)
```

效果：

$$
X\sim\mathcal{N}(\mu,\sigma^2)
$$

## 正态分布密度函数

```plain
f(x)
=
\frac{1}{\sigma\sqrt{2\pi}}
\exp\left(
-\frac{(x-\mu)^2}{2\sigma^2}
\right)
```

效果：

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\left( -\frac{(x-\mu)^2}{2\sigma^2} \right)
$$

## 概率

```plain
\Pr(A)
```

效果：

$$
\Pr(A)
$$

## 条件概率

```plain
\Pr(A\mid B)
=
\frac{\Pr(A\cap B)}
{\Pr(B)}
```

效果：

$$
\Pr(A\mid B) = \frac{\Pr(A\cap B)} {\Pr(B)}
$$

## 期望

```plain
\mathbb{E}[X]
```

效果：

$$
\mathbb{E}[X]
$$

## 条件期望

```plain
\mathbb{E}[X\mid Y]
```

效果：

$$
\mathbb{E}[X\mid Y]
$$

## 方差

```plain
\operatorname{Var}(X)
=
\mathbb{E}
\left[
(X-\mu)^2
\right]
```

效果：

$$
\operatorname{Var}(X) = \mathbb{E} \left[ (X-\mu)^2 \right]
$$

## 协方差

```plain
\operatorname{Cov}(X,Y)
=
\mathbb{E}
\left[
(X-\mu_X)(Y-\mu_Y)
\right]
```

效果：

$$
\operatorname{Cov}(X,Y) = \mathbb{E} \left[ (X-\mu_X)(Y-\mu_Y) \right]
$$

## 样本均值

```plain
\bar{x}
=
\frac{1}{n}
\sum_{i=1}^{n}x_i
```

效果：

$$
\bar{x} = \frac{1}{n} \sum_{i=1}^{n}x_i
$$

## 样本方差

```plain
s^2
=
\frac{1}{n-1}
\sum_{i=1}^{n}
(x_i-\bar{x})^2
```

效果：

$$
s^2 = \frac{1}{n-1} \sum_{i=1}^{n} (x_i-\bar{x})^2
$$

## t 统计量

```plain
t
=
\frac{\bar{x}-\mu_0}
{s/\sqrt{n}}
```

效果：

$$
t = \frac{\bar{x}-\mu_0} {s/\sqrt{n}}
$$

## 相关系数

```plain
\rho_{XY}
=
\frac{
\operatorname{Cov}(X,Y)
}{
\sigma_X\sigma_Y
}
```

效果：

$$
\rho_{XY} = \frac{ \operatorname{Cov}(X,Y) }{ \sigma_X\sigma_Y }
$$

# 24. 组合数学与数论

## 二项式系数

```plain
\binom{n}{k}
```

效果：

$$
\binom{n}{k}
$$

## 二项式定理

```plain
(a+b)^n
=
\sum_{k=0}^{n}
\binom{n}{k}
a^{n-k}b^k
```

效果：

$$
(a+b)^n = \sum_{k=0}^{n} \binom{n}{k} a^{n-k}b^k
$$

## 阶乘

```plain
n!
```

效果：

$$
n!
$$

## 同余

```plain
a\equiv b\pmod n
```

效果：

$$
a\equiv b\pmod n
$$

## 整除

```plain
a\mid b
```

效果：

$$
a\mid b
$$

## 不整除

```plain
a\nmid b
```

效果：

$$
a\nmid b
$$

## 最大公约数

```plain
\gcd(a,b)
```

效果：

$$
\gcd(a,b)
$$

# 25. 取整

## 向下取整

```plain
\lfloor x\rfloor
```

效果：

$$
\lfloor x\rfloor
$$

## 向上取整

```plain
\lceil x\rceil
```

效果：

$$
\lceil x\rceil
$$

# 26. 复数

## 虚数单位

```plain
i
```

效果：

$$
i
$$

论文中也常写：

```plain
\mathrm{i}
```

效果：

$$
\mathrm{i}
$$

## 欧拉公式

```plain
e^{i\theta}
=
\cos\theta
+
i\sin\theta
```

效果：

$$
e^{i\theta} = \cos\theta + i\sin\theta
$$

## 欧拉恒等式

```plain
e^{i\pi}+1=0
```

效果：

$$
e^{i\pi}+1=0
$$

## 实部与虚部

```plain
\operatorname{Re}(z)
\operatorname{Im}(z)
```

效果：

$$
\operatorname{Re}(z),\qquad \operatorname{Im}(z)
$$

## 共轭

```plain
\bar{z}
\overline{z_1+z_2}
```

效果：

$$
\bar{z},\qquad \overline{z_1+z_2}
$$

# 27. 数学中的文字与空格

## 数学模式中的文字

```plain
x=1
\quad
\text{if }x>0
```

效果：

$$
x=1 \quad \text{if }x>0
$$

中文：

```plain
x=1
\quad
\text{当 }x>0
```

效果：

$$
x=1 \quad \text{当 }x>0
$$

## 数学空格

| 代码 | 大致大小 |
| --- | --- |
| `\,` | 很小 |
| `\:` | 小 |
| `\;` | 中等 |
| `\quad` | 大 |
| `\qquad` | 很大 |
| `\!` | 负空格 |

积分中推荐：

```plain
\int f(x)\,dx
```

# 28. 数学字体

| 代码 | 渲染 | 常见用途 |
| --- | --- | --- |
| `x` | x | 普通变量 |
| `\mathrm{ABC}` | \mathrm{ABC} | 正体 |
| `\mathbf{x}` | \mathbf{x} | 粗体向量 |
| `\mathbb{R}` | \mathbb{R} | 数集 |
| `\mathcal{L}` | \mathcal{L} | 花体 |
| `\mathfrak{g}` | \mathfrak{g} | Fraktur |
| `\mathsf{ABC}` | \mathsf{ABC} | 无衬线 |
| `\mathtt{ABC}` | \mathtt{ABC} | 打字机字体 |

# 29. 上方与下方说明

## underbrace

```plain
\underbrace{a+b+c}_{3\text{ terms}}
```

效果：

$$
\underbrace{a+b+c}_{3\text{ terms}}
$$

## overbrace

```plain
\overbrace{x+\cdots+x}^{n\text{ times}}
```

效果：

$$
\overbrace{x+\cdots+x}^{n\text{ times}}
$$

## 箭头上写内容

```plain
A\xrightarrow{f}B
```

效果：

$$
A\xrightarrow{f}B
$$

## 等号上写说明

```plain
a
\overset{\text{def}}{=}
b
```

效果：

$$
a \overset{\text{def}}{=} b
$$

# 30. 常见数学公式模板

## 二次方程

```plain
x
=
\frac{-b\pm\sqrt{b^2-4ac}}
{2a}
```

效果：

$$
x = \frac{-b\pm\sqrt{b^2-4ac}} {2a}
$$

## 勾股定理

```plain
a^2+b^2=c^2
```

效果：

$$
a^2+b^2=c^2
$$

## 泰勒展开

```plain
f(x)
=
\sum_{n=0}^{\infty}
\frac{f^{(n)}(a)}
{n!}
(x-a)^n
```

效果：

$$
f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)} {n!} (x-a)^n
$$

## 麦克劳林展开

```plain
f(x)
=
\sum_{n=0}^{\infty}
\frac{f^{(n)}(0)}
{n!}
x^n
```

效果：

$$
f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)} {n!} x^n
$$

# 31. 常见函数展开

## 指数函数

```plain
e^x
=
\sum_{n=0}^{\infty}
\frac{x^n}{n!}
```

效果：

$$
e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!}
$$

## 正弦

```plain
\sin x
=
\sum_{n=0}^{\infty}
(-1)^n
\frac{x^{2n+1}}
{(2n+1)!}
```

效果：

$$
\sin x = \sum_{n=0}^{\infty} (-1)^n \frac{x^{2n+1}} {(2n+1)!}
$$

## 余弦

```plain
\cos x
=
\sum_{n=0}^{\infty}
(-1)^n
\frac{x^{2n}}
{(2n)!}
```

效果：

$$
\cos x = \sum_{n=0}^{\infty} (-1)^n \frac{x^{2n}} {(2n)!}
$$

# 32. 渐近分析

```plain
f(x)\sim g(x)
f(x)=O(g(x))
f(x)=o(g(x))
```

效果：

$$
f(x)\sim g(x),\qquad f(x)=O(g(x)),\qquad f(x)=o(g(x))
$$

# 33. 线性回归

## 标量形式

```plain
y_i
=
\beta_0
+
\beta_1x_i
+
\varepsilon_i
```

效果：

$$
y_i = \beta_0 + \beta_1x_i + \varepsilon_i
$$

## 矩阵形式

```plain
\mathbf{y}
=
\mathbf{X}
\boldsymbol{\beta}
+
\boldsymbol{\varepsilon}
```

效果：

$$
\mathbf{y} = \mathbf{X} \boldsymbol{\beta} + \boldsymbol{\varepsilon}
$$

## 最小二乘

```plain
\hat{\boldsymbol{\beta}}
=
\operatorname*{arg\,min}_{\boldsymbol{\beta}}
\left\|
\mathbf{y}
-
\mathbf{X}\boldsymbol{\beta}
\right\|_2^2
```

效果：

$$
\hat{\boldsymbol{\beta}} = \operatorname\*{arg,min}_{\boldsymbol{\beta}} \left| \mathbf{y} - \mathbf{X}\boldsymbol{\beta} \right|_2^2
$$

## 最小二乘闭式解

```plain
\hat{\boldsymbol{\beta}}
=
(\mathbf{X}^{\mathsf T}\mathbf{X})^{-1}
\mathbf{X}^{\mathsf T}\mathbf{y}
```

效果：

$$
\hat{\boldsymbol{\beta}} = (\mathbf{X}^{\mathsf T}\mathbf{X})^{-1} \mathbf{X}^{\mathsf T}\mathbf{y}
$$

# 34. 公式编号与引用

## 自动编号

```plain
\begin{equation}
E=mc^2
\end{equation}
```

## 标签

```plain
\begin{equation}
E=mc^2
\label{eq:energy}
\end{equation}
```

## 引用

```plain
由式~
```

## 多行分别编号

```plain
\begin{align}
a &= b+c \label{eq:first}\
d &= e+f \label{eq:second}
\end{align}
```

## 手动编号

```plain
\begin{equation}
E=mc^2
\tag{1}
\end{equation}
```

# 35. 章节结构

```plain
\section{Introduction}
\subsection{Model}
\subsubsection{Estimation}
```

中文：

```plain
\section{引言}
\subsection{模型}
\subsubsection{参数估计}
```

# 36. 单位与特殊字符

## 单位

```plain
10\,\mathrm{kg}
20\,\mathrm{m/s}
30^\circ\mathrm{C}
```

效果：

$$
10,\mathrm{kg},\qquad 20,\mathrm{m/s},\qquad 30^\circ\mathrm{C}
$$

## 百分号

```plain
50\%
```

效果：

$$
50%
$$

## 常见特殊字符转义

| 想显示 | 写法 |
| --- | --- |
| `%` | `\%` |
| `$` | `\$` |
| `&` | `\&` |
| `_` | `_` |
| `#` | `\#` |
| `{` | `\{` |
| `}` | `\}` |

# 37. Jupyter / Markdown

## 行内公式

```plain
这是一个行内公式：
```

## 独立公式

```plain
$$
f(x)=x^2
$$
```

## 多行公式

```plain
$$
\begin{aligned}
f(x)
&=(x+1)^2\
&=x^2+2x+1
\end{aligned}
$$
```

# 38. 中文 LaTeX 最小模板

```plain
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
1 & 2\
3 & 4
\end{pmatrix}.
\]

\end{document}
```

# 39. 常用数学宏包

```plain
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{amsfonts}
\usepackage{bm}
\usepackage{mathtools}
```

| 宏包 | 用途 |
| --- | --- |
| `amsmath` | 多行公式、公式环境 |
| `amssymb` | 更多数学符号 |
| `amsfonts` | `\mathbb` 等数学字体 |
| `bm` | 数学粗体 |
| `mathtools` | 增强 `amsmath` |

# 40. 常见错误

## 多字符指数不加花括号

不推荐：

```plain
x^10
```

推荐：

```plain
x^{10}
```

## 多字符下标不加花括号

不推荐：

```plain
x_10
```

推荐：

```plain
x_{10}
```

## `\left` 与 `\right` 不配对

错误：

```plain
\left(x+1
```

正确：

```plain
\left(x+1\right)
```

## 矩阵忘记 `&` 或 `\`

正确：

```plain
\begin{pmatrix}
1 & 2\
3 & 4
\end{pmatrix}
```

## 普通字母代替函数命令

不推荐：

```plain
sin(x)
```

推荐：

```plain
\sin(x)
```

## 正文全部放进数学模式

不推荐：

```plain
$x>0 时函数递增$
```

推荐：

```plain
当 
```

# 41. 一页式超级速查

## 上下标

```plain
x_i
x_{ij}
x^2
x^{10}
x_i^2
x_{ij}^{(k)}
```

## 分数与根号

```plain
\frac{a}{b}
\sqrt{x}
\sqrt[n]{x}
```

## 括号

```plain
\left( ... \right)
\left[ ... \right]
\left\{ ... \right\}
\lvert x\rvert
\lVert x\rVert
```

## 求和、连乘、积分、极限

```plain
\sum_{i=1}^{n}x_i
\prod_{i=1}^{n}x_i
\int_a^b f(x)\,dx
\lim_{x\to a}f(x)
```

## 小写希腊字母

```plain
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
```

## 大写希腊字母

```plain
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
```

## 关系

```plain
\le
\ge
\neq
\approx
\equiv
\sim
\simeq
\cong
\propto
```

## 集合

```plain
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

\mathbb{N}
\mathbb{Z}
\mathbb{Q}
\mathbb{R}
\mathbb{C}
```

## 逻辑

```plain
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
```

## 箭头

```plain
\to
\rightarrow
\leftarrow
\leftrightarrow
\mapsto
```

## 函数

```plain
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

\operatorname{Var}
\operatorname{Cov}
\operatorname{rank}
\operatorname{tr}
\operatorname{diag}
```

## 微积分

```plain
\frac{dy}{dx}
\frac{d^2y}{dx^2}
\frac{\partial f}{\partial x}
\frac{\partial^2f}{\partial x\,\partial y}
\nabla f
\nabla^2f
```

## 向量与矩阵

```plain
\vec{x}
\mathbf{x}
\boldsymbol{\beta}
\bm{x}
\bm{\beta}

A^{\mathsf T}
A^{-1}
I_n
```

## 矩阵

```plain
\begin{pmatrix}
a & b\
c & d
\end{pmatrix}
```

```plain
\begin{bmatrix}
a & b\
c & d
\end{bmatrix}
```

```plain
\begin{vmatrix}
a & b\
c & d
\end{vmatrix}
```

## 分段函数

```plain
f(x)=
\begin{cases}
f_1(x), & x<0,\
f_2(x), & x\ge0.
\end{cases}
```

## 方程组

```plain
\begin{cases}
x+y=1,\
x-y=0.
\end{cases}
```

## 多行推导

```plain
\begin{aligned}
f(x)
&=...\
&=...\
&=...
\end{aligned}
```

## 概率统计

```plain
\Pr(A)
\Pr(A\mid B)

\mathbb{E}[X]
\mathbb{E}[X\mid Y]

\operatorname{Var}(X)
\operatorname{Cov}(X,Y)

X\sim\mathcal{N}(\mu,\sigma^2)
```

## 修饰符

```plain
\bar{x}
\hat{\theta}
\tilde{x}
\vec{x}

\overline{AB}
\widehat{\theta}
\widetilde{ABC}

\dot{x}
\ddot{x}
```

## 组合数学与数论

```plain
n!
\binom{n}{k}

a\mid b
a\nmid b
a\equiv b\pmod n
\gcd(a,b)
```

## 取整

```plain
\lfloor x\rfloor
\lceil x\rceil
```

## 渐近分析

```plain
f(x)\sim g(x)
f(x)=O(g(x))
f(x)=o(g(x))
```

## 极值

```plain
\max_{x\in A}f(x)
\min_{x\in A}f(x)

\sup_{x\in A}f(x)
\inf_{x\in A}f(x)

\operatorname*{arg\,max}_{x\in A}f(x)
\operatorname*{arg\,min}_{x\in A}f(x)
```
