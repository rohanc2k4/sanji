---
title: Quantum Information Basics
course: math401
exam: exam2
topics: [quantum, qubits, dirac-notation, superposition, measurement, global-phase, hadamard-basis]
source_count: 3
sources: [rieffel-section2.pdf, Answer_keys_to_SP4-5.pdf, MATH_401_-_Practice_Exam_2.1.pdf]
created: 2026-04-09
last_updated: 2026-04-09
status: needs_review
exam_relevant: true
difficulty: medium
---

Quantum information applies linear algebra to quantum computing. Key concepts: qubits as unit vectors in $\mathbb{C}^2$, Dirac notation, global phase, superposition, and measurement in different bases. SP5 says exam-level = quiz-level difficulty for this topic.

## Details

### Dirac notation (bra-ket)

- **Ket** $|\psi\rangle$: a column vector (state)
- **Bra** $\langle\psi|$: the conjugate transpose (row vector)
- **Inner product** $\langle\phi|\psi\rangle$: dot product of two states

**Standard basis:**

$$|0\rangle = \begin{pmatrix} 1 \\ 0 \end{pmatrix}, \quad |1\rangle = \begin{pmatrix} 0 \\ 1 \end{pmatrix}$$

**Hadamard basis:**

$$|+\rangle = \frac{1}{\sqrt{2}}(|0\rangle + |1\rangle), \quad |-\rangle = \frac{1}{\sqrt{2}}(|0\rangle - |1\rangle)$$

**Other bases:**

$$|i\rangle = \frac{1}{\sqrt{2}}(|0\rangle + i|1\rangle), \quad |{-i}\rangle = \frac{1}{\sqrt{2}}(|0\rangle - i|1\rangle)$$

### Qubit states

A qubit state is a unit vector in $\mathbb{C}^2$:

$$|\psi\rangle = \alpha|0\rangle + \beta|1\rangle \quad \text{where} \quad |\alpha|^2 + |\beta|^2 = 1$$

### Global phase — when are two states "the same"?

$$\boxed{|v\rangle \text{ and } |v'\rangle \text{ are the same state} \iff |v\rangle = c\,|v'\rangle \text{ with } |c| = 1}$$

$c$ is the **global phase factor** — any complex number on the unit circle ($e^{i\theta}$, $-1$, $i$, $-i$, etc.)

**Method:** Write both as column vectors, check if dividing component-by-component gives the same $c$ everywhere with $|c| = 1$.

See [[quantum-global-phase]] for 5 worked examples from SP5.

### Superposition

A state is a **superposition** w.r.t. a basis if it has nonzero coefficients for **both** basis vectors in that basis.

**Key insight:** A state that is NOT a superposition in one basis IS a superposition in another. To find a basis where it's NOT a superposition, find a basis that **contains** it.

See [[quantum-superposition]] for 4 worked examples with standard and Hadamard bases.

### Measurement

When measuring state $|\psi\rangle$ in basis $\{|b_0\rangle, |b_1\rangle\}$:

$$\boxed{P(|b_i\rangle) = |\langle b_i | \psi \rangle|^2}$$

Probabilities always sum to 1.

**For complex coefficients:** $|a + bi|^2 = a^2 + b^2$ (squared **magnitude**, not just square).

See [[quantum-measurement]] for 4 worked examples including non-standard bases.

## Key Formulas / Patterns

- **Same state test:** $|v\rangle = c\,|v'\rangle$ with $|c| = 1$
- **Measurement probability:** $P(|b_i\rangle) = |\langle b_i | \psi \rangle|^2$
- **Standard $\leftrightarrow$ Hadamard conversion:**
  - $|0\rangle = \frac{1}{\sqrt{2}}(|+\rangle + |-\rangle)$
  - $|1\rangle = \frac{1}{\sqrt{2}}(|+\rangle - |-\rangle)$
  - $|+\rangle = \frac{1}{\sqrt{2}}(|0\rangle + |1\rangle)$
  - $|-\rangle = \frac{1}{\sqrt{2}}(|0\rangle - |1\rangle)$
- **Probabilities always sum to 1**

## Common mistakes

- Forgetting that $c$ can be complex ($i$, $e^{i\pi/4}$, etc.) when checking global phase
- Confusing "superposition w.r.t. standard basis" with "superposition w.r.t. Hadamard basis" — always specify which basis
- For measurement: forgetting to take the **squared magnitude** (not just the square — matters when coefficients are complex)

## Connections

- [[orthogonal-diagonalization]] — quantum states use orthonormal bases, same linear algebra
- [[singular-value-decomposition]] — both use matrix decomposition in different contexts

## Source Citations

[Source: rieffel-section2.pdf] — Rieffel-Polak §2, quantum states and measurement theory.
[Source: Answer_keys_to_SP4-5.pdf] — Full solutions to exercises 2.2, 2.3, 2.4, 2.6.
[Source: MATH_401_-_Practice_Exam_2.1.pdf] — Practice exam quantum information section.
