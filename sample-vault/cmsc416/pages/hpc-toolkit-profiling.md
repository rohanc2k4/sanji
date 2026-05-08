---
title: HPC Toolkit Profiling — Empirical Performance Evaluation
course: cmsc416
exam: exam3
topics: [hpc-toolkit, profiling, tracing, empirical-performance, hpcviewer]
source_count: 4
sources: [prior-claude-context.md, hpctoolkit-heat_mpi-database-18881076, hpctoolkit-lu_mpi1-database-mat_10K, hpctoolkit-lu_mpi2-database-mat_10K]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: medium
---

HPC Toolkit is a profiling suite for parallel programs. Empirical performance evaluation (using profiling data) is the other half of exam 3 alongside analytic evaluation.

## Details

### Three-Stage Pipeline

1. **hpcrun** — instruments a running program via statistical sampling. Add `-t` flag for tracing.
2. **hpcstruct** — analyzes the binary to map addresses back to source code lines.
3. **hpcprof** — combines measurements + structure into a database for HPCViewer.

```bash
mpirun -np 8 hpcrun -t ./heat_mpi 50000 20000 0
hpcstruct hpctoolkit-heat_mpi-measurements-NNNNNNNN
hpcprof   hpctoolkit-heat_mpi-measurements-NNNNNNNN
```

### Profiling vs Tracing

| Mode | What it records | Insight |
|---|---|---|
| Profiling (default) | Periodic call stack samples → aggregate % time per function | Where time is spent overall |
| Tracing (`-t` flag) | Timestamped events per processor → timeline | When and in what order things happen across processors |

### Reading the Profile Tab

Shows % of CPU time per function/loop. Look for:
- Which functions are hot spots (high % time)
- Ratio of computation vs communication (MPI calls)
- Whether time is spent where you expect it

### Reading the Trace Tab

- **X-axis:** time (left → right)
- **Y-axis:** one horizontal bar per MPI rank
- **Colors:** which function is executing at each moment
- **Depth setting:** Set to 2 to see calls out of main() — shows MPI vs compute clearly

**What to look for:**
- Are all processors active at the same time? (load balance)
- Are there idle gaps (white space)? On which ranks? When?
- Is communication (colored MPI bars) dominating compute (loop bars)?
- How does the pattern change from early run to late run?

### PMPI vs MPI

`PMPI_Gather` = `MPI_Gather` called through the profiling interface. HPC Toolkit intercepts MPI calls via PMPI wrappers. Functionally identical — just the profiler's instrumentation layer.

### What We Found Profiling heat_mpi (from A2/A3 Problem 2)

| Function | % Time | What it is |
|---|---|---|
| PMPI_Gather | 51.4% | Final gather collecting all timesteps |
| loop at :133 | 21.7% | Copying H array into flat send_buf |
| loop at :83 | 19.2% | Actual heat computation |
| MPI_Finalize | 2.5% | MPI shutdown |

Only 19% is actual computation. Over 70% is data movement. Root cause: gathering ALL 50k timesteps instead of just the final one.

## Key Formulas / Patterns

No formulas — this is empirical. The key skill is **reading trace/profile data and drawing conclusions**:
1. What fraction of time is compute vs communication?
2. Is load balanced or imbalanced?
3. What's the bottleneck?
4. What optimization would you recommend?

## Connections

- Empirical complement to [[parallel-performance-analysis]] (analytic methods)
- Applied to [[lu-mpi1-analysis]] and [[lu-mpi2-analysis]] in A3 Problem 3
- [[heat-mpi-analysis]] — profiling target for A3 Problem 2
- [[cpu-time-vs-wall-time]] — manual timing with MPI_Wtime before you reach for HPC Toolkit
- [[empirical-performance-tools]] — perf/gprof for serial; HPC Toolkit for parallel

## Source Citations

- [Source: prior-claude-context.md] — detailed HPC Toolkit workflow and heat_mpi profiling results
- [Source: hpctoolkit-heat_mpi-database-18881076] — heat_mpi profiling database
- [Source: hpctoolkit-lu_mpi1-database-mat_10K] — LU MPI1 profiling database
- [Source: hpctoolkit-lu_mpi2-database-mat_10K] — LU MPI2 profiling database
