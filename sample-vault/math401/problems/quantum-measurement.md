---
title: Quantum: Measurement Probabilities
type: problem
status: evergreen
last_updated: 2026-04-09
sources: []
---

# Quantum: Measurement Probabilities

**Source:** SP5 Exercise 2.6, Answer Key

## The Rule

When measuring state $|\psi\rangle$ in basis $\{|b_0\rangle, |b_1\rangle\}$:

$$\boxed{P(|b_i\rangle) = |\langle b_i | \psi \rangle|^2}$$

The inner product $\langle b_i | \psi \rangle$ is the coefficient of $|b_i\rangle$ when $|\psi\rangle$ is written in that basis.

Probabilities must sum to 1.

## Problem

Compute the measurement probabilities for each:

**(a)** State $\frac{\sqrt{3}}{2}|0\rangle - \frac{1}{2}|1\rangle$, measured in $\{|0\rangle, |1\rangle\}$

**(b)** State $-\frac{1}{2}|0\rangle + \frac{\sqrt{3}}{2}|1\rangle$, measured in $\{|0\rangle, |1\rangle\}$

**(c)** State $|0\rangle$, measured in $\{|+\rangle, |-\rangle\}$

**(d)** State $\frac{1}{\sqrt{2}}(|0\rangle - |1\rangle)$, measured in $\{|i\rangle, |{-i}\rangle\}$

## Solution

### (a) Standard basis measurement

$$|\psi\rangle = \frac{\sqrt{3}}{2}|0\rangle - \frac{1}{2}|1\rangle$$

Read coefficients directly:

$$P(|0\rangle) = \left|\frac{\sqrt{3}}{2}\right|^2 = \frac{3}{4}$$

$$P(|1\rangle) = \left|-\frac{1}{2}\right|^2 = \frac{1}{4}$$

> **Check:** $\frac{3}{4} + \frac{1}{4} = 1$ $\checkmark$

> **Watch out:** Take the **squared magnitude**, not just the square. For real coefficients it's the same, but for complex coefficients $|a + bi|^2 = a^2 + b^2$, not $(a + bi)^2$.

### (b) Standard basis measurement

$$|\psi\rangle = -\frac{1}{2}|0\rangle + \frac{\sqrt{3}}{2}|1\rangle$$

$$P(|0\rangle) = \left|-\frac{1}{2}\right|^2 = \frac{1}{4}, \quad P(|1\rangle) = \left|\frac{\sqrt{3}}{2}\right|^2 = \frac{3}{4}$$

### (c) Measuring $|0\rangle$ in Hadamard basis

First, convert $|0\rangle$ to the Hadamard basis:

$$|0\rangle = \frac{1}{\sqrt{2}}|+\rangle + \frac{1}{\sqrt{2}}|-\rangle$$

$$P(|+\rangle) = \left|\frac{1}{\sqrt{2}}\right|^2 = \frac{1}{2}, \quad P(|-\rangle) = \left|\frac{1}{\sqrt{2}}\right|^2 = \frac{1}{2}$$

> **Equivalently:** Use the inner product formula directly. $\langle + | 0 \rangle = \frac{1}{\sqrt{2}}$, so $P(|+\rangle) = |1/\sqrt{2}|^2 = 1/2$.

### (d) Measuring in $\{|i\rangle, |{-i}\rangle\}$ basis

Recall: $|i\rangle = \frac{1}{\sqrt{2}}(|0\rangle + i|1\rangle)$ and $|{-i}\rangle = \frac{1}{\sqrt{2}}(|0\rangle - i|1\rangle)$

State: $|\psi\rangle = \frac{1}{\sqrt{2}}(|0\rangle - |1\rangle) = |-\rangle$

Compute inner products:

$$\langle i | \psi \rangle = \frac{1}{\sqrt{2}}(\langle 0| - i\langle 1|) \cdot \frac{1}{\sqrt{2}}(|0\rangle - |1\rangle) = \frac{1}{2}(1 - i \cdot (-1)) = \frac{1}{2}(1 + i)$$

$$P(|i\rangle) = \left|\frac{1+i}{2}\right|^2 = \frac{1 + 1}{4} = \frac{1}{2}$$

$$P(|{-i}\rangle) = 1 - \frac{1}{2} = \frac{1}{2}$$

> **Remember:** $|a + bi|^2 = a^2 + b^2$. So $|1 + i|^2 = 1^2 + 1^2 = 2$.
