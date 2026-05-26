---
title: Parallel Performance Analysis — Analytic Methods
course: cmsc416
exam: exam3
topics: [performance-analysis, parallel-runtime, overhead, efficiency, isoefficiency, speedup]
source_count: 4
sources: [08-performance-analysis.pdf, A3.pdf, lec-2026-03-31-captions.txt, lec-2026-03-26-captions.txt]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: hard
---

Analytic performance evaluation is half of exam 3. You need to be able to derive parallel runtime, overhead, efficiency, speedup, and isoefficiency for a given parallel algorithm.

## Details

### Key Metrics

**Parallel Runtime (T_p):** Total time from start to finish with P processors.
```
T_p = T_comp + T_comm
```
- T_comp = computation time per processor
- T_comm = communication time (broadcasts, gathers, etc.)

**Speedup (S):**
```
S = T_1 / T_p
```
How many times faster the parallel version is versus serial.

**Efficiency (E):**
```
E = S / P = T_1 / (P * T_p)
```
Fraction of processor time spent doing useful work. E = 1 means perfect (no waste). E < 1 means some processor time is wasted on communication or idle time.

**Parallel Overhead (T_o):**
```
T_o = P * T_p - T_1
```
Total wasted processor-time across all processors. This is the difference between "P processors each working for T_p time" and "the serial work T_1". The excess is overhead (communication, idle time, redundant computation).

**Isoefficiency:**
```
T_1 = K * T_o
```
K is a constant representing the desired efficiency level. This equation tells you: as you increase P, how must you increase the problem size (which determines T_1) to keep efficiency constant?

Rearrange to get T_1 as a function of P. The growth rate of T_1 with respect to P tells you the **scalability** of the algorithm.

### Applying to Parallel LU Factorization

**Serial runtime:** T_1 = N^3/3

**Parallel computation:** Each processor does ~N^3/(3P) work (N iterations, each processing ~N/P rows, each row needing ~N operations).

**Communication per iteration:** One broadcast of N floats on a 1D torus:
```
T_bcast = ceil(log2(P)) * (t_s + t_w * N)
```

**Total communication** over N iterations:
```
T_comm = N * ceil(log2(P)) * (t_s + t_w * N)
```

**Parallel runtime:**
```
T_p = N^3/(3P) + N * log2(P) * (t_s + t_w * N)
```

**Overhead:**
```
T_o = P * T_p - T_1
    = P * [N^3/(3P) + N*log2(P)*(t_s + t_w*N)] - N^3/3
    = N^3/3 + P*N*log2(P)*(t_s + t_w*N) - N^3/3
    = P * N * log2(P) * (t_s + t_w * N)
```

The N^3/3 terms cancel — all overhead is communication.

**Isoefficiency:**
```
T_1 = K * T_o
N^3/3 = K * P * N * log2(P) * (t_s + t_w * N)
```

For large N, the t_w*N term dominates:
```
N^3/3 ≈ K * P * N * log2(P) * t_w * N
N^3 ≈ 3K * t_w * P * log2(P) * N^2
N ≈ 3K * t_w * P * log2(P)
```

So **N must grow as O(P * log(P))** to maintain efficiency when increasing P.

### Isoefficiency Example

If going from P to 4P processors, how much should N increase?

```
N_new / N_old = (4P * log2(4P)) / (P * log2(P))
             = 4 * (log2(P) + 2) / log2(P)
             ≈ 4 (for large P)
```

So roughly **quadruple N** when quadrupling P.

### Computing Efficiency for Specific Values

Plug into:
```
E = T_1 / (P * T_p) = (N^3/3) / (P * [N^3/(3P) + N*log2(P)*(t_s + t_w*N)])
```

## Key Formulas / Patterns

| Metric | Formula |
|---|---|
| Serial runtime | T_1 = N^3/3 |
| Parallel runtime | T_p = N^3/(3P) + N*log2(P)*(t_s + t_w*N) |
| Speedup | S = T_1 / T_p |
| Efficiency | E = T_1 / (P * T_p) |
| Overhead | T_o = P*N*log2(P)*(t_s + t_w*N) |
| Isoefficiency | N ∝ P*log2(P) |

### Amdahl's Law (Strong Scaling Limit)

If fraction `f` of the program is serial:
```
S_max = 1 / (f + (1-f)/P)    →    as P → ∞, S_max → 1/f
```

Even 5% serial fraction limits maximum speedup to 20x regardless of processor count. See [[strong-vs-weak-scaling]] for full treatment.

### Key Exam Strategy

For A3 Problem 1 style questions:
1. Write T_comp (serial work / P) and T_comm (count communications × cost each)
2. T_p = T_comp + T_comm
3. T_o = P*T_p - T_1 (serial terms cancel, leaving only communication terms)
4. Isoefficiency: set T_1 = K*T_o, solve for N as function of P
5. For specific values: plug into E = T_1 / (P * T_p) and compute

### A3 Problem 1 Results (Verified)

From the submitted A3:
- **Isoefficiency dominant term:** N must increase **quadratically** with P (N ∝ P²·log²(P), but dominant behavior is quadratic)
- **P=64 → P=128:** N must increase by a factor of **4** (N goes from 1024 to 4096)
- **Efficiency verification:** E(N=4096, P=128) = 0.7143, compared to E(N=1024, P=64) = 0.7141 — nearly identical, confirming the isoefficiency prediction works
- The broadcast message size M = N (one full row of the matrix)

[Source: A3 (1).pdf]

## Connections

- Applied to [[lu-factorization]] in A3 Problem 1
- Broadcast cost from [[mpi-broadcast]]
- Complements [[hpc-toolkit-profiling]] (empirical evaluation)
- Related to [[block-vs-cyclic-distribution]] — distribution affects whether T_comp is truly balanced
- Scaling concepts in [[strong-vs-weak-scaling]]
- Empirical measurement via [[cpu-time-vs-wall-time]] and [[empirical-performance-tools]]

## Source Citations

- [Source: 08-performance-analysis.pdf] — analytic performance evaluation framework, Amdahl's Law
- [Source: A3.pdf] — Problem 1 applies these metrics to parallel LU
- [Source: lec-2026-03-31-captions.txt] — wall time as primary metric, MPI_Wtime usage
- [Source: lec-2026-03-26-captions.txt] — optimize serial before parallel advice
