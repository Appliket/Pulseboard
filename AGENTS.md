# Trackalo Agent Rules

These rules govern AI-assisted work in this repository.

## Purpose

Trackalo is a local-first daily activity digest. It analyzes configured repositories, maintained docs, and raw activity notes related to this project, then generates a previous-working-day summary. Optional plugins post that summary to channels such as Slack or Telegram.

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
- `project/summaries/` stores generated daily summaries.
- `project/log.md` stores maintained project history.
- `plugins/` stores outbound posting integrations.
- `tools/` stores small local scripts.
- `tests/` stores script tests.

## Summary Rules

- Default target day is the previous working day.
- Monday summarizes Friday unless configuration changes working days.
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
- Use environment variables or untracked local files for secrets.

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

## Check Rules

Before finishing code changes:

- Run `npm run check`.
- Run a dry summary with `npm run summary -- --dry-run`.
- Confirm no secrets are present in tracked files.
