# Trackalo

Trackalo is a local-first daily activity digest for project work. It looks at configured repositories, docs, and local activity notes, generates a summary for the last working day, and optionally posts that summary to channels through small plugins.

There is no bot listener, database, vector store, hosted service, or shared AI account in the core. Integrations are outbound-only: Slack, Telegram, or future plugins receive a digest once a day.

## Quick Start

```bash
npm run check
npm run summary -- --stdout
```

By default, `npm run summary` summarizes the previous working day. On Monday it summarizes Friday. To force a day:

```bash
npm run summary -- --date 2026-05-01 --stdout
```

Generated summaries are written to `project/summaries/YYYY-MM-DD.md`.

## Automatic Codex Startup

This repo includes a project-local Codex hook in [.codex/config.toml](.codex/config.toml). When you open Codex in this trusted project, the hook runs `tools/codex-startup-summary.js` in the background.

The startup script:

- Runs only during the configured morning window, default `06:00-12:00`.
- Computes the previous working day.
- Writes `project/summaries/YYYY-MM-DD.md`.
- Posts to configured plugins once per target day.
- Records local state in `.trackalo/startup-summary-state.json`.

No environment variables are required for daily use. Put local plugin credentials in `.trackalo/plugins.json`:

```bash
mkdir -p .trackalo
cp plugins.example.json .trackalo/plugins.json
```

Then edit `.trackalo/plugins.json`. That file is ignored by Git.

## What It Reads

Trackalo only reads sources configured in [project/config.md](project/config.md):

- Git commits from configured local repositories.
- Maintained docs under configured docs paths.
- Manual activity notes under `raw/activities/`.

Raw activity notes are append-only source material. Use filenames like:

```text
raw/activities/2026-05-01-customer-call.md
```

## Posting Plugins

Manual Slack post:

```bash
SLACK_WEBHOOK_URL="https://hooks.slack.com/..." npm run summary -- --post slack
```

Manual Telegram post:

```bash
TELEGRAM_BOT_TOKEN="..." TELEGRAM_CHAT_ID="..." npm run summary -- --post telegram
```

Post to every configured plugin:

```bash
npm run summary -- --post all
```

Plugin setup notes live in:

- [plugins/slack/README.md](plugins/slack/README.md)
- [plugins/telegram/README.md](plugins/telegram/README.md)

## Scheduling

Codex startup is the default lightweight automation path. Use cron, launchd, GitHub Actions on a trusted runner, or any existing scheduler only if you want automation independent of opening Codex. Example weekday cron at 09:00:

```cron
0 9 * * 1-5 cd /path/to/trackalo && npm run summary -- --post all
```

The tool computes the previous working day, so Monday morning produces Friday's digest.

## Configuration

Edit [project/config.md](project/config.md). The summary tool reads the fenced JSON block in that file.

Keep tokens and webhook URLs out of Git. Use environment variables or a local `.env` file.
