#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
container="supabase_auth_yebetweg"
network="supabase_network_yebetweg"
image="public.ecr.aws/supabase/gotrue:v2.189.0"
keyfile="signing_keys.json"

tmp_env_file=$(mktemp)
trap 'rm -f "$tmp_env_file"' EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if [ ! -f "$keyfile" ]; then
  echo "Missing $keyfile" >&2
  exit 1
fi

key_json=$(jq -c . "$keyfile")
if [ -z "$key_json" ]; then
  echo "Failed to read $keyfile" >&2
  exit 1
fi

cat > "$tmp_env_file" <<EOF
API_EXTERNAL_URL=http://127.0.0.1:54321/auth/v1
GOTRUE_API_HOST=0.0.0.0
GOTRUE_API_PORT=9999
GOTRUE_DB_DRIVER=postgres
GOTRUE_DB_DATABASE_URL=postgresql://supabase_auth_admin:postgres@supabase_db_yebetweg:5432/postgres
GOTRUE_SITE_URL=http://127.0.0.1:3000
GOTRUE_URI_ALLOW_LIST=https://127.0.0.1:3000
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_JWT_ADMIN_ROLES=service_role
GOTRUE_JWT_AUD=authenticated
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_JWT_EXP=3600
GOTRUE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
GOTRUE_JWT_ISSUER=http://127.0.0.1:54321/auth/v1
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true
GOTRUE_MAILER_OTP_LENGTH=6
GOTRUE_MAILER_OTP_EXP=3600
GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED=false
GOTRUE_SMTP_MAX_FREQUENCY=1s
GOTRUE_MAILER_URLPATHS_INVITE=http://127.0.0.1:54321/auth/v1/verify
GOTRUE_MAILER_URLPATHS_CONFIRMATION=http://127.0.0.1:54321/auth/v1/verify
GOTRUE_MAILER_URLPATHS_RECOVERY=http://127.0.0.1:54321/auth/v1/verify
GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=http://127.0.0.1:54321/auth/v1/verify
GOTRUE_RATE_LIMIT_EMAIL_SENT=360000
GOTRUE_EXTERNAL_PHONE_ENABLED=false
GOTRUE_SMS_AUTOCONFIRM=true
GOTRUE_SMS_MAX_FREQUENCY=5s
GOTRUE_SMS_OTP_EXP=6000
GOTRUE_SMS_OTP_LENGTH=6
GOTRUE_SMS_TEMPLATE=Your code is {{ .Code }}
GOTRUE_PASSWORD_MIN_LENGTH=6
GOTRUE_PASSWORD_REQUIRED_CHARACTERS=
GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true
GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL=10
GOTRUE_SECURITY_MANUAL_LINKING_ENABLED=false
GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION=false
GOTRUE_MFA_PHONE_ENROLL_ENABLED=false
GOTRUE_MFA_PHONE_VERIFY_ENABLED=false
GOTRUE_MFA_TOTP_ENROLL_ENABLED=false
GOTRUE_MFA_TOTP_VERIFY_ENABLED=false
GOTRUE_MFA_WEB_AUTHN_ENROLL_ENABLED=false
GOTRUE_MFA_WEB_AUTHN_VERIFY_ENABLED=false
GOTRUE_MFA_MAX_ENROLLED_FACTORS=10
GOTRUE_RATE_LIMIT_ANONYMOUS_USERS=30
GOTRUE_RATE_LIMIT_TOKEN_REFRESH=150
GOTRUE_RATE_LIMIT_OTP=30
GOTRUE_RATE_LIMIT_VERIFY=30
GOTRUE_RATE_LIMIT_SMS_SENT=30
GOTRUE_RATE_LIMIT_WEB3=30
GOTRUE_JWT_VALIDMETHODS=HS256,RS256,ES256
GOTRUE_JWT_VALID_METHODS=HS256,RS256,ES256
GOTRUE_DB_MIGRATIONS_PATH=/usr/local/etc/auth/migrations
GOTRUE_JWT_KEYS=$key_json
EOF

printf 'Stopping old auth container...\n'
docker stop "$container" >/dev/null 2>&1 || true
printf 'Removing old auth container...\n'
docker rm "$container" >/dev/null 2>&1 || true
printf 'Recreating auth container with RS256 signing key...\n'
docker run -d \
  --name "$container" \
  --network "$network" \
  -p 9999:9999 \
  --env-file "$tmp_env_file" \
  "$image" auth

echo 'New auth container started:'
docker ps --filter "name=$container" --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

docker exec "$container" env | grep GOTRUE_JWT_KEYS || true
