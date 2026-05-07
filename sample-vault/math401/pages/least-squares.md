---
title: Least-Squares Solutions
course: math401
exam: exam2
topics: [least-squares, normal-equation, regression, residuals]
source_count: 1
sources: [submission_395902441.pdf]
created: 2026-04-09
last_updated: 2026-04-09
status: needs_review
exam_relevant: true
difficulty: medium
---

A least-squares solution $\hat{\mathbf{x}}$ to $A\mathbf{x} = \mathbf{b}$ minimizes $\|\mathbf{b} - A\mathbf{x}\|$, the length of the residual. It solves the **normal equation** $A^TA\hat{\mathbf{x}} = A^T\mathbf{b}$. Essential when $A\mathbf{x} = \mathbf{b}$ has no exact solution ($\mathbf{b} \notin \text{Col}(A)$).

## Details

### The normal equation

$$\hat{\mathbf{x}} = (A^TA)^{-1}A^T\mathbf{b}$$

Works when $A^TA$ is invertible (i.e., $A$ has linearly independent columns).

### Checking if $\mathbf{u}$ is a least-squares solution (without computing one)

Use the **orthogonality condition**: $\hat{\mathbf{x}}$ is a least-squares solution iff the residual $\mathbf{b} - A\hat{\mathbf{x}}$ is orthogonal to every column of $A$:

$$A^T(\mathbf{b} - A\hat{\mathbf{x}}) = \mathbf{0}$$

> **Rohan's Exam 1 mistake (Q1a):** Originally thought $A\mathbf{u} = \mathbf{b}$ was required (exact solution). Corrected via regrade: least-squares solutions can have nonzero residuals. The test is whether the residual is $\perp$ to $\text{Col}(A)$.

### Least-squares lines

Given data points, fit $y = mx + b$ by setting up $A\mathbf{x} = \mathbf{b}$:

**Two types of regression (Exam 1 Q2):**

| Line | Minimizes | $A$ has columns |
|---|---|---|
| $y = mx + b$ | **Vertical** error $\sum(y_i - (mx_i + b))^2$ | $[\mathbf{1} \mid \mathbf{x}\text{-values}]$ |
| $x = ny + c$ | **Horizontal** error $\sum(x_i - (ny_i + c))^2$ | $[\mathbf{1} \mid \mathbf{y}\text{-values}]$ |

These give **different** lines unless the data is perfectly collinear.

### Worked example (Exam 1 Q2)

Given points $(0,0)$, $(0,1)$, $(1,1)$:

For $y = mx + b$:

$$A = \begin{pmatrix} 1 & 0 \\ 1 & 0 \\ 1 & 1 \end{pmatrix}, \quad \mathbf{b} = \begin{pmatrix} 0 \\ 1 \\ 1 \end{pmatrix}$$

$$A^TA = \begin{pmatrix} 3 & 1 \\ 1 & 1 \end{pmatrix}, \quad A^T\mathbf{b} = \begin{pmatrix} 2 \\ 1 \end{pmatrix}$$

Solve normal equation $\to$ get $m$ and $b$.

## Key Formulas / Patterns

- **Normal equation:** $A^TA\hat{\mathbf{x}} = A^T\mathbf{b}$
- **Orthogonality test:** $\hat{\mathbf{x}}$ is least-squares iff $A^T(\mathbf{b} - A\hat{\mathbf{x}}) = \mathbf{0}$
- **Residual:** $\mathbf{r} = \mathbf{b} - A\hat{\mathbf{x}}$ (perpendicular to $\text{Col}(A)$)
- **Projection:** $A\hat{\mathbf{x}} = \text{proj}_{\text{Col}(A)}\,\mathbf{b}$

## Common mistakes

- Confusing least-squares with exact solution — least-squares can have nonzero residual
- Vertical error ($y = mx + b$) vs horizontal error ($x = ny + c$) are different problems
- Computation errors in $A^TA$

## Connections

- [[orthogonal-diagonalization]] — eigenvalues of $A^TA$ relate to least-squares geometry
- [[singular-value-decomposition]] — pseudoinverse $A^+ = V\Sigma^+U^T$ gives least-squares solution
- [[graph-laplacian-fiedler]] — both use matrix decomposition

## Source Citations

[Source: submission_395902441.pdf] — Exam 1 Q1 (10/10 after regrade) and Q2 (10/10).
