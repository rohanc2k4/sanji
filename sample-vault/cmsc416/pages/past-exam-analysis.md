---
title: Past Exam Performance Analysis
course: cmsc416
exam: exam3
topics: [exam-analysis, weaknesses, study-strategy]
source_count: 3
sources: [submission_388421719.pdf, submission_391337411.pdf, submission_400801317.pdf]
created: 2026-04-08
last_updated: 2026-04-08
status: needs_review
exam_relevant: true
difficulty: N/A
---

Analysis of Rohan's past exam and assignment performance to identify weak areas for exam3 prep.

## Score Summary

| Assessment | Score | Percentage |
|---|---|---|
| Assignment 1 | 85/100 | 85% |
| Mini-Exam 1 | 27.5/40 | 68.75% |
| Mini-Exam 2 | 19/40 | 47.5% |

**Trend: scores are dropping.** Exam3 must reverse this.

## Assignment 1 (85/100) — Strengths & Weaknesses

### Full marks (strong areas)
- **Store-and-Forward** (15/15) — communication cost modeling
- **Bring the Heat** (15/15) — parallelizing heat equation, data distribution, network topology
- **C K-Means** (15/15) — implementation
- **Work Disclosure** (10/10)

### Partial credit (gaps)
- **Embedding Ring in Tree** (8/10) — lost 2pts: dilation should be a specific value (2D), not general; missing diagram of link mappings
- **Task Dependency Graphs** (7/10) — lost 3pts: errors in speedup calculations for specific processor counts. Key issue: computing max speedup for P=2,4,8 processors given a task graph
- **Parallel Histogram** (12/15) — lost 3pts: overstated output partitioning efficiency (work is still O(N) per proc, not O(N/P)); didn't discuss communication explicitly (reduce vs concatenate)
- **Parallel Broadcast** (3/10) — **MAJOR WEAKNESS**: didn't describe repeated doubling algorithm properly; used ad-hoc flood-fill approach; cost analysis incorrect

### A1 takeaway for exam3
- **Repeated doubling / broadcast algorithms**: was a weakness in A1, still relevant for exam3 (communication cost analysis)
- **Task dependency graph speedup calculations**: lost points here, and this is directly testable
- **Output vs input partitioning trade-offs**: need to be precise about what changes with P

## Mini-Exam 1 (27.5/40) — Detailed Breakdown

### Q1: 2D vs 3D Mesh Broadcast (2/10) — BOMBED
Lost 8 points. Specific failures:
- Didn't give correct expression for 3D broadcast time: `t_s + 9*t_w` (9 hops + startup)
- Didn't give correct expression for 2D broadcast time: `t_s + 14*t_w` (14 hops + startup)
- Concluded wrong answer about which is faster (3D is faster for same number of nodes)
- Time analysis of proposed solution was incorrect
- **No description of repeated doubling** — same weakness as A1 Q5
- Less efficient algorithm used

**Pattern: broadcast algorithms and communication time expressions are a recurring blind spot.**

### Q2: Task Dependency Graph (10/10) — PERFECT
Correctly computed: max degree of concurrency, critical path length, max speedup (inf, 2, 4 procs), min processors for max speedup.

### Q3: seq_match() Parallelization (5.5/10) — HALF
- Lost 4pts on data distribution: distributed query[] instead of seq[] — wrong choice of what to parallelize
- Lost 1.5pts on reduction: mentioned combining results but operation was wrong/incomplete
- Overlap handling: right idea but minor mistake (size off by constant)

**Pattern: choosing WHAT to distribute across processors — tends to pick the wrong array/data.**

### Q4: MPI_Sendrecv() (10/10) — PERFECT
Correctly described MPI_Comm_size, MPI_Comm_rank, MPI_Sendrecv. Correctly identified partner calculation bug and end-processor problem.

## Mini-Exam 2 (19/40) — Detailed Breakdown

### Q1: MPI Collective Conversion (0/10) — ZERO
Used a non-collective communication operation (-7pts). Should have used **MPI_Allgather**. Complete miss on knowing which collective operation to apply.

**Pattern: weak on mapping problem requirements to the correct MPI collective (Allgather, Reduce, AllReduce, Scatter, etc.)**

### Q2: Root Input Data (5/5) — PERFECT
Correctly used MPI_Bcast for data size + MPI_Scatter for data distribution.

### Q3: Distribution of Data (5/5) — PERFECT
Correctly used MPI_Scatterv with justification.

### Q4: Cannon's MatMul Conundrum (6/10)
Lost 4pts:
- Selected correct option (B) but didn't suggest a better network architecture
- Didn't discuss how communication costs change with different network architectures
- Key gap: understanding that Cannon's algorithm assumes 2D mesh topology, and on a linear network the communication pattern maps poorly

**Pattern: understanding how algorithm communication patterns map to network topologies.**

### Q5: Column Sums for All Procs (3/10)
Lost 7pts. Correct answer: **local partial sums then MPI_AllReduce**. Only gave a vague description.

**Pattern: same as Q1 — can't identify the right MPI collective for the job. AllReduce was the answer here.**

## Recurring Weakness Patterns (EXAM3-CRITICAL)

### 1. Broadcast / Communication Algorithms
- A1 Q5: 3/10 (no repeated doubling)
- ME1 Q1: 2/10 (wrong broadcast time, no repeated doubling)
- **Must know:** repeated doubling, broadcast time on meshes/tori, t_s + hops * t_w model

### 2. Choosing the Right MPI Collective
- ME2 Q1: 0/10 (should have been Allgather)
- ME2 Q5: 3/10 (should have been AllReduce)
- **Must know:** when to use Allgather vs AllReduce vs Reduce+Bcast vs Scatter/Scatterv

### 3. Communication Cost Expressions
- ME1 Q1: couldn't write t_s + 9*t_w for 3D mesh
- A1 Q5: cost analysis incorrect
- **Must know:** hop counts on different topologies, t_s/t_w cost model

### 4. Data Distribution Decisions
- ME1 Q3: distributed the wrong array (query instead of seq)
- A1 Q4: overstated output partitioning benefits
- **Must know:** which data to distribute and why, input vs output partitioning trade-offs

### 5. Algorithm-to-Topology Mapping
- ME2 Q4: didn't discuss how Cannon's 2D mesh pattern maps to linear network
- **Must know:** how communication patterns of algorithms relate to network topology

## What Rohan Gets Right Consistently

- Task dependency graphs (A1 Q3 partial, ME1 Q2 perfect)
- MPI basics: Sendrecv, Bcast, Scatter, Scatterv usage in context
- Heat equation parallelization
- Code implementation (C K-Means, heat_mpi profiling)
- Understanding what MPI functions do (descriptions)

## Exam3 Study Priority Based on Weaknesses

Exam3 is about **analytic and empirical performance evaluation**. The critical weaknesses that overlap with exam3 scope:

1. **Communication cost expressions** (t_s, t_w, hop counts) — DIRECTLY TESTED in analytic performance
2. **Deriving T_p, T_o, efficiency, isoefficiency** — exam3 core topic, A3 Problem 1
3. **Reading HPC Toolkit traces** — exam3 core topic, A3 Problems 2-3
4. **Block vs cyclic distribution and its effect on load balance** — A3 Problem 3
5. **Broadcast cost on 1D torus** — A3 Problem 1 uses this directly

## Connections

- [[parallel-performance-analysis]] — T_p, T_o, efficiency, isoefficiency formulas
- [[strong-vs-weak-scaling]] — isoefficiency and scaling
- [[mpi-broadcast]] — broadcast algorithms and costs
- [[block-vs-cyclic-distribution]] — data distribution strategies
- [[hpc-toolkit-profiling]] — reading profile and trace views
- [[lu-factorization]] — the algorithm being analyzed
- [[slide-exercises]] — practice problems matching these patterns

## Source Citations

[Source: submission_388421719.pdf] [Source: submission_391337411.pdf] [Source: submission_400801317.pdf]
