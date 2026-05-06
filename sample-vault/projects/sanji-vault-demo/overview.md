---
title: Sanji vault demo — overview
---

# Sanji vault demo

A small markdown vault used to exercise the v0.1 Sanji frontend end to end. Goals:

1. Cover the recursive folder rendering — at least three levels deep so the indent + chevron behavior is visible.
2. Include wikilinks across folders so `semantic_search` and `/connect` have real graph data.
3. Keep the prose plausible enough that retrieval feels meaningful, not just lorem-ipsum.

## What lives where

- `daily/` — short diary entries with `#tag` captures and wikilinks to people, projects, school notes.
- `projects/sanji-vault-demo/` — this project (meta).
- `projects/coffee-roasting/` — three-levels-deep example via [[tasting-notes]].
- `school/cmsc416/` and `school/math401/` — coursework, used to test cross-folder retrieval.
- `people/` — short profiles for [[maya]] and [[jordan]].
- `recipes/`, `inbox/` — variety.

See the [[changelog]] for what's been touched recently.
