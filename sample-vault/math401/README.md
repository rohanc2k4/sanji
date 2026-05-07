# MATH401 — Applications of Linear Algebra Wiki Index

## Concepts

### SP6 Topics (Quiz — week of 2026-04-27)

- [[tensor-products]] — direct sum vs tensor product, dimension, basis for V⊗W
- [[multi-qubit-states]] — n-qubit notation, Bell basis, product-state expansion, phase conventions
- [[entanglement]] — separability test (a00·a11 = a01·a10), Bell states are entangled

### SP4/SP5 Topics (Exam 2 Primary — 80% of exam)

- [[orthogonal-diagonalization]] — A = PDP^T for symmetric matrices, Spectral Theorem, spectral decomposition
- [[singular-value-decomposition]] — A = UΣV^T for any matrix, fundamental subspaces, pseudoinverse, condition number
- [[image-compression-svd]] — Truncated SVD for image compression, quality formula, compression ratio
- [[quantum-information]] — Dirac notation, qubits, global phase, superposition, measurement

### Final Exam Topics

- [[cryptography-linear-algebra]] — stream cipher, linear-recurrence keys, attack via matrices mod 2

### Earlier Topics (Exam 2 T/F potential)

- [[least-squares]] — normal equation, residual orthogonality, regression lines
- [[graph-laplacian-fiedler]] — L = D - A, Fiedler value/vector, graph partitioning
- [[markov-chains]] — transition matrices, steady state, irreducibility, regularity, mean return

## Techniques

- Orthogonal diagonalization procedure → [[orthogonal-diagonalization]]
- Spectral decomposition A = Σλᵢuᵢuᵢ^T → [[orthogonal-diagonalization]]
- SVD computation procedure → [[singular-value-decomposition]]
- Four fundamental subspaces from SVD → [[singular-value-decomposition]]
- Truncated SVD / compression ratio → [[image-compression-svd]]
- Least-squares line fitting (vertical vs horizontal error) → [[least-squares]]
- Fiedler method for graph partitioning → [[graph-laplacian-fiedler]]
- Steady-state vector computation → [[markov-chains]]
- Global phase check (same state test) → [[quantum-information]]
- Measurement probability computation → [[quantum-information]]

## Exam Prep

- [[exam-prep]] — 4-hour cram plan (exam 2)
- [[exam2-scope]] — exam 2 scope
- [[quiz-sp6-scope]] — SP6 quiz scope (multi-qubit / tensor product)
- [[quiz-sp6-study-guide]] — SP6 quiz study guide (3-skill teaching page)

## Sources Ingested

- **2026-04-09** | submission_395902441.pdf (Exam 1, graded 43/50) → least-squares, graph-laplacian-fiedler, markov-chains
- **2026-04-09** | submission_400425878.pdf (Quiz 5, graded 10/10) → orthogonal-diagonalization
- **2026-04-09** | submission_402763442.pdf (Quiz 6, graded 9/10) → singular-value-decomposition
- **2026-04-09** | 401-s26-sp4-2.pdf (SP4 problem set) → orthogonal-diagonalization, singular-value-decomposition, image-compression-svd
- **2026-04-09** | 401-s26-sp5-1.pdf (SP5 problem set) → quantum-information
- **2026-04-09** | MATH_401_-_Practice_Exam_2.1.pdf (Practice Exam 2) → all topics
- **2026-04-09** | Answer_keys_to_SP4-5.pdf (SP4/SP5 answer keys) → orthogonal-diagonalization, singular-value-decomposition, image-compression-svd, quantum-information
- **2026-04-09** | lay-mcdonald-7.1-7.4-7.5.pdf (Textbook §7.1, §7.4, §7.5) → orthogonal-diagonalization, singular-value-decomposition
- **2026-04-09** | ch_svd.pdf (Justin's SVD notes) → singular-value-decomposition
- **2026-04-09** | ch_image_compression.pdf (Justin's image compression notes) → image-compression-svd
- **2026-04-09** | rieffel-section2.pdf (Rieffel-Polak §2) → quantum-information
- **2026-04-09** | spectral theorem.pdf (class notes) → orthogonal-diagonalization
- **2026-04-09** | svd 2-1.pdf, svd 3-1.pdf, svd 4-1.pdf, svd 5.pdf (class notes) → singular-value-decomposition, image-compression-svd
- **2026-04-09** | qis 1-1.pdf, qis 2-1.pdf, qis 3.pdf (class notes) → quantum-information
- **2026-04-21** | rieffel-section3.pdf (Rieffel-Polak §3, Multiple-Qubit Systems) → tensor-products, multi-qubit-states, entanglement
- **2026-04-21** | ch_cryptography.pdf (Justin's cryptography chapter) → cryptography-linear-algebra
