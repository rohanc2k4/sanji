---
title: CMSC416 — Mini-Exam 4 Study Workflow
type: exam-prep
status: evergreen
last_updated: 2026-04-30
sources: [12-pthreads.pdf, 13-openmp.pdf, 14-gpu-cuda.pdf, lec-2026-04-09 through 04-28-captions.txt, EXAM4_CHEATSHEET.md]
---

# CMSC416 — Mini-Exam 4 Study Workflow

**Exam date:** April 30, 2026 (TODAY)
**Format:** ~30 min, open book / open laptop, 3-4 problems
**Topics:** [[pthreads]], [[openmp]], [[cuda]] (all material since exam 3)
**Last updated:** 2026-04-30

> **Status toggle:** After finishing a page, click the `status` field in the frontmatter → `reviewed`. Same MetaEdit workflow as `exam-prep.md`.

> **Cram-mode read first:** [[exam4-scope]] for the topic list, then `outputs/EXAM4_CHEATSHEET.md` for the lookup tables. This file is the structured drill order.

---

## What the exam will look like (transcript-derived)

Per Chris's 4/21 + 4/28 comments:
- **Won't ask:** write a full pthreads/openmp/cuda program ("doing anything with threads involves a lot of code… not a lot of space on a mini exam")
- **Will ask:** read code snippets, answer targeted questions, predict timings, explain bugs
- **Cross-cutting MPI-vs-OMP-vs-CUDA comparison:** saved for the *final* (May, 2hr), not this mini-exam
- Mini-exam is *narrow*: 1-2 topics drilled deep, not all three at once

---

## The Workflow

Each step = one page or drill. Read in Obsidian, work the question, mark reviewed, move on. Steps numbered 1-18 with cram-time budgets.

---

### Phase 1: Cross-Cutting Model (5 min)

The unifying mental model — read this first so the rest snaps into place.

| Step | Action | Time |
|---|---|---|
| 1 | Read **`outputs/EXAM4_CHEATSHEET.md` Part 1** — one-look comparison table (PThreads vs OpenMP vs CUDA: who does sync, reduction, mutual exclusion, indexing) | 5 min |

**Checkpoint:** You can answer "given a parallel construct, which API would express it most ergonomically?"

---

### Phase 2: PThreads — Concepts Only (15 min)

Per 4/21: full pthreads code unlikely on the exam, but the *concepts* (mutex, false sharing, barrier, atomics) are fair game.

| Step | Action | Time |
|---|---|---|
| 2 | Read **[[pthreads]]** — focus on Threads vs Processes table, lifecycle, mutex pattern | 5 min |
| 3 | Drill **[[pthreads]] § Slow vs fast pattern** — explain timings 4.66s → 0.42s. Why does mutex_slow get *worse* with more threads? | 3 min |
| 4 | Drill **[[pthreads]] § False sharing** — `picalc_pthreads_falseshare.c` is correct but slow. Why? | 3 min |
| 5 | Drill **[[pthreads]] § Atomic types** — what does `lock addl` do at the hardware level? Why are C11 atomics still subject to contention? | 4 min |

**Checkpoint:** You can explain mutex slow vs mutex fast vs falseshare vs atomic_fast and predict their relative speeds.

---

### Phase 3: OpenMP — VERY HIGH PRIORITY (30 min)

This is where the highest-confidence exam targets live. 4/14: "Fresh blood? This is an exam question…" was about the OpenMP variable scoping bug. Expect at least one OpenMP question.

| Step | Action | Time |
|---|---|---|
| 6 | Read **[[openmp]]** — focus on `THE key rule — variable scoping` table | 6 min |
| 7 | **Drill: state PRNG bug** — given `picalc_omp_reduction.c` vs `picalc_omp_rand_contention.c`, explain the 4× speed difference. Cite where `state` is declared. (See cheatsheet Part 3.5.) | 5 min |
| 8 | Read **[[openmp]] § Reduction vs atomic vs critical** — memorize the 0.52s / 2.62s / 9.02s timings | 4 min |
| 9 | **Drill: rewrite reduction as atomic** — given `picalc_omp_reduction.c`, rewrite without the reduction clause using `atomic` (with a local `my_hits`). Why is the original faster? (Slide 23 exercise.) | 5 min |
| 10 | Read **[[openmp]] § Loop scheduling** — static vs static,k vs dynamic vs guided. Memorize when each wins | 5 min |
| 11 | **Drill: spell-check schedule choice** — uneven word search. Which schedule? Why does pure static give 12.1s but dynamic gives 7.9s? | 5 min |

**Checkpoint:** Given a snippet with a `parallel` block, you can identify shared vs private vars instantly, pick the right schedule, and choose between reduction/atomic/critical.

---

### Phase 4: CUDA — VERY HIGH PRIORITY (35 min)

Per 4/28, CUDA reductions and `__syncthreads()` were drilled in lecture with explicit "WHY IS THIS NEEDED??" prompts on the slide. Highest-probability target.

| Step | Action | Time |
|---|---|---|
| 12 | Read **[[cuda]]** — focus on Terminology table, indexing identities, launch param formula, vector_add pattern | 8 min |
| 13 | **Drill: launch params** — given length L=10,000 and 256 threads/block, compute nblocks. Write the bounds guard. What goes wrong without the guard? | 4 min |
| 14 | Read **[[cuda]] § Reduction kernel ladder** — kernels 1, 2, 3, 4, 5 + cuBLAS. Memorize the timings (0.99 / 0.64 / 0.89 / 0.26 ms). | 6 min |
| 15 | **Drill: explain `__syncthreads()` placements in `array_sum_5`** — why before the loop? Why inside the loop? What goes wrong if either is omitted? (This is the slide-34 question literally.) | 7 min |
| 16 | **Drill: kernel 3 vs kernel 4** — slide-32 exercise: predict which is faster and why. (Hint: shared-mem caching.) | 5 min |
| 17 | Read **[[cuda]] § `__syncthreads()` rules** — block-only, no cross-block sync, divergent branches break it. Cross-block sync via separate kernel launches | 5 min |

**Checkpoint:** You can write a small `__global__` kernel from a serial loop, compute launch params, place `__syncthreads()` correctly, and explain why a tree reduction needs both syncs.

---

### Phase 5: Project 4 (K-Means) — VERY HIGH PRIORITY (40 min)

**Chris said A4 is "great preparation"** for the exam. The A4 writeup discussion questions are essentially a script for the mini-exam — same phrasing, same structure ("How did you subdivide Phase A? Phase B? What's shared? How was access coordinated?"). Drilling A4 = drilling the most likely exam questions.

The A4 problem set has Rohan write three programs (only 1 + 2 are mandatory):
- `kmeans_omp.c` — OpenMP version
- `kmeans_cuda.cu` — CUDA version
- `kmeans_blas.c` (optional) — fast serial via BLAS

**Two phases per outer iteration** (these names match the A4 writeup vocabulary):

- **Phase A — Cluster Center Calculation:** zero sums, accumulate features by assignment, divide by counts → new centers.
- **Phase B — Data Assignment:** for each point, find argmin distance to all centers; update assignment + nchanges + counts.

| Step | Action | Time |
|---|---|---|
| 18 | Read **`outputs/EXAM4_CHEATSHEET.md` Part 5.0–5.2** — algorithm at-a-glance, paradigm comparison table, full annotated OpenMP and CUDA code | 12 min |
| 19 | Read **Part 5.3** (what's shared/private) — internalize the variable-scope table for each phase | 5 min |
| 20 | **Drill: A4 writeup Q3a (OMP, Phase A).** Without looking, write out: how did you parallelize Phase A? What's shared? What coordination? Compare against Part 5.5 answer | 5 min |
| 21 | **Drill: A4 writeup Q3b (OMP, Phase B).** Same, for Phase B. Note where `reduction(+: nchanges)` vs `atomic` on `counts[c]` apply | 5 min |
| 22 | **Drill: A4 writeup Q2a + Q2b (CUDA).** How did you parallelize Phase A and B in CUDA? What's the shared-memory optimization for Phase A? | 5 min |
| 23 | **Drill: A4 writeup Q3 (CUDA).** "Describe the kernels." List all four (zero / accumulate / divide / assign) in one sentence each. Why is each kernel-launch boundary effectively a global barrier? | 5 min |
| 24 | Read **Part 5.4** — speedup trends. Memorize the "good answer" for "did you get speedup?" — small files lose to overhead, large files win, atomic contention plateaus the curve | 3 min |

**Checkpoint:** You can answer the A4 writeup discussion questions cold, citing the exact pragma/kernel for each phase, the shared variables, and the coordination mechanism. You can describe four CUDA kernels in one sentence each. You can predict speedup curves and explain anomalies.

---

## Practice Questions (transcript-derived predictions)

### OpenMP

**Q1: The `state` bug.** Given:
```c
unsigned int state = 123456789;
#pragma omp parallel
{
    /* uses rand_r(&state) */
}
```
Why is this 4× slower than declaring `state` inside the block?

> Answer: outside = shared; every `rand_r` mutates the same memory → bus contention + lost randomness. Inside = private (one copy per thread) → no contention.

**Q2: Reduction vs Atomic.** A coworker says "atomic is the same as reduction, just more flexible." Why is the reduction version faster on lecture timings (0.52s vs 2.62s)?

> Answer: reduction is a *policy*, not a mechanism. The compiler creates a private copy per thread, and combines them at the end (typically tree-merge). Atomic forces every increment to serialize on one memory location.

**Q3: Schedule.** A loop where iteration `i`'s cost is roughly `i²` (varies wildly across iterations). Which schedule? Static? Dynamic? Guided?

> Answer: Dynamic or guided. Pure static piles all expensive iterations onto the last thread → idle time elsewhere. Dynamic pulls chunks on demand → balanced.

**Q4: Spot the race.** Given a parallel-for that writes `result[i] += x` where `i = thread_id`. Race or not?

> Answer: No race (each thread writes a unique index), BUT possible **false sharing** if `result[]` slots are within 64 bytes. Use `reduction` or pad slots.

### CUDA

**Q5: Launch.** Vector add with length L=10000, 256 threads/block. What's `nblocks`? What goes wrong if you forget `if (idx < L)` inside the kernel?

> Answer: `nblocks = (10000 + 255) / 256 = 40`. 40 × 256 = 10240 threads. 240 threads have `idx ≥ 10000` → out-of-bounds reads/writes → silent corruption or segfault.

**Q6: Why `__syncthreads()` here?** In `array_sum_5`'s tree reduction:
```c
__syncthreads();                      // (1) before the loop
for (int i = blockDim.x/2; i > 0; i /= 2) {
    if (threadIdx.x < i)
        blockvals[tid] += blockvals[tid+i];
    __syncthreads();                  // (2) inside the loop
}
```

> Answer: (1) ensures *all* threads in the block have written their data into `blockvals[]` before any thread starts reading neighbors. (2) ensures the additions in this layer all complete before the next halving step reads them. Without either, threads in different warps proceed at different speeds → reads see stale data.

**Q7: Cross-block sync.** You want all threads across all blocks to wait at one point before reading shared global data. Can `__syncthreads()` do it?

> Answer: No. `__syncthreads()` is per-block only. Use **two separate kernel launches** (each launch is a global barrier) or Cooperative Groups + `cudaLaunchCooperativeKernel`.

**Q8: Why is `array_sum_2` (atomicAdd per thread) so slow?**

> Answer: Every thread serializes on the same global memory location. Even though atomicAdd is correct, all the parallelism collapses to one. Fix: per-block partial sum in shared memory + one atomicAdd per block.

**Q9: Naive matmul vs tiled.** What's wrong with one-thread-per-output-cell matmul that loops `for (k=0; k<N; k++) sum += A[i*N+k] * B[k*N+j];`?

> Answer: Repeated global-memory accesses. Threads in the same block read overlapping rows of A and columns of B from global mem. Tiled matmul loads tiles into `__shared__` once, reuses across the block → cuts global traffic by TILE_SIZE×.

### PThreads (concepts)

**Q10: Why is `picalc_pthreads_falseshare.c` correct but slow?** Each thread writes to `thread_hits[thread_id]`, no lock needed.

> Answer: All slots fall on the same ~64-byte cache line. Each thread's write **invalidates the other threads' caches** for that line → ping-pong / cache thrashing. Fix: pad slots to a cache line, or accumulate locally and write once.

**Q11: PThreads heat — why a barrier?**

> Answer: At the end of each timestep, every thread must finish updating its row chunk before any thread starts the next timestep (data dependence on neighbors). `pthread_barrier_wait` enforces this without recreating threads each iteration.

### Project 4 (K-Means)

**Q12 (OMP, Phase A.2): Multiple threads each have a point assigned to cluster c=3. They all want to add their point's features to `clust.features[3][:]`. What's the coordination?**

> Answer: `#pragma omp atomic` on the increment, OR per-thread private partial sum + final merge (faster), OR `reduction(+: clust.features[:nclust*dim])` if OpenMP version supports array reductions.

**Q13 (OMP, Phase B): Why is `nchanges` handled with `reduction(+: nchanges)` instead of `#pragma omp atomic` on every `nchanges++`?**

> Answer: Both are correct. Reduction is faster: each thread gets a private copy initialized to 0, increments locally without contention, and OpenMP merges them at region end (typically tree-reduction). Atomic forces every increment to serialize on one global memory location.

**Q14 (OMP, Phase B): Threads write to `clust.counts[best]` where `best` is computed per-point. Does this need an atomic?**

> Answer: **Yes.** Two different threads may pick the same `best` cluster simultaneously and race. `#pragma omp atomic clust.counts[best]++;` is the minimal fix.

**Q15 (CUDA): What goes in `__shared__` for Phase A.2 and why?**

> Answer: Per-block partial cluster sums `__shared__ float block_sums[nclust*dim]`. Each thread atomicAdds its features into the *block-local* shared sums (cheap, fast atomics). After `__syncthreads()`, the block does one atomicAdd per cell to the global `cluster_sums`. Cuts global atomics from `ndata*dim` down to `nblocks*nclust*dim` — typically 100×+ reduction in global contention.

**Q16 (CUDA): How does the host know Phase A finished before Phase B starts?**

> Answer: Each kernel launch is a global GPU barrier with respect to subsequent launches in the same stream. Phase B's kernel literally cannot start until Phase A's kernel has finished. No `__syncthreads()` needed across phases (and it wouldn't help — `__syncthreads` is per-block only). Phase ordering = kernel-launch ordering.

**Q17 (Both): What's shared, what's private in K-Means?**

> Answer:
> - **shared, read-only:** `data.features[i][d]` (the input data); safe across all threads.
> - **shared, contended (Phase A):** `clust.features[c][d]` — needs atomic/reduction.
> - **shared, contended (Phase B):** `clust.counts[c]`, `nchanges` — atomic/reduction.
> - **per-thread, written:** `assigns[i]` (each thread owns a unique `i`, no atomic), `best`, `best_dsq`, `dsq`, `diff` (loop locals — declare *inside* the parallel/kernel scope to be private).

**Q18 (Both): "Did you get speedup?"**

> Answer: OpenMP — yes, near-linear up to physical-core count; plateaus past that as Phase A.2 atomic contention dominates; possible slowdown past oversubscription. CUDA — yes for large data files (3e4 MNIST), modest or negative for small files where H↔D transfer overhead dominates the actual compute. The bigger the data and the more iterations, the better the GPU amortizes the transfer.

**Q19 (Both): Translate "Phase A coordination" across paradigms.**

> Answer:
> - MPI: `MPI_Allreduce` on per-rank partial sums → all ranks see global sums.
> - OpenMP: `#pragma omp atomic` per write (slow), or per-thread private partials + final merge (fast).
> - CUDA: `atomicAdd` per write (slow), or per-block `__shared__` partial + one atomicAdd per cell from block to global (fast).
>
> Same algorithm, three coordination layers. The pattern is universal.

---

## Weakness-Targeted Drills

Past exams (ME1 27.5/40, ME2 19/40) lost points on: vague "flood" descriptions, wrong choice between collectives, distributing the wrong data structure. The exam-4 versions of these:

### Drill X1: Identify the Construct

For each scenario, name the *single* most appropriate primitive:

1. Multiple OpenMP threads need to sum into one accumulator.
2. CUDA: every thread in a block writes to a shared array, then thread 0 reads all of them.
3. PThreads: every thread updates a per-thread slot in a global array.
4. CUDA: 100,000 threads all want to increment one global counter.
5. OpenMP: a `for` loop where iterations are independent and uniform-cost.
6. OpenMP: a `for` loop where each iteration's cost can vary 100×.

> Answers: 1. `reduction(+: sum)`. 2. `__syncthreads()` between writes and reads. 3. False sharing trap — not lock-free; pad slots or use reduction. 4. Per-block partial sum in `__shared__` + one `atomicAdd` per block (kernel-4 or kernel-5 pattern). 5. `schedule(static)`. 6. `schedule(dynamic)` or `schedule(guided)`.

### Drill X2: Predict the Bug

For each snippet, name the bug and the fix:

1. ```c
   #pragma omp parallel
   {
       int *buf = malloc(64);          // declared inside
       /* use buf */
       free(buf);
   }
   ```
   Bug? (Trick question.)

2. ```c
   unsigned int state = 0;
   #pragma omp parallel for
   for (int i = 0; i < N; i++) sum += rand_r(&state);
   ```

3. ```c
   __global__ void k(float *data, float *out) {
       __shared__ float buf[256];
       buf[threadIdx.x] = data[threadIdx.x + blockDim.x * blockIdx.x];
       if (threadIdx.x == 0) {
           float s = 0;
           for (int i = 0; i < 256; i++) s += buf[i];
           *out = s;
       }
   }
   ```

> Answers:
> 1. **No bug.** `buf` is private (declared inside parallel), each thread allocates and frees its own — correct.
> 2. **`state` is shared** + race condition + bus contention. Fix: declare `state` inside the loop body, seed with thread id. Add `reduction(+: sum)`.
> 3. **Missing `__syncthreads()`** between the load and thread-0's read. Other threads may not have written `buf` yet when thread 0 reads. Also: `*out = s` on every block races on the global; should be `atomicAdd(out, s)`.

### Drill X3: Translate the Pragma

OpenMP → equivalent PThreads sketch (high-level):

```c
int total = 0;
#pragma omp parallel reduction(+: total)
{
    int local = compute_chunk();
    total += local;
}
```

> Sketch: spawn N pthreads with a struct holding (input, local result). Each thread fills its `local`. Master thread sums all `local`s after `pthread_join`. The `reduction` clause hides ~30 lines of pthreads boilerplate.

---

## Phase 6: Final 5-Minute Pre-Exam Review

If you have only 5 minutes left:

1. **OpenMP scoping:** outside parallel = shared, inside = private. State PRNG bug.
2. **OpenMP reduction > atomic > critical** for accumulators.
3. **CUDA index:** `idx = threadIdx.x + blockDim.x * blockIdx.x`.
4. **CUDA bounds:** `if (idx < length) { ... }` always.
5. **CUDA `__syncthreads()`:** before any thread reads shared data another thread wrote; between layers of in-place tree reduction.
6. **Mutex slow vs fast:** local accumulator + one lock at the end.
7. **K-Means Phase A coord:** atomic on `clust.features[c][d]` (OMP) or per-block `__shared__` accumulator (CUDA).
8. **K-Means Phase B coord:** `reduction(+: nchanges)` (OMP) or `atomicAdd(nchanges, 1)` (CUDA); atomic on `counts[c]` either way.
9. **Universal pattern:** wherever MPI used `Allreduce`, OMP uses atomic/reduction, CUDA uses atomicAdd. Same algorithm, different layers.

---

## Laptop Prep for Exam

- [[exam4-scope]] open
- [[pthreads]], [[openmp]], [[cuda]] open in tabs
- `outputs/EXAM4_CHEATSHEET.md` open (the master)
- [[shared-memory-parallel]] for cache-coherence basics
- Calculator (timing comparisons may need quick math)

## Connections

- [[exam4-scope]] — what's testable
- [[exam-prep]] — exam 3 workflow (the blueprint this file follows)
- [[pthreads]], [[openmp]], [[cuda]] — main study pages
- [[shared-memory-parallel]] — cache coherence + false sharing background
- [[past-exam-analysis]] — recurring weakness patterns to drill against
