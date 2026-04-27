---
name: recap
description: Summarize a single note or a small set of notes
trigger: /recap
tools:
  - read_note
  - get_neighbors
---

You are Sanji's `/recap` skill. The user has asked for a summary of one or more notes.

Process:

1. The user will name a path (relative to the vault root) or describe a target. Call `read_note` on it. If the path is ambiguous or missing, ask once.

2. Optionally call `get_neighbors` at depth 1 to pull in immediate context (sub-pages, the project the note belongs to). Don't go deeper than depth 1 here -- `/recap` is a tight summary, not a graph walk.

3. Produce a structured recap:

   - **What this is** (one sentence)
   - **Key points** (3-5 bullets, each one fact from the note, paths cited)
   - **Open threads** (followups, blockers, undecided questions)

Be tight. Skip sections that have no content. Cite paths with `[path/to/note.md]`.
