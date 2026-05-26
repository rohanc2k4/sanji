---
title: Strong Scaling vs Weak Scaling
course: cmsc416
exam: exam3
topics: [performance-analysis, scaling, strong-scaling, weak-scaling, amdahl, gustafson]
source_count: 2
sources: [08-performance-analysis.pdf, lec-2026-03-31-captions.txt]
created: 2026-04-07
last_updated: 2026-04-07
status: needs_review
exam_relevant: true
difficulty: medium
---

There are two fundamentally different ways to measure how well a parallel algorithm scales as you add processors. The distinction matters because it determines what question you're answering about your algorithm's performance.

## Details

### Strong Scaling

**Fixed problem size, increase processors.** Does it get faster?

- Keep N constant, increase P
- Ideal: T_p = T_1 / P (linear speedup)
- Reality: communication overhead grows with P, so eventually adding processors doesn't help
- **Amdahl's Law** governs the limit

**Use case:** "I have THIS specific problem. How fast can I solve it?"

### Weak Scaling

**Increase problem size proportionally with processors.** Does efficiency stay constant?

- Increase both N and P together (so each processor does the same amount of work)
- Ideal: T_p stays constant as you scale up
- **Isoefficiency** governs this — it tells you exactly how N must grow with P
- **Gustafson's Law** is the optimistic counterpart to Amdahl's

**Use case:** "I got more processors. How much BIGGER a problem can I solve in the same time?"

### Amdahl's Law

If a fraction `f` of the program is inherently serial (cannot be parallelized):

```
S_max = 1 / (f + (1-f)/P)
```

As P → ∞:
```
S_max → 1/f
```

**Example:** If 10% of the program is serial (f = 0.1), maximum speedup = 10x, no matter how many processors you add.

**Key insight:** Even a small serial fraction severely limits scalability. This is why strong scaling has diminishing returns.

### Gustafson's Law (Scaled Speedup)

Instead of fixing problem size, fix execution time:

```
S_scaled = P - f*(P-1)
```

**Key insight:** As you increase P, you can proportionally increase the problem size. The serial fraction becomes smaller relative to the parallel work. Much more optimistic than Amdahl.

### Isoefficiency and Scaling

From [[parallel-performance-analysis]], the isoefficiency relation `T_1 = K * T_o` tells you exactly how problem size must grow with P for weak scaling:

- **LU Factorization:** N must grow as O(P * log P) → good scalability
- **Odd-even sort:** exponential growth required → terrible scalability
- **Matrix multiplication (Cannon's):** also good scalability

The growth rate is the scalability fingerprint of the algorithm.

## Key Formulas / Patterns

| Concept | Formula | What it tells you |
|---|---|---|
| Amdahl's Law | S ≤ 1/(f + (1-f)/P) | Strong scaling limit |
| Gustafson's Law | S = P - f*(P-1) | Scaled (weak) speedup |
| Isoefficiency | T_1 = K * T_o, solve for N(P) | How N must grow with P |

## Connections

- Isoefficiency derivation in [[parallel-performance-analysis]]
- Applied to LU in [[lu-factorization]] (N ∝ P*log P)
- Amdahl's Law sets strong scaling limits for all parallel programs
- Empirically measured via [[hpc-toolkit-profiling]] (does speedup match prediction?)

## Source Citations

- [Source: 08-performance-analysis.pdf] — Amdahl's Law, Gustafson's Law, strong vs weak scaling definitions
- [Source: lec-2026-03-31-captions.txt] — professor's discussion of why wall time is the optimization target
