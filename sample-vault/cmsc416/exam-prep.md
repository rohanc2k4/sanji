---
title: CMSC416 — Exam 3 Study Workflow
type: exam-prep
status: evergreen
last_updated: 2026-04-07
sources: []
---

# CMSC416 — Exam 3 Study Workflow

**Exam date:** April 9, 2026 (TOMORROW)
**Format:** Open book, open laptop
**Last updated:** 2026-04-07

> **Status toggle:** After finishing a page, click the `status` field in the frontmatter → select `reviewed`. (Requires MetaEdit plugin — install via Settings → Community Plugins → Browse → "MetaEdit" → Install → Enable.)

---

## The Workflow

Each step = one page + its matching exercises. Read the page in Obsidian, work the exercises on paper, mark reviewed, move on. Steps are numbered 1–22.

---

### Phase 1: Foundations

Everything else builds on these four pages.

| Step | Action                                                                                              | Time  |
| ---- | --------------------------------------------------------------------------------------------------- | ----- |
| 1    | Read **[[lu-factorization]]** — serial LU algorithm, O(N³/3), pivoting                              | 5 min |
| 2    | Do **[[slide-exercises#Exercise LU Factorization Pseudocode]]** — complexity + numerical issues     | 5 min |
| 3    | Do **[[slide-exercises#Exercise Parallelizing LU]]** — block vs cyclic, where communication happens | 5 min |
| 4    | Read **[[mpi-broadcast]]** — Bcast cost model: t_s + t_w·m on 1D torus                              | 5 min |
| 5    | Read **[[block-vs-cyclic-distribution]]** — the core comparison, must be second nature              | 5 min |
| 6    | Read **[[cpu-time-vs-wall-time]]** — wall time is what matters, MPI_Wtime, `time` utility           | 5 min |
| 7    | Do **[[slide-exercises#Exercise Notions of Time in Computing]]** — CPU time vs wall time            | 3 min |

**Checkpoint:** You should be able to explain why cyclic beats block for LU, what Bcast costs, and the difference between CPU time and wall time. If not, re-read before continuing.

---

### Phase 2: Analytic Performance (A3 Problem 1 — 30pts)

This is the calculation-heavy section. The exam will give you a formula and ask you to derive S, E, T_o, isoefficiency.

| Step | Action                                                                                                                            | Time   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 8    | Read **[[parallel-performance-analysis]]** — T_p, S, E, T_o, isoefficiency. Has your verified A3 results                          | 10 min |
| 9    | Do **[[slide-exercises#Exercise Expensive Sum of N Numbers]]** — P=N procs, fill the table, derive E                              | 10 min |
| 10   | Do **[[slide-exercises#Exercise Realistic Summing]]** — P<N procs, fill table, derive E, see efficiency trends                    | 10 min |
| 11   | Do **[[slide-exercises#Exercise Isoefficiency for Summing]]** — derive T_o, isoefficiency equation, scaling factor                | 10 min |
| 12   | Read **[[strong-vs-weak-scaling]]** — Amdahl's Law, Gustafson's Law, what isoefficiency means                                     | 5 min  |
| 13   | Do **[[slide-exercises#Exercise Scalability of Cannon's Algorithm]]** — derive T_over with multiple terms, isoefficiency O(P^1.5) | 10 min |
|      |                                                                                                                                   |        |

**Checkpoint:** Given any T_par formula, you should be able to mechanically derive S → E → T_o → isoefficiency. The Realistic Summing exercise is the exact exam template.

---

### Phase 3: Dense Matrix Context

Fills in the "why" behind Cannon's algorithm and matrix distribution choices.

| Step | Action | Time |
|---|---|---|
| 14 | Do **[[slide-exercises#Exercise Matrix Partitioning Across Processors]]** — ideal partitioning for A×B, Aᵀ×B, A×Bᵀ | 5 min |
| 15 | Do **[[slide-exercises#Exercise Analysis of Naive Dense Mult]]** — comm cost, memory, downsides | 5 min |
| 16 | Do **[[slide-exercises#Exercise Analysis of Cannon's Algorithm]]** — same comm cost, much better memory | 5 min |

**Checkpoint:** You should know why Cannon's is preferred (same comm, O(N²/P) memory vs O(√P·N²/P)).

---

### Phase 4: Empirical Tools (A3 Problem 2 — 20pts)

Know the HPC Toolkit pipeline and how to read profile/trace views.

| Step | Action                                                                                          | Time  |
| ---- | ----------------------------------------------------------------------------------------------- | ----- |
| 17   | Read **[[hpc-toolkit-profiling]]** — hpcrun → hpcstruct → hpcprof → HPCViewer, profile vs trace | 8 min |
| 18   | Read **[[empirical-performance-tools]]** — perf, gprof, profiling vs tracing approaches         | 5 min |
| 19   | Read **[[heat-mpi-analysis]]** — ghost cells, 51% Gather bottleneck, A3 trace observations      | 8 min |

**Checkpoint:** You should be able to describe what each HPC Toolkit command does, and interpret a profile showing 60% in MPI calls as "communication-bound."

---

### Phase 5: LU Empirical Analysis (A3 Problem 3 — 40pts, highest weight)

This is where everything comes together: the theory from Phases 1-2 meets the traces.

| Step | Action | Time |
|---|---|---|
| 20 | Read **[[lu-mpi1-analysis]]** — block distribution code, A3 trace: 31s, broadcast sync masks imbalance | 8 min |
| 21 | Read **[[lu-mpi2-analysis]]** — cyclic distribution code, A3 trace: 27s, 13% faster, 0.3s startup cost | 8 min |
| 22 | Read **[[lu-mpi3-recommendation]]** — hybrid: parallel I/O + cyclic computation | 5 min |

**Checkpoint:** You should be able to explain why MPI2 is faster, why MPI1's procs all end together (broadcast sync), and what MPI3 would improve.

---

### Phase 5.5: Weakness-Targeted Drills (from past exam analysis)

Based on A1 (85/100), ME1 (27.5/40), ME2 (19/40). These drill **exactly** the patterns you've lost points on.

| Step | Action | Targets Weakness |
|---|---|---|
| W1 | Do **Drill: Communication Cost Expressions** below — write t_s/t_w formulas for 4 topologies | Weakness #1, #3 |
| W2 | Do **Drill: Pick the Right MPI Collective** below — 6 scenarios, name the collective | Weakness #2 |
| W3 | Do **Drill: What to Distribute** below — 3 parallelization scenarios, pick the right data | Weakness #4 |
| W4 | Do **Drill: LU Analytic Derivation** below — full T_p → T_o → isoefficiency from scratch | Weakness #1, #3 |

**Checkpoint:** If you can do W1-W4 without looking at answers, you've patched your biggest holes.

---

### Phase 6: Redo A3

Once all 22 steps are done and you're comfortable, redo the entire A3 from scratch without looking at your submission. This is the best exam practice because the exam will be structured like A3.

| Problem | What it tests | Wiki support |
|---|---|---|
| **Problem 1** (30pts) | Derive T_p, S, E, T_o, isoefficiency for LU | [[parallel-performance-analysis]], [[strong-vs-weak-scaling]] |
| **Problem 2** (20pts) | HPC Toolkit pipeline, interpret heat_mpi profile/trace | [[hpc-toolkit-profiling]], [[heat-mpi-analysis]] |
| **Problem 3** (40pts) | Compare MPI1 vs MPI2 traces, recommend MPI3 | [[lu-mpi1-analysis]], [[lu-mpi2-analysis]], [[lu-mpi3-recommendation]] |

---

### Phase 7: Supporting Context (if time permits)

| Step | Action |
|---|---|
| 23 | Read **[[cache-performance]]** — row vs column 4.5x speedup, may appear as short-answer |
| 24 | Read **[[parallel-sorting]]** — parallel quicksort, odd-even sort, lower priority |
| 25 | Read **[[shared-memory-parallel]]** — background only, lowest priority |

---

## Practice Questions

### Analytic (calculator-ready)

**Q1:** Given parallel LU with N=10000, P=16, t_s=100, t_w=2:
- Compute T_1, T_p, S, E
- Path: T_1 = N³/3 = 3.33×10¹¹. T_p = N³/(3P) + N·log₂(P)·(t_s + t_w·N). Plug and compute.

**Q2:** If you quadruple processors (P → 4P), how should N scale to maintain efficiency?
- From A3: N increases by factor of 4 (quadratic). Verified: E(1024,64)=0.7141 ≈ E(4096,128)=0.7143.

**Q3:** What does isoefficiency O(P·log P) mean?
- Problem size grows slightly faster than linear with P. Good scalability.

### Empirical (interpretation-ready)

**Q4:** Profile shows function X at 60% time and it's an MPI call. Meaning?
- Communication-bound. Reduce frequency or volume of communication.

**Q5:** Trace shows proc 3 idle for last 40% while others compute. Problem?
- Load imbalance. Block distribution gave proc 3 less work. Use cyclic.

**Q6:** heat_mpi: 51% Gather, 19% compute. Fix?
- Only gather final timestep, not every timestep.

**Q7:** Row vs column traversal: row is 4.5x faster in C. Why?
- Row-major layout → spatial locality → cache hits. Column jumps rows → 63% cache miss rate.

**Q8:** MPI1 trace: all procs end together despite block distribution. Why?
- Bcast synchronizes every iteration. Idle procs still participate in broadcasts.

**Q9:** MPI2 is 13% faster despite 0.3s startup bottleneck. Why?
- Cyclic = all procs do real work. MPI1 procs broadcast but don't compute in later iterations.

---

---

## Weakness-Targeted Drills (Past Exam Patterns)

See [[past-exam-analysis]] for the full breakdown. You've lost 40+ points across three exams on these same 5 patterns. These drills are designed to make you automatic on them.

### Drill W1: Communication Cost Expressions

**You've missed this on A1 Q5 (3/10) and ME1 Q1 (2/10).** Write the broadcast time for ONE message of size m words from a single source to all P processors on each topology. Use t_s (startup) and t_w (per-word transfer).

1. **1D Ring** (P processors)
2. **1D Torus** (P processors)  
3. **2D Mesh** (√P × √P processors, 1000 total nodes)
4. **3D Mesh** (∛P × ∛P × ∛P processors, 1000 total nodes)

> [!success]- Answers
>
> All use **repeated doubling** (a.k.a. recursive doubling / hypercube broadcast):
>
> 1. **1D Ring:** `ceil(log₂(P)) * (t_s + t_w * m)` — each step doubles the number of holders. Number of steps = ceil(log₂(P)). Each step sends one message of size m.
>
> 2. **1D Torus:** Same as ring for broadcast: `ceil(log₂(P)) * (t_s + t_w * m)`. The torus adds a wraparound link but repeated doubling already uses log₂(P) steps.
>
> 3. **2D Mesh (1000 nodes, √1000 ≈ 31.6, so ~32×32):** Broadcast in 2D = broadcast along one row + broadcast along all columns. Each dimension has √P nodes.
>    - Row broadcast: `ceil(log₂(√P)) * (t_s + t_w * m)`
>    - Column broadcast (all columns in parallel): `ceil(log₂(√P)) * (t_s + t_w * m)`
>    - Total: `2 * ceil(log₂(√P)) * (t_s + t_w * m)` = `ceil(log₂(P)) * (t_s + t_w * m)`
>    - **But hop count matters if not using repeated doubling:** on a 2D mesh with store-and-forward, max hops in each dimension = √P - 1. For P=1000: ~31 hops per dimension. Using simple flooding: `t_s + (√P-1 + √P-1) * t_w * m` ≈ `t_s + 2(√P-1) * t_w * m`
>    - **ME1 answer format:** `t_s + 14*t_w` for 2D with 1000 nodes means 14 hops (dimension-ordered routing on mesh).
>
> 4. **3D Mesh (1000 nodes, 10×10×10):** Three dimensions, each with ∛P = 10 nodes.
>    - Hops per dimension = ∛P - 1 = 9
>    - Total hops (dimension-ordered): 3 * (∛P - 1) = 27 with repeated doubling, or sequential dimension broadcast
>    - **ME1 answer format:** `t_s + 9*t_w` for 3D was the correct answer — meaning 9 hops total for dimension-ordered broadcast (not 27 because broadcasts in each dimension run in 3 steps of 3 hops, overlapped)
>    - Key: 3D has **fewer hops** (9) than 2D (14) for 1000 nodes → **3D is faster**
>
> **The pattern you must memorize:** 
> - Count the hops in each dimension based on the topology dimensions
> - Multiply: `t_s + total_hops * t_w * m` for simple forwarding
> - Or: `ceil(log₂(P)) * (t_s + t_w * m)` for repeated doubling
>
> **Why you keep missing this:** You jump to vague "flood" descriptions instead of counting hops along dimensions. Always start by writing the dimensions (e.g., 10×10×10 for 3D with 1000), then count hops per dimension, then add them up.

---

### Drill W2: Pick the Right MPI Collective

**You got 0/10 on ME2 Q1 (needed Allgather) and 3/10 on ME2 Q5 (needed AllReduce).** For each scenario, name the ONE correct MPI collective.

1. Each proc has a local partial sum. You need the **total sum on proc 0 only**.
2. Each proc has a local partial sum. You need the **total sum on ALL procs**.
3. Each proc has a local array chunk. You need **every proc to have everyone's chunks** (full array).
4. Proc 0 has the full array. You need to **split it evenly** across all procs.
5. Proc 0 has the full array but chunks are **unequal sizes**. Distribute to all procs.
6. Each proc computed a local column sum vector. You need **all procs to have the global column sum vector**.

> [!success]- Answers
>
> 1. **MPI_Reduce** (to root=0) — combines values with an operation, result on root only
> 2. **MPI_Allreduce** — same as Reduce but result goes to ALL procs
> 3. **MPI_Allgather** — each proc contributes a chunk, everyone gets the full concatenation
> 4. **MPI_Scatter** — root splits evenly and sends one chunk to each proc
> 5. **MPI_Scatterv** — like Scatter but allows variable-size chunks (the "v" = variable)
> 6. **MPI_Allreduce** — each proc has a partial sum vector, you want the element-wise sum on all procs. NOT Allgather (that concatenates, doesn't sum).
>
> **Decision tree to memorize:**
> - Need to **combine** values (sum, max, min)? → Reduce family
>   - Result on one proc? → `MPI_Reduce`
>   - Result on all procs? → `MPI_Allreduce`
> - Need to **distribute** data from one proc? → Scatter family
>   - Equal chunks? → `MPI_Scatter`
>   - Unequal chunks? → `MPI_Scatterv`
> - Need to **collect** data to one proc? → Gather family
>   - Equal chunks? → `MPI_Gather`
>   - Unequal? → `MPI_Gatherv`
> - Need **everyone to have everything**?
>   - Concatenation (no operation)? → `MPI_Allgather`
>   - With reduction operation? → `MPI_Allreduce`
> - One value to all procs, no splitting? → `MPI_Bcast`

---

### Drill W3: What to Distribute

**ME1 Q3: lost 4pts because you distributed query[] instead of seq[]. A1 Q4: overstated output partitioning.** For each scenario, pick which data gets distributed and why.

1. **Pattern matching:** You have a long sequence `seq[N]` and a short query `query[M]` where M << N. You want to find where query matches in seq. Which do you distribute?

2. **Matrix-vector multiply:** `y = A * x` where A is N×N and x is length N. Which do you distribute?

3. **Histogram:** Array `A[N]` of values, `bins[B]` is the histogram. B << N. Which do you distribute?

> [!success]- Answers
>
> 1. **Distribute seq[], replicate query[]** — seq is large (N), query is small (M). Each proc searches its chunk of seq for the query. Overlap of M-1 elements at boundaries for matches that span chunks. Replicating query costs only O(M) per proc. Distributing query means every proc still needs ALL of seq → no speedup.
>
> 2. **Distribute rows of A** (block or cyclic), **replicate x** — A is N² data (huge), x is only N. Each proc computes its chunk of y from its rows of A times the full x. Replicating x costs O(N) per proc. Distributing x means each proc needs columns of A it doesn't have.
>
> 3. **Distribute A[] (input partitioning)** — A is large (N elements), bins is small (B). Each proc counts its chunk of A into local bins. Then **MPI_Reduce** to combine bin counts. Do NOT distribute bins (output partitioning) because each proc still needs to scan all of A → work stays O(N) per proc regardless of P. (This is exactly what you got wrong on A1 Q4.)
>
> **The rule:** Distribute the **largest** data structure. Replicate the **small** one. If output partitioning doesn't reduce work per processor, it's not worth it.

---

### Drill W4: Full LU Analytic Derivation

**This is A3 Problem 1 and the most likely exam question.** Do this without looking at your submission.

Given: Parallel LU factorization on P processors, matrix N×N, cyclic row distribution, 1D torus network.

At each step d (d = 0 to N-1):
- Owner of row d broadcasts it to all P procs
- Each proc updates its ~N/P rows: for each row, subtract scaled version of row d

Derive, showing all work:
1. T_serial (total serial operations)
2. T_parallel (computation + communication)
3. T_overhead (T_o = P·T_p - T_1)
4. Efficiency E = T_1 / (P·T_p)
5. Isoefficiency: how must N scale with P to keep E constant?

> [!success]- Answer
>
> **1. T_serial:**
> - Three nested loops, each up to N → **T_1 = N³/3** (the /3 comes from the triangular structure: step d processes N-d-1 rows, each with N-d operations)
>
> **2. T_parallel:**
> - **Computation:** Each proc owns ~N/P rows. At each step d, it updates its rows. Total computation across all N steps: **N³/(3P)**
> - **Communication:** At each of N steps, one broadcast of a row (N words) on a 1D torus with P procs.
>   - Broadcast cost per step: `ceil(log₂(P)) · (t_s + t_w · N)`
>   - Total communication over N steps: `N · ceil(log₂(P)) · (t_s + t_w · N)`
> - **T_p = N³/(3P) + N·log₂(P)·t_s + N²·log₂(P)·t_w**
>
> **3. T_overhead:**
> - T_o = P·T_p - T_1
> - T_o = P·[N³/(3P) + N·log₂(P)·t_s + N²·log₂(P)·t_w] - N³/3
> - T_o = N³/3 + P·N·log₂(P)·t_s + P·N²·log₂(P)·t_w - N³/3
> - **T_o = P·N·log₂(P)·t_s + P·N²·log₂(P)·t_w**
>
> **4. Efficiency:**
> - E = T_1 / (P·T_p) = (N³/3) / (N³/3 + T_o)
> - E = 1 / (1 + T_o/T_1)
> - E = 1 / (1 + [P·N·log₂(P)·t_s + P·N²·log₂(P)·t_w] / [N³/3])
> - For large N, the t_w term dominates: E ≈ 1 / (1 + 3·P·log₂(P)·t_w / N)
>
> **5. Isoefficiency:**
> - Set T_1 = K·T_o for constant efficiency (K = E/(1-E))
> - N³/3 = K · [P·N·log₂(P)·t_s + P·N²·log₂(P)·t_w]
> - The dominant overhead term is P·N²·log₂(P)·t_w
> - So: N³/3 ≥ K·P·N²·log₂(P)·t_w
> - → **N ≥ 3K·P·log₂(P)·t_w**
> - → **N scales as O(P·log P)** — good scalability!
> - When you double P, N must slightly more than double.
>
> **Verification from A3:** E(N=1024, P=64) ≈ 0.714, E(N=4096, P=128) ≈ 0.714. N quadrupled when P doubled → consistent with N scaling faster than linearly.

---

## Laptop Prep for Exam

- This wiki open in Obsidian
- EXAM2_CHEATSHEET open
- Calculator app
- [[slide-exercises]] open for reference formulas
