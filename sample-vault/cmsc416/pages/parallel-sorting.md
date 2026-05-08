---
title: Parallel Sorting — Quicksort and Odd-Even Sort
course: cmsc416
exam: [exam2, exam3]
topics: [sorting, parallel-quicksort, odd-even-sort, alltoall, communicator-split]
source_count: 2
sources: [09-parallel-sorting.pdf, lec-2026-03-24-captions.txt]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: false
difficulty: medium
---

Parallel sorting was covered before exam3 scope but bridges exam2 and exam3 content. The professor said isoefficiency/analytic analysis of sorting "won't be on [exam2], will be on the next one instead." However, the exam3 announcement focuses on A3 content (LU + HPC Toolkit), so sorting is lower priority.

## Details

### Parallel Quicksort (Practical)

**Setup:** Array distributed across P processors. Goal: all smallest numbers on proc 0 (sorted), next on proc 1, etc.

**Algorithm:**
1. **Pick a pivot** (ideally the median — but finding the median requires sorting, catch-22)
2. **Each processor partitions** its local data around the pivot (≤ pivot on left, > pivot on right)
3. **Global rearrangement:** Low-numbered processors get all elements ≤ pivot, high-numbered get > pivot. Uses `MPI_Alltoall` style communication.
4. **Split communicator:** Low procs form one group, high procs form another. Each group recurses with a new pivot.
5. **Base case:** Each proc has only its own data → local sort (e.g., quicksort internally)

**Key MPI concepts involved:**
- `MPI_Alltoall` / `MPI_Alltoallv` for the global rearrangement step
- `MPI_Comm_split` to subdivide communicators at each recursive level
- Pivot selection: random, median-of-medians, or sample sort approaches

**Isoefficiency:** Modest — reasonably practical for distributed memory. [Source: lec-2026-03-24-captions.txt]

### Odd-Even Sort (Theoretical)

A bubble sort variant that exposes parallelism in the compare-and-exchange steps.

**Algorithm:**
- Outer loop: N iterations (R = 0 to N-1)
- Even iterations (R even): pair up elements at indices (0,1), (2,3), (4,5)... → compare and exchange
- Odd iterations (R odd): pair up at (1,2), (3,4), (5,6)... → compare and exchange
- Each inner loop is fully parallelizable (all pairs independent)

**With N processors for N elements:** Each inner loop is O(1). Total: O(N) compare-exchange rounds.

**With fewer processors (practical variant):** Each processor holds a block of elements. "Compare and exchange" becomes: exchange blocks, each keeps appropriate half (smaller or larger).

**Isoefficiency:** Very poor — exponential in P. "Fun for dances, but trash" for practical use. [Source: lec-2026-03-24-captions.txt]

**GPU relevance:** Professor mentioned odd-even sort becomes more viable on GPUs because of many cores + shared memory making exchanges cheap.

### Communicator Splitting

```c
int color = (rank < size/2) ? 0 : 1;  // low procs = group 0, high = group 1
MPI_Comm sub_comm;
MPI_Comm_split(MPI_COMM_WORLD, color, rank, &sub_comm);
// Now sub_comm only contains procs in your group
```

Used in parallel quicksort at each recursion level to isolate groups.

## Key Formulas / Patterns

| Algorithm | Serial Complexity | Parallel (P procs) | Isoefficiency |
|---|---|---|---|
| Parallel Quicksort | O(N log N) | Practical, good scaling | Modest |
| Odd-Even Sort | O(N²) | O(N) with N procs | Exponential in P (bad) |

## Connections

- Uses [[mpi-broadcast]] style collectives (Alltoall)
- Isoefficiency concept from [[parallel-performance-analysis]]
- Professor mentioned revisiting sorting for GPU discussion later

## Source Citations

- [Source: 09-parallel-sorting.pdf] — parallel sorting algorithms slides
- [Source: lec-2026-03-24-captions.txt] — detailed quicksort walkthrough, odd-even sort demo with students, pivot selection discussion
