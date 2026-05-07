# Pulseboard Obsidian Template

Pulseboard is a local-first Obsidian project wiki template for task management, source-backed project knowledge, and optional daily activity digests.

The template is intentionally small. It has no inbound bot listener, hosted service, database, vector store, shared AI account, or required background process. Project state lives in markdown files that can be opened in Obsidian, reviewed in Git, cloned into an organization, or vendored as a submodule.

## Use This Template

Create a repository from this GitHub template or clone it directly:

```bash
git clone https://github.com/Appliket/Pulseboard.git my-project-pulseboard
cd my-project-pulseboard
npm run init -- --project "My Project" --repo-name my-project --github owner/my-project
npm run check
```

Open [project/board.md](project/board.md) in Obsidian with the Kanban plugin enabled.

## What Is Included

- [project/board.md](project/board.md): Obsidian Kanban status board.
- [project/tasks/](project/tasks/): canonical task records.
- [project/info/](project/info/): maintained synthesis backed by source notes.
- [raw/](raw/): append-only evidence from activities, durable info, meetings, requests, and specs.
- [commands/](commands/): agent-readable procedures for Configure, Add, Update, Check, Injest, Lint, Query, Graph, Repurpose Audit, and Sync GitHub Issues.
- [tools/](tools/): dependency-light local scripts for initialization and daily summaries.
- [plugins/](plugins/): outbound Slack and Telegram digest setup notes.

## Daily Summary

```bash
npm run summary -- --stdout
npm run summary -- --dry-run
```

By default, summaries target the previous working day. Monday summarizes Friday unless configured otherwise in [project/config.md](project/config.md).

Generated summaries are written under `project/summaries/` and ignored by Git except for `.gitkeep`.

## Agent Workflow

Ask an agent to follow [AGENTS.md](AGENTS.md), then use commands in natural language:

```text
Configure this project for my app: categories feature, bug, chore; priorities p0-p3
Add "Build the account settings page"
Update [[build-account-settings-page]] to in-progress
Check the project wiki
Injest these customer call notes into the knowledge base: ...
Query the wiki: which future features are best supported by customer evidence?
Lint the wiki
Graph the project wiki
Repurpose audit for the configured app and docs
Sync GitHub issues
```

Task records and [project/board.md](project/board.md) remain the source of truth. GitHub issue sync is optional and only mirrors selected implementation-ready local tasks.

## Knowledge Base Commands

Use `Injest` to capture documents, chats, transcripts, requests, specs, and durable notes into append-only `raw/` directories. Use `Query` for source-backed answers and `Lint` to check whether maintained pages are backed by evidence.

## Repurpose Audits

Use `Repurpose audit` for product, migration, cleanup, or reuse passes. The audit command creates append-only notes under `raw/activities/`, maintained plans under `project/info/`, and high-signal task records under `project/tasks/`.

## GitHub Issue Sync

Use `Sync GitHub issues` only when selected implementation-ready local tasks should be mirrored to a configured GitHub repository. Planning, coherence, research, audit, and info-maintenance tasks should usually stay local.

## Plugin Repo

The installable/deployable ChatGPT MCP plugin is separate from this template:

```text
https://github.com/Appliket/Pulseboard-plugin
```

That repo contains the MCP server, onboarding service, API routes, and Render/Vercel deployment files. This template repo remains the source of truth for the Obsidian project structure.
