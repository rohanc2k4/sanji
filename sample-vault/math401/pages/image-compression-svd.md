---
title: Image Compression via SVD
course: math401
exam: exam2
topics: [svd, image-compression, truncated-svd, data-quality, compression-ratio]
source_count: 3
sources: [ch_image_compression.pdf, Answer_keys_to_SP4-5.pdf, MATH_401_-_Practice_Exam_2.1.pdf]
created: 2026-04-09
last_updated: 2026-04-09
status: needs_review
exam_relevant: true
difficulty: medium
---

Image compression uses truncated SVD to approximate a matrix (image) by keeping only the $k$ largest singular values. This preserves most of the image variance while dramatically reducing storage.

## Details

### How images are matrices

A grayscale image is an $m \times n$ matrix $A$ where each entry is a pixel value in $[0, 1]$ (0 = black, 1 = white).

### Truncated SVD

Given $A = U\Sigma V^T$ with singular values $\sigma_1 \geq \sigma_2 \geq \cdots \geq \sigma_r > 0$:

**Keep only the top $k$:**

$$A_k = U_k \Sigma_k V_k^T$$

where $U_k$ is $m \times k$, $\Sigma_k$ is $k \times k$, $V_k$ is $n \times k$.

### Image quality (variance preserved)

$$\boxed{\text{Quality} = \frac{\sigma_1^2 + \sigma_2^2 + \cdots + \sigma_k^2}{\sigma_1^2 + \sigma_2^2 + \cdots + \sigma_r^2}}$$

Rule of thumb: aim for $\geq 99.5\%$ quality.

### Compression ratio and storage

See [[image-compression]] for full worked examples.

**For rectangular $m \times n$ image (EXAM-LEVEL — Exercise 10.6):**

| | Values stored |
|---|---|
| Uncompressed | $mn$ |
| Compressed ($k$ singular values) | $k(m + n + 1)$ |

$$\text{Compression ratio} = \frac{k(m + n + 1)}{mn}$$

$$\text{Worth doing when } k < \frac{mn}{m + n + 1}$$

**For square $n \times n$:** ratio simplifies to $\approx 2k/n$. Worth it when $k < n/2$.

### Out-of-range values

After truncation, pixel values may fall outside $[0, 1]$. **Don't renormalize — clamp:** values $> 1 \to$ white, values $< 0 \to$ black. [Source: ch_image_compression.pdf]

## Key Formulas / Patterns

- **Quality:** $\displaystyle\frac{\sum_{i=1}^{k} \sigma_i^2}{\sum_{i=1}^{r} \sigma_i^2}$
- **Rectangular compression ratio:** $\dfrac{k(m+n+1)}{mn}$
- **Square compression ratio:** $\dfrac{2k}{n}$
- **Worth doing when:** $k < \dfrac{mn}{m+n+1}$
- **Rank-1 approximation:** $A_1 = \sigma_1 \mathbf{u}_1 \mathbf{v}_1^T$

## Connections

- [[singular-value-decomposition]] — image compression is the primary application of truncated SVD
- [[orthogonal-diagonalization]] — SVD extends diagonalization concepts

## Source Citations

[Source: ch_image_compression.pdf] — Justin's notes chapter 10, full theory and examples.
[Source: Answer_keys_to_SP4-5.pdf] — Exercise 10.6 solution (compression ratio formula).
[Source: MATH_401_-_Practice_Exam_2.1.pdf] — Practice exam includes image compression problems.
