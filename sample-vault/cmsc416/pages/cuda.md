---
title: CUDA — GPU Programming with NVIDIA's Toolkit
course: cmsc416
exam: exam4
topics: [cuda, gpu, kernels, threads-blocks-grids, shared-memory, atomics, syncthreads, reductions, cublas]
source_count: 4
sources: [14-gpu-cuda.pdf, code/cuda/14-gpu-cuda-code/, lec-2026-04-23-captions.txt, lec-2026-04-28-captions.txt]
created: 2026-04-30
last_updated: 2026-04-30
status: needs_review
exam_relevant: true
difficulty: hard
---

CUDA exposes the GPU as a **co-processor** to the CPU host. The host transfers data to device memory, launches kernels (functions tagged `__global__`) that run on **thousands of GPU threads**, and reads results back. Threads are grouped into **blocks** (which share fast `__shared__` cache memory and can sync via `__syncthreads()`); blocks form a **grid**. The CUDA mental model blends [[shared-memory-parallel]] (fast intra-block sharing) with distributed-memory programming (explicit cross-device data transfers, like MPI) — a hybrid that maps onto the hardware reality.

## Details

### CPU vs GPU at a glance

| | CPU | GPU |
|---|---|---|
| Cores | Few (4–64), complex | Thousands, simple |
| Per-thread speed | Fast | Slow |
| Memory | Main RAM | Device DRAM (separate) |
| Best at | Branching, latency-sensitive | Massive embarrassingly parallel work |

**Movement model:** copy host→device, launch kernel(s), copy device→host.

### CUDA terminology

| Term | Meaning |
|---|---|
| **Thread** | Smallest unit of execution. Has `threadIdx.{x,y,z}` |
| **Block** | Group of threads. Shared memory + `__syncthreads()` work within a block |
| **Grid** | Group of blocks. `blockIdx.{x,y,z}`, `gridDim` |
| **Warp** | Hardware schedule unit = 32 threads in lockstep |
| **Kernel** | `__global__` function. Called from host, runs on device |
| **Host** | CPU side: sets up data, launches kernels |
| **Device** | GPU |
| **Compute Capability** | Hardware version, e.g. `sm_70`. Determines available features |
| **PTX** | Parallel Thread Execution — GPU assembly. Embedded in fat binaries |

### Compile and run on Zaratan

```bash
sinteractive -c 4 -G -t 20 -a cmsc416-class    # interactive GPU node
module load soft/cuda
nvcc hello.cu                                  # produces a.out (ELF + embedded PTX)
./a.out
```

### The execution-config syntax

```c
kernel<<<nblocks, nthreads>>>(args);
kernel<<<nblocks, nthreads, shared_bytes>>>(args);
dim3 b(bx,by); dim3 t(tx,ty);
kernel<<<b, t>>>(args);                        // 2D launch
```

To cover an array of length `L`:
```c
long nthreads = 256;
long nblocks = (L + nthreads - 1) / nthreads;
kernel<<<nblocks, nthreads>>>(L, ...);
// inside kernel: if (idx < L) { ... }         // bounds guard
```

### Indexing identities (memorize)

```c
int idx_1d = threadIdx.x + blockDim.x * blockIdx.x;
long row = threadIdx.x + blockDim.x * blockIdx.x;   // 2D, x = row
long col = threadIdx.y + blockDim.y * blockIdx.y;   // 2D, y = col
```

### Vector add — the canonical pattern

```c
__global__ void vector_add(long len, float *x, float *y, float *z) {
    long idx = threadIdx.x + blockDim.x * blockIdx.x;
    if (idx < len) z[idx] = x[idx] + y[idx];
}

// host:
cudaMalloc((void**)&dev_x, bytes);
cudaMemcpy(dev_x, host_x, bytes, cudaMemcpyHostToDevice);
vector_add<<<nb, nt>>>(len, dev_x, dev_y, dev_z);
cudaMemcpy(host_z, dev_z, bytes, cudaMemcpyDeviceToHost);
cudaFree(dev_x);
```

`cudaMemcpy` blocks the CPU — implicit sync point with all pending kernels.

### Repeated kernel launches have overhead

Looping inside a kernel beats relaunching from host (lecture: 0.69s vs 1.08s for 1M iters):

```c
// BETTER: device-side loop
__global__ void vector_loopadd(long iters, long len, ...) {
    int idx = ...;
    if (idx < len)
        for (long i = 0; i < iters; i++) z[idx] = x[idx] + y[idx];
}
```

### Reduction — array sum, four progressively-better kernels

| Kernel | Strategy | 10M, 128t/block | Notes |
|---|---|---|---|
| 1 | All threads `*sum += data[i]` | broken | Race condition, wrong answer |
| 2 | All threads `atomicAdd(sum, data[i])` | slow | Correct but heavy global contention |
| 3 | Thread-0 of block sums its slice via local var, then `atomicAdd` | 0.99 ms | One atomic per block |
| 4 | All threads load to `__shared__`, then thread-0 sums | 0.64 ms | Shared mem caching wins |
| 5 | True tree reduction in `__shared__` (halve active threads each step) | 0.89 ms | Algorithmic but launch overhead |
| **cuBLAS Sdot** | NVIDIA's tuned implementation | **0.26 ms** | **Use this** |

Lesson: **NVIDIA's libraries are hard to beat.** When a primitive fits, use cuBLAS.

### Tree reduction (the canonical pattern, kernel 5)

```c
__global__ void array_sum_5(int len, float *data, float *sum) {
    extern __shared__ float blockvals[];
    blockvals[threadIdx.x] = 0.0f;

    int idx = threadIdx.x + blockDim.x * blockIdx.x;
    if (idx < len) blockvals[threadIdx.x] = data[idx];
    __syncthreads();                                   // (1) wait for all loads

    for (int i = blockDim.x / 2; i > 0; i /= 2) {
        if (threadIdx.x < i)
            blockvals[threadIdx.x] += blockvals[threadIdx.x + i];
        __syncthreads();                               // (2) wait for this layer
    }

    if (threadIdx.x == 0) atomicAdd(sum, blockvals[0]);
}
// Launch with shared_bytes = nthreads * sizeof(float)
```

`__syncthreads()` is required (1) before reading neighbors that other threads in the block wrote, and (2) between halving steps to ensure a layer's adds complete before the next layer reads.

### `__syncthreads()` rules

- Block-level only. **Cannot** sync across blocks.
- All threads in the block must reach the same `__syncthreads()` (don't put it inside divergent branches).
- For cross-block sync: use **separate kernel launches** (each launch = global barrier) or Cooperative Groups + `cudaLaunchCooperativeKernel` (newer, fragile).

### Warps

Hardware schedules 32 threads at a time. Threads in a warp execute in lockstep; divergent branches inside a warp serialize the paths. `__syncthreads()` waits until all warps in the block reach it.

### Shared memory — static vs dynamic

```c
// STATIC (compile-time size)
__global__ void k_static(...) {
    __shared__ float arr[NTHREADS];
}

// DYNAMIC (size set at launch)
__global__ void k_dyn(...) {
    extern __shared__ float arr[];
}
k_dyn<<<nb, nt, nt * sizeof(float)>>>(...);    // 3rd config arg = shared bytes
```

### Atomic operations

`atomicAdd`, `atomicSub`, `atomicMin/Max`, `atomicCAS`, `atomicExch`, bitwise variants. Serialize at the target address. Use after a per-block partial reduction to cut traffic.

### Multi-D and pitched memory

```c
cudaMallocPitch((void**)&dev_a, &pitch, width_bytes, rows);
cudaMemcpy2D(dev_a, pitch, host_a, host_pitch, width_bytes, rows, kind);
// kernel: idx = row * (pitch / sizeof(float)) + col;
```

`cudaMallocPitch` pads each row so its start aligns to a memory-bank/cache-line — improves access patterns at the cost of a pitch != cols arithmetic.

### Matrix multiply

Naive: 1 thread per output element, loops over k:

```c
long i = threadIdx.x + blockDim.x * blockIdx.x;
long j = threadIdx.y + blockDim.y * blockIdx.y;
float sum = 0.0f;
for (long k = 0; k < N; k++) sum += A[i*N+k] * B[k*N+j];
C[i*N+j] = sum;
```

Slow because each thread re-reads rows/cols from global memory. **Tiled matmul** loads tiles into `__shared__`, reuses across threads in the block, syncs between tile loads — major speedup.

### Odd-Even sort on GPU

Each thread does one compare-exchange; host launches the kernel N times for N rounds. Even with N/2 threads in parallel, **slower than CPU `qsort`** for moderate N (3.2 s vs 0.09 s for length 500k) — algorithmic complexity O(N²) plus launch overhead loses to O(N log N). Better GPU sorts: bitonic / Batcher's odd-even (sorting networks, O(log² N) rounds).

### Timing

```c
cudaEvent_t beg, end;
cudaEventCreate(&beg); cudaEventCreate(&end);
cudaEventRecord(beg);
/* kernels */
cudaEventRecord(end);
cudaEventSynchronize(end);
float ms;
cudaEventElapsedTime(&ms, beg, end);
```

Don't use CPU clocks — they miss async kernel work.

### Error checking

```c
cudaError err = cudaMalloc((void**)&p, bytes);
assert(err == cudaSuccess);
// or macro:
#define CHECK(EXPR) assert((EXPR) == cudaSuccess)
```

### Alternatives (just know they exist)

- **OpenCL:** open multi-vendor analog of CUDA. `__kernel` functions, explicit memory mgmt. Performance ≈ CUDA with hand-tuning.
- **OpenACC:** `#pragma acc` directive-based, like OpenMP for accelerators. Compiler emits the GPU code.

## Key Formulas / Patterns

- **Index:** `idx = threadIdx.x + blockDim.x * blockIdx.x`. Always.
- **Cover length L:** `nblocks = (L + nthreads - 1) / nthreads`; guard `if (idx < L)`.
- **Reduction recipe:** load to shared mem → `__syncthreads()` → tree-halve in shared mem → final `atomicAdd` per block.
- **Two-sync rule:** sync after writing shared mem before any other thread reads it; sync between iterations of in-place tree reduction.
- **Lean on cuBLAS** for any standard linear-algebra op.

## Connections

- [[pthreads]] — fundamental shared-memory ideas (atomics, mutexes) reappear as `atomicAdd` and `__syncthreads()`
- [[openmp]] — OpenMP `reduction` is the abstract version of CUDA's tree-reduction recipe
- [[shared-memory-parallel]] — cache coherence, false sharing background
- [[parallel-sorting]] — odd-even sort, bitonic sort revisited on GPU
- [[empirical-performance-tools]] — `cudaEvent` is the GPU-side analogue of MPI_Wtime

## Source Citations

- [Source: 14-gpu-cuda.pdf] — full lecture content, kernels 1-5, multi-dim, sorting, cuBLAS
- [Source: 14-gpu-cuda-code/hello.cu, vecadd_cuda.cu, vecloop_cuda.cu] — basic patterns
- [Source: 14-gpu-cuda-code/arraysum_cuda.cu, arraysum_cublas.cu, arraysum-timing.txt] — reduction comparison + timings
- [Source: 14-gpu-cuda-code/matadd_cuda.cu, oddeven_cuda.cu, optimized_reduce.cu] — multi-dim, sort, reduction tuning
- [Source: lec-2026-04-23-captions.txt, lec-2026-04-28-captions.txt]
