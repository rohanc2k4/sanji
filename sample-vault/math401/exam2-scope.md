---
title: MATH401 — Exam 2 Scope
type: exam-scope
status: evergreen
last_updated: 2026-04-10
sources: []
---

# MATH401 — Exam 2 Scope

**Date:** April 10, 2026 (Thursday)
**Format:** Closed book, closed notes, no laptop

## Topics

- At least 80% of questions come directly from **SP4 and SP5** exam-level problems (possibly with changed numbers)
- 5-part true/false section (2 points each) — likely the only place with unseen questions
- Computations will not be as brutal as Exam 1

## SP4 Topics (Spectral Theorem, SVD, Image Compression)

### Spectral Theorem (Lay-McDonald §7.1)
- Orthogonal diagonalization procedure (A = PDP^T)
- When is orth. diag. possible? (iff symmetric)
- Spectral decomposition (A = Σλᵢuᵢuᵢ^T)
- Gram-Schmidt within repeated eigenspaces
- T/F §7.1.25-32 (ALL covered in answer key)
- Proofs §7.1.33-38

### SVD (Lay-McDonald §7.4, Justin's notes)
- Full SVD computation procedure
- Four fundamental subspaces from SVD
- Maximizing ||Ax|| via singular values
- Pseudoinverse and least-squares via SVD
- Condition number (σ₁/σₙ)
- |det(A)| = product of singular values
- T/F concepts from §7.4.13-18

### Image Compression (Justin's notes ch. 10)
- Truncated SVD
- Quality formula: Σσᵢ²(kept)/Σσᵢ²(all)
- Compression ratio: k(m+n+1)/mn for m×n
- When compression is worth doing: k < mn/(m+n+1)

## SP5 Topics (Quantum Information — Rieffel-Polak §2)

- Dirac notation (bra-ket): |ψ⟩, ⟨ψ|, ⟨φ|ψ⟩
- Qubit states: α|0⟩ + β|1⟩ with |α|²+|β|²=1
- Global phase: |v⟩ = c|v'⟩ with |c|=1 → same state
- Superposition w.r.t. different bases (standard, Hadamard, {|i⟩, |−i⟩})
- Measurement probability: P(|bᵢ⟩) = |⟨bᵢ|ψ⟩|²
- Exercises 2.2, 2.3, 2.4, 2.6 (all in SP5 answer key)
- SP5 = exam-level = quiz-level difficulty

## Professor's Hints

- "You should be able to get a B as long as you've done the homework sets correctly"
- No separate sample exam — SP4 and SP5 problems ARE the study material
- Focus: mastery of SP4 and SP5 problem types, not memorizing specific numbers
