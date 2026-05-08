---
title: Multi-Qubit States
course: math401
exam: quiz-sp6
topics: [multi-qubit, bell-basis, quantum, tensor-product, notation]
source_count: 1
sources: [rieffel-section3.pdf]
created: 2026-04-21
last_updated: 2026-04-21
status: needs_review
exam_relevant: true
difficulty: medium
---

An $n$-qubit system lives in the $2^n$-dimensional space $V_{n-1} \otimes \cdots \otimes V_0$, where each $V_i$ is a single qubit's $\mathbb{C}^2$. This page collects notation conventions, the Bell basis, phase conventions, and worked tensor-product computations. [Source: rieffel-section3.pdf §3.1.3]

## Details

### State space and basis notation (four equivalent forms)

For an $n$-qubit system, the $2^n$ standard basis vectors can be written in any of these notations, interchangeably:

1. Full tensor: $|0\rangle_{n-1} \otimes \cdots \otimes |0\rangle_0$
2. Adjacency = tensor: $|0\rangle \cdots |0\rangle |0\rangle$
3. Bit string ket: $|b_{n-1} \ldots b_0\rangle$
4. Decimal ket: $|x\rangle$ where $x$ is the decimal value of $b_{n-1} \ldots b_0$

**Two-qubit basis:** $\{|00\rangle, |01\rangle, |10\rangle, |11\rangle\} = \{|0\rangle, |1\rangle, |2\rangle, |3\rangle\}$.

**Three-qubit basis:** $\{|000\rangle, \ldots, |111\rangle\} = \{|0\rangle, \ldots, |7\rangle\}$.

The notation $|3\rangle$ is context-dependent (2-qubit $|11\rangle$ vs 3-qubit $|011\rangle$). Always know how many qubits you are in.

### Matrix representation

Basis vectors are ordered numerically. Example: the two-qubit state $\tfrac{1}{2}|00\rangle + \tfrac{i}{2}|01\rangle + \tfrac{1}{\sqrt{2}}|11\rangle$ has column vector

$$\begin{pmatrix} 1/2 \\ i/2 \\ 0 \\ 1/\sqrt{2} \end{pmatrix}$$

### The Bell basis (two qubits)

$$|\Phi^+\rangle = \tfrac{1}{\sqrt{2}}(|00\rangle + |11\rangle) \quad\quad |\Phi^-\rangle = \tfrac{1}{\sqrt{2}}(|00\rangle - |11\rangle)$$
$$|\Psi^+\rangle = \tfrac{1}{\sqrt{2}}(|01\rangle + |10\rangle) \quad\quad |\Psi^-\rangle = \tfrac{1}{\sqrt{2}}(|01\rangle - |10\rangle)$$

All four Bell states are [[entanglement|entangled]]. Two qubits in state $|\Phi^+\rangle$ are called an **EPR pair**. Maximally entangled; used in teleportation, dense coding, and Ekert 91 QKD.

### Global phase and relative phase (multi-qubit)

Same rule as single-qubit: $|v\rangle \sim |w\rangle$ iff $|v\rangle = c|w\rangle$ with $|c| = 1$. In addition, **phase factors distribute over tensors**:

$$|v\rangle \otimes (e^{i\varphi}|w\rangle) = e^{i\varphi}(|v\rangle \otimes |w\rangle) = (e^{i\varphi}|v\rangle) \otimes |w\rangle$$

So a phase on a single qubit of a single term can always be pulled out into the scalar coefficient of that term.

**Important trap — relative phase is physical, global phase is not:**

$$\tfrac{1}{\sqrt{2}}(e^{i\varphi}|00\rangle + |11\rangle) \not\sim \tfrac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$$

because $e^{i\varphi}$ sits on only one term — it is a *relative* phase. Compare:

$$\tfrac{1}{\sqrt{2}}(e^{i\varphi}|00\rangle + e^{i\varphi}|11\rangle) \sim \tfrac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$$

here the phase is on both terms — it factors out as a *global* phase.

### Superposition (multi-qubit)

Same definition as single qubit, extended: $|v\rangle$ is a superposition w.r.t. orthonormal set $\{|\beta_1\rangle, \ldots, |\beta_k\rangle\}$ if $|v\rangle = \sum a_i|\beta_i\rangle$ and at least **two** $a_i$ are nonzero. Unspecified basis = standard basis.

Reminder: superposition is basis-dependent; entanglement (below) is not basis-dependent but is tensor-decomposition-dependent.

### Same state, different expressions

$\tfrac{1}{\sqrt{2}}(|0\rangle|0\rangle + |1\rangle|1\rangle) = \tfrac{1}{\sqrt{2}}(|+\rangle|+\rangle + |-\rangle|-\rangle)$ — one state, two ways to write it. Don't confuse "which kets appear" with "which state we're in."

### Computing product states: worked examples

**Example 3.1.4:** $\tfrac{1}{\sqrt{2}}(|0\rangle + |1\rangle) \otimes \tfrac{1}{\sqrt{2}}(|0\rangle + |1\rangle) = \tfrac{1}{2}(|00\rangle + |01\rangle + |10\rangle + |11\rangle)$.

**Example 3.1.5:** $\left(\tfrac{1}{2}|0\rangle + \tfrac{\sqrt{3}}{2}|1\rangle\right) \otimes \left(\tfrac{1}{\sqrt{2}}|0\rangle + \tfrac{i}{\sqrt{2}}|1\rangle\right) = \tfrac{1}{2\sqrt{2}}|00\rangle + \tfrac{i}{2\sqrt{2}}|01\rangle + \tfrac{\sqrt{3}}{2\sqrt{2}}|10\rangle + \tfrac{i\sqrt{3}}{2\sqrt{2}}|11\rangle$.

Pattern: $(a|0\rangle + b|1\rangle) \otimes (c|0\rangle + d|1\rangle) = ac|00\rangle + ad|01\rangle + bc|10\rangle + bd|11\rangle$.

### Dimension counting (exam-critical)

- An $n$-qubit system has a $2^n$-dimensional Hilbert space.
- Factoring out global phase and unit-norm constraint: $2^n - 1$ complex projective dimensions.
- A **product state** $|\psi_1\rangle \otimes \cdots \otimes |\psi_n\rangle$ is described by just $n$ complex numbers (after factoring phases). Since $2^n \gg n$, almost all $n$-qubit states are entangled.

## Key Formulas / Patterns

- **$n$-qubit dim:** $2^n$ (full space), $2^n - 1$ (distinct quantum states up to global phase).
- **Bell states** (memorize all four).
- **Phase distributes over $\otimes$:** can move a scalar across qubits but not create/absorb a per-term phase.
- **Product-state expansion:** $(a|0\rangle + b|1\rangle) \otimes (c|0\rangle + d|1\rangle) = ac|00\rangle + ad|01\rangle + bc|10\rangle + bd|11\rangle$.

## Connections

- [[tensor-products]] — the vector-space machinery underneath this page
- [[entanglement]] — what it means when the product-state expansion can't reproduce the target
- [[quantum-information]] — single-qubit background (Dirac notation, Hadamard basis, global phase)
- [[quantum-measurement]] — measurement in the multi-qubit case (exam2 page)

## Source Citations

[Source: rieffel-section3.pdf] — §3.1.3 state space of an $n$-qubit system; Bell basis (Eq. 3.1); Examples 3.1.3–3.1.5; phase conventions p. 36–37.
