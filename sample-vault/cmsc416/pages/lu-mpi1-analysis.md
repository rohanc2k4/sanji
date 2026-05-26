---
title: LU MPI1 — Block Distribution Analysis
course: cmsc416
exam: exam3
topics:
  - lu-factorization
  - mpi
  - block-distribution
  - parallel-io
  - load-balance
source_count: 2
sources:
  - lu_mpi1.c
  - hpctoolkit-lu_mpi1-database-mat_10K
created: 2026-04-07
last_updated: 2026-04-07
status: reviewed
exam_relevant: true
difficulty: hard
---

lu_mpi1.c implements parallel LU factorization using **block (contiguous) row distribution**. Each processor owns a contiguous chunk of N/P rows. This creates a fundamental load imbalance problem as the algorithm progresses.

## Details

### Data Distribution: Block (Contiguous)

For P=4 processors and a 16x16 matrix:
- Proc 0 owns rows 0-3
- Proc 1 owns rows 4-7
- Proc 2 owns rows 8-11
- Proc 3 owns rows 12-15

Each processor stores `row_count = N/P` rows locally as a flat array of `row_count * N` floats.

### File I/O: Parallel Independent Read

Every processor opens the file independently, reads the dimension, then `fseek`s to its block of rows and reads only its portion. This is efficient — no single bottleneck, all processors read in parallel.

```c
size_t row_start = proc_rank * row_count * dim * sizeof(float);
fseek(infile, row_start, SEEK_CUR);  // each proc seeks to its own data
fread(A, sizeof(float), row_count*dim, infile);  // reads only its rows
```

**Advantage:** Fast startup. All processors load data simultaneously. No communication needed for data distribution.

### Factorization: Block Distribution Problem

The leading row index for column d maps to processor `lead_rank = d / row_count`.

```c
int lead_rank = d / row_count;  // which proc has row d
```

**Critical problem:** As the algorithm progresses through columns:
- Early iterations (d small): Proc 0 broadcasts its rows. All procs have work on rows below d.
- Middle iterations: Higher-rank procs start broadcasting. Lower-rank procs have **no rows below d**, so they do nothing.
- Late iterations: Only the last 1-2 processors are doing any computation. Everyone else is idle.

This means **low-rank processors finish their useful work early and sit idle** while high-rank processors still have computation to do. The load imbalance gets worse as the algorithm progresses.

### Loop Bounds (how idle is handled)

```c
size_t ibeg = (d < row_beg) ? 0 : d - row_beg;  // if d is below my rows, start at 0
size_t iend = (d < row_end) ? row_count : 0;     // if d is past my rows, don't iterate at all
```

When `d >= row_end` for a processor, `iend = 0` and the inner loop body never executes. The processor still participates in the `MPI_Bcast` but does zero computation.

## Key Formulas / Patterns

- Row ownership: global row `d` is on processor `d / row_count`
- Local row index: `d % row_count`
- Load imbalance: Proc 0 finishes all useful work after iteration d = N/P. Proc P-1 works until iteration d = N-1.

## Performance Implications (for HPC Toolkit analysis)

**What you'd expect to see in the trace:**
- **Early run:** All processors active (green compute + purple Bcast flickers), balanced
- **Late run:** Only high-rank processors computing. Low-rank processors show idle gaps (white) between Bcast calls. Increasingly unbalanced as d grows.
- **Overall:** Significant wasted processor time. Processors with low ranks spend most of the run idle.

### Actual A3 Trace Results (8 processors, 10K matrix)

**Runtime:** ~31 seconds (vs MPI2's ~27 seconds — MPI2 is ~13% faster).

**Startup (0–4.28s):** All 8 processors active from t=0 with solid blue bars. No startup delay — every processor independently seeks to and reads its own file portion. This is the **strength** of MPI1.

**Late run (24.68s–31.45s):** Surprisingly, all 8 processors show solid blue right up until ~28s, ending nearly simultaneously. **The expected load imbalance is not visually obvious** because MPI_Bcast in the inner loop keeps all processors synchronized at every step — even processors with no rows left to update still participate in every broadcast. This means all processors stay locked in step, which masks the imbalance but also means idle processors waste time in broadcast calls rather than being truly free.

[Source: A3 (1).pdf]

## Connections

- Contrast with [[lu-mpi2-analysis]] which uses cyclic distribution for better load balance
- Based on [[lu-factorization]] serial algorithm
- Uses [[mpi-broadcast]] for leading row distribution
- Load balance issues relate to [[block-vs-cyclic-distribution]]
- Part of [[parallel-performance-analysis]] exam content

## Source Citations

- [Source: lu_mpi1.c] — lines 85-116 (parallel file read with fseek), lines 125-154 (block-distributed factorization)
- [Source: A3 (1).pdf] — submitted trace analysis, runtime comparison, startup/late-run observations
