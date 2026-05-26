---
title: Empirical Performance Tools — perf, gprof, and Profiling Approaches
course: cmsc416
exam: exam3
topics: [empirical-performance, perf, gprof, profiling, tracing, performance-counters]
source_count: 4
sources: [10-empirical-performance.pdf, lec-2026-03-26-captions.txt, lec-2026-03-31-captions.txt, lec-2026-04-02-captions.txt]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: medium
---

Beyond manual timing with `MPI_Wtime`, there are automated tools that profile and trace programs to identify where time is being spent. This is the exam3 empirical performance toolchain: `perf` and `gprof` for serial code, and [[hpc-toolkit-profiling]] for parallel MPI code.

## Details

### Profiling vs Tracing (General Concepts)

| Approach | How it works | What you learn |
|---|---|---|
| **Profiling** | Periodically samples the call stack ("what are you doing now?") | Aggregate % time per function — where time is spent overall |
| **Tracing** | Records timestamped events (function entry/exit, MPI calls) | When and in what order things happen — timeline view |

The professor noted: "It's not super important to me the technical distinction between tracing and profiling. If you use those somewhat interchangeably, I certainly won't hold it against you." [Source: lec-2026-03-31-captions.txt]

### `perf` — Hardware Performance Counters

A Linux tool that reads CPU performance counter registers to measure low-level hardware events.

```bash
perf stat -e cycles,instructions,cache-references,cache-misses ./matrix_timing 8000 4000 row
```

**What it reports:**

| Counter | What it means |
|---|---|
| cycles | Total CPU clock cycles consumed |
| instructions | Total instructions executed |
| cache-references | Total cache accesses (loads) |
| cache-misses | Cache accesses that missed (had to go to slower memory) |

**Key insight from lecture:** Row-oriented matrix traversal vs column-oriented in C:

| Metric       | Row traversal              | Column traversal             |
| ------------ | -------------------------- | ---------------------------- |
| Cycles       | 135 million                | 372 million                  |
| Cache misses | 3 million / 56M loads (5%) | 39 million / 61M loads (63%) |
| Speed        | **4.5x faster**            | Baseline                     |

**Why:** C is row-major — elements in the same row are contiguous in memory. Traversing by row benefits from cache (spatial locality). Traversing by column jumps across memory, causing constant cache misses. [Source: lec-2026-03-26-captions.txt, lec-2026-04-02-captions.txt]

**Superscalar processors:** You may see fewer cycles than instructions because modern CPUs have multiple functional units (ALUs, FPUs) that execute independent instructions simultaneously. This is instruction-level parallelism within a single core. [Source: lec-2026-04-02-captions.txt]

### `gprof` — Function-Level Profiling (Serial)

Ancient but universally available. GCC has built-in support.

```bash
# Step 1: Compile with profiling flag
gcc -pg -g -O2 -o unroll unroll.c

# Step 2: Run normally (generates gmon.out)
./unroll 1000000

# Step 3: View profile
gprof unroll gmon.out
```

**Output includes:**
1. **Flat profile** — % time per function (e.g., `sum_range_B: 50%`, `sum_range_A: 25%`, `sum_range_C: 25%`)
2. **Call graph** — which functions called which, and how much time was in each call tree

**When to use:** Quick serial profiling. If you have GCC, you have gprof. For parallel MPI programs, use [[hpc-toolkit-profiling]] instead. [Source: lec-2026-03-31-captions.txt]

### Cache Effects — Why This Matters

**Memory hierarchy:**

| Level              | Size       | Latency | Shared?             |
| ------------------ | ---------- | ------- | ------------------- |
| Registers          | ~dozens    | instant | Per-core            |
| L1 cache           | ~64 KB     | ~0.5 ns | Per-core            |
| L2 cache           | ~256 KB    | ~few ns | Per-core            |
| L3 cache           | ~tens MB   | ~10+ ns | Shared across cores |
| Main memory (DRAM) | ~16-256 GB | ~100 ns | Shared              |

**Cache line:** When CPU fetches address X from memory, it brings a whole chunk (cache line, ~64 bytes) into cache. Adjacent memory accesses are nearly free.

**Practical rule:** In C, iterate over the last index fastest (row-major). Fortran is opposite (column-major). Getting this wrong can cost 4-5x performance. [Source: lec-2026-04-02-captions.txt]

### Optimize Serial Before Parallel

Professor's advice: "Don't try to parallelize first, try to optimize your serial code first." If you can get a 4x speedup from cache optimization, that might be enough. And if you then parallelize, the parallel version gets all those serial optimizations too. [Source: lec-2026-03-26-captions.txt]

## Key Formulas / Patterns

No formulas — this is empirical. The key skill is choosing the right tool:

| Goal                                     | Tool                              |
| ---------------------------------------- | --------------------------------- |
| Quick wall time measurement              | `time ./program` or `MPI_Wtime()` |
| Hardware counters (cache misses, cycles) | `perf stat`                       |
| Serial function-level profiling          | `gprof` (compile with `-pg`)      |
| Parallel MPI profiling + tracing         | `hpcrun` / HPC Toolkit            |

## Connections

- [[cpu-time-vs-wall-time]] — foundational time concepts
- [[hpc-toolkit-profiling]] — the parallel-specific profiling tool (exam3 focus)
- [[cache-performance]] — detailed cache effects and optimization
- Empirical complement to [[parallel-performance-analysis]] (analytic methods)

## Source Citations

- [Source: 10-empirical-performance.pdf] — perf usage, gprof pipeline, time utility
- [Source: lec-2026-03-26-captions.txt] — CPU vs wall time, perf cache miss analysis, row vs column traversal
- [Source: lec-2026-03-31-captions.txt] — gprof walkthrough, MPI_Wtime, profiling vs tracing distinction
- [Source: lec-2026-04-02-captions.txt] — cache hierarchy, superscalar processors, cache coherence
