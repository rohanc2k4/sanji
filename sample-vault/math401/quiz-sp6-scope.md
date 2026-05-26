---
title: MATH401 — SP6 Quiz Scope
type: exam-scope
status: evergreen
last_updated: 2026-04-21
sources: [rieffel-section3.pdf]
---

# MATH401 — SP6 Quiz Scope

**Date:** next week (week of 2026-04-27)
**Format:** quiz (shorter than an exam)
**Source:** SP6 problem set on multi-qubit states / tensor product of vector spaces (Rieffel §3).

## What's testable

Per the professor's announcement:

- **No proofs.** SP6 has harder proof-style problems; those won't appear on the quiz.
- **Identify whether a 2-qubit state is entangled or not.**
- **Give the dimension of a tensor product $V \otimes W$.**
- **Write down a basis for $V \otimes W$ given bases for $V$ and $W$.**

## Topic map

- [[tensor-products]] — dimension, basis of $V \otimes W$, direct sum vs tensor product
- [[entanglement]] — separability test $a_{00}a_{11} = a_{01}a_{10}$
- [[multi-qubit-states]] — supporting notation, Bell basis, product-state expansion

## Quiz-level tricks to drill

1. **Dim:** $\dim(V \otimes W) = \dim V \cdot \dim W$ (not $+$). Direct sum is $+$.
2. **Basis:** pairs $\{e_i \otimes f_j\}$ for all $i, j$ in dictionary order.
3. **Separability test:** $(a_1|0\rangle + b_1|1\rangle) \otimes (a_2|0\rangle + b_2|1\rangle)$ expands to $a_1a_2|00\rangle + a_1b_2|01\rangle + b_1a_2|10\rangle + b_1b_2|11\rangle$. The state $a_{00}|00\rangle + a_{01}|01\rangle + a_{10}|10\rangle + a_{11}|11\rangle$ is **separable iff $a_{00}a_{11} = a_{01}a_{10}$**, else entangled.
4. **All four Bell states are entangled.**

## Not on this quiz, but SP6 covers

- Proofs that $|W_n\rangle$ and $|GHZ_n\rangle$ are entangled (Exercises 3.3–3.4).
- Writing states in the Bell basis (Exercise 3.7) — possible but light.
- Multi-qubit measurement (that's exam-2 material, page [[quantum-measurement]]).

## Professor's framing

> "SP6 problems are harder than what I'll ask; you won't need to prove anything. Identify entangled vs not, give tensor-product dimension, and write down a basis for $V \otimes W$."
