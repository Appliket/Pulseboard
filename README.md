# Pulseboard Template

Pulseboard Template is a local-first project-management, knowledge-base, and daily activity digest starter. The primary workflow is the Karpathy/LLM Wiki style markdown system: tasks, append-only evidence, maintained synthesis pages, Obsidian Kanban, queryable knowledge, and graph coherence. Plugins are secondary outbound reporting surfaces for stakeholders such as a CEO.

There is no bot listener, database, vector store, hosted service, or shared AI account in the core. Project management remains plain markdown. Integrations are outbound-only: Slack, Telegram, or future plugins receive a digest once a day.

GitHub is optional. Pulseboard can mirror selected implementation-ready task records to GitHub issues, but planning, coherence, audits, customer evidence, and maintained project knowledge stay local by default.

## Use This Template

Create a new repository from this template, then initialize its project config:

```bash
npm run init -- --project "My Project" --repo-name my-project --github owner/my-project
npm run check
```

The init command updates [project/config.md](project/config.md) and creates `.pulseboard/plugins.json` from [plugins.example.json](plugins.example.json). The `.pulseboard/` directory is ignored by Git.

## Quick Start

```bash
npm run check
npm run summary -- --stdout
```

Open `project/board.md` in Obsidian with the Kanban plugin enabled to manage the human status board.

Ask any coding agent to follow [AGENTS.md](AGENTS.md), then use project commands in natural language:

```text
Configure this project for my app: categories feature, bug, chore; priorities p0-p3; repo owner/example at .
Add "Build the account settings page"
Update [[build-account-settings-page]] to in-progress
Check the project wiki
Injest these customer call notes into the knowledge base: ...
Query the wiki: which future features are best supported by customer evidence?
Lint the wiki
Repurpose audit for the configured app and docs
Sync GitHub issues
```

By default, `npm run summary` summarizes the previous working day. On Monday it summarizes Friday. To force a day:

```bash
npm run summary -- --date 2026-05-01 --stdout
```

Generated summaries are written locally to `project/summaries/YYYY-MM-DD.md`. Generated summary markdown is ignored by Git by default.

## Automatic Codex Startup

This template includes a project-local Codex hook in [.codex/config.toml](.codex/config.toml). When you open Codex in a trusted project created from this template, the hook runs `tools/agent-startup-summary.js` in the background through a Codex compatibility wrapper.

The startup script:

- Runs only during the configured morning window, default `06:00-12:00`.
- Computes the previous working day.
- Writes `project/summaries/YYYY-MM-DD.md`.
- Posts to configured plugins once per target day.
- Records local state in `.pulseboard/startup-summary-state.json`.

No environment variables are required for daily use. Put local plugin credentials in `.pulseboard/plugins.json`:

```bash
mkdir -p .pulseboard
cp plugins.example.json .pulseboard/plugins.json
```

Then edit `.pulseboard/plugins.json`. That file is ignored by Git.

## Other Agents

The digest does not depend on Codex. Any agent, editor, or automation tool can run the same idempotent startup command:

```bash
npm run agent-start
```

Agent integration contract:

- Run `npm run agent-start` when the agent opens or attaches to the project.
- It is safe to call multiple times; it posts at most once per target day.
- It exits quietly outside the morning window.
- It uses `.pulseboard/plugins.json` for local plugin credentials.
- It writes generated summaries under `project/summaries/`.

For agents that support project startup hooks, configure that hook to run `npm run agent-start`. For agents without hooks, use cron/launchd or a shell alias that opens the agent and then runs the command.

## What It Reads

Pulseboard only reads sources configured in [project/config.md](project/config.md):

- Git commits from configured local repositories.
- Maintained docs under configured docs paths.
- Manual activity notes under `raw/activities/`.
- Durable raw evidence under `raw/info/`, `raw/meetings/`, `raw/requests/`, and `raw/specs/`.
- Project-management pages under `project/`, including task records and checks.

Raw notes are append-only source material. Use filenames like:

```text
raw/meetings/2026-05-01-customer-call.md
```

## Markdown Project Wiki

The template keeps the original local-first project-management and knowledge-base workflow:

- `project/board.md`: Obsidian Kanban human status board.
- `project/tasks/`: canonical structured task records.
- `project/info/`: maintained project context and product synthesis.
- `raw/meetings/`, `raw/requests/`, `raw/specs/`, and `raw/info/`: append-only evidence from calls, chats, documents, and specs.
- `commands/`: agent-readable procedures for Configure, Add, Update, Check, Injest, Lint, Query, Graph, Repurpose Audit, and Sync GitHub Issues.
- `graph/`: rebuildable topology artifacts.

The daily digest layer does not replace the wiki. It summarizes activity from the wiki, docs, raw notes, and configured repositories so stakeholders can get status without entering Obsidian.

## Knowledge Base Commands

Use `Injest` to capture documents, chats, customer requests, call transcripts, specs, or durable notes into append-only `raw/` source files, then maintain source-backed synthesis under `project/info/`.

Use `Query` to ask the local wiki questions such as which feature requests appear most often, what future work is supported by customer evidence, why a decision was made, or what risks are visible in source material. Query answers should cite inspected files, separate evidence from inference, and call out gaps.

Use `Lint` to validate query readiness: stale links, unsourced maintained claims, weak evidence, raw hygiene, and important themes that need synthesis pages.

## Repurpose Audits

Use `Repurpose audit` when a project needs a product, migration, cleanup, or reuse pass. The procedure reads configured local repositories and docs, plus explicitly configured external wiki/docs paths if present.

The audit workflow creates:

- Append-only source notes under `raw/activities/YYYY-MM-DD-*.md`.
- One maintained plan page under `project/info/*-plan.md`.
- A small number of concrete task records under `project/tasks/*.md`.
- Optional GitHub issues later, only for implementation-ready tasks.

The maintained plan should say what should be done, what is still needed, and what can be deleted, archived, or deferred. Raw files are source material and must not be rewritten.

## GitHub Issue Sync

Use `Sync GitHub issues` when task records should be mirrored to GitHub. This command is optional and requires configured repository `github` slugs in `project/config.md`.

The sync procedure:

- Lists existing open issues first.
- Avoids duplicate issues by title, task id, existing `github_issue` URLs, and overlapping scope.
- Creates issues only from implementation-ready task records when `github_issue` is absent.
- Writes created issue URLs back into task frontmatter.
- Adds an append-only raw activity note.
- Updates `project/log.md`.
- Runs `npm run check`, `npm run summary -- --dry-run`, and a tracked-file secret scan.

Planning/coherence tasks should usually remain local. Do not use GitHub as the canonical board; Pulseboard task records and `project/board.md` remain the source of truth.

## Posting Plugins

Manual Slack post:

```bash
npm run summary -- --post slack
```

Manual Telegram post:

```bash
npm run summary -- --post telegram
```

Post to every locally configured plugin:

```bash
npm run summary -- --post all
```

Plugin setup notes live in:

- [plugins/slack/README.md](plugins/slack/README.md)
- [plugins/telegram/README.md](plugins/telegram/README.md)

## Scheduling

Agent startup is the default lightweight automation path. Use cron, launchd, GitHub Actions on a trusted runner, or any existing scheduler only if you want automation independent of opening an agent. Example weekday cron at 09:00:

```cron
0 9 * * 1-5 cd /path/to/project && npm run summary -- --post all
```

The tool computes the previous working day, so Monday morning produces Friday's digest.

## Configuration

Edit [project/config.md](project/config.md). The summary tool reads the fenced JSON block in that file.

Keep tokens and webhook URLs out of Git. Use `.pulseboard/plugins.json`, environment variables, or another local secret store.

Optional fields:

- `external_docs`: explicit local wiki/docs paths an audit may inspect.
- `knowledge_sources`: local raw evidence paths that `Query` and `Lint` may inspect.
- `issue_sync`: local settings for optional GitHub issue mirroring.
