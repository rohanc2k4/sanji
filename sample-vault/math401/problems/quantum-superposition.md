---
title: "Quantum: Superposition w.r.t. a Basis"
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# Quantum: Superposition w.r.t. a Basis

**Source:** SP5 Exercise 2.3, Answer Key

## The Rule

A state is a **superposition** with respect to basis $\{|b_0\rangle, |b_1\rangle\}$ if it has **nonzero coefficients for BOTH basis vectors** when written in that basis.

## Basis Conversions (put on cheat sheet)

$$|0\rangle = \frac{1}{\sqrt{2}}(|+\rangle + |-\rangle) \qquad |1\rangle = \frac{1}{\sqrt{2}}(|+\rangle - |-\rangle)$$

$$|+\rangle = \frac{1}{\sqrt{2}}(|0\rangle + |1\rangle) \qquad |-\rangle = \frac{1}{\sqrt{2}}(|0\rangle - |1\rangle)$$

## Problem

For each state, determine: is it a superposition in the **standard basis** $\{|0\rangle, |1\rangle\}$? In the **Hadamard basis** $\{|+\rangle, |-\rangle\}$? If not a superposition, give a basis where it is.

**(a)** $|+\rangle$

**(b)** $\frac{1}{\sqrt{2}}(|+\rangle + |-\rangle)$

**(c)** $\frac{1}{\sqrt{2}}(|+\rangle - |-\rangle)$

**(d)** $\frac{1}{\sqrt{2}}(|0\rangle - i|1\rangle)$

## Solution

**(a)** $|+\rangle = \frac{1}{\sqrt{2}}|0\rangle + \frac{1}{\sqrt{2}}|1\rangle$

- Standard basis $\{|0\rangle, |1\rangle\}$: **YES** — Both coefficients $= 1/\sqrt{2} \neq 0$
- Hadamard basis $\{|+\rangle, |-\rangle\}$: **NO** — It IS $|+\rangle$ (coefficient of $|-\rangle$ is 0)

**(b)** $\frac{1}{\sqrt{2}}(|+\rangle + |-\rangle) = |0\rangle$

- Standard basis: **NO** — It's just $|0\rangle$ (coefficient of $|1\rangle$ is 0)
- Hadamard basis: **YES** — Both coefficients $= 1/\sqrt{2} \neq 0$

**(c)** $\frac{1}{\sqrt{2}}(|+\rangle - |-\rangle) = |1\rangle$

- Standard basis: **NO** — It's just $|1\rangle$
- Hadamard basis: **YES** — Both coefficients nonzero

**(d)** $\frac{1}{\sqrt{2}}(|0\rangle - i|1\rangle)$

- Standard basis: **YES** — Both coefficients nonzero ($1/\sqrt{2}$ and $-i/\sqrt{2}$)
- Hadamard basis: **YES** — Convert: $= \frac{1}{2}(1-i)|+\rangle + \frac{1}{2}(1+i)|-\rangle$, both nonzero
- $\{|i\rangle, |-i\rangle\}$ basis: **NO** — It IS $|-i\rangle$

> **Key insight:** A state that is NOT a superposition in one basis IS a superposition in another. To find a basis where it's NOT a superposition, find a basis that **contains** it as one of its basis vectors.
