---
title: "SVD: Full Computation (2x2)"
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# SVD: Full Computation (2x2)

**Source:** Quiz 6 (scored 9/10)

## Problem

Compute the singular value decomposition $A = U\Sigma V^T$ of

$$A = \begin{pmatrix} 4 & 6 \\ 0 & 4 \end{pmatrix}$$

## Solution

### Step 1: Compute $A^T A$

$$A^T = \begin{pmatrix} 4 & 0 \\ 6 & 4 \end{pmatrix}, \quad A^T A = \begin{pmatrix} 4 & 0 \\ 6 & 4 \end{pmatrix}\begin{pmatrix} 4 & 6 \\ 0 & 4 \end{pmatrix} = \begin{pmatrix} 16 & 24 \\ 24 & 52 \end{pmatrix}$$

### Step 2: Eigenvalues of $A^T A$

$$\det(A^T A - \lambda I) = (16 - \lambda)(52 - \lambda) - 24^2 = \lambda^2 - 68\lambda + 256$$

$$= (\lambda - 64)(\lambda - 4) = 0$$

$$\lambda_1 = 64, \quad \lambda_2 = 4$$

> **Sanity check:** $64 + 4 = 68 = 16 + 52 = \text{trace}(A^T A)$ $\checkmark$

### Step 3: Singular values

$$\sigma_1 = \sqrt{64} = 8, \quad \sigma_2 = \sqrt{4} = 2$$

$$\Sigma = \begin{pmatrix} 8 & 0 \\ 0 & 2 \end{pmatrix}$$

### Step 4: Find $V$ (eigenvectors of $A^T A$, normalized)

For $\lambda_1 = 64$:

$$(A^T A - 64I)\mathbf{v} = \begin{pmatrix} -48 & 24 \\ 24 & -12 \end{pmatrix}\mathbf{v} = \mathbf{0} \implies 2x_1 = x_2$$

$$\mathbf{v}_1 = \frac{1}{\sqrt{5}}\begin{pmatrix} 1 \\ 2 \end{pmatrix}$$

For $\lambda_2 = 4$:

$$(A^T A - 4I)\mathbf{v} = \begin{pmatrix} 12 & 24 \\ 24 & 48 \end{pmatrix}\mathbf{v} = \mathbf{0} \implies x_1 = -2x_2$$

$$\mathbf{v}_2 = \frac{1}{\sqrt{5}}\begin{pmatrix} -2 \\ 1 \end{pmatrix}$$

> **Check orthogonality:** $\mathbf{v}_1 \cdot \mathbf{v}_2 = \frac{1}{5}(-2 + 2) = 0$ $\checkmark$

### Step 5: Find $U$ using $\mathbf{u}_i = \frac{1}{\sigma_i} A\mathbf{v}_i$

$$\mathbf{u}_1 = \frac{1}{8}\begin{pmatrix} 4 & 6 \\ 0 & 4 \end{pmatrix}\begin{pmatrix} 1/\sqrt{5} \\ 2/\sqrt{5} \end{pmatrix} = \frac{1}{8}\begin{pmatrix} 16/\sqrt{5} \\ 8/\sqrt{5} \end{pmatrix} = \begin{pmatrix} 2/\sqrt{5} \\ 1/\sqrt{5} \end{pmatrix}$$

$$\mathbf{u}_2 = \frac{1}{2}\begin{pmatrix} 4 & 6 \\ 0 & 4 \end{pmatrix}\begin{pmatrix} -2/\sqrt{5} \\ 1/\sqrt{5} \end{pmatrix} = \frac{1}{2}\begin{pmatrix} -2/\sqrt{5} \\ 4/\sqrt{5} \end{pmatrix} = \begin{pmatrix} -1/\sqrt{5} \\ 2/\sqrt{5} \end{pmatrix}$$

### Step 6: Assemble

$$A = U\Sigma V^T = \begin{pmatrix} 2/\sqrt{5} & -1/\sqrt{5} \\ 1/\sqrt{5} & 2/\sqrt{5} \end{pmatrix} \begin{pmatrix} 8 & 0 \\ 0 & 2 \end{pmatrix} \begin{pmatrix} 1/\sqrt{5} & 2/\sqrt{5} \\ -2/\sqrt{5} & 1/\sqrt{5} \end{pmatrix}$$

> **$V^T$ has eigenvectors as ROWS, not columns. This is where you lost 1pt on Quiz 6.**
