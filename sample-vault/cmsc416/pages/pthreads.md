---
title: PThreads — POSIX Threads for Shared Memory
course: cmsc416
exam: exam4
topics: [pthreads, threads, mutex, barriers, atomics, false-sharing]
source_count: 4
sources: [12-pthreads.pdf, code/pthreads/12-pthreads-code/, lec-2026-04-09-captions.txt, lec-2026-04-14-captions.txt]
created: 2026-04-30
last_updated: 2026-04-30
status: needs_review
exam_relevant: true
difficulty: medium
---

PThreads (POSIX threads) are the canonical UNIX low-level threading library. Threads in a process **share memory by default**, in contrast to processes that share via explicit IPC. PThreads gives fine-grained control: you write the worker function, manage thread lifetime, and synchronize manually with mutexes, barriers, condition variables, or rwlocks. The recurring lesson from `picalc_pthreads_*` is **work locally, share at the end** — the same rule that drove MPI design and shows up again in [[openmp]] and [[cuda]].

## Details

### Threads vs Processes

| | Processes | PThreads |
|---|---|---|
| Startup | Slower | Faster |
| Memory | Explicit (mmap/shm/IPC) | Shared by default |
| Protection | Strong | Little |
| Create | `fork()` | `pthread_create()` |
| Wait | `waitpid()` | `pthread_join()` |
| Self-id | `getpid()` | `pthread_self()` |
| Exit | `exit()` | `pthread_exit()` or `return` |

### Lifecycle

```c
pthread_t tid;
pthread_create(&tid, NULL, worker_fn, arg);   // worker_fn: void *(*)(void *)
pthread_join(tid, &retval);                   // wait for it, get return value
```

Compile with `gcc x.c -lpthread`.

### Why a mutex (race condition)

`total_hits++` expands to load → increment → store. Two threads can both load `100`, both increment to `101`, both store `101` — one increment lost. A mutex serializes the load-modify-store as a critical region.

```c
pthread_mutex_lock(&lock);
total_hits++;
pthread_mutex_unlock(&lock);
```

### Slow vs fast pattern

The single most important pattern. **Slow:** one lock per iteration. **Fast:** local accumulator, one lock at the end.

```c
// Fast
int my_hits = 0;
for (i = 0; i < points_per_thread; i++) {
    if (in_circle()) my_hits++;
}
pthread_mutex_lock(&lock);
total_hits += my_hits;       // single update per thread
pthread_mutex_unlock(&lock);
```

Lecture timings (50M points, 4 threads, lower better):

| Version | Time |
|---|---|
| Mutex slow (lock per iter) | 4.66 s |
| Mutex fast (one lock per thread) | 0.42 s |

### False sharing

Globally allocate `int thread_hits[MAX_THREADS]`, one slot per thread, no locks needed for correctness. **But it's slow**: all slots fall on the same ~64-byte cache line. Each write invalidates the other threads' caches → ping-pong. Fix: pad slots to a cache line, accumulate locally, or use [[shared-memory-parallel]] reductions.

### Atomic types (C11)

```c
#include <stdatomic.h>
atomic_int total_hits = 0;
total_hits++;       // x86 emits `lock addl` → bus locked
```

`lock` prefix locks the memory bus; gives the proc exclusive access; invalidates other procs' caches with the var. Same contention pattern → still need local accumulators if the update is hot.

Atomics are language-level (no OS call), but only protect a single expression. For multi-statement critical regions, use a mutex.

### Barriers

Replace recreate-thread-per-iteration patterns. Start P threads once, sync via barrier between iterations.

```c
pthread_barrier_t b;
pthread_barrier_init(&b, NULL, nthreads);    // wait for nthreads
// ...
pthread_barrier_wait(&b);                    // every thread blocks until all arrive
pthread_barrier_destroy(&b);
```

Used in PThreads heat: each iteration's row update must complete on all threads before any thread starts the next row.

### Other synchronization primitives

- **Condition variables:** `pthread_cond_wait/signal/broadcast` — pair with a mutex. Wait/notify queue, finer-grained than barriers. Used to build custom barriers, semaphores, etc.
- **Read-Write locks:** `pthread_rwlock_rdlock/wrlock/unlock` — multiple readers, exclusive writer. Better concurrency when readers >> writers.

### Avoiding global state

Pass a pointer to a per-thread `struct` (with args + result slot) instead of using globals. Lets the worker function be reentrant and library-safe.

```c
typedef struct { int *array; int start, stop; long sum; } sumdata_t;
void *sum_worker(void *arg) {
    sumdata_t *d = (sumdata_t *) arg;
    long s = 0;
    for (int i = d->start; i < d->stop; i++) s += d->array[i];
    d->sum = s;
    return NULL;
}
```

### Thread pools (optional)

When work arrives over time, reuse a pool of long-lived threads that pull from a task queue. Avoids per-task creation cost. OpenMP does this for you implicitly. Building it from PThreads needs condition variables or a message queue.

## Key Formulas / Patterns

- **Always:** local accumulator + one shared update at the end. The rule for PThreads, [[openmp]], [[cuda]], and MPI alike.
- **Mutex pattern:** `lock → modify → unlock`. Order matters: never `lock` after a function that may early-return without unlocking.
- **Barrier in heat-style loops:** `pthread_barrier_wait` at the end of each timestep.

## Connections

- [[openmp]] — higher-level abstraction over the same primitives (often implemented on top of pthreads in libGOMP)
- [[cuda]] — same "compute locally, sync at the end" pattern, but with `__syncthreads()` and `atomicAdd`
- [[shared-memory-parallel]] — cache coherence, false sharing background
- [[cache-performance]] — false sharing is a cache-coherence cost

## Source Citations

- [Source: 12-pthreads.pdf] — full lecture content
- [Source: 12-pthreads-code/picalc_pthreads_mutex_slow.c, mutex_fast.c, falseshare.c, atomic_slow.c, atomic_fast.c] — slow vs fast comparisons
- [Source: 12-pthreads-code/pthread_sum_array.c] — struct + worker pattern
- [Source: lec-2026-04-09-captions.txt, lec-2026-04-14-captions.txt] — verbal context
