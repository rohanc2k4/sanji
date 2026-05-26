---
title: Stream Cipher Cryptography via Linear Recursion mod 2
course: math401
exam: final
topics: [cryptography, mod-2, stream-cipher, linear-recursion, matrix-mod-2]
source_count: 1
sources: [ch_cryptography.pdf]
created: 2026-04-21
last_updated: 2026-04-21
status: needs_review
exam_relevant: true
difficulty: medium
---

Justin Wyss-Gallifent §13: a linear-algebra take on bit-stream encryption. Alice and Bob XOR a binary plaintext with a shared, recursively-defined key; the attacker with matched plaintext+ciphertext snippets recovers the recursion coefficients by solving a linear system mod 2. Final-exam territory, not on SP6 quiz. [Source: ch_cryptography.pdf §13]

## Details

### Modulo 2 arithmetic

$a \equiv b \pmod 2$ means $a, b$ have the same parity. Arithmetic: $1+1 \equiv 0$, $(3)(5) \equiv 1$, $-1 \equiv 1$. Matrices extend entry-wise. Addition mod 2 is **XOR**.

**Key fact:** adding the same bit twice cancels: $(x + k) + k \equiv x \pmod 2$. That is why encrypt and decrypt are the same operation.

### Basic encrypt / decrypt

Alice and Bob share a short binary key (e.g., $k = 11010$). To encrypt, Alice adds the key bit-by-bit (mod 2) to the plaintext, **repeating the key** once it runs out. Bob decrypts by doing the same operation with the same key on the ciphertext. [Source: ch_cryptography.pdf §13.4]

$$\text{ciphertext} = \text{plaintext} \oplus \text{key}, \quad \text{plaintext} = \text{ciphertext} \oplus \text{key}$$

Used (with elaborations) in Bluetooth, GSM, and cable scrambling.

### Linear-recursive keys

Problem: a short key has short period and is easy to brute-force. Solution: generate a long key from a small seed using a linear recurrence mod 2.

**Definition.** A linearly recursively defined key of length $i$ is a pair $K = \{\bar s, \bar c\}$ with $\bar s, \bar c \in \{0,1\}^i$, $c_1 = 1$. The key starts with $x_1 \ldots x_i = \bar s$. For $n \ge i+1$:

$$x_n \equiv c_1 x_{n-i} + c_2 x_{n-i+1} + \cdots + c_i x_{n-1} \pmod 2$$

The constraint $c_1 = 1$ ensures the recurrence genuinely depends on $i$ previous bits (otherwise length is shorter).

**Example 13.2.** $\bar s = [0;1;1]$, $\bar c = [1;0;1]$ gives $x_n \equiv x_{n-3} + x_{n-1}$, producing $0111010\,0111010\,\ldots$ — period 7.

### Period bounds

- **Theorem:** a linear-recurrence key of length $i$ has period $\le 2^i - 1$. Proof: consider the $2^i$ windows of length $i$ in the first $2^i$ positions; each is a vector in $\{0,1\}^i \setminus \{\bar 0\}$ (the zero window forces all zeros). Only $2^i - 1$ nonzero windows exist, so two must match, and from that point the key repeats.
- **Reversibility:** given any $i$ consecutive bits we can recover the preceding bit. From $x_{k+i} \equiv x_k + c_2 x_{k+1} + \cdots + c_i x_{k+i-1}$, solve for $x_k$ (mod 2 makes $-$ and $+$ identical): $x_k \equiv c_2 x_{k+1} + \cdots + c_i x_{k+i-1} + x_{k+i}$.

### Attack: recover the recurrence from a key fragment

If Eve has matched plaintext and ciphertext, $\text{plaintext} \oplus \text{ciphertext} = \text{key fragment}$. Given enough of the key she can recover $\bar c$:

1. **Guess a length $m$.** Build matrix
$$M_m = \begin{pmatrix} x_1 & x_2 & \cdots & x_m \\ x_2 & x_3 & \cdots & x_{m+1} \\ \vdots & & & \vdots \\ x_m & x_{m+1} & \cdots & x_{2m-1} \end{pmatrix}$$
2. Solve $M_m \bar c \equiv (x_{m+1}, \ldots, x_{2m})^T \pmod 2$.
3. **Verify** the candidate $\bar c$ by regenerating the key from $(x_1, \ldots, x_m, \bar c)$ and comparing to the full fragment. If it fails, increment $m$ and retry.

**Refined brute force:** the right $m$ is typically where $\det(M_m) \equiv 1 \pmod 2$ **followed by several** $\det(M_{m+k}) \equiv 0$ — signaling that the recurrence truly has length $m$ and larger matrices are redundant. [Source: ch_cryptography.pdf §13.6.3]

### Solving $A \bar c \equiv \bar b \pmod 2$

- **Invertibility:** a square $\{0,1\}$-matrix $A$ is invertible mod 2 iff $\det(A) \equiv 1 \pmod 2$.
- **Computing $A^{-1}$ mod 2:** compute the ordinary inverse, multiply by $\det(A)$ to clear denominators (yielding the adjugate), then reduce mod 2. In formula: $A^{-1} \equiv \operatorname{adj}(A) \pmod 2$ when $\det(A) \equiv 1$.
- Then $\bar c \equiv A^{-1} \bar b \pmod 2$.

### Pseudorandom numbers from a linear recurrence

Generate the key, break into $k$-bit chunks, convert each chunk to decimal. The same recurrence-recovery attack breaks this PRNG given enough output.

## Key Formulas / Patterns

- Encrypt = Decrypt = bitwise $\oplus$ with repeating key.
- Recurrence: $x_n \equiv \sum_{j=1}^{i} c_j x_{n-i+j-1} \pmod 2$ with $c_1 = 1$.
- Period $\le 2^i - 1$; equality is common.
- Attack: build $M_m$ (Hankel matrix of the fragment), solve $M_m \bar c \equiv \bar b \pmod 2$, verify.
- Invertibility mod 2: $\det \equiv 1$. Inverse mod 2: $\operatorname{adj}(A) \bmod 2$.
- Refined brute force: look for $\det(M_m) \equiv 1$ followed by several $0$s.

## Connections

- [[quantum-information]] — contrast: classical cryptography fragile to matched-plaintext; Ekert/BB84 are quantum alternatives
- [[multi-qubit-states]] — EPR-based QKD (Ekert 91) uses entangled pairs, an alternative to this kind of classical stream cipher
- Core linear algebra: matrix inverse, determinant, linear systems — applied in $\mathbb{F}_2$

## Exercises (from the chapter)

- 13.1–13.2: encrypt a stream with a given key.
- 13.3–13.4: write out 30 digits of a recursive key and find the period.
- 13.5–13.8: brute-force recover the recurrence from a fragment.
- 13.9–13.12: refined brute force (det = 1 then three det = 0).
- 13.13–13.14: full pipeline — recover key from matched ciphertext/plaintext, decrypt, decode to letters ($1=A,\ldots$).
- 13.15–13.17: PRNG from recurrence; recover the next terms.
- 13.18: reasoning about partial determinant patterns.
- 13.19–13.20: inferring recurrence from a short repeating key.

## Common mistakes

- Forgetting $c_1 = 1$ convention: a zero first coefficient means the recurrence has a shorter effective length.
- Computing $A^{-1}$ in the reals and forgetting to first multiply by $\det(A)$ before reducing mod 2 (fractions don't reduce correctly).
- Stopping at the first $m$ with $\det(M_m) \equiv 1$ without checking that the recovered $\bar c$ actually regenerates the rest of the fragment.

## Source Citations

[Source: ch_cryptography.pdf] — §13.1–13.9, all theorems and examples; Matlab helpers `genkey`, `genmatrixfromfragment`; worked Example 13.6 (m = 9 recovery).
