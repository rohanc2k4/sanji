---
title: MATH401 Exam 2 — 4-Hour Cram Plan
type: exam-prep
status: evergreen
last_updated: 2026-04-10
sources: []
---

# MATH401 Exam 2 — 4-Hour Cram Plan

**Exam:** April 10, 2026
**Your profile:** Exam 1 86% (T/F was 40%), Quiz 5 100%, Quiz 6 90%
**Friend's warning:** Decomposition stuff (not image compression) was the hardest

## Reading Order

Read these pages in order. Each links to worked problems.

| Order | Page | Time | Why this order |
|---|---|---|---|
| 1 | [[singular-value-decomposition]] | 60 min | Hardest topic, do it with a fresh mind |
| 2 | [[orthogonal-diagonalization]] | 45 min | Foundation for SVD, quick review since Quiz 5 was 100% |
| 3 | [[image-compression-svd]] | 20 min | Easy application of SVD, formula memorization |
| 4 | [[quantum-information]] | 30 min | Independent topic, straightforward |
| 5 | [[tf-drill]] | 45 min | Your weakest area — drill last so it's fresh for the exam |

Skip [[least-squares]], [[graph-laplacian-fiedler]], [[markov-chains]] unless you finish early. They're Exam 1 topics and only appear in T/F (covered in the drill).

---

## Hour 1 — SVD (the hard part)

Work through these problems in order:

### 1. [[svd-full-2x2]] — Full SVD Computation
Your Quiz 6 problem. Walk through every step of $A = U\Sigma V^T$ for a $2 \times 2$ matrix. **This is the most likely exam problem type.**
- Procedure: $A^TA \to$ eigenvalues $\to \sigma_i \to V \to U$
- Trap to avoid: $V^T$ has eigenvectors as **rows** (you lost 1pt here)

### 2. [[svd-wide-matrix]] — Non-Square SVD Shortcut
What to do when $A$ is $2 \times 3$: use $AA^T$ instead of $A^TA$, flip the formula to $\mathbf{v}_i = \frac{1}{\sigma_i}A^T\mathbf{u}_i$.

### 3. [[svd-subspaces-det]] — Reading Info from SVD
Given an SVD, identify rank, bases for $\text{Col}(A)$, $\text{Nul}(A)$, and compute $|\det(A)|$. Three problems from SP4.

---

## Hour 2 — Orthogonal Diagonalization

### 4. [[orth-diag-2x2]] — Standard 2x2
Your Quiz 5 problem. Clean procedure for $A = PDP^T$. Includes the 2x2 eigenvalue shortcut formula.

### 5. [[orth-diag-3x3-repeated]] — 3x3 with Gram-Schmidt
The tricky case: repeated eigenvalue means eigenvectors in the same eigenspace might NOT be orthogonal. Must Gram-Schmidt within the eigenspace.

### 6. [[spectral-decomposition]] — Spectral Decomposition
Write $A = \lambda_1 \mathbf{u}_1\mathbf{u}_1^T + \lambda_2 \mathbf{u}_2\mathbf{u}_2^T + \cdots$. Worked example with verification.

---

## Hour 3 — Quantum + Image Compression

### 7. [[quantum-global-phase]] — Same State Test
5 examples of checking whether $|v\rangle = c\,|v'\rangle$ with $|c| = 1$. The method: write as column vectors, check if ratio is constant with unit magnitude.

### 8. [[quantum-superposition]] — Superposition Classification
Is a state a superposition in the standard basis? Hadamard basis? 4 worked examples with tables.

### 9. [[quantum-measurement]] — Measurement Probabilities
$P(|b_i\rangle) = |\langle b_i | \psi \rangle|^2$. Four problems including measurement in non-standard bases.

### 10. [[image-compression]] — Compression Ratio and Quality
Derive $k(m+n+1)/mn$, compute quality from singular values, know when compression is worth doing.

---

## Hour 4 — T/F Drill + Cheat Sheet

### 11. [[tf-drill]] — All True/False Questions
Every T/F from SP4 answer key (§7.1.25-32) plus SVD and earlier topics. Each has the answer and a one-line justification. **This is your biggest point-risk area.**

### Cheat Sheet Layout

**Side 1 — Procedures:**
- Orth. diag. procedure (5 steps) + $\lambda = \frac{(a+d) \pm \sqrt{(a-d)^2 + 4b^2}}{2}$
- SVD procedure (5 steps) + $AA^T$ vs $A^TA$ rule
- Spectral decomposition: $A = \sum \lambda_i \mathbf{u}_i \mathbf{u}_i^T$
- Four subspaces table ($U$ first $r$ = Col, $V$ last $n-r$ = Nul, etc.)
- Image compression: quality $= \frac{\sum_{i=1}^k \sigma_i^2}{\sum_{i=1}^r \sigma_i^2}$, ratio $= \frac{k(m+n+1)}{mn}$, worth it when $k < \frac{mn}{m+n+1}$
- Quantum: basis conversions, $P(|b_i\rangle) = |\langle b_i|\psi\rangle|^2$, global phase test

**Side 2 — T/F + Mini-Examples:**
- SP4 §7.1.25-32 (8 items with one-line reasons)
- SVD T/F (7 items)
- One compact worked SVD
- 3 global phase examples (same/same/different)
- 1 measurement example
