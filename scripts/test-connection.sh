#!/usr/bin/env bash
# Quick database connectivity check. Credentials come from the environment —
# never hardcode them here (this file is tracked in git).
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo "error: set SUPABASE_DB_URL (or DATABASE_URL) before running." >&2
  echo "  e.g. export SUPABASE_DB_URL=\"postgres://<user>:<password>@<host>:5432/postgres\"" >&2
  exit 1
fi

echo "Testing database connection..."
psql "$DB_URL" -c "SELECT 1 AS connection_test;"
