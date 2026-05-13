#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

find "supabase/migrations" -maxdepth 1 -type f -name '*.sql' | sort
