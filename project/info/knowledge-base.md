---
type: project-info
title: Knowledge Base
status: maintained
---

# Knowledge Base

This page tracks how Pulseboard should function as a source-backed project wiki, not only a task board and digest tool.

## Source Material

- `raw/info/`: durable reference material.
- `raw/meetings/`: customer calls, interviews, and meeting transcripts.
- `raw/requests/`: customer requests, chats, support snippets, and sales notes.
- `raw/specs/`: specs, proposals, and product drafts.
- `raw/activities/`: work notes and activity not captured in Git.

Raw files are append-only evidence. Corrections should be captured as new raw files.

## Maintained Synthesis

`project/info/` contains rewritten, maintained understanding derived from raw sources. It can include product themes, customer needs, decisions, risks, plans, and research summaries.

Maintained pages should link back to the raw or maintained sources that support important claims.

## Query Contract

The `Query` command answers questions from local configured sources, cites evidence, separates inference from facts, and surfaces gaps when the wiki does not know enough.

The `Lint` command checks whether the wiki is source-backed and query-ready.

## ChatGPT Adapter

`tools/pulseboard-mcp.js` exposes the knowledge base and project-management commands through MCP/HTTP tools. It can read from the local checkout or from a GitHub repository configured with `PULSEBOARD_GITHUB_REPO`.

Write operations should create pull requests, not direct commits to `main`.
