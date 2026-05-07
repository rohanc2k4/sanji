---
title: CMSC416 — Mini-Exam 4 Scope
type: exam-scope
status: evergreen
last_updated: 2026-04-30
sources: [12-pthreads.pdf, 13-openmp.pdf, 14-gpu-cuda.pdf, 12-pthreads-code.zip, 13-openmp-code.zip, 14-gpu-cuda-code.zip, lec-2026-04-09, 04-14, 04-16, 04-21, 04-23, 04-28-captions.txt]
---

# CMSC416 — Mini-Exam 4 Scope

**Date:** April 30, 2026 (Thursday)
**Priority:** CRITICAL (final mini-exam of the semester; close to failing — must ace this)
**Format:** Mini-exam, open book / open laptop (assumed same as prior mini-exams)

## Topics

From professor's announcement:
- **Shared memory parallel programming** (last two weeks of lecture)
- **CUDA programming** (this week's lecture)
- Content draws from **Project 4** experience

All material covered since Exam 3.

## Raw Announcement

> Mini-Exam 4 will be on Thu 30-Apr as planned. Doing project 4 will be great preparation for it. Revisiting the in-class exercises on shared memory (last two weeks) and CUDA programming (this week) will also be great preparation.

## Study Inputs (ingested 2026-04-30)

### Lecture PDFs (post-exam 3)
- `raw/12-pthreads.pdf` — PThreads (POSIX threads, mutexes, atomics, barriers, false sharing)
- `raw/13-openmp.pdf` — OpenMP (directives, scheduling, reductions, scoping)
- `raw/14-gpu-cuda.pdf` — GPU + CUDA (kernels, blocks, shared mem, atomics, reductions, sorting)

### Lecture transcripts
- `raw/transcripts/lec-2026-04-09-captions.txt` (PThreads kickoff)
- `raw/transcripts/lec-2026-04-14-captions.txt`
- `raw/transcripts/lec-2026-04-16-captions.txt` (OpenMP)
- `raw/transcripts/lec-2026-04-21-captions.txt`
- `raw/transcripts/lec-2026-04-23-captions.txt` (CUDA intro)
- `raw/transcripts/lec-2026-04-28-captions.txt` (CUDA reductions, A4 prep)

### Code
- `raw/code/pthreads/12-pthreads-code/` — picalc variants (mutex slow/fast, falseshare, atomic), pthread_sum_array
- `raw/code/openmp/13-openmp-code/` — picalc reduction/atomic/critical, matvec, spellcheck, scheduling demos
- `raw/code/cuda/14-gpu-cuda-code/` — hello, vecadd, vecloop, arraysum kernels 1-5, arraysum_cublas, matadd, oddeven, optimized_reduce

### Wiki pages (created or updated)
- [[pthreads]] (created 2026-04-30)
- [[openmp]] (created 2026-04-30)
- [[cuda]] (created 2026-04-30)
- [[shared-memory-parallel]] (updated for exam4 relevance)

## Master Cheatsheet

`outputs/EXAM4_CHEATSHEET.md` — full pthreads/openmp/cuda cheatsheet, mirrors EXAM2 blueprint (quick lookup tables, complete sections per topic, slide exercises, common mistakes).

## Format

- Mini-exam, ~30 min, 3-4 problems. Open book / open laptop (assumed same as prior).
- Per 4/28 transcript: small + focused (1-2 of the three topics drilled deeply, not all three at once). Final exam (later, 2hr) is comprehensive.

## Topics most likely to appear

1. **CUDA kernel writing** — given a C loop, write the kernel + launch params. Indexing, bounds, `__syncthreads`, shared mem.
2. **Reduction patterns** — explain `array_sum_3` vs `_4` vs `_5`; why each `__syncthreads` is needed.
3. **OpenMP pragma identification** — given a parallel-for, identify the right scheduling, reduction, scoping. The `state` PRNG bug is a likely "spot the bug" question.
4. **Why fast vs slow** — false sharing, mutex contention, lock-free patterns. Why `picalc_pthreads_mutex_slow.c` is slower with more threads.
5. **PThreads → OpenMP equivalent** — translate one to the other.

## Open questions

- Confirm format (mini-exam length, open book/laptop) once professor posts logistics.
- Confirm whether material from earlier exams is also fair game on this final mini-exam (per 4/28 transcript: probably no — the *final* exam is comprehensive, but mini-exam 4 is narrow).
