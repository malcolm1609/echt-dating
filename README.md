# Echt

Dating-App nur für echte und aktive Menschen. Plan: siehe [PLAN.md](PLAN.md).

```bash
npm install
npm test        # Kernregeln (Jest)
npm start       # Expo (ohne .env im Demo-Modus)

# Datenbank-Tests gegen eine leere Postgres-Datenbank
DATABASE_URL=postgres://... supabase/tests/run.sh
```
