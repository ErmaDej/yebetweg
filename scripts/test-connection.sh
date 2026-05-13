#!/usr/bin/env bash
set -euo pipefail

# Database connection URL using service role key
DB_URL="postgres://postgres:Kukusha77%21@db.jxyavtdmcloxnhuavokc.supabase.co:5432/postgres"

echo "Testing database connection with service role key..."
psql "$DB_URL" -c "SELECT 1 as connection_test;"