---
title: LU MPI2 — Cyclic Distribution Analysis
course: cmsc416
exam: exam3
topics: [lu-factorization, mpi, cyclic-distribution, scatter, load-balance]
source_count: 2
sources: [lu_mpi2.c, hpctoolkit-lu_mpi2-database-mat_10K]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: hard
---

lu_mpi2.c implements parallel LU factorization using **cyclic (round-robin) row distribution**. Rows are dealt out like cards — row 0 to proc 0, row 1 to proc 1, ..., row P to proc 0 again. This spreads the workload evenly across all processors throughout the entire algorithm.

## Details

### Data Distribution: Cyclic (Round-Robin)

For P=4 processors and a 16x16 matrix:
- Proc 0 owns rows 0, 4, 8, 12
- Proc 1 owns rows 1, 5, 9, 13
- Proc 2 owns rows 2, 6, 10, 14
- Proc 3 owns rows 3, 7, 11, 15

Each processor stores `row_count = N/P` rows locally, but they are **non-contiguous** in the global matrix.

### File I/O: Root Reads + Scatter

Only rank 0 reads the entire matrix from the file, then rearranges rows into cyclic order and uses `MPI_Scatter` to distribute.

```c
// Rank 0 reads rows in cyclic order for scatter:
// For each proc p, read rows p, p+P, p+2P, ... into contiguous memory
for(int p=0; p<proc_count; p++){
    for(size_t r=0; r<row_count; r++){
        fseek(infile, sizeof(size_t) + (p + r*proc_count)*rowbytes, SEEK_SET);
        fread(Aall + p*dim*row_count + r*dim, sizeof(float), dim, infile);
    }
}
MPI_Scatter(Aall, row_count*dim, MPI_FLOAT,
            A,    row_count*dim, MPI_FLOAT, 0, MPI_COMM_WORLD);
```

**Disadvantage:** Rank 0 does ALL file I/O. Must allocate the entire N*N matrix. Other processors wait during loading. Slow startup, especially for large matrices.

**The fseek pattern is also inefficient:** rank 0 seeks back and forth through the file reading non-contiguous rows, rather than reading sequentially.

### Factorization: Cyclic Distribution Advantage

The leading row for column d maps to processor `lead_rank = d % proc_count`.

```c
int lead_rank = d % proc_count;  // which proc has row d (cyclic!)
```

**Key advantage:** Because rows are dealt round-robin, the "active" processor cycles through ALL processors evenly. At any point in the algorithm, every processor has approximately the same number of rows still needing updates.

### Loop Bounds

```c
size_t ibeg = d / proc_count;      // local row to begin at
size_t iend = row_count;           // always iterate to the end
if(proc_rank <= lead_rank){
    ibeg++;                        // low-rank procs skip one row
}
```

Unlike MPI1, `iend` is always `row_count` — every processor always has rows to process. The only adjustment is that low-rank procs skip one extra row at the beginning (because their next row after d is further ahead cyclically).

## Key Formulas / Patterns

- Row ownership: global row `d` is on processor `d % proc_count` (cyclic)
- Local row index: `d / proc_count`
- Load balance: All processors active throughout the entire algorithm. Each proc always has ~(N-d)/P rows to update.

## Performance Implications (for HPC Toolkit analysis)

**What you'd expect to see in the trace:**
- **Startup:** Slow — rank 0 does all file I/O, other processors idle during scatter. Visible as a long initial phase on rank 0 before computation begins.
- **Main computation:** All processors active throughout. Balanced green (compute) bars across all ranks. Much better utilization than MPI1.
- **Overall:** Better total runtime despite slower startup, because no processor sits idle during computation.

### Actual A3 Trace Results (8 processors, 10K matrix)

**Runtime:** ~27 seconds (vs MPI1's ~31 seconds — MPI2 is **~13% faster**).

**Startup:** Every processor shows a small dark blue segment (~0–0.3s) before transitioning to pink. This dark segment = rank 0 reading the entire matrix and reorganizing it while all other processors are blocked waiting for MPI_Scatter. After scatter completes, all processors transition into `lu_factorize_mpi2` (pink) simultaneously. This bottleneck would grow with larger matrices (O(N²) data for rank 0 to read alone).

**Late run (21.23s–27.94s):** All 8 processors show solid pink throughout, with a consistent green segment (~1–1.5s) at the very end — this is `lu_verify_mpi2` (verification phase) that all processors enter together after computation finishes. **Good utilization throughout** — no processors go idle mid-computation.

**Key insight from A3:** The broadcast synchronization in MPI1 masks its load imbalance (all procs stay locked in step). MPI2's advantage is that its processors do *real work* throughout, not just participate in broadcasts. This is why MPI2 is 13% faster despite the startup penalty.

[Source: A3 (1).pdf]

## Connections

- Contrast with [[lu-mpi1-analysis]] which uses block distribution (fast I/O, bad load balance)
- Based on [[lu-factorization]] serial algorithm
- Uses [[mpi-broadcast]] for leading row distribution, `MPI_Scatter` for initial data distribution
- Distribution strategy relates to [[block-vs-cyclic-distribution]]
- Part of [[parallel-performance-analysis]] exam content

## Source Citations

- [Source: lu_mpi2.c] — lines 85-143 (root reads + cyclic reorder + scatter), lines 151-177 (cyclic-distributed factorization)
- [Source: A3 (1).pdf] — submitted trace analysis, runtime comparison, startup/late-run observations
