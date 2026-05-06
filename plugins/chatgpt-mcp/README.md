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
GITHUB_INSTALLATION_ID=12345 \
GITHUB_APP_ID=... \
GITHUB_APP_PRIVATE_KEY=... \
npm run mcp:http
```

For production, use a GitHub App installation id plus `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`. The server mints short-lived installation tokens when it reads private repositories or opens pull requests. A direct GitHub token is still accepted for local/admin testing, but it is not the recommended hosted setup.

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
- `/onboarding`: hosted setup schema and repository initialization endpoint.

## Hosted Onboarding

For a single tenant, deploy with one configured repository:

```bash
PULSEBOARD_STORAGE=github
PULSEBOARD_GITHUB_REPO=owner/repo
PULSEBOARD_GITHUB_REF=main
```

For hosted installs where each user/team gets a different Pulseboard repository, expose `/onboarding` and route installs by OAuth subject:

```bash
PULSEBOARD_STORAGE=github
PULSEBOARD_INSTALLS_JSON='{"oauth-sub-or-install-id":{"repo":"owner/repo","installation_id":"12345"}}'
```

`GET /onboarding` returns the setup questions. `POST /onboarding` accepts answers such as:

```json
{
  "project": "Client Portal",
  "owner": "acme",
  "repo_name": "client-portal-pulseboard",
  "private": true,
  "timezone": "UTC",
  "installation_id": "12345",
  "subject": "oauth-sub-or-install-id"
}
```

The endpoint creates or initializes the GitHub repository with the Pulseboard files and returns the `owner/repo` slug. With `installation_id`, the server uses GitHub App auth and does not need a static PAT. If `PULSEBOARD_INSTALLS_PATH` points at a writable JSON file, the subject-to-repo plus installation mapping is persisted automatically; on Vercel, prefer storing that mapping in environment-backed JSON or an external store because the filesystem is not durable.

Requests can also select a repo explicitly with `X-Pulseboard-Repo: owner/repo` plus `X-GitHub-Installation-Id: 12345`, or `?repo=owner/repo&installation_id=12345`, useful for development and admin testing.

## Render Deployment

This repository includes [render.yaml](../../render.yaml) for a Render Web Service:

- Runtime: Node.js.
- Start command: `npm start`.
- Host binding: `HOST=0.0.0.0`.
- Persistent install mapping: `PULSEBOARD_INSTALLS_PATH=/var/data/pulseboard-installs.json`.
- Disk mount: `/var/data`.

Create the service from the Blueprint, then set these secret/env values in Render:

```bash
PULSEBOARD_PUBLIC_URL=https://your-render-service.onrender.com
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
PULSEBOARD_OAUTH_ISSUER=...
PULSEBOARD_OAUTH_AUDIENCE=https://your-render-service.onrender.com
PULSEBOARD_OAUTH_JWKS_URL=...
```

Create a GitHub App with repository permissions for Contents write, Pull requests write, Metadata read, and Administration write if onboarding should create repositories. Install it on the target account/org and pass both `owner` and the resulting `installation_id` to `/onboarding`.

For early admin testing before OAuth is wired, set `PULSEBOARD_ALLOW_NOAUTH_WRITES=1` manually in Render and use `X-Pulseboard-Repo: owner/repo` plus `X-GitHub-Installation-Id: 12345`, or `?repo=owner/repo&installation_id=12345`. Remove that flag before exposing the service publicly.

## Authentication

Read-only public-repo use can run without OAuth. Anything that exposes private repositories or write tools should be deployed behind proper OAuth 2.1 for MCP. Set:

```bash
PULSEBOARD_PUBLIC_URL=https://your-public-host.example.com
PULSEBOARD_OAUTH_ISSUER=https://auth.example.com
PULSEBOARD_OAUTH_AUDIENCE=https://your-public-host.example.com
PULSEBOARD_OAUTH_JWKS_URL=https://auth.example.com/.well-known/jwks.json
```

The adapter publishes protected-resource metadata and verifies bearer JWTs against the configured issuer/JWKS before running write tools. The OAuth issuer itself should be provided by an identity provider such as Auth0, Okta, Cognito, or Stytch. Keep write tools behind review: `create_ingest_pr`, `create_task_pr`, and `update_task_pr` open pull requests instead of committing directly to `main`.
