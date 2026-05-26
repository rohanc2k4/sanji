---
title: Tensor Products of Vector Spaces
course: math401
exam: quiz-sp6
topics: [tensor-product, direct-sum, vector-spaces, multi-qubit, quantum]
source_count: 1
sources: [rieffel-section3.pdf]
created: 2026-04-21
last_updated: 2026-04-21
status: needs_review
exam_relevant: true
difficulty: medium
---

The tensor product $V \otimes W$ is how quantum state spaces combine, in contrast to the direct sum $V \oplus W$ used for classical state spaces. Quiz-critical: dimension of tensor product, basis of tensor product given bases for $V$ and $W$, and telling direct sum apart from tensor product. [Source: rieffel-section3.pdf §3.1]

## Details

### Direct sum $V \oplus W$ (classical)

Given $V$ with basis $\{|\alpha_1\rangle, \ldots, |\alpha_n\rangle\}$ and $W$ with basis $\{|\beta_1\rangle, \ldots, |\beta_m\rangle\}$, the direct sum has basis equal to the **union**:

$$\{|\alpha_1\rangle, \ldots, |\alpha_n\rangle, |\beta_1\rangle, \ldots, |\beta_m\rangle\}$$

$$\boxed{\dim(V \oplus W) = \dim V + \dim W = n + m}$$

Elements look like $|v\rangle \oplus |w\rangle$, which stack vertically as a single column vector of length $n+m$. Inner product: $(\langle v_2| \oplus \langle w_2|)(|v_1\rangle \oplus |w_1\rangle) = \langle v_2|v_1\rangle + \langle w_2|w_1\rangle$.

**Classical intuition:** three objects, each with position and momentum, combine by stacking their 2-vectors into one 6-vector. Size grows **linearly** with the number of components.

### Tensor product $V \otimes W$ (quantum)

Given the same bases as above, the tensor product has basis equal to the **set of all pairs** $|\alpha_i\rangle \otimes |\beta_j\rangle$:

$$\{|\alpha_i\rangle \otimes |\beta_j\rangle : 1 \le i \le n, \; 1 \le j \le m\}$$

$$\boxed{\dim(V \otimes W) = \dim V \cdot \dim W = nm}$$

The tensor product operator $\otimes$ is bilinear:

$$(|v_1\rangle + |v_2\rangle) \otimes |w\rangle = |v_1\rangle \otimes |w\rangle + |v_2\rangle \otimes |w\rangle$$
$$|v\rangle \otimes (|w_1\rangle + |w_2\rangle) = |v\rangle \otimes |w_1\rangle + |v\rangle \otimes |w_2\rangle$$
$$(a|v\rangle) \otimes |w\rangle = |v\rangle \otimes (a|w\rangle) = a(|v\rangle \otimes |w\rangle)$$

Notation: $|v\rangle|w\rangle$ is shorthand for $|v\rangle \otimes |w\rangle$. Inner product: $(\langle v_2| \otimes \langle w_2|)(|v_1\rangle \otimes |w_1\rangle) = \langle v_2|v_1\rangle \langle w_2|w_1\rangle$ (product, not sum).

### Writing down a basis (quiz skill)

If $V$ has basis $\{e_1, \ldots, e_n\}$ and $W$ has basis $\{f_1, \ldots, f_m\}$:

**Basis of $V \oplus W$:** $\{e_1, \ldots, e_n, f_1, \ldots, f_m\}$ — $n+m$ vectors.

**Basis of $V \otimes W$:** $\{e_i \otimes f_j\}$ for all $i,j$ — $nm$ vectors, usually listed in **dictionary order** $(e_1 f_1, e_1 f_2, \ldots, e_1 f_m, e_2 f_1, \ldots, e_n f_m)$.

**Example 3.1.1 (textbook):** $V, W$ two-dimensional with bases $\{|\alpha_1\rangle, |\alpha_2\rangle\}$, $\{|\beta_1\rangle, |\beta_2\rangle\}$.

Basis of $V \otimes W$: $\{|\alpha_1\beta_1\rangle, |\alpha_1\beta_2\rangle, |\alpha_2\beta_1\rangle, |\alpha_2\beta_2\rangle\}$ — dim 4.

For $|v\rangle = a_1|\alpha_1\rangle + a_2|\alpha_2\rangle$ and $|w\rangle = b_1|\beta_1\rangle + b_2|\beta_2\rangle$:

$$|v\rangle \otimes |w\rangle = a_1b_1|\alpha_1\beta_1\rangle + a_1b_2|\alpha_1\beta_2\rangle + a_2b_1|\alpha_2\beta_1\rangle + a_2b_2|\alpha_2\beta_2\rangle$$

### Computing $|v\rangle \otimes |w\rangle$ as a column vector (Kronecker)

In dictionary order, multiply each entry of $|v\rangle$ by the entire vector $|w\rangle$:

$$\begin{pmatrix} a \\ b \end{pmatrix} \otimes \begin{pmatrix} c \\ d \end{pmatrix} = \begin{pmatrix} ac \\ ad \\ bc \\ bd \end{pmatrix}$$

**Example 3.1.2:** $|v\rangle = \tfrac{1}{\sqrt{5}}(1, -2)^T$, $|w\rangle = \tfrac{1}{\sqrt{10}}(-1, 3)^T$:

$$|v\rangle \otimes |w\rangle = \tfrac{1}{5\sqrt{2}}(-1, 3, 2, -6)^T$$

### Key structural facts

- Tensor product of two **unit** vectors is a unit vector.
- Tensor product of two **orthonormal** bases is an orthonormal basis for $V \otimes W$.
- $n$ two-dimensional spaces combine to a $2^n$-dimensional space (classical direct sum: $2n$).
- **Most** vectors in $V \otimes W$ **cannot** be written as $|v\rangle \otimes |w\rangle$ — those that cannot are the [[entanglement|entangled states]].
- Representation of an element as a sum of simple tensors $|v_i\rangle \otimes |w_i\rangle$ is **not unique**.

## Key Formulas / Patterns

| | Direct sum $V \oplus W$ | Tensor product $V \otimes W$ |
|---|---|---|
| Dimension | $n + m$ | $n \cdot m$ |
| Basis | $\{e_i\} \cup \{f_j\}$ | $\{e_i \otimes f_j\}$ |
| Element | $|v\rangle \oplus |w\rangle$ (stack) | $\sum_k |v_k\rangle \otimes |w_k\rangle$ |
| Inner product | $\langle v_2|v_1\rangle + \langle w_2|w_1\rangle$ | $\langle v_2|v_1\rangle \cdot \langle w_2|w_1\rangle$ |
| Models | Classical state space | Quantum state space |
| Growth for $n$ qubits | linear ($2n$) | exponential ($2^n$) |

**Kronecker product** (column-vector tensor): $(a, b)^T \otimes (c, d)^T = (ac, ad, bc, bd)^T$.

## Common mistakes

- Writing $\dim(V \otimes W) = n + m$. It is $nm$.
- Forgetting that most elements of $V \otimes W$ are NOT simple tensors $|v\rangle \otimes |w\rangle$.
- Using the wrong ordering when writing Kronecker output — stick with dictionary order unless the problem says otherwise.

## Connections

- [[multi-qubit-states]] — applies tensor product to build $n$-qubit state spaces
- [[entanglement]] — states in $V \otimes W$ that cannot be factored
- [[quantum-information]] — single-qubit foundations that this builds on
- [[orthogonal-diagonalization]] — orthonormal bases behave well under tensor product

## Source Citations

[Source: rieffel-section3.pdf] — §3.1.1 direct sum, §3.1.2 tensor product, Examples 3.1.1–3.1.2.
