---
title: LU Factorization
course: cmsc416
exam: exam3
topics:
  - lu-factorization
  - linear-algebra
  - matrix-decomposition
source_count: 2
sources:
  - lu_serial.c
  - 07-dense-mat-algs.pdf
created: 2026-04-07
last_updated: 2026-04-07
status: reviewed
exam_relevant: true
difficulty: medium
---

LU factorization decomposes a square matrix A into a lower triangular matrix L and an upper triangular matrix U such that A = L*U. This makes solving linear systems efficient: instead of solving Ax = b directly, you solve Ly = b (forward substitution) then Ux = y (back substitution).

## Details

The algorithm works column by column. For each pivot column d:
1. Take the pivot row d (the "leading row")
2. For every row i below d, compute `scale = A[i][d] / A[d][d]`
3. Store `scale` in the lower triangle: `A[i][d] = scale`
4. Subtract the scaled pivot row from row i: `A[i][j] -= scale * A[d][j]` for j > d
5. After all columns are processed, the upper triangle of A contains U, and the lower triangle contains L (with implicit 1s on the diagonal)

The implementation in this course is **in-place** — L and U overwrite the original matrix A. No separate L or U matrices are allocated.

## Key Formulas / Patterns

- **Serial runtime:** T_1 = N^3/3 (two nested loops over ~N elements each, iterated N times)
- **Scale factor:** `scale = A[i][d] / A[d][d]`
- **Row update:** `A[i][j] = A[i][j] - scale * A[d][j]` for j = d+1 to N-1
- No pivoting in our implementation — numerically unstable for some matrices but sufficient for course purposes

## Connections

- Parallelized in [[lu-mpi1-analysis]] (block distribution) and [[lu-mpi2-analysis]] (cyclic distribution)
- Uses [[mpi-broadcast]] to share the leading row with all processors
- Performance analyzed in [[parallel-performance-analysis]]

## Source Citations

- [Source: lu_serial.c] — lines 95-108, the serial factorization loop
- [Source: 07-dense-mat-algs.pdf] — LU factorization theory and parallelization strategies
