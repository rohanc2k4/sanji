---
title: Sample Vault
type: reference
last_updated: 2026-05-07
---

# Sample Vault

Reference vault for testing Sanji's retrieval and ingestion pipelines against substantive markdown content. Two subject areas, ~60 pages, all with proper YAML frontmatter, `[[wikilinks]]`, and `[Source: filename]` citations.

## What's here

- `cmsc416/` — parallel computing notes (MPI, OpenMP, CUDA, pthreads, cache performance, scaling, LU factorization, parallel sorting, profiling). 20 concept pages plus exam-prep and scope docs.
- `math401/` — linear algebra and quantum information (SVD, least squares, Markov chains, graph Laplacian, multi-qubit states, tensor products, image compression via SVD, cryptography). 11 concept pages plus 11 worked-problem pages.
- `inbox/` — landing zone for ingestion smoke tests. Contents are gitignored so user-local PDFs/DOCX/txt files stay out of the public repo.

## Origin

Anonymized excerpt from a personal study wiki. No personal data, no real names beyond course identifiers, no internal company info. Pure domain knowledge.

## Use

Point Sanji's onboarding "Vault path" at this folder. Indexing picks up every `.md` file and skips the `.sanji/` directory it creates here. Wikilinks resolve internally so semantic search and `/connect` have meaningful signal.

Drop ingestion test files into `inbox/`. They won't be committed.

## Don't

This vault ships in the public repo. Do not add personal content here. Personal vaults belong outside the repo (point Sanji at `~/SomeLocalVault/` instead).
