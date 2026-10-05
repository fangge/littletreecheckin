#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${LITTLETREE_ROOT:-/opt/littletreecheckin}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/db-backup}"
API_PORT="${LITTLETREE_API_PORT:-3002}"
WEB_PORT="${LITTLETREE_WEB_PORT:-8081}"

cd "$PROJECT_ROOT"
test -f .env.local
grep -q '^DATABASE_URL=' .env.local
set -a
. ./.env.local
set +a
command -v node >/dev/null
command -v pnpm >/dev/null
command -v pm2 >/dev/null
command -v nginx >/dev/null
command -v mysql >/dev/null
systemctl is-active --quiet mysql

pnpm install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm lint
pnpm --dir server test
pnpm build
pnpm --dir server build

if [[ "${IMPORT_BACKUP:-false}" == "true" ]]; then
  node server/scripts/import-backup.mjs "$BACKUP_DIR"
fi

if [[ "${IMPORT_AUTH_USERS:-false}" == "true" ]]; then
  node server/scripts/import-auth-users.mjs
fi

install -d /var/www/littletreecheckin
cp -R dist/. /var/www/littletreecheckin/
sed \
  -e "s/__LITTLETREE_API_PORT__/${API_PORT}/g" \
  -e "s/__LITTLETREE_WEB_PORT__/${WEB_PORT}/g" \
  deploy/nginx.conf > /etc/nginx/sites-available/littletreecheckin.conf
chmod 0644 /etc/nginx/sites-available/littletreecheckin.conf
ln -sfn /etc/nginx/sites-available/littletreecheckin.conf /etc/nginx/sites-enabled/littletreecheckin.conf
LITTLETREE_ROOT="$PROJECT_ROOT" LITTLETREE_API_PORT="$API_PORT" pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
nginx -t
systemctl reload nginx
for attempt in {1..20}; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == 20 ]]; then
    echo "API health check failed on port ${API_PORT}" >&2
    exit 1
  fi
  sleep 1
done
echo "littletreecheckin deployed on web=${WEB_PORT} api=${API_PORT}"
