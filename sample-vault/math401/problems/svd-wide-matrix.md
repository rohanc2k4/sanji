---
title: SVD: Wide Matrix Shortcut
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# SVD: Wide Matrix Shortcut

**Source:** Lay-McDonald Example 3, TA Xiaolu review session

## Problem

Compute the SVD of

$$A = \begin{pmatrix} 4 & 11 & 14 \\ 8 & 7 & -2 \end{pmatrix}$$

*Hint: $A$ is $2 \times 3$. Use $AA^T$ instead of $A^T A$.*

## Solution

### Why $AA^T$?

$A^T A$ is $3 \times 3$ (harder). $AA^T$ is $2 \times 2$ (easier). Both give the **same nonzero eigenvalues**, so the same $\sigma$'s.

Using $AA^T$ gives us $U$ directly (instead of $V$ first).

### Step 1: Compute $AA^T$ ($2 \times 2$)

$$AA^T = \begin{pmatrix} 4 & 11 & 14 \\ 8 & 7 & -2 \end{pmatrix}\begin{pmatrix} 4 & 8 \\ 11 & 7 \\ 14 & -2 \end{pmatrix} = \begin{pmatrix} 333 & 81 \\ 81 & 117 \end{pmatrix}$$

### Step 2: Eigenvalues of $AA^T$

$$\det(AA^T - \lambda I) = (333 - \lambda)(117 - \lambda) - 81^2$$

$$= \lambda^2 - 450\lambda + 32{,}400 = (\lambda - 360)(\lambda - 90) = 0$$

$$\lambda_1 = 360, \quad \lambda_2 = 90$$

### Step 3: Singular values

$$\sigma_1 = \sqrt{360} = 6\sqrt{10}, \quad \sigma_2 = \sqrt{90} = 3\sqrt{10}, \quad \sigma_3 = 0$$

### Step 4: Find $U$ (eigenvectors of $AA^T$, normalized)

For $\lambda_1 = 360$:

$$(AA^T - 360I)\mathbf{u} = \begin{pmatrix} -27 & 81 \\ 81 & -243 \end{pmatrix}\mathbf{u} = \mathbf{0} \implies x_2 = \tfrac{1}{3}x_1$$

$$\mathbf{u}_1 = \frac{1}{\sqrt{10}}\begin{pmatrix} 3 \\ 1 \end{pmatrix}$$

For $\lambda_2 = 90$:

$$\mathbf{u}_2 = \frac{1}{\sqrt{10}}\begin{pmatrix} 1 \\ -3 \end{pmatrix}$$

### Step 5: Find $V$ using reversed formula $\mathbf{v}_i = \frac{1}{\sigma_i} A^T \mathbf{u}_i$

$$\mathbf{v}_1 = \frac{1}{6\sqrt{10}} A^T \mathbf{u}_1 = \frac{1}{6\sqrt{10}} \begin{pmatrix} 4 & 8 \\ 11 & 7 \\ 14 & -2 \end{pmatrix}\begin{pmatrix} 3/\sqrt{10} \\ 1/\sqrt{10} \end{pmatrix} = \begin{pmatrix} 1/3 \\ 2/3 \\ 2/3 \end{pmatrix}$$

$$\mathbf{v}_2 = \frac{1}{3\sqrt{10}} A^T \mathbf{u}_2 = \begin{pmatrix} -2/3 \\ -1/3 \\ 2/3 \end{pmatrix}$$

For $\sigma_3 = 0$: solve $A^T A \mathbf{v} = \mathbf{0}$ and find $\mathbf{v}_3$ orthogonal to $\mathbf{v}_1, \mathbf{v}_2$:

$$\mathbf{v}_3 = \begin{pmatrix} 2/3 \\ -2/3 \\ 1/3 \end{pmatrix}$$

### Step 6: Assemble

$$\Sigma = \begin{pmatrix} 6\sqrt{10} & 0 & 0 \\ 0 & 3\sqrt{10} & 0 \end{pmatrix}$$

$$A = U\Sigma V^T$$

> **Key takeaway:** For $m < n$, compute $AA^T$ and use $\mathbf{v}_i = \frac{1}{\sigma_i}A^T\mathbf{u}_i$. Saves significant computation.
