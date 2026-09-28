# Telegram authentication setup

The Edge Function URL is:

`https://lptzejmdtsmnlxfodihr.supabase.co/functions/v1/telegram-webhook`

1. Store `TELEGRAM_BOT_TOKEN` as an encrypted secret in Supabase Edge Function Secrets. The same variable must exist in Vercel Production for the Next.js login-code route.
2. Set the webhook from a local PowerShell session. Never commit or paste the token into source control:

```powershell
$token = "PASTE_TOKEN_LOCALLY"
$url = "https://lptzejmdtsmnlxfodihr.supabase.co/functions/v1/telegram-webhook"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook?url=$([uri]::EscapeDataString($url))" -Method Get
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo" -Method Get
```

The `getWebhookInfo` response must contain the Edge Function URL and an empty `last_error_message`. Send `/start` to the bot, then share a phone contact, enter a name, and enter a birth date as `DD.MM.YYYY`.
