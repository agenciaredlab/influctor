#!/bin/bash
# ── Influctor — Script de actualización ──────────────────────
# Uso: bash deploy.sh
# Requiere que install.sh ya se haya ejecutado.
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "→ Actualizando código desde git..."
git pull origin main

echo "→ Instalando dependencias..."
npm ci --omit=dev --silent

echo "→ Construyendo la app..."
NODE_ENV=production npm run build

echo "→ Aplicando cambios de base de datos..."
npx prisma db push --accept-data-loss

echo "→ Reiniciando la app..."
pm2 restart influctor

echo "✔ Deploy completado — $(date)"
