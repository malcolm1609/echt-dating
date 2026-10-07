# Echt

Dating-App nur für echte und aktive Menschen. Plan: siehe [PLAN.md](PLAN.md).

```bash
npm install
npm test        # Kernregeln (Jest)
npm start       # Expo (ohne .env im Demo-Modus)

# Datenbank-Tests gegen eine leere Postgres-Datenbank
DATABASE_URL=postgres://... supabase/tests/run.sh
```

## Ausweisprüfung mit Didit einrichten

1. Konto auf [didit.me](https://didit.me) anlegen und einen KYC-Workflow mit Ausweis, Liveness und Face Match erstellen.
2. Webhook-Ziel: `https://<projekt>.supabase.co/functions/v1/verification-webhook`
3. Secrets setzen und Funktionen deployen:

```bash
supabase secrets set DIDIT_API_KEY=... DIDIT_WORKFLOW_ID=... DIDIT_WEBHOOK_SECRET=...
supabase functions deploy verification-start
supabase functions deploy verification-webhook
```
