# Slack Summary Plugin

Posts the generated previous-working-day summary to a Slack channel through an incoming webhook.

## Setup

1. Create a Slack incoming webhook for the target channel.
2. Set `SLACK_WEBHOOK_URL` in the local environment or `.env`.
3. Run:

```bash
npm run summary -- --post slack
```

No Slack messages are read. This plugin only posts the generated digest.
