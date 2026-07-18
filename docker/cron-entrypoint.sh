#!/bin/sh
set -e

# APP_HOST lets deployments override the target hostname — defaults to
# "influctor-app" (the container_name used by the documented plain
# docker-compose/Portainer deployment in the README). Swarm deployments
# don't get DNS entries from container_name, only from the service name,
# so set APP_HOST to that service name in Swarm-based stacks.
APP_HOST="${APP_HOST:-influctor-app}"

# Escribe el crontab usando la variable de entorno CRON_SECRET del contenedor
cat > /etc/crontabs/root << EOF
* * * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://${APP_HOST}:3000/api/cron/publish-scheduled >/dev/null 2>&1
0 9 * * 1 curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://${APP_HOST}:3000/api/cron/weekly-report >/dev/null 2>&1
0 6 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://${APP_HOST}:3000/api/cron/sync-instagram >/dev/null 2>&1
0 7 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://${APP_HOST}:3000/api/cron/sync-tiktok >/dev/null 2>&1
0 10 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://${APP_HOST}:3000/api/cron/trial-reminder >/dev/null 2>&1
5 0 1 * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://${APP_HOST}:3000/api/cron/ai-reset >/dev/null 2>&1
EOF

echo "→ Cron jobs activos (APP_HOST=${APP_HOST})"
exec crond -f -L /dev/stdout
