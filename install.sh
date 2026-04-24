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

# ── Detección de proxy existente ─────────────────────────────
detect_proxy() {
  # Traefik como servicio del sistema
  if systemctl is-active --quiet traefik 2>/dev/null; then
    echo "traefik-system"; return
  fi
  # Binario de Traefik instalado (aunque no corra como servicio)
  if command -v traefik &>/dev/null; then
    echo "traefik-binary"; return
  fi
  # Traefik corriendo en Docker
  if command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -qi traefik; then
    echo "traefik-docker"; return
  fi
  # Nginx activo
  if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "nginx-active"; return
  fi
  # Nginx instalado pero inactivo
  if command -v nginx &>/dev/null; then
    echo "nginx-installed"; return
  fi
  echo "none"
}

# Busca el directorio de configs dinámicas de Traefik
find_traefik_dynamic_dir() {
  for cfg in /etc/traefik/traefik.yml /etc/traefik/traefik.toml \
             /opt/traefik/traefik.yml /opt/traefik/traefik.toml; do
    if [[ -f "$cfg" ]]; then
      # Extrae la ruta del file provider (directory: ...)
      local dir
      dir=$(grep -E '^\s*(directory|watch)' "$cfg" 2>/dev/null | \
            grep -v watch | head -1 | sed 's/.*directory[: ]*//;s/[" ]//g' || true)
      [[ -n "$dir" && -d "$dir" ]] && echo "$dir" && return
    fi
  done
  # Fallback: directorio estándar
  echo "/etc/traefik/dynamic"
}

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

# ── Detección de proxy ───────────────────────────────────────
echo ""
echo -e "  ${BOLD}Proxy reverso${NC}"
DETECTED_PROXY=$(detect_proxy)
PROXY_MODE=""   # nginx | traefik-new | traefik-existing | traefik-docker-manual

case "$DETECTED_PROXY" in
  traefik-system)
    ok "Traefik detectado como servicio del sistema — se usará."
    PROXY_MODE="traefik-existing"
    ;;
  traefik-binary)
    ok "Binario de Traefik detectado — se configurará como servicio."
    PROXY_MODE="traefik-existing"
    ;;
  traefik-docker)
    warn "Traefik en Docker detectado."
    warn "La config automática no es posible en este caso."
    echo -e "  Al terminar el instalador recibirás el bloque YAML que debes"
    echo -e "  agregar a tu docker-compose.yml manualmente."
    PROXY_MODE="traefik-docker-manual"
    ;;
  nginx-active|nginx-installed)
    ok "Nginx detectado — se agregará el sitio de Influctor."
    PROXY_MODE="nginx"
    ;;
  none)
    echo "  No se encontró ningún proxy reverso instalado."
    echo "  [1] Instalar Nginx  (simple, recomendado para un solo sitio)"
    echo "  [2] Instalar Traefik (recomendado si vas a tener múltiples servicios)"
    read -rp "  Opción [1]: " PROXY_CHOICE
    PROXY_CHOICE="${PROXY_CHOICE:-1}"
    [[ "$PROXY_CHOICE" == "2" ]] && PROXY_MODE="traefik-new" || PROXY_MODE="nginx"
    ;;
esac

# ── SSL ──────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Certificado SSL${NC}"

# Traefik-docker: SSL lo maneja Docker, no preguntamos
SSL_CHOICE="3"; SSL_CERT=""; SSL_KEY=""

if [[ "$PROXY_MODE" != "traefik-docker-manual" ]]; then
  if [[ "$PROXY_MODE" == "traefik-new" ]]; then
    echo "  [1] Let's Encrypt automático (Traefik lo gestiona solo)"
    echo "  [2] Tengo los archivos del certificado de Hostinger"
    echo "  [3] Solo HTTP por ahora"
    read -rp "  Opción [1]: " SSL_CHOICE
    SSL_CHOICE="${SSL_CHOICE:-1}"
  else
    echo "  [1] Tengo los archivos del certificado de Hostinger"
    echo "  [2] Instalar Let's Encrypt (Certbot)"
    echo "  [3] Solo HTTP por ahora"
    read -rp "  Opción [1]: " SSL_CHOICE
    SSL_CHOICE="${SSL_CHOICE:-1}"
  fi

  if [[ "$PROXY_MODE" == "traefik-new" && "$SSL_CHOICE" == "1" ]]; then
    read -rp "  Email para Let's Encrypt [admin@${DOMAIN}]: " ACME_EMAIL
    ACME_EMAIL="${ACME_EMAIL:-admin@${DOMAIN}}"
  fi

  if [[ "$SSL_CHOICE" == "1" && "$PROXY_MODE" != "traefik-new" ]]; then
    read -rp "  Ruta del archivo .crt o .pem [/etc/ssl/influctor.crt]: " SSL_CERT
    SSL_CERT="${SSL_CERT:-/etc/ssl/influctor.crt}"
    read -rp "  Ruta del archivo .key [/etc/ssl/influctor.key]: " SSL_KEY
    SSL_KEY="${SSL_KEY:-/etc/ssl/influctor.key}"
  elif [[ "$SSL_CHOICE" == "2" && "$PROXY_MODE" == "traefik-new" ]]; then
    read -rp "  Ruta del archivo .crt o .pem [/etc/ssl/influctor.crt]: " SSL_CERT
    SSL_CERT="${SSL_CERT:-/etc/ssl/influctor.crt}"
    read -rp "  Ruta del archivo .key [/etc/ssl/influctor.key]: " SSL_KEY
    SSL_KEY="${SSL_KEY:-/etc/ssl/influctor.key}"
  fi
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
if [[ "$PROXY_MODE" == traefik* ]]; then
  apt-get install -y -qq curl git openssl
else
  apt-get install -y -qq curl git nginx openssl
fi

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
const { execSync } = require('child_process')

// Carga las variables de .env.production en el entorno de PM2
function loadEnv(file) {
  try {
    const lines = require('fs').readFileSync(file, 'utf8').split('\n')
    const env = {}
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key) env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
    }
    return env
  } catch { return {} }
}

const envVars = {
  NODE_ENV: 'production',
  PORT:     '${APP_PORT}',
  ...loadEnv('${APP_DIR}/.env.production'),
}

module.exports = {
  apps: [{
    name:               'influctor',
    script:             'node_modules/.bin/next',
    args:               'start -p ${APP_PORT}',
    cwd:                '${APP_DIR}',
    instances:          1,
    autorestart:        true,
    watch:              false,
    max_memory_restart: '512M',
    env:                envVars,
    error_file:         '/var/log/influctor/error.log',
    out_file:           '/var/log/influctor/out.log',
    log_date_format:    'YYYY-MM-DD HH:mm:ss',
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
#  PASO 6: PROXY REVERSO (Nginx o Traefik)
# ══════════════════════════════════════════════════════════════
hr

# ── RAMA NGINX ───────────────────────────────────────────────
if [[ "$PROXY_MODE" == "nginx" ]]; then
  info "Configurando Nginx..."
  NGINX_CONF="/etc/nginx/sites-available/influctor"

  if [[ "$SSL_CHOICE" == "1" && -f "$SSL_CERT" && -f "$SSL_KEY" ]]; then
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

  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/influctor
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  ok "Nginx configurado para $DOMAIN."

  if [[ "$SSL_CHOICE" == "2" ]]; then
    info "Solicitando certificado Let's Encrypt para $DOMAIN..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" --redirect || \
      warn "No se pudo obtener el certificado. Asegúrate de que el dominio apunte a este servidor e intenta: certbot --nginx -d $DOMAIN"
  fi

# ── RAMA TRAEFIK NUEVO ───────────────────────────────────────
elif [[ "$PROXY_MODE" == "traefik-new" ]]; then
  info "Instalando Traefik..."

  TRAEFIK_BIN="/usr/local/bin/traefik"
  TRAEFIK_VER=$(curl -s https://api.github.com/repos/traefik/traefik/releases/latest \
    | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/' 2>/dev/null || echo "3.3.3")
  TRAEFIK_URL="https://github.com/traefik/traefik/releases/download/v${TRAEFIK_VER}/traefik_v${TRAEFIK_VER}_linux_amd64.tar.gz"

  curl -fsSL "$TRAEFIK_URL" -o /tmp/traefik.tar.gz
  tar -xzf /tmp/traefik.tar.gz -C /tmp traefik
  mv /tmp/traefik "$TRAEFIK_BIN"
  chmod +x "$TRAEFIK_BIN"
  rm -f /tmp/traefik.tar.gz

  mkdir -p /etc/traefik/dynamic /etc/traefik/certs

  # Configuración estática de Traefik
  if [[ "$SSL_CHOICE" == "1" ]]; then
    # ACME (Let's Encrypt)
    cat > /etc/traefik/traefik.yml << TRAEFIKEOF
global:
  checkNewVersion: false
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@${DOMAIN}
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true

log:
  level: ERROR
TRAEFIKEOF
    touch /etc/traefik/acme.json && chmod 600 /etc/traefik/acme.json

  elif [[ "$SSL_CHOICE" == "2" && -f "$SSL_CERT" && -f "$SSL_KEY" ]]; then
    # Certificados propios
    cp "$SSL_CERT" /etc/traefik/certs/cert.pem
    cp "$SSL_KEY"  /etc/traefik/certs/key.pem
    cat > /etc/traefik/traefik.yml << TRAEFIKEOF
global:
  checkNewVersion: false
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true

log:
  level: ERROR
TRAEFIKEOF
    cat > /etc/traefik/dynamic/tls.yml << TLSEOF
tls:
  certificates:
    - certFile: /etc/traefik/certs/cert.pem
      keyFile:  /etc/traefik/certs/key.pem
TLSEOF

  else
    # Solo HTTP
    cat > /etc/traefik/traefik.yml << TRAEFIKEOF
global:
  checkNewVersion: false
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true

log:
  level: ERROR
TRAEFIKEOF
  fi

  # Ruta dinámica para la app
  ENTRYPOINT="web"
  RULE_TLS=""
  [[ "$SSL_CHOICE" != "3" ]] && ENTRYPOINT="websecure"
  if [[ "$SSL_CHOICE" == "1" ]]; then
    RULE_TLS='      tls:
        certResolver: letsencrypt'
  elif [[ "$SSL_CHOICE" == "2" ]]; then
    RULE_TLS='      tls: {}'
  fi
  cat > /etc/traefik/dynamic/influctor.yml << DYNEOF
http:
  routers:
    influctor:
      rule: "Host(\`${DOMAIN}\`)"
      entryPoints:
        - ${ENTRYPOINT}
      service: influctor
${RULE_TLS}
  services:
    influctor:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:${APP_PORT}"
DYNEOF

  # Servicio systemd para Traefik
  cat > /etc/systemd/system/traefik.service << SVCEOF
[Unit]
Description=Traefik Reverse Proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/traefik --configFile=/etc/traefik/traefik.yml
Restart=always
RestartSec=5
NoNewPrivileges=true
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
SVCEOF

  systemctl daemon-reload
  systemctl enable traefik
  systemctl start traefik
  ok "Traefik instalado y corriendo para $DOMAIN."

# ── RAMA TRAEFIK EXISTENTE ───────────────────────────────────
elif [[ "$PROXY_MODE" == "traefik-existing" ]]; then
  info "Configurando ruta en Traefik existente..."

  DYNAMIC_DIR=$(find_traefik_dynamic_dir)
  if [[ -z "$DYNAMIC_DIR" ]]; then
    DYNAMIC_DIR="/etc/traefik/dynamic"
    mkdir -p "$DYNAMIC_DIR"
    warn "No se encontró directorio dinámico de Traefik. Usando $DYNAMIC_DIR — verifica que traefik.yml apunte a este directorio."
  fi

  ENTRYPOINT="websecure"
  RULE_TLS="      tls: {}"
  [[ "$SSL_CHOICE" == "3" ]] && ENTRYPOINT="web" && RULE_TLS=""

  cat > "${DYNAMIC_DIR}/influctor.yml" << DYNEOF
http:
  routers:
    influctor:
      rule: "Host(\`${DOMAIN}\`)"
      entryPoints:
        - ${ENTRYPOINT}
      service: influctor
${RULE_TLS}
  services:
    influctor:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:${APP_PORT}"
DYNEOF

  ok "Ruta influctor.yml creada en ${DYNAMIC_DIR}. Traefik la recargará automáticamente."

# ── RAMA TRAEFIK DOCKER (manual) ─────────────────────────────
elif [[ "$PROXY_MODE" == "traefik-docker-manual" ]]; then
  warn "Traefik corre en Docker. Agrega esta entrada a tu docker-compose.yml del servicio Traefik:"
  cat << DOCKEREOF

  # ── Agregar al servicio 'influctor' en tu docker-compose.yml ──
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.influctor.rule=Host(\`${DOMAIN}\`)"
    - "traefik.http.routers.influctor.entrypoints=websecure"
    - "traefik.http.routers.influctor.tls=true"
    - "traefik.http.services.influctor.loadbalancer.server.port=${APP_PORT}"

DOCKEREOF
  info "Luego recarga con: docker compose up -d"
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
# influctor-cron: recordatorio de trial (diario 10am UTC)
0 10 * * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" "${CRON_URL}/api/cron/trial-reminder" >/dev/null 2>&1
# influctor-cron: reset mensual de uso de IA (día 1 de cada mes, 00:05 UTC)
5 0 1 * * curl -sf -H "Authorization: Bearer ${CRON_SECRET}" "${CRON_URL}/api/cron/ai-reset" >/dev/null 2>&1
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
if [[ "$PROXY_MODE" == "nginx" ]]; then
  echo -e "    nginx -t                — verificar config de Nginx"
  echo -e "    systemctl reload nginx  — recargar Nginx"
elif [[ "$PROXY_MODE" == "traefik-new" ]]; then
  echo -e "    systemctl status traefik          — ver estado de Traefik"
  echo -e "    systemctl restart traefik         — reiniciar Traefik"
  echo -e "    journalctl -u traefik -f          — ver logs de Traefik"
  echo -e "    ls /etc/traefik/dynamic/          — ver rutas dinámicas"
elif [[ "$PROXY_MODE" == "traefik-existing" ]]; then
  echo -e "    ls ${DYNAMIC_DIR}/               — ver rutas dinámicas"
  echo -e "    cat ${DYNAMIC_DIR}/influctor.yml — ver config de la app"
elif [[ "$PROXY_MODE" == "traefik-docker-manual" ]]; then
  echo -e "    docker compose up -d              — aplicar cambios en docker-compose.yml"
fi
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
