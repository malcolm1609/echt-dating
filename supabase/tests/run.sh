#!/usr/bin/env bash
# Spielt Stub + Migrationen in eine leere Datenbank ein und führt die Tests aus.
# Aufruf: DATABASE_URL=postgres://... supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f tests/supabase_stub.sql
for f in migrations/*.sql; do psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
for f in tests/*.test.sql; do psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
