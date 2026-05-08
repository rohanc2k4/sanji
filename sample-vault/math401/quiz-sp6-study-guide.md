---
title: MATH401 SP6 Quiz — Study Guide
type: exam-prep
course: math401
exam: quiz-sp6
last_updated: 2026-04-21
sources: [rieffel-section3.pdf]
---

# MATH401 SP6 Quiz — What You Need to Know

The professor narrowed it to three skills. Each below is taught with the minimum machinery you need and the one trick to remember.

## 1. Dimension of $V \otimes W$

**Rule:** $\dim(V \otimes W) = \dim V \cdot \dim W$. Multiply, don't add.

The trap question is to slip in $V \oplus W$ (direct sum) or ask about both:

| | Direct sum $V \oplus W$ | Tensor product $V \otimes W$ |
|---|---|---|
| Dimension | $n + m$ | $nm$ |
| Basis | $\{e_i\} \cup \{f_j\}$ | $\{e_i \otimes f_j\}$ for all $i,j$ |

Example: $V = \mathbb{R}^3, W = \mathbb{R}^2$. Then $\dim(V \oplus W) = 5$, $\dim(V \otimes W) = 6$.

For $n$ qubits, each qubit sits in $\mathbb{C}^2$, so the $n$-qubit space has dim $2^n$.

## 2. Basis of $V \otimes W$ given bases for $V$ and $W$

If $V$ has basis $\{e_1, \ldots, e_n\}$ and $W$ has basis $\{f_1, \ldots, f_m\}$:

$$\text{Basis of } V \otimes W = \{\, e_i \otimes f_j \;:\; 1 \le i \le n,\; 1 \le j \le m \,\}$$

That's all $nm$ pairs, usually written in dictionary order: $e_1 f_1,\, e_1 f_2, \ldots, e_1 f_m,\, e_2 f_1, \ldots, e_n f_m$.

**Worked: $V = W = \mathbb{C}^2$ with standard basis $\{|0\rangle, |1\rangle\}$.** Basis of $V \otimes W$:
$$\{|00\rangle, |01\rangle, |10\rangle, |11\rangle\}$$
four vectors, dim 4 (= $2 \cdot 2$). Same pattern for $n$-qubits: all bit strings of length $n$.

**Worked: Exercise 3.1 style.** $V$ has basis $\{(1,0,0), (0,1,0), (0,0,1)\}$. Two different bases for $V \otimes V$: either the standard $\{e_i \otimes e_j\}_{i,j=1}^3$ (nine pairs), or the same nine pairs written in reverse order — both are valid bases since the order of a basis is arbitrary.

## 3. Entangled or not? (2-qubit separability test)

**The one-line test.** A 2-qubit state $|\psi\rangle = a_{00}|00\rangle + a_{01}|01\rangle + a_{10}|10\rangle + a_{11}|11\rangle$ is **separable** (= product of two single-qubit states) iff

$$\boxed{\,a_{00}\,a_{11} \;=\; a_{01}\,a_{10}\,}$$

If that equality fails, the state is **entangled**. That's the whole quiz trick.

**Why it works.** If $|\psi\rangle = (a_1|0\rangle + b_1|1\rangle) \otimes (a_2|0\rangle + b_2|1\rangle)$ then expanding gives $a_{00} = a_1a_2$, $a_{01} = a_1b_2$, $a_{10} = b_1a_2$, $a_{11} = b_1b_2$. So $a_{00}a_{11} = a_1a_2b_1b_2 = a_{01}a_{10}$ always.

**Drill — recognize these on sight:**

| State | Cross-products | Verdict |
|---|---|---|
| $\tfrac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$ (Bell $\Phi^+$) | $\tfrac{1}{2}$ vs $0$ | entangled |
| $\tfrac{1}{\sqrt{2}}(|01\rangle + |10\rangle)$ (Bell $\Psi^+$) | $0$ vs $\tfrac{1}{2}$ | entangled |
| $\tfrac{1}{\sqrt{2}}(|00\rangle - |11\rangle)$ (Bell $\Phi^-$) | $-\tfrac{1}{2}$ vs $0$ | entangled |
| $\tfrac{1}{\sqrt{2}}(|01\rangle - |10\rangle)$ (Bell $\Psi^-$) | $0$ vs $-\tfrac{1}{2}$ | entangled |
| $\tfrac{1}{2}(|00\rangle + |01\rangle + |10\rangle + |11\rangle)$ | $\tfrac{1}{4} = \tfrac{1}{4}$ | separable ($= |+\rangle|+\rangle$) |
| $\tfrac{1}{\sqrt{2}}(|00\rangle + i|11\rangle)$ | $i/2$ vs $0$ | entangled |
| $|00\rangle$ | $0 = 0$ | separable |

**Bell states are always entangled.** If you see anything that looks like one diagonal pair of $|00\rangle+|11\rangle$ or off-diagonal $|01\rangle+|10\rangle$ alone, the cross product is 0 while the other side is nonzero → entangled.

**Two sanity guards:**
- A state being in superposition $\ne$ being entangled. $\tfrac{1}{2}(|00\rangle+|01\rangle+|10\rangle+|11\rangle)$ is a 4-way superposition but separable.
- Entanglement does NOT depend on the basis. It DOES depend on the tensor decomposition (1+1 qubits vs register grouping), but at quiz level you're always in the 1+1 qubit decomposition.

## Quick checklist to run on every quiz problem

1. Asked "dimension of $V \otimes W$"? → multiply dims.
2. Asked for "a basis"? → write out all $\dim V \cdot \dim W$ pairs $e_i \otimes f_j$.
3. Given a 2-qubit state, asked entangled? → check $a_{00}a_{11} \stackrel{?}{=} a_{01}a_{10}$.

## Connections

- [[tensor-products]] — full treatment of direct sum vs tensor product
- [[multi-qubit-states]] — n-qubit notation, Bell basis, phase conventions
- [[entanglement]] — full separability discussion, decomposition-dependence caveats
- [[quiz-sp6-scope]] — professor's stated scope
