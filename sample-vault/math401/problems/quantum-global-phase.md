---
title: Quantum: Global Phase (Same State Test)
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# Quantum: Global Phase (Same State Test)

**Source:** SP5 Exercise 2.2, Answer Key

## The Rule

Two states $|v\rangle$ and $|v'\rangle$ represent the **same physical state** if and only if:

$$|v\rangle = c\,|v'\rangle \quad \text{where} \quad |c| = 1$$

The constant $c$ is the **global phase factor** (can be $-1$, $i$, $-i$, $e^{i\theta}$, etc.)

## Problem

For each pair, determine if they represent the same state:

**(a)** $|0\rangle$ and $-|0\rangle$

**(b)** $|1\rangle$ and $i|1\rangle$

**(c)** $\frac{1}{\sqrt{2}}(|0\rangle + |1\rangle)$ and $\frac{1}{\sqrt{2}}(-|0\rangle + i|1\rangle)$

**(d)** $\frac{1}{\sqrt{2}}(|0\rangle + |1\rangle)$ and $\frac{1}{\sqrt{2}}(|0\rangle - |1\rangle)$

**(e)** $\frac{1}{\sqrt{2}}(|0\rangle - |1\rangle)$ and $\frac{1}{\sqrt{2}}(|1\rangle - |0\rangle)$

## Solution

**(a) SAME.** $|0\rangle = (-1) \cdot (-|0\rangle)$, and $|-1| = 1$. Global phase $c = -1$.

**(b) SAME.** $i|1\rangle = i \cdot |1\rangle$, so $|1\rangle = (-i) \cdot i|1\rangle$, and $|-i| = 1$. Global phase $c = i$.

**(c) DIFFERENT.** Write as column vectors:

$$|v\rangle = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 \\ 1 \end{pmatrix}, \quad |v'\rangle = \frac{1}{\sqrt{2}}\begin{pmatrix} -1 \\ i \end{pmatrix}$$

For $|v\rangle = c\,|v'\rangle$, need $c \cdot (-1) = 1 \implies c = -1$ AND $c \cdot i = 1 \implies c = -i$.

$c$ can't be $-1$ and $-i$ simultaneously. **Different states.**

**(d) DIFFERENT.** Need $c \cdot 1 = 1 \implies c = 1$ AND $c \cdot (-1) = 1 \implies c = -1$.

$c$ can't be $1$ and $-1$ simultaneously. **Different states.**

**(e) SAME.**

$$\frac{1}{\sqrt{2}}(|1\rangle - |0\rangle) = -\frac{1}{\sqrt{2}}(|0\rangle - |1\rangle)$$

Global phase $c = -1$, and $|-1| = 1$. **Same state.**

> **Method:** Write both as column vectors in the standard basis. Check if dividing component-by-component gives the same $c$ everywhere. If $c$ is the same for all components and $|c| = 1$, they're the same state.
