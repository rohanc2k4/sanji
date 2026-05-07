---
title: Orthogonal Diagonalization: 2x2
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# Orthogonal Diagonalization: 2x2

**Source:** Quiz 5 (scored 10/10)

## Problem

Orthogonally diagonalize

$$A = \begin{pmatrix} 4 & 1 \\ 1 & 4 \end{pmatrix}$$

That is, find orthogonal $P$ and diagonal $D$ such that $A = PDP^T$.

## Solution

### Step 1: Eigenvalues

$$\det(A - \lambda I) = (4 - \lambda)^2 - 1 = \lambda^2 - 8\lambda + 15 = (\lambda - 5)(\lambda - 3) = 0$$

$$\lambda_1 = 5, \quad \lambda_2 = 3$$

> **Checks:** $5 + 3 = 8 = \text{trace}(A)$ $\checkmark$ and $5 \times 3 = 15 = \det(A)$ $\checkmark$

> **2x2 shortcut:** For $\begin{pmatrix} a & b \\ b & d \end{pmatrix}$, eigenvalues are $\dfrac{(a+d) \pm \sqrt{(a-d)^2 + 4b^2}}{2}$

### Step 2: Eigenvectors

For $\lambda_1 = 5$:

$$(A - 5I)\mathbf{x} = \begin{pmatrix} -1 & 1 \\ 1 & -1 \end{pmatrix}\mathbf{x} = \mathbf{0} \implies x_2 = x_1 \implies \mathbf{v}_1 = \begin{pmatrix} 1 \\ 1 \end{pmatrix}$$

For $\lambda_2 = 3$:

$$(A - 3I)\mathbf{x} = \begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}\mathbf{x} = \mathbf{0} \implies x_2 = -x_1 \implies \mathbf{v}_2 = \begin{pmatrix} 1 \\ -1 \end{pmatrix}$$

### Step 3: Verify orthogonality

$$\mathbf{v}_1 \cdot \mathbf{v}_2 = 1(1) + 1(-1) = 0 \quad \checkmark$$

> For symmetric matrices, eigenvectors from **distinct** eigenvalues are **automatically orthogonal**. No Gram-Schmidt needed here.

### Step 4: Normalize

$$\|\mathbf{v}_1\| = \sqrt{2}, \quad \|\mathbf{v}_2\| = \sqrt{2}$$

$$\mathbf{u}_1 = \begin{pmatrix} 1/\sqrt{2} \\ 1/\sqrt{2} \end{pmatrix}, \quad \mathbf{u}_2 = \begin{pmatrix} 1/\sqrt{2} \\ -1/\sqrt{2} \end{pmatrix}$$

### Step 5: Assemble

$$P = \begin{pmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \end{pmatrix}, \quad D = \begin{pmatrix} 5 & 0 \\ 0 & 3 \end{pmatrix}$$

$$\boxed{A = PDP^T}$$

> **Remember:** Column order of $P$ must match diagonal order of $D$. The column for $\lambda_1 = 5$ goes with the $5$ on the diagonal.
