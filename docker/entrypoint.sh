#!/bin/sh
set -e

echo "→ Aplicando schema de base de datos..."
npx prisma db push --accept-data-loss

echo "→ Iniciando Influctor..."
exec npm start
