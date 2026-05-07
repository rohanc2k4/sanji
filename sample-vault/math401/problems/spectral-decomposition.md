---
title: Spectral Decomposition
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# Spectral Decomposition

**Source:** Lay-McDonald Example 4

## Problem

Construct the spectral decomposition of

$$A = \begin{pmatrix} 7 & 2 \\ 2 & 4 \end{pmatrix}$$

given the orthogonal diagonalization

$$A = \begin{pmatrix} 2/\sqrt{5} & -1/\sqrt{5} \\ 1/\sqrt{5} & 2/\sqrt{5} \end{pmatrix} \begin{pmatrix} 8 & 0 \\ 0 & 3 \end{pmatrix} \begin{pmatrix} 2/\sqrt{5} & 1/\sqrt{5} \\ -1/\sqrt{5} & 2/\sqrt{5} \end{pmatrix}$$

## Solution

### The Formula

If $A = PDP^T$ with orthonormal eigenvectors $\mathbf{u}_1, \ldots, \mathbf{u}_n$ and eigenvalues $\lambda_1, \ldots, \lambda_n$:

$$\boxed{A = \lambda_1 \mathbf{u}_1\mathbf{u}_1^T + \lambda_2 \mathbf{u}_2\mathbf{u}_2^T + \cdots + \lambda_n \mathbf{u}_n\mathbf{u}_n^T}$$

### Apply it

$$\mathbf{u}_1 = \begin{pmatrix} 2/\sqrt{5} \\ 1/\sqrt{5} \end{pmatrix}, \quad \mathbf{u}_2 = \begin{pmatrix} -1/\sqrt{5} \\ 2/\sqrt{5} \end{pmatrix}, \quad \lambda_1 = 8, \quad \lambda_2 = 3$$

Compute each outer product:

$$\mathbf{u}_1\mathbf{u}_1^T = \begin{pmatrix} 2/\sqrt{5} \\ 1/\sqrt{5} \end{pmatrix}\begin{pmatrix} 2/\sqrt{5} & 1/\sqrt{5} \end{pmatrix} = \begin{pmatrix} 4/5 & 2/5 \\ 2/5 & 1/5 \end{pmatrix}$$

$$\mathbf{u}_2\mathbf{u}_2^T = \begin{pmatrix} -1/\sqrt{5} \\ 2/\sqrt{5} \end{pmatrix}\begin{pmatrix} -1/\sqrt{5} & 2/\sqrt{5} \end{pmatrix} = \begin{pmatrix} 1/5 & -2/5 \\ -2/5 & 4/5 \end{pmatrix}$$

### Combine

$$A = 8 \begin{pmatrix} 4/5 & 2/5 \\ 2/5 & 1/5 \end{pmatrix} + 3 \begin{pmatrix} 1/5 & -2/5 \\ -2/5 & 4/5 \end{pmatrix}$$

$$= \begin{pmatrix} 32/5 & 16/5 \\ 16/5 & 8/5 \end{pmatrix} + \begin{pmatrix} 3/5 & -6/5 \\ -6/5 & 12/5 \end{pmatrix} = \begin{pmatrix} 35/5 & 10/5 \\ 10/5 & 20/5 \end{pmatrix} = \begin{pmatrix} 7 & 2 \\ 2 & 4 \end{pmatrix} \quad \checkmark$$

> Each $\mathbf{u}_i\mathbf{u}_i^T$ is a **rank-1 projection matrix** (only when $\mathbf{u}_i$ is a unit vector). The spectral decomposition breaks $A$ into a weighted sum of projections.
