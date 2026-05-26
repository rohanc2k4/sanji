---
title: Markov Chains
course: math401
exam: exam2
topics: [markov-chains, transition-matrix, steady-state, irreducible, regular, mean-return]
source_count: 1
sources: [submission_395902441.pdf]
created: 2026-04-09
last_updated: 2026-04-09
status: needs_review
exam_relevant: true
difficulty: hard
---

A Markov chain is a stochastic process where the next state depends only on the current state. Defined by a transition matrix $A$ where $A_{ij} = P(\text{state } i \mid \text{currently in state } j)$. Columns sum to 1.

## Details

### Key definitions

- **Transition matrix $A$:** Column-stochastic (columns sum to 1)
- **Irreducible:** From any state, you can reach any other (directed graph is strongly connected)
- **Regular:** $\exists\, k$ such that $A^k$ has all strictly positive entries
- **Aperiodic:** GCD of return times to any state is 1
- **Steady-state vector $\mathbf{q}$:** $A\mathbf{q} = \mathbf{q}$ with $\|\mathbf{q}\|_1 = 1$ (entries sum to 1, all $\geq 0$)

**Relationships:**
- Regular $\implies$ irreducible (but **not** vice versa)
- Irreducible + aperiodic $\implies$ regular (for finite chains)
- Regular $\iff$ unique steady state **and** convergence from any start

### Finding the steady-state vector

Solve $(A - I)\mathbf{q} = \mathbf{0}$ with $q_1 + q_2 + \cdots + q_n = 1$:

1. Write equations from $A\mathbf{q} = \mathbf{q}$
2. Express all variables in terms of one free variable
3. Apply normalization $\sum q_i = 1$

> **Exam tip:** Don't row reduce — just write out equations directly and solve algebraically. Much faster.

### Mean return theorem

$$\boxed{\text{Average steps to return to state } i = \frac{1}{q_i}}$$

Example: If $q_1 = 2/7$, mean return time $= 7/2 = 3.5$ steps.

### Checking irreducibility

Draw the directed graph of the transition matrix. If every state is reachable from every other state (following directed edges), the chain is irreducible.

## Key Formulas / Patterns

- **Steady state:** $A\mathbf{q} = \mathbf{q}$, $\sum q_i = 1$
- **Mean return time:** $1/q_i$
- Regular $\implies$ irreducible (not vice versa)
- Regular $\iff$ unique steady state + convergence

## T/F concepts (for Exam 2)

Full drill: [[tf-drill]]

Critical T/F from Exam 1 Q5 (Rohan scored 4/10):

- **FALSE:** Every Markov chain converges to a unique steady state (only **regular** ones)
- **TRUE:** Every finite Markov chain has $\geq 1$ steady-state vector (Perron-Frobenius), but it may not be unique
- **FALSE:** Irreducible $\implies$ regular (could be periodic)
- **TRUE:** Regular transition matrix $\implies$ strongly connected directed graph

## Common mistakes

- Confusing "has a steady state" (always true, finite chains) with "converges to unique steady state" (only regular)
- Row reducing when direct equation solving is faster
- Forgetting normalization $\sum q_i = 1$

## Connections

- [[graph-laplacian-fiedler]] — graph structure determines the transition matrix
- [[orthogonal-diagonalization]] — eigenvalue 1 corresponds to the steady-state vector

## Source Citations

[Source: submission_395902441.pdf] — Exam 1 Q4 (10/10 after regrade), Q5c-e (T/F, scored 3/6).
