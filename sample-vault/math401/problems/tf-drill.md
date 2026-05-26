---
title: True/False Drill
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# True/False Drill

**Source:** SP4 §7.1.25-32, §7.4.13-18, Answer Keys

Your Exam 1 T/F score: **4/10 (40%)**. This is the only section with unseen questions. Drill until automatic.

---

## Spectral Theorem T/F (SP4 §7.1.25-32)

### Q25: An $n \times n$ matrix that is orthogonally diagonalizable must be symmetric.

> **TRUE.** If $A = PDP^T$ with $P$ orthogonal, then $A^T = (PDP^T)^T = PD^TP^T = PDP^T = A$.

### Q26: There are symmetric matrices that are not orthogonally diagonalizable.

> **FALSE.** The Spectral Theorem guarantees that **every** symmetric matrix is orthogonally diagonalizable.

### Q27: An orthogonal matrix is orthogonally diagonalizable.

> **FALSE.** An orthogonal matrix satisfies $P^TP = I$, but it is **not necessarily symmetric**. Example: a rotation matrix $\begin{pmatrix} 0 & -1 \\ 1 & 0 \end{pmatrix}$ is orthogonal but not symmetric (and has complex eigenvalues).

### Q28: If $B = PDP^T$ where $P^T = P^{-1}$ and $D$ is diagonal, then $B$ is symmetric.

> **TRUE.** $B^T = (PDP^T)^T = PD^TP^T = PDP^T = B$ (since $D^T = D$ for diagonal matrices).

### Q29: For a nonzero $\mathbf{v}$ in $\mathbb{R}^n$, the matrix $\mathbf{v}\mathbf{v}^T$ is called a projection matrix.

> **FALSE.** $\mathbf{v}\mathbf{v}^T$ is a projection matrix **only if** $\|\mathbf{v}\| = 1$.
>
> Why: $(\mathbf{v}\mathbf{v}^T)^2 = \mathbf{v}(\mathbf{v}^T\mathbf{v})\mathbf{v}^T = \|\mathbf{v}\|^2 \cdot \mathbf{v}\mathbf{v}^T$. For idempotency ($P^2 = P$), need $\|\mathbf{v}\|^2 = 1$.

### Q30: If $A^T = A$ and $A\mathbf{u} = 3\mathbf{u}$, $A\mathbf{v} = 4\mathbf{v}$, then $\mathbf{u} \cdot \mathbf{v} = 0$.

> **TRUE.** Eigenvectors from **different eigenspaces** of a symmetric matrix are orthogonal (Theorem 1).

### Q31: An $n \times n$ symmetric matrix has $n$ distinct real eigenvalues.

> **FALSE.** It has $n$ real eigenvalues **counting multiplicities**, but they can repeat. Example: $I_n$ has eigenvalue $1$ repeated $n$ times.

### Q32: The dimension of an eigenspace of a symmetric matrix is sometimes less than the multiplicity of the corresponding eigenvalue.

> **FALSE.** By the Spectral Theorem, $\dim(\text{eigenspace}) = \text{multiplicity}$, **always**, for symmetric matrices.

---

## SVD T/F

### Every matrix has an SVD.

> **TRUE.** The SVD exists for any $m \times n$ matrix, regardless of shape or rank.

### Singular values can be negative.

> **FALSE.** $\sigma_i = \sqrt{\lambda_i} \geq 0$ where $\lambda_i$ are eigenvalues of $A^TA$ (which are non-negative).

### $\text{rank}(A) = $ number of nonzero singular values.

> **TRUE.** The nonzero $\sigma_i$'s correspond to the nonzero "stretching directions."

### For square $A$: $|\det(A)| = \sigma_1 \cdot \sigma_2 \cdots \sigma_n$.

> **TRUE.** From $A = U\Sigma V^T$: $|\det(A)| = |\det(U)| \cdot |\det(\Sigma)| \cdot |\det(V^T)| = 1 \cdot \prod \sigma_i \cdot 1$.

### $A$ and $A^T$ have the same singular values.

> **TRUE.** $A^T A$ and $AA^T$ have the same nonzero eigenvalues.

### The condition number of invertible $A$ is $\sigma_1 / \sigma_n$.

> **TRUE.** Large condition number $\implies$ $A\mathbf{x} = \mathbf{b}$ is sensitive to errors.

### $\max_{\|\mathbf{x}\|=1} \|A\mathbf{x}\| = \sigma_1$.

> **TRUE.** Attained at $\mathbf{v}_1$, the unit eigenvector of $A^TA$ for the largest eigenvalue.

---

## Earlier Topics T/F (could appear on exam)

### If two graphs have the same degree matrix, they are isomorphic.

> **FALSE.** Many non-isomorphic graphs share the same degree sequence. Degree alone doesn't determine structure.

### Every Markov chain converges to a unique steady state.

> **FALSE.** Only **regular** Markov chains (some $A^k$ has all positive entries) converge to a unique steady state.

### An irreducible Markov chain is regular.

> **FALSE.** Irreducible means you can reach any state from any other. But an irreducible chain can be **periodic** (e.g., bipartite graph), which makes it not regular.

### The Fiedler value of a connected graph is positive.

> **TRUE.** Fiedler value $= \lambda_2(L) > 0$ for connected graphs. $\lambda_2 = 0$ only if disconnected.

### Every finite Markov chain has at least one steady-state vector.

> **TRUE.** Guaranteed by Perron-Frobenius. But it may not be **unique**, and the chain may not **converge** to it.
