#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Load environment variables from .env file if it exists
if [[ -f ".env" ]]; then
  source .env
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  DB_URL="$SUPABASE_DB_URL"
elif [[ -n "${DATABASE_URL:-}" ]]; then
  DB_URL="$DATABASE_URL"
else
  echo "ERROR: SUPABASE_DB_URL or DATABASE_URL is required."
  echo "Set one of these environment variables and rerun."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is not installed or not available in PATH."
  exit 1
fi

MIGRATIONS_DIR="supabase/migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "ERROR: migrations directory not found at $MIGRATIONS_DIR"
  exit 1
fi

echo "Running SQL migrations from $MIGRATIONS_DIR"

while IFS= read -r migration; do
  echo
  echo "=== Applying $(basename "$migration") ==="
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$migration"
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

echo
echo "All migrations applied successfully."
