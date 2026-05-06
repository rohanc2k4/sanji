---
title: SVD notes
---

# Singular value decomposition

Every real matrix `A ∈ R^{m×n}` factors as `A = U Σ V^T` where:

- `U` is `m×m` orthogonal (left singular vectors)
- `V` is `n×n` orthogonal (right singular vectors)
- `Σ` is `m×n` diagonal with non-negative entries `σ_1 ≥ σ_2 ≥ ... ≥ σ_r > 0` and zeros below

The columns of `U` and `V` corresponding to the same `σ_i` are paired — `A v_i = σ_i u_i`.

## Eckart-Young

The best rank-k approximation of `A` in either Frobenius or operator norm is the truncation `A_k = U_k Σ_k V_k^T` where you keep only the top k singular values. This is the load-bearing fact for low-rank approximation, PCA, and image compression.

## Connection to PCA

If you center your data matrix and take the SVD, the right singular vectors `V` are the principal directions and `σ_i^2 / (n-1)` are the principal variances. PCA is just SVD on centered data.

See [[final-exam]] for the practice problems.
