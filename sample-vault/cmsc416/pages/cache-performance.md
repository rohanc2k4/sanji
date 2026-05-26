---
title: Cache Performance — Row vs Column, Memory Hierarchy, Cache Coherence
course: cmsc416
exam: exam3
topics: [cache, memory-hierarchy, row-major, column-major, cache-coherence, spatial-locality]
source_count: 3
sources: [lec-2026-03-26-captions.txt, lec-2026-04-02-captions.txt, 10-empirical-performance.pdf]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: medium
---

Cache performance explains why two algorithms with identical big-O complexity can have 4-5x different real-world runtimes. Understanding cache is essential for both serial optimization and parallel shared-memory programming.

## Details

### How Cache Works

When the CPU requests memory address X, the hardware fetches a whole **cache line** (~64 bytes) containing X and its neighbors into cache. Subsequent accesses to nearby addresses are nearly instant (0.5 ns from L1 vs 100 ns from main memory).

**Spatial locality:** Accessing sequential memory addresses benefits from cache because each fetch brings in neighbors you'll need next.

### Row-Major vs Column-Major

| Language | Memory layout | Fast traversal |
|---|---|---|
| **C** (row-major) | Row elements contiguous: `A[0][0], A[0][1], A[0][2], ...` | Vary last index fastest (across columns within a row) |
| **Fortran** (column-major) | Column elements contiguous: `A[0][0], A[1][0], A[2][0], ...` | Vary first index fastest (down rows within a column) |

### The Canonical Example

Summing all elements of an N×N matrix in C:

```c
// GOOD (row traversal) — 4.5x faster
for (int i = 0; i < N; i++)       // fix row
    for (int j = 0; j < N; j++)   // vary column (contiguous in memory)
        sum += A[i][j];

// BAD (column traversal) — same big-O, but constant cache misses
for (int j = 0; j < N; j++)       // fix column
    for (int i = 0; i < N; i++)   // vary row (jumps across memory)
        sum += A[i][j];
```

**perf measurements** (from lecture):
- Row: 135M cycles, 3M cache misses / 56M loads (5% miss rate)
- Column: 372M cycles, 39M cache misses / 61M loads (63% miss rate)
- Result: **4.5x speedup** from row orientation alone

[Source: lec-2026-03-26-captions.txt, lec-2026-04-02-captions.txt]

### Memory Hierarchy

| Level | Typical size | Latency | Notes |
|---|---|---|---|
| Registers | ~dozens | instant | Per-core, direct ALU access |
| L1 cache | ~64 KB | ~0.5 ns | Per-core, split into L1d (data) and L1i (instruction) |
| L2 cache | ~256 KB | ~few ns | Per-core |
| L3 cache | ~tens of MB | ~10+ ns | Shared across all cores on the chip |
| Main memory | ~16-256 GB | ~100 ns | Shared, DRAM chips off the processor |

Each level is larger but slower. Data moves in cache lines from main memory → L3 → L2 → L1 → registers. LRU (Least Recently Used) eviction when cache is full. [Source: lec-2026-04-02-captions.txt]

### Cache Coherence (Shared Memory)

When multiple cores have their own L1/L2 caches but share L3 and main memory, a **cache coherence problem** arises:

1. Core 0 reads address 1024 (value = 5) into its L1 cache
2. Core 0 modifies it to 10 (write-back policy: only updates L1, not main memory yet)
3. Core 1 reads address 1024 — gets stale value 5 from main memory!

**Write-through vs Write-back:**
- **Write-through:** Every write propagates immediately to all levels → correct but slow (defeats cache purpose)
- **Write-back (common):** Write only to L1, mark as "dirty," flush later when evicted → fast but creates stale copies

**Hardware solutions:**
- **Invalidate:** When Core 0 writes, notify Core 1 that its cached copy is invalid. Core 1 must re-fetch.
- **Update:** When Core 0 writes, directly update Core 1's cached copy.
- Both require **snooping** — hardware monitors cache activity across cores.

**Practical advice:** Avoid sharing data between cores. In both distributed memory (MPI) and shared memory (OpenMP), design so each core works on its own data partition. [Source: lec-2026-04-02-captions.txt]

### Why This Matters for Parallel Programs

Bad cache behavior on one core becomes worse with multiple cores:
- Each core thrashing cache independently
- Shared L3 has more contention
- False sharing: different cores modifying adjacent (same cache line) data causes constant invalidation

Professor: "Make sure the serial performance is good because this is going to be magnified if you take a crummy cache performance version and try to multicore it." [Source: lec-2026-04-02-captions.txt]

## Key Formulas / Patterns

No formulas. Key rules:
1. In C, iterate last index fastest (row traversal)
2. Optimize serial code before parallelizing
3. In parallel programs, minimize shared data between cores

## Connections

- Measured by [[empirical-performance-tools]] (`perf` tool)
- Relevant to [[heat-mpi-analysis]] — MPI_Sendrecv exchanges ghost cells (minimal shared data)
- Related to [[parallel-performance-analysis]] — cache effects add to T_comp in practice

## Source Citations

- [Source: lec-2026-03-26-captions.txt] — perf measurements, row vs column 4.5x speedup
- [Source: lec-2026-04-02-captions.txt] — memory hierarchy, cache coherence, write-back vs write-through, snooping
- [Source: 10-empirical-performance.pdf] — cache performance slides, matrix timing examples
