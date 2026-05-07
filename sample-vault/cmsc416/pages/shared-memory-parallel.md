---
title: Shared Memory Parallel Computing — Cache Coherence and OpenMP Preview
course: cmsc416
exam: exam4
topics: [shared-memory, cache-coherence, openmp, multicore, snooping, false-sharing]
source_count: 2
sources: [lec-2026-03-24-captions.txt, lec-2026-04-02-captions.txt]
created: 2026-04-07
last_updated: 2026-04-30
status: needs_review
exam_relevant: true
difficulty: medium
---

Shared memory systems (multicore CPUs) contrast with distributed memory (MPI). This topic was introduced after exam 2 and previews OpenMP/GPU content. Less likely on exam3 (which focuses on A3 content), but provides context for understanding cache effects in empirical performance.

## Details

### Distributed vs Shared Memory

| Aspect | Distributed Memory (MPI) | Shared Memory (Multicore) |
|---|---|---|
| Memory model | Each processor has private memory | All cores share one address space |
| Communication | Explicit message passing (MPI_Send/Recv) | Read/write shared variables |
| Hardware | Cluster nodes connected by network | Multiple cores on one chip |
| Main challenge | Communication overhead, deadlocks | Race conditions, cache coherence |
| Programming model | MPI | OpenMP, pthreads |

### GPUs — Somewhere In Between

GPUs are a co-processor (separate from CPU). Massive parallelism (thousands of cores) with shared memory within the GPU. Data must be transferred between CPU and GPU memory (like distributed), but within GPU it's shared. [Source: lec-2026-03-24-captions.txt]

### Cache Coherence Problem

When multiple cores have private caches (L1, L2) but share L3 and main memory:

1. Core 0 reads X = 5 into its L1 cache
2. Core 0 writes X = 10 (only updates L1, not main memory — write-back policy)
3. Core 1 reads X → gets stale value 5 from main memory or shared cache

**Solutions:**
- **Invalidation protocol:** Core 0's write invalidates Core 1's cached copy. Core 1 must re-fetch.
- **Update protocol:** Core 0's write directly updates Core 1's cache.
- Both need **snooping** hardware to monitor cross-core cache activity.

**Best practice:** Minimize sharing. Have each core work on its own data partition — exactly what we do in MPI, and the same principle applies in shared memory. [Source: lec-2026-04-02-captions.txt]

### False Sharing

Even if cores access different variables, if those variables are in the same cache line (~64 bytes), modifying one invalidates the other core's cache. This causes performance degradation without any logical data sharing.

## Key Formulas / Patterns

No formulas. Key concept: minimize shared data access between cores, whether in distributed or shared memory.

## Connections

- [[pthreads]] — exam4 main material; PThreads false-sharing example demonstrates this exact pattern
- [[openmp]] — exam4 main material; built on top of cache-coherent shared memory
- [[cuda]] — exam4 main material; GPU is shared-mem within a block, distributed across blocks
- Cache effects measured by [[empirical-performance-tools]]
- [[cache-performance]] — detailed cache behavior
- Contrasts with MPI approach in [[lu-mpi1-analysis]], [[lu-mpi2-analysis]]

## Source Citations

- [Source: lec-2026-03-24-captions.txt] — shared memory intro, GPU preview
- [Source: lec-2026-04-02-captions.txt] — cache coherence protocols, snooping, false sharing concept
