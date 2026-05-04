# Pulseboard Agent Rules

These rules govern AI-assisted work in this repository.

## Purpose

This repository is a Pulseboard template instance. It combines a Karpathy/LLM Wiki style project-management system with optional daily digest plugins.

Project work is represented as small markdown task nodes connected through wikilinks and explicit metadata. The Obsidian Kanban board is the canonical human status view. The graph is the dependency/coherence view. Daily digest plugins summarize previous-working-day activity and post it outbound to channels such as Slack or Telegram.

The core product is intentionally small:

- No inbound bot listener.
- No shared AI account.
- No database, vector store, SaaS backend, or required background service.
- No framework-heavy runtime.
- Outbound plugins only post summaries.
- GitHub issue sync is optional and only mirrors selected implementation-ready local tasks.

## Directory Rules

- `raw/activities/` stores append-only source notes about work that may not appear in Git.
- `raw/info/` stores append-only durable reference material.
- Never mutate, rewrite, summarize over, or delete raw source files. Add a new raw file for corrections.
- `project/config.md` stores digest configuration.
- `project/board.md` stores the Obsidian Kanban board.
- `project/tasks/` stores markdown task records.
- `project/checks/` stores generated check reports.
- `commands/` stores agent command procedures.
- `graph/` stores generated graph artifacts.
- `plugins.example.json` is a non-secret local plugin configuration template.
- `project/summaries/` stores generated daily summaries.
- `project/log.md` stores maintained project history.
- `plugins/` stores outbound posting integrations.
- `.codex/config.toml` stores the project-local Codex startup hook.
- `tools/agent-startup-summary.js` is the generic startup entrypoint for any agent or scheduler.
- `tools/` stores small local scripts.
- `tests/` stores script tests.

## Summary Rules

- Default target day is the previous working day.
- Monday summarizes Friday unless configuration changes working days.
- Agent startup automation must be idempotent and post at most once per target day.
- Summaries must only use configured local repositories, configured docs paths, and `raw/activities/`.
- Do not invent activity. If no activity is found, say so.
- Generated summaries may be rebuilt.
- Raw activity and info files are source material and must not be mutated after capture.

## Project Wiki Rules

- Users invoke project-management commands by asking the agent, for example `Add "request text"`, `Update [[task-id]] to in-progress`, `Repurpose audit`, or `Sync GitHub issues`.
- Follow `commands/Configure.md`, `commands/Add.md`, `commands/Update.md`, `commands/Check.md`, `commands/Injest.md`, `commands/Graph.md`, `commands/Repurpose-Audit.md`, and `commands/Sync-GitHub-Issues.md`.
- Allowed task states are exactly `todo`, `in-progress`, `in-review`, and `done`.
- `project/board.md` must keep Obsidian Kanban frontmatter: `kanban-plugin: board`.
- Board lanes must remain exactly `## To Do`, `## In Progress`, `## In Review`, and `## Done`.
- Cards must be checkbox wikilinks like `- [ ] [[task-id]]`.
- Each non-archived task must appear exactly once on the board.
- Task status and board lane must agree.
- Graph artifacts are rebuildable and must not be treated as source of truth.

## Audit And Issue Sync Rules

- Product, repurpose, migration, and coherence audits must create append-only source notes under `raw/activities/YYYY-MM-DD-*.md`.
- Maintained audit synthesis belongs under `project/info/*-plan.md`.
- Concrete follow-up work belongs under `project/tasks/*.md`.
- Planning, coherence, research, audit, and info-maintenance tasks should usually stay local.
- Implementation-ready tasks may sync to GitHub only when a configured repository has a GitHub slug and the task has no `github_issue` frontmatter.
- Never create GitHub issues directly from raw notes or plan pages. Create task records first.
- Avoid duplicate GitHub issues by listing existing open issues before creating anything.
- When an issue is created, write its URL back into task frontmatter as `github_issue`.

## Plugin Rules

- Plugins are outbound-only.
- Slack and Telegram plugins post the generated summary to a configured channel/chat.
- Plugins must not read ambient channel history.
- Plugins must not mutate repository files except by invoking the summary generator.
- Add new integrations under `plugins/<name>/`.
- Plugin credentials, webhook URLs, bot tokens, cookies, and secrets must never be committed.
- Prefer `.pulseboard/plugins.json` for local plugin credentials. Environment variables are allowed for manual runs.

## Configuration Rules

- `project/config.md` contains a fenced JSON block consumed by `tools/daily-summary.js`.
- Repository paths must be local paths.
- Docs paths must be local paths inside this checkout unless the user explicitly configures otherwise.
- External wiki/docs paths are optional and must be explicitly configured or supplied by the user for the current audit.
- The user-confirmed configuration is authoritative.

## Runtime Rules

- Keep scripts dependency-light and inspectable.
- Prefer Node standard library for the summary tool.
- Do not add a long-running bot process unless the user explicitly changes the product direction again.
- Do not add API-key or OAuth model access for the core digest.
- Agent-specific integrations should call `npm run agent-start` or `node tools/agent-startup-summary.js`; do not fork core digest behavior per agent.

## Agent Finish Rules

- When a task changes repository files, finish by committing the completed work and pushing it to the configured remote branch.
- Do not commit raw source files, credentials, generated secrets, or unrelated user changes unless the user explicitly asks.
- If checks fail, pushing fails, or the remote/branch is not configured, report the blocker and leave the worktree state clear.

## Check Rules

Before finishing code changes:

- Run `npm run check`.
- Run a dry summary with `npm run summary -- --dry-run`.
- Confirm no secrets are present in tracked files.
