#!/bin/bash
# ============================================================
#  Influctor — Instalador para VPS (Ubuntu/Debian)
#  Uso: bash install.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✔${NC}  $1"; }
info() { echo -e "${CYAN}→${NC}  $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
die()  { echo -e "${RED}✘${NC}  $1"; exit 1; }
hr()   { echo -e "\n${CYAN}────────────────────────────────────────${NC}\n"; }

# ── Requiere root ────────────────────────────────────────────
[[ $EUID -ne 0 ]] && die "Ejecuta este script como root: sudo bash install.sh"

clear
echo -e "${BOLD}${CYAN}"
echo "  ██╗███╗   ██╗███████╗██╗     ██╗   ██╗ ██████╗████████╗ ██████╗ ██████╗"
echo "  ██║████╗  ██║██╔════╝██║     ██║   ██║██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗"
echo "  ██║██╔██╗ ██║█████╗  ██║     ██║   ██║██║        ██║   ██║   ██║██████╔╝"
echo "  ██║██║╚██╗██║██╔══╝  ██║     ██║   ██║██║        ██║   ██║   ██║██╔══██╗"
echo "  ██║██║ ╚████║██║     ███████╗╚██████╔╝╚██████╗   ██║   ╚██████╔╝██║  ██║"
echo "  ╚═╝╚═╝  ╚═══╝╚═╝     ╚══════╝ ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "  ${BOLD}Instalador para VPS — Ubuntu/Debian${NC}"
echo -e "  Este script configura Node.js, PM2, Nginx, PostgreSQL y los cron jobs.\n"

# ══════════════════════════════════════════════════════════════
#  PASO 1: RECOPILAR CONFIGURACIÓN
# ══════════════════════════════════════════════════════════════
hr
echo -e "${BOLD}Configuración inicial${NC}"
echo ""

# Directorio de la app
read -rp "  Directorio de la app [/var/www/influctor]: " APP_DIR
APP_DIR="${APP_DIR:-/var/www/influctor}"

# Dominio
read -rp "  Dominio (ej: app.tudominio.com): " DOMAIN
[[ -z "$DOMAIN" ]] && die "El dominio es obligatorio."

# Puerto
read -rp "  Puerto de la app [3000]: " APP_PORT
APP_PORT="${APP_PORT:-3000}"

# Base de datos
echo ""
echo -e "  ${BOLD}Base de datos PostgreSQL${NC}"
echo "  [1] Instalar PostgreSQL en este servidor (recomendado, más simple)"
echo "  [2] Usar una base de datos externa (Neon, Supabase cloud, etc.)"
read -rp "  Opción [1]: " DB_CHOICE
DB_CHOICE="${DB_CHOICE:-1}"

if [[ "$DB_CHOICE" == "1" ]]; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
  DATABASE_URL="postgresql://influctor:${DB_PASSWORD}@localhost:5432/influctor"
  INSTALL_POSTGRES=true
  ok "Se instalará PostgreSQL local con contraseña generada automáticamente."
else
  read -rp "  DATABASE_URL (postgresql://user:pass@host:5432/db): " DATABASE_URL
  [[ -z "$DATABASE_URL" ]] && die "DATABASE_URL es obligatoria."
  INSTALL_POSTGRES=false
fi

# SSL
echo ""
echo -e "  ${BOLD}Certificado SSL${NC}"
echo "  [1] Tengo los archivos del certificado de Hostinger"
echo "  [2] Instalar Let's Encrypt (Certbot) — requiere que el dominio apunte a este servidor"
echo "  [3] Solo HTTP por ahora (activar SSL después)"
read -rp "  Opción [1]: " SSL_CHOICE
SSL_CHOICE="${SSL_CHOICE:-1}"

SSL_CERT=""
SSL_KEY=""
if [[ "$SSL_CHOICE" == "1" ]]; then
  read -rp "  Ruta del archivo .crt o .pem [/etc/ssl/influctor.crt]: " SSL_CERT
  SSL_CERT="${SSL_CERT:-/etc/ssl/influctor.crt}"
  read -rp "  Ruta del archivo .key [/etc/ssl/influctor.key]: " SSL_KEY
  SSL_KEY="${SSL_KEY:-/etc/ssl/influctor.key}"
fi

# NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ok "NEXTAUTH_SECRET generado automáticamente."

# CRON_SECRET
CRON_SECRET=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
ok "CRON_SECRET generado automáticamente."

# ── Resumen ──────────────────────────────────────────────────
hr
echo -e "${BOLD}Resumen de instalación:${NC}"
echo ""
echo "  Directorio:     $APP_DIR"
echo "  Dominio:        $DOMAIN"
echo "  Puerto:         $APP_PORT"
echo "  PostgreSQL:     $([ "$INSTALL_POSTGRES" = true ] && echo 'local (se instalará)' || echo 'externa')"
echo "  SSL:            $([ "$SSL_CHOICE" = "1" ] && echo "Hostinger ($SSL_CERT)" || ([ "$SSL_CHOICE" = "2" ] && echo "Let's Encrypt" || echo "Solo HTTP"))"
echo ""
read -rp "  ¿Continuar con la instalación? [s/N]: " CONFIRM
[[ "${CONFIRM,,}" != "s" ]] && die "Instalación cancelada."

# ══════════════════════════════════════════════════════════════
#  PASO 2: DEPENDENCIAS DEL SISTEMA
# ══════════════════════════════════════════════════════════════
hr
info "Actualizando paquetes del sistema..."
apt-get update -qq

info "Instalando dependencias base..."
apt-get install -y -qq curl git nginx openssl

# ── Node.js 20 LTS ──────────────────────────────────────────
NODE_VER=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
if [[ "$NODE_VER" -lt 18 ]]; then
  info "Instalando Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs
  ok "Node.js $(node --version) instalado."
else
  ok "Node.js v${NODE_VER} ya está instalado."
fi

# ── PM2 ─────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "Instalando PM2..."
  npm install -g pm2 --silent
  ok "PM2 instalado."
else
  ok "PM2 ya está instalado ($(pm2 --version))."
fi

# ══════════════════════════════════════════════════════════════
#  PASO 3: POSTGRESQL (opcional)
# ══════════════════════════════════════════════════════════════
if [[ "$INSTALL_POSTGRES" == "true" ]]; then
  hr
  info "Instalando PostgreSQL..."
  apt-get install -y -qq postgresql postgresql-contrib

  systemctl start postgresql
  systemctl enable postgresql

  # Crear usuario y base de datos
  sudo -u postgres psql -c "CREATE USER influctor WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE DATABASE influctor OWNER influctor;" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE influctor TO influctor;" 2>/dev/null || true

  ok "PostgreSQL configurado — base de datos 'influctor' creada."
fi

# ══════════════════════════════════════════════════════════════
#  PASO 4: CONFIGURAR LA APP
# ══════════════════════════════════════════════════════════════
hr
info "Preparando directorio $APP_DIR..."
mkdir -p "$APP_DIR"

# Si no hay package.json, asumimos que hay que copiar desde el directorio actual
if [[ ! -f "$APP_DIR/package.json" ]]; then
  if [[ -f "$(pwd)/package.json" ]]; then
    info "Copiando archivos de la app al directorio de instalación..."
    cp -r "$(pwd)/." "$APP_DIR/"
  else
    warn "No se encontró package.json en $APP_DIR ni en el directorio actual."
    warn "Coloca los archivos de la app en $APP_DIR y ejecuta deploy.sh"
  fi
fi

# ── .env.production ─────────────────────────────────────────
info "Creando archivo de entorno..."
cat > "$APP_DIR/.env.production" << ENVEOF
# ── Base de datos ──────────────────────────────────────────
DATABASE_URL="${DATABASE_URL}"

# ── NextAuth ───────────────────────────────────────────────
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"

# ── App ────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NODE_ENV="production"

# ── Cron secret (generado automáticamente) ─────────────────
CRON_SECRET="${CRON_SECRET}"

# ── Las demás keys (Stripe, Anthropic, Resend, etc.) ──────
# Se configuran desde el panel en https://${DOMAIN}/admin/settings
# después de que la app esté corriendo.
ENVEOF
chmod 600 "$APP_DIR/.env.production"
ok ".env.production creado en $APP_DIR"

# ── Instalar dependencias y build ────────────────────────────
if [[ -f "$APP_DIR/package.json" ]]; then
  info "Instalando dependencias npm..."
  cd "$APP_DIR"
  npm ci --omit=dev --silent 2>&1 | tail -3

  info "Generando cliente de Prisma y construyendo la app..."
  NODE_ENV=production npm run build 2>&1 | tail -5
  ok "Build completado."

  info "Aplicando schema de base de datos..."
  DATABASE_URL="$DATABASE_URL" npx prisma db push --accept-data-loss 2>&1 | tail -3
  ok "Base de datos lista."
fi

# ══════════════════════════════════════════════════════════════
#  PASO 5: PM2
# ══════════════════════════════════════════════════════════════
hr
info "Configurando PM2..."

cat > "$APP_DIR/ecosystem.config.js" << ECOSYSTEMEOF
module.exports = {
  apps: [{
    name:         'influctor',
    script:       'node_modules/.bin/next',
    args:         'start -p ${APP_PORT}',
    cwd:          '${APP_DIR}',
    instances:    1,
    autorestart:  true,
    watch:        false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV:    'production',
      PORT:        ${APP_PORT},
    },
    env_file: '${APP_DIR}/.env.production',
    error_file:  '/var/log/influctor/error.log',
    out_file:    '/var/log/influctor/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
}
ECOSYSTEMEOF

mkdir -p /var/log/influctor

# Arrancar la app
cd "$APP_DIR"
pm2 start ecosystem.config.js --env production 2>/dev/null || pm2 restart influctor
pm2 save

# Configurar autostart al reiniciar el servidor
pm2 startup systemd -u root --hp /root 2>/dev/null | grep "sudo " | bash || true
pm2 save

ok "PM2 configurado. La app corre en el puerto $APP_PORT."

# ══════════════════════════════════════════════════════════════
#  PASO 6: NGINX
# ══════════════════════════════════════════════════════════════
hr
info "Configurando Nginx..."

NGINX_CONF="/etc/nginx/sites-available/influctor"

# ── Bloque SSL ───────────────────────────────────────────────
if [[ "$SSL_CHOICE" == "1" && -f "$SSL_CERT" && -f "$SSL_KEY" ]]; then
  # SSL con certificado de Hostinger
  cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

elif [[ "$SSL_CHOICE" == "2" ]]; then
  # Let's Encrypt — Nginx HTTP para validación, después Certbot agrega SSL
  apt-get install -y -qq certbot python3-certbot-nginx
  cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

else
  # Solo HTTP
  cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINXEOF
fi

# Activar el sitio
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/influctor
rm -f /etc/nginx/sites-enabled/default

# Verificar y recargar Nginx
nginx -t && systemctl reload nginx
ok "Nginx configurado para $DOMAIN."

# Let's Encrypt — solicitar certificado
if [[ "$SSL_CHOICE" == "2" ]]; then
  info "Solicitando certificado Let's Encrypt para $DOMAIN..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" --redirect || \
    warn "No se pudo obtener el certificado. Asegúrate de que el dominio apunte a este servidor e intenta: certbot --nginx -d $DOMAIN"
fi

# ══════════════════════════════════════════════════════════════
#  PASO 7: CRON JOBS
# ══════════════════════════════════════════════════════════════
hr
info "Configurando cron jobs..."

CRON_URL="http://127.0.0.1:${APP_PORT}"

# Eliminar crons anteriores de influctor si existen
crontab -l 2>/dev/null | grep -v "influctor-cron" > /tmp/crontab_clean || true

cat >> /tmp/crontab_clean << CRONEOF
# influctor-cron: publicar contenido programado (cada minuto)
* * * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" "${CRON_URL}/api/cron/publish-scheduled" >/dev/null 2>&1
# influctor-cron: reporte semanal (lunes 9am UTC)
0 9 * * 1 curl -sf -H "Authorization: Bearer ${CRON_SECRET}" "${CRON_URL}/api/cron/weekly-report" >/dev/null 2>&1
# influctor-cron: sincronizar Instagram (diario 6am UTC)
0 6 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" "${CRON_URL}/api/cron/sync-instagram" >/dev/null 2>&1
# influctor-cron: sincronizar TikTok (diario 7am UTC)
0 7 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" "${CRON_URL}/api/cron/sync-tiktok" >/dev/null 2>&1
CRONEOF

crontab /tmp/crontab_clean
rm -f /tmp/crontab_clean
ok "Cron jobs configurados (publicación, reportes, sync Instagram/TikTok)."

# ══════════════════════════════════════════════════════════════
#  PASO 8: SCRIPT DE DEPLOY
# ══════════════════════════════════════════════════════════════
hr
info "Creando script de deploy para futuras actualizaciones..."

cat > "$APP_DIR/deploy.sh" << DEPLOYEOF
#!/bin/bash
# ── Influctor — Script de actualización ──────────────────────
set -e
APP_DIR="${APP_DIR}"
cd "\$APP_DIR"

echo "→ Actualizando código..."
git pull origin main

echo "→ Instalando dependencias..."
npm ci --omit=dev --silent

echo "→ Construyendo la app..."
NODE_ENV=production npm run build

echo "→ Aplicando cambios de base de datos..."
npx prisma db push --accept-data-loss

echo "→ Reiniciando la app..."
pm2 restart influctor

echo "✔ Deploy completado — \$(date)"
DEPLOYEOF

chmod +x "$APP_DIR/deploy.sh"
ok "Script de deploy creado en $APP_DIR/deploy.sh"

# ══════════════════════════════════════════════════════════════
#  RESUMEN FINAL
# ══════════════════════════════════════════════════════════════
hr
echo -e "${GREEN}${BOLD}✔ Instalación completada${NC}"
echo ""
echo -e "  ${BOLD}Tu app está corriendo en:${NC}"
if [[ "$SSL_CHOICE" != "3" ]]; then
  echo -e "    ${CYAN}https://${DOMAIN}${NC}"
else
  echo -e "    ${CYAN}http://${DOMAIN}${NC}"
fi
echo ""
echo -e "  ${BOLD}Próximos pasos:${NC}"
echo ""
echo -e "  1. Abre ${CYAN}https://${DOMAIN}/register${NC}"
echo -e "     → Crea tu cuenta de administrador (el primer registro es super admin)"
echo ""
echo -e "  2. Ve a ${CYAN}https://${DOMAIN}/admin/settings${NC}"
echo -e "     → Configura Stripe, Anthropic, Resend, Instagram y TikTok"
echo ""
echo -e "  3. Para futuras actualizaciones ejecuta:"
echo -e "     ${CYAN}bash ${APP_DIR}/deploy.sh${NC}"
echo ""
echo -e "  ${BOLD}Comandos útiles:${NC}"
echo -e "    pm2 status              — ver estado de la app"
echo -e "    pm2 logs influctor      — ver logs en tiempo real"
echo -e "    pm2 restart influctor   — reiniciar la app"
echo -e "    nginx -t                — verificar config de Nginx"
echo ""

if [[ "$INSTALL_POSTGRES" == "true" ]]; then
  echo -e "  ${BOLD}Base de datos local:${NC}"
  echo -e "    Host: localhost:5432"
  echo -e "    DB:   influctor"
  echo -e "    User: influctor"
  echo -e "    Pass: ${DB_PASSWORD}"
  echo -e "    URL:  ${DATABASE_URL}"
  echo ""
  echo -e "  ${YELLOW}⚠  Guarda la contraseña de PostgreSQL en un lugar seguro.${NC}"
fi

echo ""
echo -e "  ${BOLD}Archivo de entorno:${NC} ${APP_DIR}/.env.production"
echo -e "  ${BOLD}Logs:${NC}              /var/log/influctor/"
echo ""
