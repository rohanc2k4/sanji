---
title: Heat MPI — Parallel Heat Transfer Simulation Analysis
course: cmsc416
exam: exam3
topics: [heat-transfer, mpi, ghost-cells, sendrecv, gather, profiling]
source_count: 4
sources: [heat_mpi.c, heat_serial.c, prior-claude-context.md, hpctoolkit-heat_mpi-database-18881076]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: medium
---

The heat transfer simulation (from A2) is the subject of A3 Problem 2 — profiling it with HPC Toolkit. Understanding the code structure and its performance bottleneck is essential for interpreting the profiling data.

## Details

### The Physics

A 1D rod with fixed-temperature endpoints. Each internal cell's temperature at time t+1 depends on its current value and its neighbors:

```
H[t+1][p] = H[t][p] + k*H[t][p-1] - 2*k*H[t][p] + k*H[t][p+1]
```

Left boundary = 20.0, Right boundary = 10.0, Internal initial = 50.0, k = 0.5.

### Serial vs MPI Structure

| Aspect | heat_serial.c | heat_mpi.c |
|---|---|---|
| Data | Full `H[max_time][width]` matrix | Each proc: `H[max_time][cells_per_P]` |
| Partition | N/A | Block distribution: proc r owns cells `[r*cells_per_P .. (r+1)*cells_per_P - 1]` |
| Boundary cells | Direct array access `H[t][p-1]`, `H[t][p+1]` | Ghost cells via `MPI_Sendrecv` |
| Output | Direct print | `MPI_Gather` to root, then root reassembles and prints |

### MPI Communication Pattern

Each timestep requires exchanging **ghost cells** — boundary values from neighboring processors:

```c
// Exchange with LEFT neighbor (if not rank 0)
MPI_Sendrecv(&H[t][0], 1, MPI_DOUBLE, rank-1, 100,    // send my leftmost
             &left_nei, 1, MPI_DOUBLE, rank-1, 200,    // recv their rightmost
             MPI_COMM_WORLD, MPI_STATUS_IGNORE);

// Exchange with RIGHT neighbor (if not last rank)
MPI_Sendrecv(&H[t][cells_per_P-1], 1, MPI_DOUBLE, rank+1, 200,
             &right_nei, 1, MPI_DOUBLE, rank+1, 100,
             MPI_COMM_WORLD, MPI_STATUS_IGNORE);
```

**Tags 100/200:** 100 = message traveling left, 200 = message traveling right. Prevents message mix-ups. `MPI_Sendrecv` is deadlock-safe (no need to alternate send/recv order).

**Data transferred:** Only 2 doubles per processor per timestep — very lightweight communication.

### The Performance Bottleneck (from HPC Toolkit profiling)

Profiling heat_mpi with 50,000 timesteps and 20,000 cells revealed:

| Function | % Time | What it is |
|---|---|---|
| `PMPI_Gather` | 51.4% | Final gather collecting ALL timesteps |
| loop at line 133 | 21.7% | Copying H array into flat send_buf |
| loop at line 83 | 19.2% | **Actual heat computation** |
| `MPI_Finalize` | 2.5% | MPI shutdown |

**Only 19% is actual computation. Over 70% is data movement.**

**Root cause:** The code gathers ALL 50,000 timesteps of ALL cells to rank 0 for printing. The `send_buf` flattening loop and `MPI_Gather` dominate runtime. In practice, you'd only gather the final timestep or a subset.

### Reading the HPC Toolkit Output for heat_mpi

**Profile tab:** Shows the percentages above. Look for: which functions consume the most time, ratio of compute vs communication.

**Trace tab (from A3 submission):**
- Good load balancing: all 8 bars nearly identical (each processor has 2500 cells, same timesteps)
- **First second:** All 8 processors working simultaneously — balanced computation
- **Last second:** Amdahl's Law visible. Only 2 processors active during the gather step (MPI_Gather keeps ranks 0 and 4 busy as intermediate receivers). Other processors idle.
- **Fix:** Only gather and print the final timestep rather than all 50,000

[Source: A3 (1).pdf]

## Key Formulas / Patterns

```
Communication per timestep: 2 * (t_s + t_w * 1)  [one double each way]
Computation per timestep: cells_per_P operations
Comm/Comp ratio: very small (good) — 2 doubles vs thousands of operations
Bottleneck: end-of-run gather, not per-timestep communication
```

## Connections

- Profiled using [[hpc-toolkit-profiling]] pipeline (A3 Problem 2)
- Ghost cell exchange uses [[mpi-broadcast]] concepts (though Sendrecv, not Bcast)
- Block distribution similar to [[lu-mpi1-analysis]] (but load is balanced here — all internal cells do same work)
- Contrasts with [[lu-mpi1-analysis]] and [[lu-mpi2-analysis]] where the bottleneck is in computation load balance, not final gather

## Source Citations

- [Source: heat_mpi.c] — full MPI heat implementation with ghost cell exchange
- [Source: heat_serial.c] — serial baseline for comparison
- [Source: prior-claude-context.md] — HPC Toolkit profiling results (51.4% in Gather)
- [Source: hpctoolkit-heat_mpi-database-18881076] — profiling database
