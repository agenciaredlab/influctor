#!/bin/sh
set -e

# Escribe el crontab usando la variable de entorno CRON_SECRET del contenedor
cat > /etc/crontabs/root << EOF
* * * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://influctor-app:3000/api/cron/publish-scheduled >/dev/null 2>&1
0 9 * * 1 curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://influctor-app:3000/api/cron/weekly-report >/dev/null 2>&1
0 6 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://influctor-app:3000/api/cron/sync-instagram >/dev/null 2>&1
0 7 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://influctor-app:3000/api/cron/sync-tiktok >/dev/null 2>&1
0 10 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://influctor-app:3000/api/cron/trial-reminder >/dev/null 2>&1
5 0 1 * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" http://influctor-app:3000/api/cron/ai-reset >/dev/null 2>&1
EOF

echo "→ Cron jobs activos"
exec crond -f -L /dev/stdout
