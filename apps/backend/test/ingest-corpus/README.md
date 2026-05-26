# Ingest eval corpus

Real-content fixtures that the `ingest:eval` runner uses to grade the
ingest skill prompt against actual academic / general source documents.

## Why

Unit tests cover the mechanical pipeline (extractors, rewrite parser,
service queue). They don't tell you whether the skill prompt
*produces useful structured notes* across the variety of inputs students
actually drop into Sanji. This corpus is the missing piece.

## How to use

```bash
cd ~/Dev_Projects/sanji
pnpm -F @sanji/backend ingest:eval ~/Dev_Projects/sanji/sample-vault
```

The runner walks every source file in this directory, runs it through the
real rewrite pipeline against a real Claude adapter (so it burns subscription
quota or API tokens — intentionally not part of CI), and grades the produced
frontmatter against each source's hand-written `.expected.md` companion.

A dated report lands at `outputs/ingest-eval-<YYYY-MM-DD>.md` in the EA repo
so iteration history stays versioned.

## Goal

≥ 80 % pass rate on deterministic fields (`content_type`, `title_contains`,
`summary` length, `tags_min` floor) before v0.1 ships. Iterate the prompt at
`apps/backend/src/skills/builtin/ingest.md` until you hit it.

## Curation guide — 10 fixtures

Aim for breadth over depth. One file per row, plus a `<stem>.expected.md`
companion that pins the deterministic frontmatter expectations. Body content
is NOT character-matched — the eval reads only the YAML frontmatter from the
expected files.

| Source                          | Format | content_type | Notes                                              |
|---------------------------------|--------|--------------|----------------------------------------------------|
| `paper-attention.pdf`           | PDF    | paper        | "Attention Is All You Need" or similar canonical   |
| `paper-cs-prose.pdf`            | PDF    | paper        | Heavy-prose CS paper (less math)                   |
| `slides-cmsc416-mpi.pdf`        | PDF    | slides       | A real CMSC416 lecture deck Rohan kept             |
| `slides-general.pdf`            | PDF    | slides       | Beamer or PowerPoint export, mixed content         |
| `transcript-lecture.txt`        | TXT    | transcript   | A YouTube-style timestamped transcript             |
| `article-web-savedaspdf.pdf`    | PDF    | article      | Web blog saved as PDF (Distill / Substack)         |
| `article-web-2.pdf`             | PDF    | article      | Different blog source, different prose register    |
| `assignment-writeup.docx`       | DOCX   | assignment   | A submitted assignment with prompt + answer        |
| `code-snippet.txt`              | TXT    | code         | A copy-pasted snippet of code with comments        |
| `wildcard-misc.txt`             | TXT    | other        | Forces the wildcard branch in the skill prompt     |

## Expected-companion shape

```yaml
---
content_type: paper
title_contains: attention
summary: any string ≥20 and ≤200 chars
tags_min:
  - any
  - three
  - tags
---

(optional human notes here — the runner ignores body content)
```

Recognized keys (everything else is ignored):

- `content_type` (string, must equal exactly).
- `title_contains` (string, case-insensitive substring of `title`).
- `summary` (presence triggers length bounds: 20-200 chars).
- `tags_min` (array; `actual.tags.length` must be ≥ this array's length).

Add new keys + a comparator branch in `apps/backend/scripts/ingest-eval.ts`
when you have a deterministic check that's worth grading.

## Status

Corpus is **stub** until launch curation. The runner works against any
fixtures present here; v0.1 ship-readiness expects the full 10 + ≥ 80 %
pass rate.
