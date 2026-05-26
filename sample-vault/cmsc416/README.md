# CMSC416 — Parallel Computing Wiki Index

## Concepts

- [[lu-factorization]] — In-place LU decomposition algorithm, serial foundation (exam3)
- [[block-vs-cyclic-distribution]] — Block vs cyclic row distribution, trade-offs for LU (exam3)
- [[mpi-broadcast]] — MPI_Bcast collective operation, cost model on 1D torus (exam2, exam3)
- [[parallel-performance-analysis]] — T_p, speedup, efficiency, overhead, isoefficiency derivations (exam3)
- [[hpc-toolkit-profiling]] — HPC Toolkit pipeline, reading profile/trace data (exam3)
- [[cpu-time-vs-wall-time]] — CPU time vs wall time, time utility, MPI_Wtime (exam3)
- [[empirical-performance-tools]] — perf, gprof, profiling vs tracing approaches (exam3)
- [[cache-performance]] — Row vs column traversal, memory hierarchy, cache coherence (exam3)
- [[strong-vs-weak-scaling]] — Amdahl's Law, Gustafson's Law, isoefficiency interpretation (exam3)
- [[parallel-sorting]] — Parallel quicksort, odd-even sort (exam2/exam3 bridge)
- [[shared-memory-parallel]] — Shared memory, cache coherence, false sharing (exam4)
- [[pthreads]] — POSIX threads, mutexes, atomics, barriers, false sharing (exam4)
- [[openmp]] — Directive-based shared-memory parallelism, scheduling, reductions (exam4)
- [[cuda]] — GPU programming, kernels, blocks, shared mem, atomicAdd, tree reductions (exam4)

## Exam Prep

- [[exam-prep]] — exam 3 study workflow
- [[exam4-prep]] — exam 4 study workflow (pthreads, openmp, cuda)
- [[exam3-scope]] — exam 3 scope
- [[exam4-scope]] — exam 4 scope (pthreads, openmp, cuda)

## Exam Analysis

- [[past-exam-analysis]] — A1 (85/100), ME1 (27.5/40), ME2 (19/40): weakness patterns and exam3 study priorities

## Practice

- [[slide-exercises]] — Worked problems from lecture slides: summing, isoefficiency, Cannon's, LU, matrix partitioning (exam3)

## Code Walkthroughs

- [[lu-mpi1-analysis]] — Block distribution LU: fast parallel I/O, poor load balance (exam3)
- [[lu-mpi2-analysis]] — Cyclic distribution LU: root-only I/O + scatter, good load balance (exam3)
- [[lu-mpi3-recommendation]] — Recommended hybrid: parallel I/O + cyclic computation (exam3)
- [[heat-mpi-analysis]] — Heat transfer MPI: ghost cells, gather bottleneck, profiling target (exam3)

## Sources Ingested

- [lu_serial.c] — ingested 2026-04-07, 1 page (lu-factorization)
- [lu_mpi1.c] — ingested 2026-04-07, 3 pages (lu-mpi1-analysis, block-vs-cyclic, lu-mpi3-recommendation)
- [lu_mpi2.c] — ingested 2026-04-07, 3 pages (lu-mpi2-analysis, block-vs-cyclic, lu-mpi3-recommendation)
- [prior-claude-context.md] — ingested 2026-04-07, 1 page (hpc-toolkit-profiling)
- [08-performance-analysis.pdf] — ingested 2026-04-07, 3 pages (parallel-performance-analysis, strong-vs-weak-scaling, cpu-time-vs-wall-time)
- [10-empirical-performance.pdf] — ingested 2026-04-07, 3 pages (cpu-time-vs-wall-time, empirical-performance-tools, cache-performance)
- [09-parallel-sorting.pdf] — ingested 2026-04-07, 1 page (parallel-sorting)
- [heat_mpi.c] — ingested 2026-04-07, 1 page (heat-mpi-analysis)
- [heat_serial.c] — ingested 2026-04-07, 1 page (heat-mpi-analysis)
- [lec-2026-03-24-captions.txt] — ingested 2026-04-07, 1 page (parallel-sorting)
- [lec-2026-03-26-captions.txt] — ingested 2026-04-07, 3 pages (cpu-time-vs-wall-time, empirical-performance-tools, cache-performance)
- [lec-2026-03-31-captions.txt] — ingested 2026-04-07, 3 pages (empirical-performance-tools, cpu-time-vs-wall-time, hpc-toolkit-profiling)
- [lec-2026-04-02-captions.txt] — ingested 2026-04-07, 2 pages (cache-performance, shared-memory-parallel)
- [EXAM2_CHEATSHEET.md] — ingested 2026-04-07, cross-referenced with existing pages (MPI foundations)
- [A3.pdf] — ingested 2026-04-07, referenced in parallel-performance-analysis and exam3-scope
- [hpctoolkit-heat_mpi-database-18881076] — ingested 2026-04-07, 1 page (hpc-toolkit-profiling, heat-mpi-analysis)
- [hpctoolkit-lu_mpi1-database-mat_10K] — ingested 2026-04-07, referenced in hpc-toolkit-profiling
- [hpctoolkit-lu_mpi2-database-mat_10K] — ingested 2026-04-07, referenced in hpc-toolkit-profiling
- [submission_388421719.pdf] — ingested 2026-04-08, A1 graded (85/100), 1 page (past-exam-analysis)
- [submission_391337411.pdf] — ingested 2026-04-08, Mini-Exam 1 graded (27.5/40), 1 page (past-exam-analysis)
- [submission_400801317.pdf] — ingested 2026-04-08, Mini-Exam 2 graded (19/40), 1 page (past-exam-analysis)
- [12-pthreads.pdf + 12-pthreads-code/] — ingested 2026-04-30, 1 page (pthreads)
- [13-openmp.pdf + 13-openmp-code/] — ingested 2026-04-30, 1 page (openmp)
- [14-gpu-cuda.pdf + 14-gpu-cuda-code/] — ingested 2026-04-30, 1 page (cuda)
- [lec-2026-04-09 / 04-14 / 04-16 / 04-21 / 04-23 / 04-28 captions.txt] — ingested 2026-04-30, cross-referenced in pthreads/openmp/cuda pages
