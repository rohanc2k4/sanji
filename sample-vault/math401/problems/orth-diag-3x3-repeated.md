---
title: Orthogonal Diagonalization: 3x3 with Repeated Eigenvalue
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# Orthogonal Diagonalization: 3x3 with Repeated Eigenvalue

**Source:** Lay-McDonald Example 3

## Problem

Orthogonally diagonalize

$$A = \begin{pmatrix} 3 & -2 & 4 \\ -2 & 6 & 2 \\ 4 & 2 & 3 \end{pmatrix}$$

given that the characteristic equation is $(\lambda - 7)^2(\lambda + 2) = 0$.

## Solution

### Step 1: Eigenvalues

$$\lambda_1 = 7 \text{ (multiplicity 2)}, \quad \lambda_2 = -2 \text{ (multiplicity 1)}$$

### Step 2: Eigenvectors

For $\lambda = 7$: solve $(A - 7I)\mathbf{x} = \mathbf{0}$

$$(A - 7I) = \begin{pmatrix} -4 & -2 & 4 \\ -2 & -1 & 2 \\ 4 & 2 & -4 \end{pmatrix} \implies \text{two free variables}$$

$$\mathbf{v}_1 = \begin{pmatrix} 1 \\ 0 \\ 1 \end{pmatrix}, \quad \mathbf{v}_2 = \begin{pmatrix} -1/2 \\ 1 \\ 0 \end{pmatrix}$$

For $\lambda = -2$: solve $(A + 2I)\mathbf{x} = \mathbf{0}$

$$\mathbf{v}_3 = \begin{pmatrix} -1 \\ -1/2 \\ 1 \end{pmatrix}$$

### Step 3: Orthogonalize within the repeated eigenspace

$\mathbf{v}_1$ and $\mathbf{v}_2$ are in the same eigenspace ($\lambda = 7$) but are **NOT orthogonal**:

$$\mathbf{v}_1 \cdot \mathbf{v}_2 = -\tfrac{1}{2} + 0 + 0 = -\tfrac{1}{2} \neq 0$$

**Apply Gram-Schmidt** to get $\mathbf{z}_2$ orthogonal to $\mathbf{v}_1$:

$$\mathbf{z}_2 = \mathbf{v}_2 - \frac{\mathbf{v}_2 \cdot \mathbf{v}_1}{\mathbf{v}_1 \cdot \mathbf{v}_1}\,\mathbf{v}_1 = \begin{pmatrix} -1/2 \\ 1 \\ 0 \end{pmatrix} - \frac{-1/2}{2}\begin{pmatrix} 1 \\ 0 \\ 1 \end{pmatrix} = \begin{pmatrix} -1/4 \\ 1 \\ 1/4 \end{pmatrix}$$

> **Critical:** $\mathbf{v}_3$ (from $\lambda = -2$) is automatically orthogonal to both $\mathbf{v}_1$ and $\mathbf{z}_2$ because it's from a **different** eigenspace. Only vectors within the **same** eigenspace need Gram-Schmidt.

### Step 4: Normalize all three

$$\mathbf{u}_1 = \frac{\mathbf{v}_1}{\|\mathbf{v}_1\|} = \begin{pmatrix} 1/\sqrt{2} \\ 0 \\ 1/\sqrt{2} \end{pmatrix}$$

$$\mathbf{u}_2 = \frac{\mathbf{z}_2}{\|\mathbf{z}_2\|} = \begin{pmatrix} -1/\sqrt{18} \\ 4/\sqrt{18} \\ 1/\sqrt{18} \end{pmatrix}$$

$$\mathbf{u}_3 = \frac{\mathbf{v}_3}{\|\mathbf{v}_3\|} = \begin{pmatrix} -2/3 \\ -1/3 \\ 2/3 \end{pmatrix}$$

### Step 5: Assemble

$$P = \begin{pmatrix} 1/\sqrt{2} & -1/\sqrt{18} & -2/3 \\ 0 & 4/\sqrt{18} & -1/3 \\ 1/\sqrt{2} & 1/\sqrt{18} & 2/3 \end{pmatrix}, \quad D = \begin{pmatrix} 7 & 0 & 0 \\ 0 & 7 & 0 \\ 0 & 0 & -2 \end{pmatrix}$$

$$\boxed{A = PDP^T}$$

> **When do you need Gram-Schmidt?** Only when an eigenvalue has multiplicity $> 1$. For distinct eigenvalues, eigenvectors of a symmetric matrix are automatically orthogonal.
