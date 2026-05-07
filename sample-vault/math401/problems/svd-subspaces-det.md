---
title: SVD: Subspaces, Rank, and Determinant
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# SVD: Subspaces, Rank, and Determinant

**Source:** SP4 Exercises 15-17, Lay-McDonald §7.4

## Problem 1 (Exercise 15)

Suppose the SVD of a $3 \times 3$ matrix $A$ is:

$$A = \begin{pmatrix} 0.40 & -0.78 & 0.47 \\ 0.37 & -0.33 & -0.87 \\ -0.84 & -0.52 & -0.16 \end{pmatrix} \begin{pmatrix} 7.10 & 0 & 0 \\ 0 & 3.10 & 0 \\ 0 & 0 & 0 \end{pmatrix} \begin{pmatrix} 0.30 & -0.51 & -0.81 \\ 0.76 & 0.64 & -0.12 \\ 0.58 & -0.58 & 0.58 \end{pmatrix}$$

**(a)** What is $\text{rank}(A)$?

**(b)** Give a basis for $\text{Col}(A)$ and $\text{Nul}(A)$.

## Solution 1

**(a)** Count nonzero singular values: $\sigma_1 = 7.10$, $\sigma_2 = 3.10$, $\sigma_3 = 0$.

$$\boxed{\text{rank}(A) = 2}$$

**(b)** Read directly from $U$ and $V$:

**Basis of $\text{Col}(A)$** = first $r = 2$ columns of $U$:

$$\left\{ \begin{pmatrix} 0.40 \\ 0.37 \\ -0.84 \end{pmatrix}, \begin{pmatrix} -0.78 \\ -0.33 \\ -0.52 \end{pmatrix} \right\}$$

**Basis of $\text{Nul}(A)$** = last $(n - r) = 1$ column of $V$:

$$\left\{ \begin{pmatrix} -0.81 \\ -0.12 \\ 0.58 \end{pmatrix} \right\}$$

> **Full table to memorize:**
>
> | Subspace | Basis from | Which columns |
> |---|---|---|
> | $\text{Col}(A)$ | $U$ | first $r$ |
> | $\text{Nul}(A^T)$ | $U$ | last $m - r$ |
> | $\text{Row}(A) = \text{Col}(A^T)$ | $V$ | first $r$ |
> | $\text{Nul}(A)$ | $V$ | last $n - r$ |

---

## Problem 2 (Exercise 17)

Show that for a square matrix $A$:

$$|\det(A)| = \sigma_1 \cdot \sigma_2 \cdots \sigma_n$$

## Solution 2

Since $A = U\Sigma V^T$:

$$\det(A) = \det(U) \cdot \det(\Sigma) \cdot \det(V^T)$$

$U$ and $V$ are orthogonal, so $|\det(U)| = |\det(V^T)| = 1$.

$\Sigma$ is diagonal, so $\det(\Sigma) = \sigma_1 \cdot \sigma_2 \cdots \sigma_n$.

$$\therefore \quad |\det(A)| = 1 \cdot (\sigma_1 \sigma_2 \cdots \sigma_n) \cdot 1 = \sigma_1 \sigma_2 \cdots \sigma_n \quad \square$$

---

## Problem 3 (Exercise 14)

Find a unit vector $\mathbf{x}$ that maximizes $\|A\mathbf{x}\|$ and compute the maximum, given $A^T A$ has eigenvalues $9, 4$.

## Solution 3

$$\|A\mathbf{x}\|^2 = \mathbf{x}^T(A^TA)\mathbf{x}$$

Subject to $\|\mathbf{x}\| = 1$, the max of $\mathbf{x}^T(A^TA)\mathbf{x}$ is $\lambda_1 = 9$, attained at the unit eigenvector $\mathbf{v}_1$ for $\lambda_1$.

$$\max \|A\mathbf{x}\| = \sqrt{\lambda_1} = \sigma_1 = 3$$

> **The max of $\|A\mathbf{x}\|$ over unit vectors is always $\sigma_1$, the largest singular value.**
