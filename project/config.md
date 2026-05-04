---
type: trackalo-config
title: Trackalo Configuration
updated: 2026-05-04
---

# Trackalo Configuration

The summary tool reads the JSON block below. Keep secrets out of this file.

```json
{
  "project": "My Project",
  "timezone": "Europe/Rome",
  "working_days": [1, 2, 3, 4, 5],
  "summary_dir": "project/summaries",
  "repositories": [
    {
      "name": "my-project",
      "path": ".",
      "github": "",
      "areas": ["docs", "automation", "integrations"]
    }
  ],
  "docs": [
    "README.md",
    "AGENTS.md",
    "project",
    "plugins"
  ],
  "activities": [
    "raw/activities"
  ],
  "plugins": {
    "slack": {
      "enabled": false,
      "env": "SLACK_WEBHOOK_URL"
    },
    "telegram": {
      "enabled": false,
      "env": ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]
    }
  }
}
```
