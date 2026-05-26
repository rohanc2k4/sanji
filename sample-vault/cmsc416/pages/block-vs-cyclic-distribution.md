---
title: Block vs Cyclic Data Distribution
course: cmsc416
exam: exam3
topics:
  - data-distribution
  - block-distribution
  - cyclic-distribution
  - load-balance
source_count: 4
sources:
  - lu_mpi1.c
  - lu_mpi2.c
  - 07-dense-mat-algs.pdf
  - 06-hpc-linear-algebra.pdf
created: 2026-04-07
last_updated: 2026-04-07
status: reviewed
exam_relevant: true
difficulty: medium
---

Block and cyclic distribution are the two fundamental ways to partition matrix rows (or other data) across processors. The choice directly affects load balance, communication patterns, and I/O strategy.

## Details

### Block (Contiguous) Distribution

Each processor gets a contiguous chunk of rows.

```
P=4, N=16:
Proc 0: rows  0, 1, 2, 3
Proc 1: rows  4, 5, 6, 7
Proc 2: rows  8, 9,10,11
Proc 3: rows 12,13,14,15
```

**Row ownership:** global row d → processor `d / (N/P)`
**Local index:** `d % (N/P)`

Pros:
- Simple mapping
- Data is contiguous in memory → good cache behavior
- Easy to do parallel file I/O (each proc reads a contiguous chunk)

Cons:
- **Load imbalance for LU-type algorithms.** As the algorithm progresses through columns, earlier processors run out of work while later processors still have rows to update.

### Cyclic (Round-Robin) Distribution

Rows are dealt out like cards, one at a time.

```
P=4, N=16:
Proc 0: rows  0, 4, 8,12
Proc 1: rows  1, 5, 9,13
Proc 2: rows  2, 6,10,14
Proc 3: rows  3, 7,11,15
```

**Row ownership:** global row d → processor `d % P`
**Local index:** `d / P`

Pros:
- **Excellent load balance for LU.** Active rows are spread across all processors at every stage of the algorithm. No processor runs out of work early.

Cons:
- Data is non-contiguous in the original matrix → complicates file I/O
- Rank 0 must read and rearrange data before distributing (in this course's implementation)
- Slightly more complex index math

### Block-Cyclic (not in our code, but mentioned in lectures)

A hybrid: distribute blocks of B rows cyclically. With B=1 it's pure cyclic; with B=N/P it's pure block.

## Key Formulas / Patterns

| Property | Block | Cyclic |
|---|---|---|
| Row d on proc | `d / (N/P)` | `d % P` |
| Local index | `d % (N/P)` | `d / P` |
| Load balance for LU | Poor (early procs idle late) | Good (all procs active throughout) |
| File I/O | Easy (contiguous seek) | Hard (non-contiguous, needs reorder) |
| Memory layout | Cache-friendly | Same locally, but global layout scattered |

## Connections

- [[lu-mpi1-analysis]] uses block distribution — fast I/O but load imbalance
- [[lu-mpi2-analysis]] uses cyclic distribution — slow I/O but balanced computation
- [[lu-mpi3-recommendation]] should combine: parallel I/O from block + cyclic computation
- Relates to [[parallel-performance-analysis]] efficiency calculations

## Source Citations

- [Source: lu_mpi1.c] — block distribution implementation
- [Source: lu_mpi2.c] — cyclic distribution implementation
- [Source: 07-dense-mat-algs.pdf] — distribution strategies for dense matrix algorithms
- [Source: 06-hpc-linear-algebra.pdf] — HPC linear algebra data partitioning
