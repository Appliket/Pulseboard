# Telegram Summary Plugin

Posts the generated previous-working-day summary to a Telegram chat.

## Setup

1. Create a Telegram bot with BotFather.
2. Add the bot to the target chat.
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in the local environment or `.env`.
4. Run:

```bash
npm run summary -- --post telegram
```

No Telegram messages are read. This plugin only posts the generated digest.
