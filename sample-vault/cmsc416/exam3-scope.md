---
title: CMSC416 — Exam 3 Scope
type: exam-scope
status: evergreen
last_updated: 2026-04-07
sources: []
---

# CMSC416 — Exam 3 Scope

**Date:** April 9, 2026 (Wednesday)
**Priority:** CRITICAL (close to failing — must ace this exam)
**Format:** Mini-exam

## Topics

From professor's announcement:
- **Analytic performance evaluation** of parallel programs
- **Empirical performance evaluation** of parallel programs
- Content draws from **Assignment 3** experience

All material covered since Exam 2.

## Raw Announcement

> The mini-exam will still take place on Thu 09-Apr. The exam will focus on Analytic and Empirical Performance evaluation of parallel programs that we've discussed since Exam 2. Content will draw from the experience you gain by completing Assignment 3.

## Format

- **Open book, open laptop** (cheatsheet and code allowed on screen)

## Assignment 3 Breakdown (exam content draws from this)

**Due:** Tue Apr 7, 2026. PDF submission to Gradescope. ~5% of total grade.

### Problem 1 (30pts): Analytic Performance of Parallel LU Factorization
- Compute **Parallel Runtime T_p** for parallel LU factorization pseudocode
- Variables: N (matrix dimension), P (processors), t_s and t_w (comm startup/per-word transfer)
- Broadcast on 1D torus: ceil(log2(P)) * (t_s + t_w * m)
- Compute **Parallel Overhead T_o = P*T_p - T_1** where T_1 (serial) = N^3/3
- Derive **Isoefficiency Balance Equation**: T_1 = K * T_o
- Show how N must scale with P to maintain efficiency
- Compute Efficiency for specific N,P values and verify isoefficiency prediction

Key concepts to understand:
- LU factorization algorithm (in-place, rows distributed among processors)
- 1D torus broadcast cost model
- Parallel runtime analysis (computation + communication)
- Overhead, efficiency, isoefficiency

### Problem 2 (20pts): Basic Use of HPC Toolkit
- Profile heat_mpi (from A2) using HPC Toolkit on Zaratan
- Steps: compile → module load hpctoolkit → sinteractive → hpcrun -t → hpcstruct → hpcprof
- Transfer database to local machine, open in HPCViewer
- Analyze Profile Tab (% time per function) and Trace Tab (timeline per processor)
- Screenshots required: terminal session, database folder, profile tab, 3 trace views (full, first 1s, last 1s)

Key concepts to understand:
- HPC Toolkit pipeline: hpcrun → hpcstruct → hpcprof
- Profiling vs tracing (aggregate % time vs timeline)
- Reading profile data (which functions are hot spots)
- Reading trace data (what processors do over time, load balance, idle time)
- PMPI = MPI profiling interface (functionally identical)

### Problem 3 (40pts): Empirical Analysis of Parallel LU with HPC Toolkit
- Analyze two MPI implementations (lu_mpi1.c and lu_mpi2.c) using provided HPC Toolkit databases
- Compare: data distribution strategy, file I/O approach, processor utilization
- Use trace view to compare startup behavior and late-run computation patterns
- Recommend combined best features for lu_mpi3.c

Key concepts to understand:
- Block vs cyclic data distribution for matrices
- How distribution strategy affects load balance in LU
- File I/O strategies (rank 0 reads + distributes vs parallel I/O)
- Identifying performance issues from trace views

### Problem 4 (10pts): Work Disclosure

## Professor's Hints

- Exam draws from Assignment 3 experience — understanding the assignment is key to the exam.
- The exam is on analytic AND empirical evaluation — expect both calculation and interpretation questions.
- For closed-form analysis: know how to derive T_p, T_o, efficiency, isoefficiency.
- For empirical: know how to read HPC Toolkit profile/trace output and draw conclusions.

## Source Materials in raw/

### Lecture PDFs (post-exam2)
- `raw/06-hpc-linear-algebra.pdf` — HPC linear algebra foundations
- `raw/07-dense-mat-algs.pdf` — Dense matrix algorithms (includes LU)

### Code (A2 — used in A3 Problem 2)
- `raw/code/heat_mpi.c` — Heat transfer MPI implementation (profiled in A3)
- `raw/code/heat_serial.c` — Serial heat transfer

### Code (A3 — the assignment itself)
- `raw/code/lu_serial.c` — Serial LU implementation
- `raw/code/lu_mpi1.c` — Parallel LU implementation 1
- `raw/code/lu_mpi2.c` — Parallel LU implementation 2
- `raw/code/lu_gen_random.c` — Random matrix generator

### HPC Toolkit Databases
- `raw/hpctoolkit-heat_mpi-database-18881076/` — Heat MPI profiling data
- `raw/hpctoolkit-lu_mpi1-database-mat_10K/` — LU MPI1 profiling data (10K matrix)
- `raw/hpctoolkit-lu_mpi2-database-mat_10K/` — LU MPI2 profiling data (10K matrix)

### Notes
- `raw/notes/prior-claude-context.md` — Detailed A2 architecture + HPC Toolkit notes from prior work
- `raw/notes/EXAM2_CHEATSHEET.md` — Exam 2 cheatsheet (foundation content)
