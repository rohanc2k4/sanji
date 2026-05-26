---
title: Slide Exercises — Worked Problems from Lectures
course: cmsc416
exam: exam3
topics: [isoefficiency, parallel-overhead, cannon, lu-factorization, dense-matrix, empirical-performance, cpu-time, speedup, efficiency]
source_count: 3
sources: [08-performance-analysis.pdf, 07-dense-mat-algs.pdf, 10-empirical-performance.pdf]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: hard
---

Collected exercises from lecture slides with full solutions. These are the professor's own practice problems — the exam will look like these. Work each one yourself before reading the answer.

---

## Tier 1: Foundations

### Exercise: LU Factorization Pseudocode
**Source:** 07-dense-mat-algs.pdf, slide 29

Given the LU factorization algorithm:
```
LU_FACTORS(A[]):
  N = nrows(A)
  L = N×N identity matrix
  U = copy of A
  for d = 0 to N-1:           // leading row d
    for i = d+1 to N-1:       // remaining rows i
      scale = U[i,d] / U[d,d]
      L[i,d] = scale
      for j = d to N-1:
        U[i,j] = U[i,j] - scale * U[d,j]
  return L, U
```

**Questions:**
1. Computational complexity?
2. What could go wrong numerically?

> [!success]- Answer
>
> 1. **O(N³)** — three nested loops, each up to N iterations
> 2. **Division by zero** at `scale = U[i,d] / U[d,d]` when diagonal element is 0. Fix: pivoting (permute rows so largest element in column d is used). Yields LUP decomposition.

### Exercise: Parallelizing LU
**Source:** 07-dense-mat-algs.pdf, slide 33

Given the in-place variant `LU_FACTORS_INPLACE(A[])`, how would you parallelize it?
- What decomposition/distribution of A?
- Where does communication happen?

> [!success]- Answer
>
> - **Block decomposition** → some processors idle (later rows shrink)
> - **Row decomposition** → also leads to idling (described in Grama 8.3)
> - **Cyclic decomposition** → best balance. E.g., 100×100 matrix, 4 procs: P0 gets rows 0,4,8,12..., P1 gets rows 1,5,9,13..., etc.
> - **Communication:** broadcast leading row from owning proc to all others at each iteration
>
> **Parallel runtime:** T = N³/P + N·log₂(P)·t_s + t_w·N²·P → **O(N³/P)**
> Main overhead: broadcasting a row at each step.
>
> See also: [[lu-mpi1-analysis]] (block), [[lu-mpi2-analysis]] (cyclic), [[block-vs-cyclic-distribution]]

---

## Tier 2: Analytic Performance (most exam-critical)

### Exercise: Expensive Sum of N Numbers
**Source:** 08-performance-analysis.pdf, slide 5

Standard serial algorithm to sum N numbers takes T_ser = N steps. Describe a parallel algorithm that uses P = N processors and takes T_par = 2·log₂(N) steps. Then compute:

|              | P = 8 | P = 32 | P = 1024 |
| ------------ | ----- | ------ | -------- |
| T_ser, T_par | ?     | ?      | ?        |
| Speedup S    | ?     | ?      | ?        |
| Efficiency E | ?     | ?      | ?        |
| Cost C       | ?     | ?      | ?        |

Also: What is the analytic efficiency? Is this worth the cost?

> [!success]- Answer
>
> **Algorithm:** Repeated Halving (Reduction). Each processor holds 1 of N numbers. Odd procs send to even procs which add. Then procs not divisible by 4 send to those that are. Each iteration = 2 steps (send + add), halves active procs → 2·log₂(N) steps.
>
> **Formulas:** T_ser = N, T_par = 2·log₂(N), P = N
>
> **P = 8 (N = 8):**
> - T_ser = 8, T_par = 2·log₂(8) = 2·3 = 6
> - S = T_ser / T_par = 8/6 = **1.33**
> - E = S / P = 1.33/8 = **0.167 ≈ 0.16**
> - C = P · T_par = 8 · 6 = **48** (serial cost was only 8)
>
> **P = 32 (N = 32):**
> - T_ser = 32, T_par = 2·log₂(32) = 2·5 = 10
> - S = 32/10 = **3.20**
> - E = 3.20/32 = **0.10**
> - C = 32 · 10 = **320** (serial cost was only 32)
>
> **P = 1024 (N = 1024):**
> - T_ser = 1024, T_par = 2·log₂(1024) = 2·10 = 20
> - S = 1024/20 = **51.2**
> - E = 51.2/1024 = **0.05**
> - C = 1024 · 20 = **20480** (serial cost was only 1024)
>
> | | P = 8 | P = 32 | P = 1024 |
> |---|---|---|---|
> | T_ser, T_par | 8, 6 | 32, 10 | 1024, 20 |
> | Speedup S | 1.33 | 3.20 | 51.2 |
> | Efficiency E | 0.16 | 0.10 | 0.05 |
> | Cost C | 48 | 320 | 20480 |
>
> **Analytic efficiency:** E = S/P = (N / 2·log₂(N)) / N = **1/(2·log₂(N))**
>
> **Verdict:** Big speedup but very costly with diminishing efficiency. Not worth it — using N processors for an O(N) problem is wasteful.
>
> See also: [[parallel-performance-analysis]], [[strong-vs-weak-scaling]]

### Exercise: Realistic Summing
**Source:** 08-performance-analysis.pdf, slide 7

Adding N numbers on P < N processors can be done in N/P + 2·log₂(P) steps. How?

Fill in the table:

| P | N | T_p | S | E | C |
|---|---|---|---|---|---|
| 4 | 64 | ? | ? | ? | ? |
| 8 | 64 | ? | ? | ? | ? |
| 8 | 192 | ? | ? | ? | ? |
| 16 | 192 | ? | ? | ? | ? |
| 16 | 512 | ? | ? | ? | ? |

What happens to efficiency as N and P vary? Give an analytic expression for E.

> [!success]- Answer
>
> **How:** Each proc starts with N/P numbers, sums locally in N/P steps, then performs a parallel reduction in 2·log₂(P) steps.
>
> | P | N | T_p | S = N/T_p | E = S/P | C = T_p×P |
> |---|---|---|---|---|---|
> | 4 | 64 | 20 | 3.20 | 0.80 | 80 |
> | 8 | 64 | 14 | 4.57 | 0.57 | 112 |
> | 8 | 192 | 30 | 6.40 | 0.80 | 240 |
> | 16 | 192 | 20 | 9.60 | 0.60 | 320 |
> | 16 | 512 | 40 | 12.80 | 0.80 | 640 |
>
> **Efficiency:** E = N / (N + 2P·log₂(P)) = 1 / (1 + (2P·log₂(P))/N)
>
> **Key insight:**
> - Fixed P, increasing N → efficiency increases
> - Fixed N, increasing P → efficiency decreases

### Exercise: Isoefficiency for Summing
**Source:** 08-performance-analysis.pdf, slide 12-13

For realistic summing with T_par = N/P + 2·log₂(P):
1. Derive the parallel overhead T_o
2. Write the isoefficiency equation W = K·T_o
3. If increasing procs from P₁=4 to P₂=8, by what factor must N increase?

> [!success]- Answer
>
> **Overhead:**
> T_o = P·T_par - T_ser = P·(N/P + 2·log₂(P)) - N = N + 2P·log₂(P) - N = **2P·log₂(P)**
>
> **Isoefficiency:** W = K·T_o → **N = K·2P·log₂(P)**
>
> **Scaling factor P₁=4 → P₂=8:**
> (2·8·log₂(8)) / (2·4·log₂(4)) = (8·3)/(4·2) = 24/8 = **3**
>
> N must increase by factor of 3. Verified:
>
> | P | N | E |
> |---|---|---|
> | 4 | 64 | 0.80 |
> | 8 | 192 | 0.80 |
> | 16 | 512 | 0.80 |
>
> See also: [[parallel-performance-analysis]] (A3 verified: N scales by factor 4 when P doubles for LU)

### Exercise: Scalability of Cannon's Algorithm
**Source:** 08-performance-analysis.pdf, slide 14-17

Cannon's parallel runtime:
T_par = N³/P + 2(√P - 1)·(t_s + t_w·(N²/P))

1. What is T_ser for matrix-matrix multiply?
2. Derive the parallel overhead T_over
3. Derive the isoefficiency

> [!success]- Answer
>
> **T_ser = N³** (standard matrix multiply)
>
> **Parallel overhead:**
> T_over = P·T_par - T_ser
> = P·(N³/P + 2(√P - 1)·(t_s + t_w·N²/P)) - N³
> = 2(√P - 1)·(P·t_s + t_w·N²)
> = **O(P^1.5·t_s + P^0.5·N²·t_w)**
>
> **Isoefficiency** (analyze each term against W = N³):
> - Term 1: N³ = K·P^1.5·t_s → straightforward
> - Term 2: N³ = K·P^0.5·N²·t_w → N = K·P^0.5·t_w → N³ = K³·P^1.5·t_w³
>
> Both terms → **W must grow at O(P^1.5)** to maintain efficiency.
>
> This is a good isoefficiency — work grows modestly with P.
>
> See also: [[parallel-performance-analysis]], [[strong-vs-weak-scaling]]

---

## Tier 2.5: Dense Matrix Analysis

### Exercise: Matrix Partitioning Across Processors
**Source:** 07-dense-mat-algs.pdf, slide 4

For square matrices, what is the ideal partitioning for:
1. C = A × B?
2. C = A^T × B?
3. C = A × B^T?

> [!success]- Answer
>
> 1. **C = A × B:** A row-partitioned, B column-partitioned → C block-partitioned with no communication
> 2. **C = A^T × B:** Both A and B column-partitioned
> 3. **C = A × B^T:** Both A and B row-partitioned
>
> **In practice:** Block-partitioning is most common because many applications use both A and A^T. It's a middle-way approach. Libraries like ScaLAPACK use block cyclic partitioning by default.

### Exercise: Analysis of Naive Dense Mult
**Source:** 07-dense-mat-algs.pdf, slide 9

N×N matrices on P processors in √P × √P grid. Each proc has block of N²/P elements. All-to-All comm cost: t_comm = (p-1)(t_s + t_w·M).

1. Communication cost?
2. Memory requirement per proc?
3. Time for final block matrix multiply?
4. Downsides?

> [!success]- Answer
>
> 1. **Communication:** t_comm = 2(√P - 1)·(t_s + t_w·(N²/P)) — two All-to-All shares (one for rows, one for cols)
> 2. **Memory:** 2√P submatrices per proc (full rows/cols needed)
> 3. **Multiply time:** t_mult = O(√P · (N/√P)³) = **O(N³/P)**
> 4. **Downsides:** Storing √P submatrices per proc may be prohibitive: 2√P × N²/P space. Also, no overlap of communication/computation.

### Exercise: Analysis of Cannon's Algorithm
**Source:** 07-dense-mat-algs.pdf, slide 15

Same setup but simplified comm cost: t_comm = t_s + t_w·M (send/recv on ring).

1. Communication cost?
2. Better/worse/same as Naive?
3. Memory per proc?
4. Better/worse/same as Naive?

> [!success]- Answer
>
> 1. **Communication:** t_comm = 2(√P - 1)·(t_s + t_w·(N²/P)) — **same as Naive**
> 2. **Same** communication cost
> 3. **Memory:** O(N²/P) — just 5 blocks (A_s, B_s, C_ij, A_r workspace, B_r workspace)
> 4. **Much better** than Naive: O(N²/P) vs O(√P · N²/P). Constant number of blocks instead of entire rows/cols.
>
> **Key lesson:** Cannon's uses pipelining — blocks compute partial results then get passed forward. Benefits from 2D Grid/Torus topology.

---

## Tier 3: Empirical Performance

### Exercise: Notions of Time in Computing
**Source:** 10-empirical-performance.pdf, slide 4

What are the two important kinds of "time" when evaluating program execution? (Hint: parallelism makes the distinction clearer.)

> [!success]- Answer
>
> **CPU Time:** Total time processors spent executing. 4 procs × 30 seconds = 120 CPU seconds. Correlates with power usage / resource utilization.
>
> **Wall Time (Real Time):** How long humans waited. 4 procs × 30 seconds = 30 seconds waiting. This is what parallel programming improves.
>
> **Measuring in C:**
> - CPU time: `clock()` from `<time.h>`
> - Wall time: `gettimeofday()` from `<sys/time.h>`
> - MPI wall time: `MPI_Wtime()`
>
> See also: [[cpu-time-vs-wall-time]]

---

## How to Use These

**During review:** After reading each wiki page, work the matching exercises:
- Tier 1 pages → LU Pseudocode + Parallelizing LU exercises
- Tier 2 pages → Expensive Sum, Realistic Summing, Isoefficiency, Cannon's exercises
- Tier 3 pages → Notions of Time exercise
- Dense matrix context → Matrix Partitioning, Naive Mult, Cannon's Analysis exercises

**Key pattern:** The exam will ask you to derive T_p, then compute S, E, C, T_o, then isoefficiency. The Realistic Summing and Cannon's exercises are the exact template.
