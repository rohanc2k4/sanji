---
title: Sample Vault
---

# Sample Vault

Hand-authored fixture for trying Sanji end to end. Mix of root files, one-level folders, and two-level nesting so the recursive sources sidebar has something to render. Wikilinks connect a few notes so semantic search and `/connect` have signal.

## Layout

- [[README]] — this page
- `daily/` — diary entries
- `projects/` — personal work
- `school/` — coursework grouped by class
- `people/` — collaborators
- `recipes/`, `inbox/` — odds and ends

Point Sanji's onboarding "Vault path" at this folder and run through the flow. Indexing should pick up all `.md` files and skip the `.sanji/` subdir it creates here.
