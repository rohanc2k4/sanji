---
title: CPU Time vs Wall Time — Measuring Program Performance
course: cmsc416
exam: exam3
topics:
  - empirical-performance
  - cpu-time
  - wall-time
  - time-utility
  - MPI_Wtime
source_count: 3
sources:
  - 10-empirical-performance.pdf
  - lec-2026-03-26-captions.txt
  - lec-2026-03-31-captions.txt
created: 2026-04-07
last_updated: 2026-04-07
status: reviewed
exam_relevant: true
difficulty: easy
---

Understanding the two kinds of "time" in computing is fundamental to empirical performance evaluation. The whole point of parallel programming is to reduce wall time, even at the cost of more total CPU time.

## Details

### CPU Time

How much processing effort the CPU spent executing your program. Measured in clock cycles converted to seconds.

- **Serial program:** 1 billion instructions on a 1 GHz processor = 1 CPU second
- **Parallel program (4 cores, 30s each):** total CPU time = 120 seconds, even though the job finished in 30s
- **C function:** `clock()` — returns `clock_t`, measures CPU cycles. Accounts for ALL cores (so multicore programs report inflated CPU time)
- CPU time does NOT include time spent waiting on I/O, network, or other external devices

### Wall Time (Real Time)

How long a human has to wait from start to finish.

- **The metric we optimize in parallel programming** — we parallelize to reduce wall time
- **C function:** `gettimeofday()` — returns seconds since epoch, measures elapsed real-world time
- **MPI function:** `MPI_Wtime()` — measures wall time in MPI programs (see below)
- Wall time DOES include waiting on I/O, network, and idle time

### Why Wall Time Is What Matters for Parallel Programs

The professor made this explicit: "The wall time reduction is the whole aim of parallel programming." We trade more total CPU time (due to communication overhead) for less wall time. [Source: lec-2026-03-31-captions.txt]

### The `time` Utility

The command-line `time` utility reports three values:

| Field | What it measures | Example |
|---|---|---|
| **real** | Wall time (how long you waited) | 2.45s |
| **user** | CPU time in your program's functions | 0.90s |
| **sys** | CPU time in OS kernel calls on your behalf | 0.36s |

**Key relationships:**
- `real ≈ user + sys` → 100% CPU utilization (compute-bound program)
- `real > user + sys` → program is waiting on something (I/O, network, disk)
- `real < user + sys` → multiple cores active (parallel build with `make -j4`)

### `make -j4` Example (from lecture)

- `time make`: real ≈ user + sys (sequential build, one GCC at a time)
- `time make -j4`: real < user + sys (4 compilations in parallel, so wall time drops but total CPU time slightly increases due to coordination)

This is the same principle as parallel computing: split work across cores to reduce wall time. [Source: lec-2026-03-31-captions.txt]

### MPI_Wtime

```c
double start = MPI_Wtime();
// ... phase of computation ...
double end = MPI_Wtime();
double elapsed = end - start;

if (rank == 0) {
    printf("Phase took %.3f seconds\n", elapsed);
}
```

**Why wall time (not CPU time)?** Because we're trying to minimize how long the user waits. [Source: lec-2026-03-31-captions.txt]

**Why only report from root?** Root typically does the first and final operations (gathers, prints). All processors sync at collective operations, so root's wall time represents the total runtime. [Source: lec-2026-03-31-captions.txt]

## Key Formulas / Patterns

| Measurement | Serial (C) | MPI |
|---|---|---|
| CPU time | `clock()` | N/A (not the goal) |
| Wall time | `gettimeofday()` | `MPI_Wtime()` |
| Command-line | `time ./program` | `time mpirun -np 4 ./program` |

## Connections

- Foundation for [[hpc-toolkit-profiling]] (automated profiling replaces manual timing)
- Wall time is what [[parallel-performance-analysis]] optimizes (T_p is wall time)
- Related to [[empirical-performance-tools]] for more sophisticated measurement

## Source Citations

- [Source: lec-2026-03-26-captions.txt] — CPU time vs wall time definitions, time utility examples
- [Source: lec-2026-03-31-captions.txt] — MPI_Wtime, why wall time matters for parallel programs, make -j4 example
- [Source: 10-empirical-performance.pdf] — time utility slides, CPU time vs wall time definitions
