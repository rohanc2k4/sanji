---
title: Graph Laplacian and Fiedler Method
course: math401
exam: exam2
topics: [graphs, laplacian, fiedler, partitioning, eigenvalues, adjacency-matrix]
source_count: 1
sources: [submission_395902441.pdf]
created: 2026-04-09
last_updated: 2026-04-09
status: needs_review
exam_relevant: true
difficulty: hard
---

The graph Laplacian $L = D - A$ encodes graph structure, where $D$ is the degree matrix and $A$ is the adjacency matrix. The Fiedler method uses the eigenvector of the second-smallest eigenvalue to partition the graph.

## Details

### Constructing the Laplacian

1. **Adjacency matrix $A$:** $A_{ij} = 1$ if vertices $i, j$ connected, $0$ otherwise (symmetric for undirected)
2. **Degree matrix $D$:** diagonal, $D_{ii} = \deg(i)$
3. **Laplacian $L = D - A$** (**NOT** $A - D$ — Rohan made this error on Exam 1 Q3a)

### Properties of the Laplacian

- $L$ is symmetric and positive semidefinite (all eigenvalues $\geq 0$)
- Smallest eigenvalue is always $0$ (eigenvector is all-ones $\mathbf{1}$)
- Number of zero eigenvalues $=$ number of connected components
- Row sums and column sums are all zero

### Fiedler value and vector

- **Fiedler value** $\varphi$: second-smallest eigenvalue of $L$
- **Fiedler vector:** eigenvector for $\varphi$
- $\varphi$ measures "algebraic connectivity" — larger $\varphi$ means more connected

### Fiedler method for graph partitioning

1. $\varphi = \lambda_2$ (second-smallest eigenvalue)
2. Find the $\varphi$-eigenspace
3. **Partition:** positive components $\to$ one group, negative $\to$ another, zero $\to$ either
4. Each group must be connected (admissible partition)

### Worked example (Exam 1 Q3)

4-vertex cycle: $1\text{--}2$, $2\text{--}3$, $3\text{--}4$, $4\text{--}1$

$$A = \begin{pmatrix} 0 & 1 & 0 & 1 \\ 1 & 0 & 1 & 0 \\ 0 & 1 & 0 & 1 \\ 1 & 0 & 1 & 0 \end{pmatrix}, \quad L = D - A = \begin{pmatrix} 2 & -1 & 0 & -1 \\ -1 & 2 & -1 & 0 \\ 0 & -1 & 2 & -1 \\ -1 & 0 & -1 & 2 \end{pmatrix}$$

Eigenvalues: $\{0, 2, 2, 4\}$. Fiedler value $\varphi = 2$. Four admissible partitions.

## Key Formulas / Patterns

- $L = D - A$
- Smallest eigenvalue of $L = 0$, always
- Fiedler value $= \lambda_2(L)$
- $\varphi = 0 \iff$ graph is disconnected
- Same adjacency matrix $\iff$ isomorphic, but same degree matrix does **NOT** imply isomorphic

## T/F concepts (for Exam 2)

Full drill: [[tf-drill]]

- **FALSE:** If two graphs have the same degree matrix, they are isomorphic
- **FALSE:** If two graphs are isomorphic, they have the same adjacency matrix (they have **similar** adjacency matrices — same up to permutation)
- **TRUE:** Fiedler value $> 0$ for connected graphs

## Common mistakes

- Computing $A - D$ instead of $D - A$ (lost points on Exam 1)
- Confusing "same adjacency matrix" with "isomorphic" — isomorphism allows vertex relabeling

## Connections

- [[orthogonal-diagonalization]] — $L$ is symmetric, so it's orthogonally diagonalizable
- [[markov-chains]] — graph structure determines transition probabilities
- [[least-squares]] — both involve matrix decomposition

## Source Citations

[Source: submission_395902441.pdf] — Exam 1 Q3 (9/10, lost 1pt on $D - A$ vs $A - D$), Q5a (graph isomorphism T/F).
