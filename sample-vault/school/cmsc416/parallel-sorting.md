---
title: Parallel sorting
---

# Parallel sorting

Three patterns from the cmsc416 unit, ranked by usefulness in real workloads:

## 1. Sample sort

Pick a random sample of size `s × P` from the N input elements. Sort the sample. Take every s-th element as a pivot — this gives `P − 1` pivots that approximate the global distribution. Bucket each process's local data by pivot, all-to-all the buckets, sort each bucket locally.

Communication: O(N) bytes total over the all-to-all. Wins when N >> P.

## 2. Bitonic sort

Hardware-friendly comparator network. Constant communication pattern, easy to map onto a hypercube topology. Worse total work (O(N log² N)) but the locality is excellent.

## 3. Radix variants

When keys are bounded integers, radix sort beats comparison-based for large N. The parallel form is essentially repeated bucket-by-digit, which is sample sort with deterministic pivots.

See [[exam-prep]] for the practice problems.
