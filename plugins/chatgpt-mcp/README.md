# ChatGPT MCP Adapter

This adapter exposes a Pulseboard repository as a ChatGPT-readable knowledge app surface.

It keeps GitHub as the canonical storage layer:

- `raw/` remains append-only source evidence.
- `project/info/` remains maintained synthesis.
- `project/tasks/` and `project/board.md` remain project-management source of truth.
- Git history and pull requests provide review and audit.

## Modes

Local filesystem mode:

```bash
npm run mcp
```

HTTP development mode:

```bash
npm run mcp:http
curl http://127.0.0.1:8787/tools
```

GitHub-backed mode:

```bash
PULSEBOARD_STORAGE=github \
PULSEBOARD_GITHUB_REPO=owner/repo \
PULSEBOARD_GITHUB_REF=main \
GITHUB_TOKEN=... \
npm run mcp:http
```

`GITHUB_TOKEN` or `GH_TOKEN` is required for private repositories and for `create_ingest_pr`.

## Tools

- `search`: search configured docs, tasks, maintained info, raw activities, and knowledge sources.
- `fetch`: retrieve a full document by id/path.
- `query`: return source-backed evidence and gaps for a question.
- `lint`: report source coverage, broken wikilinks, and raw hygiene warnings.
- `list_tasks`: list project task records.
- `get_board`: return Obsidian Kanban lanes and cards.
- `check`: validate task-board coherence plus knowledge-base lint warnings.
- `create_ingest_pr`: create a GitHub branch and pull request with a new append-only raw source file and optional synthesis page.
- `create_task_pr`: create a branch and pull request adding a task, raw request note, board card, and log entry.
- `update_task_pr`: create a branch and pull request updating task status and moving the board card.

## ChatGPT App Path

The core Pulseboard logic is dependency-free and can run as stdio MCP for local agents or as HTTP JSON for deployment testing.

For a production ChatGPT app, run this behind a remote MCP transport that ChatGPT can connect to, or wrap these exported tool handlers with the official Apps SDK/MCP server framework. Keep write tools behind review: `create_ingest_pr`, `create_task_pr`, and `update_task_pr` open pull requests instead of committing directly to `main`.
