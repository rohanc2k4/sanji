---
title: LU MPI3 — Recommended Combined Implementation
course: cmsc416
exam: exam3
topics: [lu-factorization, mpi, optimization, parallel-io, cyclic-distribution]
source_count: 2
sources: [lu_mpi1.c, lu_mpi2.c]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: hard
---

A3 Problem 3 asks you to recommend an optimized lu_mpi3.c that combines the best features of MPI1 and MPI2. This page synthesizes the analysis.

## Details

### What's wrong with each version

| Aspect | MPI1 (Block) | MPI2 (Cyclic) |
|---|---|---|
| File I/O | All procs read in parallel (fast) | Rank 0 reads everything + scatter (slow) |
| Data distribution | Block — contiguous rows per proc | Cyclic — round-robin rows |
| Load balance | Bad — early procs idle in late iterations | Good — all procs active throughout |
| Overall | Fast startup, wasted compute time | Slow startup, efficient compute |

### Best features to combine

**From MPI1: Parallel file I/O**
- Every processor opens the file and reads its own rows independently using `fseek`
- No single bottleneck at rank 0
- No need to allocate the full N*N matrix on one processor

**From MPI2: Cyclic data distribution for computation**
- Rows distributed round-robin ensures all processors have work at every iteration
- No load imbalance during the factorization

### The MPI3 strategy

1. **Load phase:** All processors read in parallel (like MPI1), but read their *cyclic* rows, not their block rows. Each processor seeks to rows `rank, rank+P, rank+2P, ...` in the file and reads them into local memory.

2. **Compute phase:** Run the factorization with cyclic distribution (like MPI2). `lead_rank = d % P`, balanced loop bounds.

3. **Result:** Fast parallel I/O startup (no rank-0 bottleneck) + balanced computation (no idle processors).

### Implementation sketch

```c
// Load: each proc reads its cyclic rows independently
size_t row_count = dim / proc_count;
float *A = malloc(sizeof(float) * row_count * dim);
for(size_t r = 0; r < row_count; r++){
    size_t global_row = proc_rank + r * proc_count;  // cyclic: row 0,P,2P,...
    size_t file_offset = sizeof(size_t) + global_row * dim * sizeof(float);
    fseek(infile, file_offset, SEEK_SET);
    fread(A + r * dim, sizeof(float), dim, infile);
}

// Factorize: same as MPI2 (cyclic distribution)
// lead_rank = d % proc_count
// Balanced loop bounds, all procs active throughout
```

### Why this works

- The fseek pattern is slightly more complex than MPI1's single contiguous read per proc, but each processor still only opens and reads from the file independently — no MPI communication needed for data distribution.
- The computation is identical to MPI2's well-balanced approach.
- Memory usage is optimal: each proc allocates only N/P rows, no full-matrix allocation anywhere.

## Connections

- Combines best of [[lu-mpi1-analysis]] (I/O) and [[lu-mpi2-analysis]] (computation)
- Relies on understanding [[block-vs-cyclic-distribution]]
- Part of A3 Problem 3 — the 40% problem

## Source Citations

- [Source: lu_mpi1.c] — parallel fseek I/O pattern (lines 85-116)
- [Source: lu_mpi2.c] — cyclic factorization loop (lines 151-177)
