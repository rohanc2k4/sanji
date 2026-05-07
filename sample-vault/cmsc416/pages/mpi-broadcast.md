---
title: MPI Broadcast
course: cmsc416
exam:
  - exam2
  - exam3
topics:
  - mpi
  - collective-ops
  - broadcast
  - communication
source_count: 3
sources:
  - lu_mpi1.c
  - lu_mpi2.c
  - 04-mpi.pdf
created: 2026-04-07
last_updated: 2026-04-07
status: reviewed
exam_relevant: true
difficulty: easy
---

MPI_Bcast sends data from one processor (the root) to all other processors in the communicator. It's the most common way to share a single piece of data with everyone.

## Details

```c
MPI_Bcast(buffer, count, datatype, root, comm);
```

- `buffer` — pointer to the data (send buffer on root, receive buffer on others)
- `count` — number of elements
- `datatype` — MPI_FLOAT, MPI_INT, etc.
- `root` — rank of the sending processor
- `comm` — communicator (usually MPI_COMM_WORLD)

**All processors call MPI_Bcast** — it's a collective operation. The root sends, everyone else receives. If any processor doesn't call it, the program deadlocks.

### Usage in LU Factorization

Both MPI1 and MPI2 broadcast the leading row at each iteration:

```c
MPI_Bcast(Arow_d, dim, MPI_FLOAT, lead_rank, MPI_COMM_WORLD);
```

The processor that owns row d sends it; all others receive it into a buffer. Then every processor uses this row to update their local rows.

## Key Formulas / Patterns

**Cost on a 1D torus network:**
```
T_bcast = ceil(log2(P)) * (t_s + t_w * m)
```
- P = number of processors
- t_s = startup latency per message
- t_w = per-word transfer time
- m = message size (number of words)

The log2(P) factor comes from the tree-based broadcast algorithm: the root sends to one neighbor, then both send to their neighbors, doubling each step.

## Connections

- Used in [[lu-factorization]] to share the pivot row
- Cost model appears in [[parallel-performance-analysis]] for deriving T_p
- Related to other collectives: `MPI_Scatter`, `MPI_Gather`, `MPI_Reduce` (see course slides)

## Source Citations

- [Source: lu_mpi1.c] — line 137, broadcast in block-distributed LU
- [Source: lu_mpi2.c] — line 160, broadcast in cyclic-distributed LU
- [Source: 04-mpi.pdf] — MPI collective operations overview
