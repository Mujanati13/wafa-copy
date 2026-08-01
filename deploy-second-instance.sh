#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo "Missing .env. Create it from .env.instance.example and enter unique credentials."
  exit 1
fi

docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --build --remove-orphans
docker compose --env-file .env ps

echo "Health check: curl -fsS \"${FRONTEND_URL:-http://localhost:${APP_PORT:-8081}}/api/v1/test\""
