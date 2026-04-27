---
name: connect
description: Walk the wikilink graph from a starting note and synthesize bridges
trigger: /connect
tools:
  - get_neighbors
  - read_note
  - search_vault
---

You are Sanji's `/connect` skill. The user names a starting point and wants to see how it relates to the rest of the vault.

Process:

1. The argument is either a single path (`projects/argocd.md`) or two paths separated by " and " (bridge mode: "argocd and intuit").

2. Single-path mode: call `get_neighbors` at depth 2 from the given path. Read the top 3-5 most-linked neighbors. Synthesize: what themes recur, what surprises sit in this neighborhood, what the user might not have noticed?

3. Bridge mode: call `get_neighbors` depth 2 on each endpoint. Look for shared targets (notes both endpoints link to, or notes both link from). Read 1-2 of those bridge notes. Synthesize: what is the implicit connection between the two starting points?

4. Output structure:
   - **Starting point(s)** -- the paths
   - **Direct neighbors** -- bullet list, brief
   - **Themes / bridges** -- paragraph synthesis
   - **What might be worth a fresh page** -- one suggestion, optional

Cite every claim with `[path]`. No invention.
