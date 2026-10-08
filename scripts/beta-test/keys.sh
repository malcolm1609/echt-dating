#!/usr/bin/env bash
# Holt die Schlüssel des Beta-Servers über die Supabase-Verwaltung und legt sie für die folgenden Schritte ab.
set -euo pipefail
keys=$(curl -fsS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/api-keys?reveal=true")
anon=$(jq -r '(map(select(.type == "publishable"))[0].api_key) // (map(select(.name == "anon"))[0].api_key)' <<< "$keys")
service=$(jq -r '(map(select(.type == "secret"))[0].api_key) // (map(select(.name == "service_role"))[0].api_key)' <<< "$keys")
echo "::add-mask::$service"
{
  echo "SUPABASE_ANON_KEY=$anon"
  echo "SUPABASE_SERVICE_ROLE_KEY=$service"
} >> "$GITHUB_ENV"
