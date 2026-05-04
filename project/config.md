---
type: pulseboard-config
title: Pulseboard Configuration
updated: 2026-05-04
---

# Pulseboard Configuration

The summary tool reads the JSON block below. Keep secrets out of this file.

```json
{
  "project": "Pulseboard",
  "timezone": "Europe/Rome",
  "working_days": [1, 2, 3, 4, 5],
  "summary_dir": "project/summaries",
  "task_states": ["todo", "in-progress", "in-review", "done"],
  "areas": [
    "docs",
    "info",
    "frontend",
    "backend",
    "mobile",
    "api",
    "database",
    "design",
    "infrastructure",
    "tests",
    "automation",
    "integrations"
  ],
  "categories": [
    {
      "key": "feature",
      "description": "New user-facing or workflow capability.",
      "examples": ["Add Google login to onboarding."]
    },
    {
      "key": "bug",
      "description": "Broken or incorrect behavior.",
      "examples": ["Fix checkout error when payment fails."]
    },
    {
      "key": "chore",
      "description": "Maintenance, tooling, cleanup, or operational work.",
      "examples": ["Add digest automation to project startup."]
    },
    {
      "key": "docs",
      "description": "Documentation, project knowledge, or specification work.",
      "examples": ["Document the plugin setup flow."]
    }
  ],
  "priorities": [
    {
      "key": "p0",
      "description": "Urgent blocker or severe user impact.",
      "examples": ["Users cannot access the product."]
    },
    {
      "key": "p1",
      "description": "Important near-term work.",
      "examples": ["Add a required customer delivery flow."]
    },
    {
      "key": "p2",
      "description": "Useful planned work without immediate delivery pressure.",
      "examples": ["Improve empty states."]
    },
    {
      "key": "p3",
      "description": "Low urgency cleanup or exploratory work.",
      "examples": ["Rename an internal helper."]
    }
  ],
  "repositories": [
    {
      "name": "pulseboard",
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
  "external_docs": [],
  "activities": [
    "raw/activities"
  ],
  "issue_sync": {
    "enabled": false,
    "provider": "github",
    "implementation_ready_statuses": ["todo", "in-progress"],
    "local_only_categories": ["docs"]
  },
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
