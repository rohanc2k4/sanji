---
title: Singular Value Decomposition (SVD)
course: math401
exam: exam2
topics: [svd, eigenvalues, orthogonal-matrices, matrix-factorization]
source_count: 7
sources: [submission_402763442.pdf, lay-mcdonald-7.1-7.4-7.5.pdf, Answer_keys_to_SP4-5.pdf, ch_svd.pdf, 401-s26-sp4-2.pdf, svd 2-1.pdf, review-session-xiaolu-04-07.txt]
created: 2026-04-09
last_updated: 2026-04-09
status: needs_review
exam_relevant: true
difficulty: hard
---

The Singular Value Decomposition factors any $m \times n$ matrix $A$ into $A = U\Sigma V^T$, where $U$ is $m \times m$ orthogonal, $\Sigma$ is $m \times n$ diagonal of singular values, and $V$ is $n \times n$ orthogonal. Unlike orthogonal diagonalization, SVD works for **any** matrix.

## Details

### Step-by-step procedure

1. **Compute $A^TA$** (an $n \times n$ symmetric matrix)
2. **Eigenvalues of $A^TA$:** Solve $\det(A^TA - \lambda I) = 0$. All $\lambda_i \geq 0$.
3. **Singular values:** $\sigma_i = \sqrt{\lambda_i}$, ordered $\sigma_1 \geq \sigma_2 \geq \cdots \geq 0$
4. **Construct $\Sigma$:** Diagonal matrix with $\sigma_1, \sigma_2, \ldots$ on the diagonal
5. **Find $V$:** Orthonormal eigenvectors of $A^TA$ become columns of $V$. **Normalize!**
6. **Construct $V^T$:** Transpose of $V$ (eigenvectors become **rows**)
7. **Find $U$:** $\mathbf{u}_i = \frac{1}{\sigma_i} A\mathbf{v}_i$ — automatically orthonormal
8. **Result:** $A = U\Sigma V^T$

### Worked example (Quiz 6)

See [[svd-full-2x2]] for the full worked SVD of $A = \begin{pmatrix} 4 & 6 \\ 0 & 4 \end{pmatrix}$ (scored 9/10, lost 1pt on $V$ vs $V^T$).

### Computational shortcut: $AA^T$ vs $A^TA$

$A^TA$ is $n \times n$ and $AA^T$ is $m \times m$. **Use whichever is smaller.** [Source: review-session-xiaolu-04-07.txt]

- $m < n$ (wide matrix, e.g. $2 \times 3$): compute $AA^T$. Get $U$ directly, then $\mathbf{v}_i = \frac{1}{\sigma_i} A^T\mathbf{u}_i$
- $m > n$ (tall matrix): compute $A^TA$ as usual. Get $V$, then $\mathbf{u}_i = \frac{1}{\sigma_i} A\mathbf{v}_i$
- Both give the **same nonzero eigenvalues** (same $\sigma$'s)

See [[svd-wide-matrix]] for a full $2 \times 3$ worked example.

### Maximizing $\|A\mathbf{x}\|$ (SP4 Exercise 14)

$$\|A\mathbf{x}\|^2 = \mathbf{x}^T(A^TA)\mathbf{x}$$

Subject to $\|\mathbf{x}\| = 1$, the max is $\lambda_1$ (largest eigenvalue of $A^TA$), attained at $\mathbf{v}_1$.

$$\boxed{\max_{\|\mathbf{x}\|=1} \|A\mathbf{x}\| = \sigma_1}$$

### Four Fundamental Subspaces from SVD

Given $A = U\Sigma V^T$ with rank $r$: [Source: lay-mcdonald-7.1-7.4-7.5.pdf]

| Subspace | Basis | Which columns |
|---|---|---|
| $\text{Col}(A)$ | $\{\mathbf{u}_1, \ldots, \mathbf{u}_r\}$ | First $r$ of $U$ |
| $\text{Nul}(A^T)$ | $\{\mathbf{u}_{r+1}, \ldots, \mathbf{u}_m\}$ | Remaining of $U$ |
| $\text{Row}(A)$ | $\{\mathbf{v}_1, \ldots, \mathbf{v}_r\}$ | First $r$ of $V$ |
| $\text{Nul}(A)$ | $\{\mathbf{v}_{r+1}, \ldots, \mathbf{v}_n\}$ | Remaining of $V$ |

See [[svd-subspaces-det]] for worked examples (SP4 exercises 15-17).

### Pseudoinverse

$$A^+ = V_r D^{-1} U_r^T$$

Then $\hat{\mathbf{x}} = A^+\mathbf{b}$ is the least-squares solution of $A\mathbf{x} = \mathbf{b}$ with smallest norm. [Source: lay-mcdonald-7.1-7.4-7.5.pdf]

### Condition Number

For invertible $n \times n$ matrix $A$:

$$\text{condition number} = \frac{\sigma_1}{\sigma_n}$$

Large condition number $\implies$ solution of $A\mathbf{x} = \mathbf{b}$ is sensitive to errors. [Source: lay-mcdonald-7.1-7.4-7.5.pdf]

### Determinant from SVD

$$|\det(A)| = \sigma_1 \cdot \sigma_2 \cdots \sigma_n$$

Proof in [[svd-subspaces-det]]. [Source: Answer_keys_to_SP4-5.pdf]

### Inverse from SVD

If $A$ is invertible (all $\sigma_i > 0$):

$$A^{-1} = V\Sigma^{-1}U^T$$

where $\Sigma^{-1}$ has $1/\sigma_i$ on the diagonal. [Source: Answer_keys_to_SP4-5.pdf]

## Key Formulas / Patterns

- $A^TA$ eigenvalues $\to \sigma_i^2$
- $V$ columns $=$ orthonormal eigenvectors of $A^TA$
- $U$ columns: $\mathbf{u}_i = \frac{1}{\sigma_i}A\mathbf{v}_i$
- $\text{rank}(A) =$ number of nonzero $\sigma$'s
- $\|A\|$ (operator norm) $= \sigma_1$

## Common mistakes

1. **Forgetting to normalize eigenvectors** before constructing $V$
2. **Confusing $V$ and $V^T$** — $V$ has eigenvectors as columns, $V^T$ has them as rows
3. **Wrong order** — convention is $\sigma_1 \geq \sigma_2 \geq \cdots$
4. Computing $AA^T$ when you meant $A^TA$ for $V$ (or vice versa)

## Connections

- [[orthogonal-diagonalization]] — SVD generalizes $PDP^T$ to non-symmetric matrices. $A^TA$ is symmetric, so Spectral Theorem applies for $V$.
- [[least-squares]] — pseudoinverse $A^+ = V\Sigma^+U^T$ gives least-squares solution
- [[image-compression-svd]] — primary application of truncated SVD

## Source Citations

[Source: submission_402763442.pdf] — Quiz 6, scored 9/10 (lost 1pt on $V^T$).
[Source: lay-mcdonald-7.1-7.4-7.5.pdf] — §7.4 SVD theory, fundamental subspaces, pseudoinverse, condition number.
[Source: Answer_keys_to_SP4-5.pdf] — SP4 §7.4.13-18 worked solutions.
[Source: ch_svd.pdf] — Justin's SVD notes.
[Source: svd 2-1.pdf] — Class notes on geometry of orthogonal matrices and SVD.
[Source: review-session-xiaolu-04-07.txt] — TA Xiaolu review session, $AA^T$ shortcut.
