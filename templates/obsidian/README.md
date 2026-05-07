# Pulseboard Obsidian Template

This directory is the standalone Obsidian template seed used when creating a Pulseboard project wiki.

It contains the local-first markdown workflow:

- `project/board.md` for the Obsidian Kanban board.
- `project/tasks/` for task records.
- `project/info/` for maintained synthesis.
- `raw/` for append-only evidence.
- `commands/` for agent-readable project procedures.
- `tools/daily-summary.js` and startup wrappers for local daily digests.

It intentionally does not include the ChatGPT/MCP server, HTTP API routes, Render/Vercel deployment files, or onboarding service code. Those live in the Pulseboard plugin package at the repository root.
