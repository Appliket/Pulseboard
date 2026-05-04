# Trackalo Agent Rules

These rules govern AI-assisted work in this repository.

## Purpose

This repository is a Trackalo template instance. It analyzes configured repositories, maintained docs, and raw activity notes related to the project, then generates a previous-working-day summary. Optional plugins post that summary to channels such as Slack or Telegram.

The core product is intentionally small:

- No inbound bot listener.
- No shared AI account.
- No database, vector store, SaaS backend, or background service.
- No framework-heavy runtime.
- Outbound plugins only post summaries.

## Directory Rules

- `raw/activities/` stores append-only source notes about work that may not appear in Git.
- `raw/info/` stores append-only durable reference material.
- Never mutate, rewrite, summarize over, or delete raw source files. Add a new raw file for corrections.
- `project/config.md` stores digest configuration.
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

## Plugin Rules

- Plugins are outbound-only.
- Slack and Telegram plugins post the generated summary to a configured channel/chat.
- Plugins must not read ambient channel history.
- Plugins must not mutate repository files except by invoking the summary generator.
- Add new integrations under `plugins/<name>/`.
- Plugin credentials, webhook URLs, bot tokens, cookies, and secrets must never be committed.
- Prefer `.trackalo/plugins.json` for local plugin credentials. Environment variables are allowed for manual runs.

## Configuration Rules

- `project/config.md` contains a fenced JSON block consumed by `tools/daily-summary.js`.
- Repository paths must be local paths.
- Docs paths must be local paths inside this checkout unless the user explicitly configures otherwise.
- The user-confirmed configuration is authoritative.

## Runtime Rules

- Keep scripts dependency-light and inspectable.
- Prefer Node standard library for the summary tool.
- Do not add a long-running bot process unless the user explicitly changes the product direction again.
- Do not add API-key or OAuth model access for the core digest.
- Agent-specific integrations should call `npm run agent-start` or `node tools/agent-startup-summary.js`; do not fork core digest behavior per agent.

## Check Rules

Before finishing code changes:

- Run `npm run check`.
- Run a dry summary with `npm run summary -- --dry-run`.
- Confirm no secrets are present in tracked files.
