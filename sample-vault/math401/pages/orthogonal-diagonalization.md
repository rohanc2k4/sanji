---
title: Orthogonal Diagonalization
course: math401
exam: exam2
topics: [eigenvalues, eigenvectors, orthogonal-matrices, spectral-theorem]
source_count: 5
sources: [submission_400425878.pdf, lay-mcdonald-7.1-7.4-7.5.pdf, Answer_keys_to_SP4-5.pdf, spectral theorem.pdf, 401-s26-sp4-2.pdf]
created: 2026-04-09
last_updated: 2026-04-09
status: needs_review
exam_relevant: true
difficulty: medium
---

Orthogonal diagonalization decomposes a symmetric matrix $A$ into $A = PDP^T$, where $P$ is orthogonal (columns are normalized eigenvectors) and $D$ is diagonal (eigenvalues). Guaranteed for any real symmetric matrix by the **Spectral Theorem**.

## Details

### When is orthogonal diagonalization possible?

$$A \text{ is orthogonally diagonalizable} \iff A \text{ is symmetric } (A = A^T)$$

This is the Spectral Theorem for real symmetric matrices. [Source: lay-mcdonald-7.1-7.4-7.5.pdf]

### Step-by-step procedure

1. **Eigenvalues:** Solve $\det(A - \lambda I) = 0$
2. **Eigenvectors:** For each $\lambda$, solve $(A - \lambda I)\mathbf{x} = \mathbf{0}$
3. **Orthogonalize:** Eigenvectors from distinct eigenvalues are automatically orthogonal. If eigenvalue has multiplicity $> 1$, apply **Gram-Schmidt** within that eigenspace.
4. **Normalize:** $\mathbf{u} = \mathbf{v} / \|\mathbf{v}\|$
5. **Assemble:** $P = [\mathbf{u}_1 \mid \mathbf{u}_2 \mid \cdots]$, $D = \text{diag}(\lambda_1, \lambda_2, \ldots)$ matching column order of $P$
6. **Result:** $A = PDP^T$ (since $P^{-1} = P^T$ for orthogonal $P$)

**2x2 shortcut:** For $\begin{pmatrix} a & b \\ b & d \end{pmatrix}$:

$$\lambda = \frac{(a+d) \pm \sqrt{(a-d)^2 + 4b^2}}{2}$$

**Sanity checks:** $\sum \lambda_i = \text{trace}(A)$ and $\prod \lambda_i = \det(A)$.

### Worked examples

- **2x2:** See [[orth-diag-2x2]] — Quiz 5 problem, $A = \begin{pmatrix} 4 & 1 \\ 1 & 4 \end{pmatrix}$ (scored 10/10)
- **3x3 with repeated eigenvalue + Gram-Schmidt:** See [[orth-diag-3x3-repeated]]

### Spectral Decomposition

If $A = PDP^T$ with orthonormal eigenvectors $\mathbf{u}_1, \ldots, \mathbf{u}_n$ and eigenvalues $\lambda_1, \ldots, \lambda_n$:

$$\boxed{A = \lambda_1 \mathbf{u}_1\mathbf{u}_1^T + \lambda_2 \mathbf{u}_2\mathbf{u}_2^T + \cdots + \lambda_n \mathbf{u}_n\mathbf{u}_n^T}$$

Each $\mathbf{u}_i\mathbf{u}_i^T$ is a rank-1 projection matrix (only when $\mathbf{u}_i$ is a unit vector).

See [[spectral-decomposition]] for a full worked example with verification.

### True/False from SP4 (§7.1.25-32) — EXAM CRITICAL

Full drill with justifications: [[tf-drill]]

Quick reference:

| # | Statement | Answer |
|---|---|---|
| 25 | Orth. diag. $\implies$ symmetric | **T** |
| 26 | $\exists$ symmetric not orth. diag. | **F** (Spectral Thm) |
| 27 | Orthogonal matrix is orth. diag. | **F** (not necessarily symmetric) |
| 28 | $B = PDP^T$ with $P$ orth. $\implies B$ symmetric | **T** |
| 29 | $\mathbf{v}\mathbf{v}^T$ is projection matrix | **F** (only if $\|\mathbf{v}\| = 1$) |
| 30 | Symmetric, $A\mathbf{u}=3\mathbf{u}$, $A\mathbf{v}=4\mathbf{v}$ $\implies \mathbf{u}\cdot\mathbf{v}=0$ | **T** |
| 31 | $n \times n$ symmetric has $n$ distinct eigenvalues | **F** (can repeat) |
| 32 | $\dim(\text{eigenspace}) < \text{multiplicity}$ | **F** (always equal) |

### Additional SP4 proofs (§7.1.33-38)

- **33:** If $A$ is symmetric, $(\!A\mathbf{x}\!) \cdot \mathbf{y} = \mathbf{x} \cdot (\!A\mathbf{y}\!)$ for all $\mathbf{x}, \mathbf{y}$
- **34:** If $A$ is symmetric, then $B^TAB$, $B^TB$, and $BB^T$ are all symmetric
- **35:** $A$ invertible and orth. diag. $\implies A^{-1}$ is also orth. diag. ($A^{-1} = PD^{-1}P^T$)
- **36:** $A, B$ both orth. diag. and $AB = BA \implies AB$ is orth. diag.
- **37:** For symmetric $A$, $\dim(\text{eigenspace for } \lambda) = \text{multiplicity of } \lambda$
- **38:** $A = PRP^{-1}$ with $P$ orth. and $R$ upper triangular, $A$ symmetric $\implies R$ is diagonal

[Source: Answer_keys_to_SP4-5.pdf]

## Common mistakes

- Forgetting to **normalize** eigenvectors
- Eigenvalues in $D$ must match **column order** of $P$
- Only works for **symmetric** matrices
- Confusing "$n$ real eigenvalues" with "$n$ distinct eigenvalues" — multiplicities can repeat (Q31)
- $\mathbf{v}\mathbf{v}^T$ is only a projection matrix if $\mathbf{v}$ is a **unit** vector (Q29)

## Connections

- [[singular-value-decomposition]] — SVD generalizes $PDP^T$ to non-symmetric matrices. $A^TA$ is symmetric $\to$ Spectral Theorem gives $V$.
- [[image-compression-svd]] — truncated SVD relies on spectral decomposition concepts
- [[quantum-information]] — quantum states use orthonormal bases
- [[least-squares]] — eigenvalues of $A^TA$ appear in least-squares analysis
- [[markov-chains]] — steady-state analysis uses eigenvalue decomposition

## Source Citations

[Source: submission_400425878.pdf] — Quiz 5, scored 10/10.
[Source: lay-mcdonald-7.1-7.4-7.5.pdf] — §7.1 Spectral Theorem, Examples 2-4, T/F 25-32.
[Source: Answer_keys_to_SP4-5.pdf] — SP4 answer key, §7.1.25-38 full solutions.
[Source: spectral theorem.pdf] — Class notes on spectral theorem.
[Source: 401-s26-sp4-2.pdf] — SP4 problem set.
