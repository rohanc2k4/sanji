---
title: OpenMP — Directive-based Shared Memory Parallelism
course: cmsc416
exam: exam4
topics: [openmp, pragma, reduction, parallel-for, scheduling, shared-private]
source_count: 4
sources: [13-openmp.pdf, code/openmp/13-openmp-code/, lec-2026-04-16-captions.txt, lec-2026-04-21-captions.txt]
created: 2026-04-30
last_updated: 2026-04-30
status: needs_review
exam_relevant: true
difficulty: medium
---

OpenMP (Open Multi-Processing) is a standard for shared-memory parallelism in C/C++/Fortran via compiler **directives** (`#pragma omp ...`). The compiler turns the directive into thread-managing code — you don't write the worker function or manage lifetimes. OpenMP is the easiest parallelism in C: ergonomic, fast, hard to misuse if you understand variable scoping. Don't confuse it with **OpenMPI**, which is an MPI implementation for distributed memory.

## Details

### Compile and run

```bash
gcc x.c -fopenmp                    # without -fopenmp, pragmas are silently ignored
OMP_NUM_THREADS=4 ./a.out           # set thread count via env
```

Three ways to set thread count:
- `OMP_NUM_THREADS=4` env var (default)
- `omp_set_num_threads(4)` API call
- `num_threads(4)` clause on the pragma: `#pragma omp parallel num_threads(4)`

### Basic parallel block

```c
#pragma omp parallel
{
    int id = omp_get_thread_num();
    int n  = omp_get_num_threads();
    work(id, n);
}                                   // implicit barrier here
```

All threads in the team execute the block. Implicit barrier at the end of every `parallel` (and every `for`).

Under the hood (libGOMP):

```
#pragma omp parallel { body; }
=>
void subfn(void *data) { use data; body; }
GOMP_parallel_start(subfn, &data, num_threads);
subfn(&data);
GOMP_parallel_end();
```

### THE key rule — variable scoping

| Where declared | Default scope | Notes |
|---|---|---|
| Outside `parallel` block | **shared** | Globals, heap, main's stack |
| Inside `parallel` block | **private** | New copy per thread |
| `private(x)` clause | private | Forced even if declared outside |
| `shared(x)` | shared | Rarely needed (default) |
| `firstprivate(x)` | private | Initialized to outside value |
| `reduction(op: x)` | private + final combine | See below |

**Famous bug:** declare PRNG state outside the parallel block → every thread mutates the same `state` → bus contention + lost randomness:

```c
unsigned int state = 123456789;          // SHARED → contention
#pragma omp parallel
    rand_r(&state);                      // 4× slowdown vs private
```

Fix: move `state` inside the block (becomes private).

### Reduction — the canonical accumulation pattern

```c
int total_hits = 0;
#pragma omp parallel reduction(+: total_hits)
{
    /* ... */
    total_hits++;                        // OpenMP makes this safe
}
// total_hits now contains the global sum
```

Each thread gets a private copy initialized to the operator identity (`0` for `+`, `1` for `*`, `INT_MIN` for `max`, etc.); after the parallel region, OpenMP combines them. Likely implemented as private-copy + tree merge under the hood — fast.

Available ops: `+ * - & | ^ && ||`, `min`, `max`, and recent versions support array reductions like `reduction(+: result[i])`.

### Reduction vs atomic vs critical (timings, 100M pts, 4 threads)

| Mechanism | Use for | Time |
|---|---|---|
| `reduction` | Accumulators | **0.52s** |
| `#pragma omp atomic` | Single-expression updates | 2.62s |
| `#pragma omp critical` | Multi-statement protected region | 9.02s |

Heuristic: prefer **reduction**, fall back to **atomic**, use **critical** only when you truly need multi-statement mutual exclusion.

### Parallel loops

```c
#pragma omp parallel for
for (int i = 0; i < N; i++) work(i);    // i is automatically private
```

Iterations divided across threads. **Assumption:** iterations are independent. If they aren't, races.

### Loop scheduling

| Schedule | Behavior | Use when |
|---|---|---|
| `static` (default) | Equal blocks at compile time | Iterations have uniform cost |
| `static, k` | Round-robin chunks of size k | Balanced fine-grain |
| `dynamic, k` | Threads grab chunks of size k from a queue | Iteration cost varies |
| `guided` | Big chunks first, shrinking | Variable cost, lower overhead than dynamic |
| `runtime` | Set by `OMP_SCHEDULE` env | Experimentation |

Spell-check exercise illustrates: pure static badly imbalanced (1.66B vs 0.11B work units across threads) → 12.1s. Dynamic rebalances → 7.9s.

### Sections (non-loop parallelism)

```c
#pragma omp parallel
{
    #pragma omp sections
    {
        #pragma omp section { compute_d(); }
        #pragma omp section { compute_other(); }
    }
}
```

A few **distinct** independent code paths executed in parallel.

### Locks (when reduction/atomic/critical doesn't fit)

```c
omp_lock_t lock;
omp_init_lock(&lock);
#pragma omp parallel
{
    omp_set_lock(&lock);
    /* exclusive section */
    omp_unset_lock(&lock);
}
omp_destroy_lock(&lock);
```

### Nested parallelism

Disabled by default. Enable:

```c
omp_set_max_active_levels(2);                // modern API
// export OMP_MAX_ACTIVE_LEVELS=2            // env (modern)
// (deprecated: omp_set_nested(1) / OMP_NESTED=true)
```

### Thread pool semantics

GCC's libGOMP reuses threads across `parallel` regions. First parallel block pays full startup; subsequent blocks reuse. Idle threads remain resident — system load looks constant.

### Matrix-vector multiply (3 ways)

| Strategy | Pragma | When |
|---|---|---|
| Outer-loop parallel | `#pragma omp parallel for` over `i` | Many rows, the default winner |
| Inner-loop parallel | `#pragma omp parallel for reduction(+: result[i])` over `j` | Few rows, heavy inner |
| Both nested | Nested `parallel for` (needs `OMP_MAX_ACTIVE_LEVELS=2`) | Rarely better; usually overhead loses |

## Key Formulas / Patterns

- **Default scoping bug:** declare per-thread state inside the `parallel` block. Outside = shared = race.
- **Accumulation:** use `reduction(+: var)`. Pay attention to op identity.
- **Loop scheduling decision:** uniform cost → static; uneven → dynamic/guided.
- **Compile-time gate:** `#ifdef _OPENMP` to wrap OMP-specific code that must compile without `-fopenmp`.

## Connections

- [[pthreads]] — lower-level shared-memory primitives that OpenMP often runs on top of (libGOMP)
- [[cuda]] — `reduction` clause is the shared-memory analog of CUDA's tree-reduction + atomicAdd pattern
- [[shared-memory-parallel]] — cache coherence, false sharing background
- A4 K-Means OpenMP version mirrors A2's MPI K-Means with `MPI_Allreduce` → `reduction`/`atomic`

## Source Citations

- [Source: 13-openmp.pdf] — directives, scheduling, reduction, scoping
- [Source: 13-openmp-code/picalc_omp_reduction.c, picalc_omp_atomic.c, picalc_omp_alt.c] — reduction vs atomic vs critical
- [Source: 13-openmp-code/picalc_randr_contention.c] — shared `state` bug
- [Source: 13-openmp-code/spellcheck_omp.c] — schedule comparison
- [Source: 13-openmp-code/matvec_omp.c] — three ways to parallelize matvec
- [Source: lec-2026-04-16-captions.txt, lec-2026-04-21-captions.txt]
