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

Streamable HTTP development mode:

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

`GITHUB_TOKEN` or `GH_TOKEN` is required for private repositories and for write tools.

Write tools are hidden by default. Enable them explicitly:

```bash
PULSEBOARD_ENABLE_WRITE_TOOLS=1 npm run mcp:http
```

For local development only, write tools can be advertised without OAuth:

```bash
PULSEBOARD_ENABLE_WRITE_TOOLS=1 \
PULSEBOARD_ALLOW_NOAUTH_WRITES=1 \
npm run mcp:http
```

## Tools

- `search`: search configured docs, tasks, maintained info, raw activities, and knowledge sources.
- `fetch`: retrieve a full document by id/path.
- `query`: return source-backed evidence and gaps for a question.
- `lint`: report source coverage, broken wikilinks, and raw hygiene warnings.
- `list_tasks`: list project task records.
- `get_board`: return Obsidian Kanban lanes and cards.
- `check`: validate task-board coherence plus knowledge-base lint warnings.
- `create_ingest_pr`: create a GitHub branch and pull request with a new append-only raw source file and optional synthesis page. Hidden unless writes are enabled.
- `create_task_pr`: create a branch and pull request adding a task, raw request note, board card, and log entry. Hidden unless writes are enabled.
- `update_task_pr`: create a branch and pull request updating task status and moving the board card. Hidden unless writes are enabled.

## ChatGPT App Path

The server exposes a Streamable HTTP MCP endpoint at `/mcp`. In ChatGPT Developer Mode, create a connector with:

```text
https://your-public-host.example.com/mcp
```

For local development, expose `npm run mcp:http` through ngrok or Cloudflare Tunnel and use the tunnel `/mcp` URL.

The server also exposes:

- `/health`: health check.
- `/tools`: debug view of advertised tools.
- `/manifest.json`: deployment metadata.
- `/.well-known/oauth-protected-resource`: OAuth resource metadata scaffold.

## Authentication

Read-only public-repo use can run without OAuth. Anything that exposes private repositories or write tools should be deployed behind proper OAuth 2.1 for MCP. Set:

```bash
PULSEBOARD_PUBLIC_URL=https://your-public-host.example.com
PULSEBOARD_OAUTH_ISSUER=https://auth.example.com
PULSEBOARD_OAUTH_AUDIENCE=https://your-public-host.example.com
PULSEBOARD_OAUTH_JWKS_URL=https://auth.example.com/.well-known/jwks.json
```

The adapter publishes protected-resource metadata and verifies bearer JWTs against the configured issuer/JWKS before running write tools. The OAuth issuer itself should be provided by an identity provider such as Auth0, Okta, Cognito, or Stytch. Keep write tools behind review: `create_ingest_pr`, `create_task_pr`, and `update_task_pr` open pull requests instead of committing directly to `main`.
