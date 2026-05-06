---
title: cmsc416 exam prep
---

# CMSC416 final exam prep

## Topics

- Communication patterns (point-to-point, collective, one-sided RMA)
- [[parallel-sorting|Parallel sorting]] — sample sort, bitonic sort, radix variants
- Block vs cyclic distributions and when each wins
- Empirical performance tools — strong vs weak scaling, Amdahl, Gustafson
- LU decomposition with MPI-3 RMA recommendation

## Practice problems

1. Given N elements on P processes, derive the expected communication volume of sample sort.
2. Why does a block distribution beat a cyclic one for the LU pivot row in MPI-3 RMA?
3. Sketch the dependency graph for a tree-reduce of P=8.

Cross-references: [[parallel-sorting]] is the deepest topic. Empirical-performance practice questions hit hardest in past exams.
