---
title: Image Compression via SVD
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# Image Compression via SVD

**Source:** SP4 Exercise 10.6, Justin's notes

## Problem 1: Compression Ratio

An $m \times n$ grayscale image is compressed using truncated SVD with $k$ singular values. Derive the compression ratio and determine when compression is worth doing.

## Solution 1

### What gets stored

| | Values stored | Count |
|---|---|---|
| Uncompressed | All pixel values | $mn$ |
| Compressed | $k$ columns of $U$ ($m$ entries each) + $k$ singular values + $k$ columns of $V$ ($n$ entries each) | $k(m + n + 1)$ |

### Compression ratio

$$\text{Compression ratio} = \frac{\text{compressed size}}{\text{uncompressed size}} = \frac{k(m + n + 1)}{mn}$$

### When is it worth doing?

Compression saves space when compressed $<$ uncompressed:

$$k(m + n + 1) < mn \implies \boxed{k < \frac{mn}{m + n + 1}}$$

### Square image shortcut

For $n \times n$: ratio simplifies to $\approx \frac{2k}{n}$ (since $k(2n+1) \approx 2kn$ for large $n$).

Worth doing when $k < n/2$.

---

## Problem 2: Image Quality

Given singular values $\sigma_1 = 100$, $\sigma_2 = 50$, $\sigma_3 = 20$, $\sigma_4 = 10$, $\sigma_5 = 5$, $\sigma_6 = 1$. Compute quality for $k = 3$.

## Solution 2

$$\text{Quality} = \frac{\sigma_1^2 + \sigma_2^2 + \cdots + \sigma_k^2}{\sigma_1^2 + \sigma_2^2 + \cdots + \sigma_r^2}$$

Numerator ($k = 3$):

$$100^2 + 50^2 + 20^2 = 10000 + 2500 + 400 = 12{,}900$$

Denominator (all):

$$10000 + 2500 + 400 + 100 + 25 + 1 = 13{,}026$$

$$\text{Quality} = \frac{12{,}900}{13{,}026} \approx 99.03\%$$

> **Rule of thumb:** Aim for $\geq 99.5\%$ quality for a reasonable image.

> **Out-of-range pixels after truncation:** Don't renormalize. **Clamp:** values $> 1$ become white, values $< 0$ become black.
