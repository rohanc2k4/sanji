---
title: Entanglement and the Separability Test
course: math401
exam: quiz-sp6
topics: [entanglement, tensor-product, bell-states, quantum, separable]
source_count: 1
sources: [rieffel-section3.pdf]
created: 2026-04-21
last_updated: 2026-04-21
status: needs_review
exam_relevant: true
difficulty: medium
---

A two-qubit state $|\psi\rangle$ is **separable** (unentangled) if it can be written as $|v\rangle \otimes |w\rangle$ for some $|v\rangle, |w\rangle \in \mathbb{C}^2$. Otherwise it is **entangled**. Primary quiz skill: given coefficients $(a_{00}, a_{01}, a_{10}, a_{11})$, decide separable vs entangled. [Source: rieffel-section3.pdf §3.2]

## Details

### Definition

Given a tensor decomposition $V = V_1 \otimes \cdots \otimes V_n$, a state $|\psi\rangle \in V$ is:

- **Separable** w.r.t. this decomposition iff $|\psi\rangle = |v_1\rangle \otimes \cdots \otimes |v_n\rangle$ for some $|v_i\rangle \in V_i$.
- **Entangled** w.r.t. this decomposition iff no such factorization exists.

Entanglement depends on the **decomposition**, not on the basis chosen within each factor.

### Quiz skill — the 2-qubit separability test

Given a two-qubit state $|\psi\rangle = a_{00}|00\rangle + a_{01}|01\rangle + a_{10}|10\rangle + a_{11}|11\rangle$, ask: does there exist $(a_1, b_1), (a_2, b_2)$ with

$$(a_1|0\rangle + b_1|1\rangle) \otimes (a_2|0\rangle + b_2|1\rangle) = a_1 a_2|00\rangle + a_1 b_2|01\rangle + b_1 a_2|10\rangle + b_1 b_2|11\rangle$$

equal to $|\psi\rangle$? Matching coefficients gives four equations:

$$a_1 a_2 = a_{00}, \quad a_1 b_2 = a_{01}, \quad b_1 a_2 = a_{10}, \quad b_1 b_2 = a_{11}$$

**Fast determinant test (the one to use on the quiz):**

$$\boxed{|\psi\rangle = a_{00}|00\rangle + a_{01}|01\rangle + a_{10}|10\rangle + a_{11}|11\rangle \text{ is separable iff } a_{00} a_{11} = a_{01} a_{10}}$$

Derivation: $(a_1 a_2)(b_1 b_2) = (a_1 b_2)(b_1 a_2)$ always, so if the state is separable the coefficient "cross products" must match. Conversely, if $a_{00}a_{11} = a_{01}a_{10}$ you can factor out single-qubit states.

**Entangled iff $a_{00}a_{11} \neq a_{01}a_{10}$.**

### Worked: Bell state $|\Phi^+\rangle$ is entangled

$|\Phi^+\rangle = \tfrac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$: coefficients $a_{00} = a_{11} = \tfrac{1}{\sqrt{2}}$, $a_{01} = a_{10} = 0$.

Cross check: $a_{00}a_{11} = \tfrac{1}{2}$, $a_{01}a_{10} = 0$. Not equal, so **entangled**.

Textbook proof: if $(a_1|0\rangle + b_1|1\rangle) \otimes (a_2|0\rangle + b_2|1\rangle) = \tfrac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$ then $a_1 b_2 = 0$, forcing either $a_1 a_2 = 0$ or $b_1 b_2 = 0$ — contradicting the fact that $|00\rangle$ and $|11\rangle$ both have coefficient $\tfrac{1}{\sqrt{2}}$.

### More separability check examples

| State | $a_{00}a_{11}$ | $a_{01}a_{10}$ | Verdict |
|---|---|---|---|
| $\tfrac{1}{\sqrt{2}}(|00\rangle + |11\rangle) = |\Phi^+\rangle$ | $1/2$ | $0$ | entangled |
| $\tfrac{1}{\sqrt{2}}(|01\rangle + |10\rangle) = |\Psi^+\rangle$ | $0$ | $1/2$ | entangled |
| $\tfrac{1}{\sqrt{2}}(|00\rangle - i|11\rangle)$ | $-i/2$ | $0$ | entangled |
| $\tfrac{1}{2}(|00\rangle + |01\rangle + |10\rangle + |11\rangle)$ | $1/4$ | $1/4$ | separable ($= |+\rangle|+\rangle$) |
| $\tfrac{7}{10}|00\rangle + \tfrac{1}{10}|01\rangle + \tfrac{1}{10}|10\rangle + \tfrac{7}{10}|11\rangle$ | $49/100$ | $1/100$ | entangled |
| $\tfrac{i}{10}|00\rangle + \tfrac{\sqrt{99}}{10}|11\rangle$ | $i\sqrt{99}/100$ | $0$ | entangled |

All four Bell states are entangled. They are in fact **maximally** entangled.

### Caveats you may be asked about

- **Entanglement is w.r.t. a tensor decomposition.** A state can be entangled w.r.t. one decomposition and separable w.r.t. another (Example 3.2.3). The 4-qubit state $\tfrac{1}{2}(|0000\rangle + |0101\rangle + |1010\rangle + |1111\rangle)$ is entangled w.r.t. the single-qubit decomposition, but factors as a product of two 2-qubit states under the (qubit 1, qubit 3) and (qubit 2, qubit 4) grouping.
- **Entanglement is NOT basis-dependent.** Writing $\tfrac{1}{\sqrt{2}}(|00\rangle + |11\rangle) = \tfrac{1}{\sqrt{2}}(|++\rangle + |--\rangle)$ does not change its entangled status — both are the same vector.
- A linear combination of entangled states is **not necessarily** entangled (Exercise 3.2).
- A state can be a superposition w.r.t. the standard basis without being entangled — e.g. $\tfrac{1}{2}(|00\rangle + |01\rangle + |10\rangle + |11\rangle)$ is separable but not a basis vector (Exercise 3.12).

### Separability via single-qubit factoring (when separable)

If $a_{00} a_{11} = a_{01} a_{10}$ and you want the actual factors: pick $a_1 a_2 = a_{00}$, $a_1 b_2 = a_{01}$, so $b_2/a_2 = a_{01}/a_{00}$; similarly $b_1/a_1 = a_{10}/a_{00}$. Pick any normalization, e.g. $a_1 = \sqrt{|a_{00}|^2 + |a_{10}|^2}$, then $b_1 = a_1 (a_{10}/a_{00})$, $a_2 = a_{00}/a_1$, $b_2 = a_{01}/a_1$.

## Key Formulas / Patterns

- **Separability test ($2$-qubit):** $|\psi\rangle$ separable iff $a_{00}a_{11} = a_{01}a_{10}$.
- **All four Bell states are entangled.**
- Entanglement is tensor-decomposition-dependent, basis-independent.
- Quiz-level: professor said "no proofs" — just identify separable vs entangled.

## Common mistakes

- Calling a state entangled just because it's a superposition. Superposition and entanglement are separate concepts.
- Trying to factor with hand-algebra when the determinant test answers it in one line.
- Forgetting that a zero coefficient in one position still plays in $a_{00}a_{11} = a_{01}a_{10}$.

## Connections

- [[tensor-products]] — the structure that makes entanglement possible
- [[multi-qubit-states]] — notation and the Bell basis
- [[quantum-measurement]] — entangled states behave nonlocally under measurement (exam 2 page)

## Source Citations

[Source: rieffel-section3.pdf] — §3.2 Entangled States; Example 3.2.1 Bell entanglement proof; Example 3.2.2 more entangled examples; Example 3.2.3 decomposition dependence; Exercises 3.2, 3.12.
