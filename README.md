# Influctor — Social Growth Platform

Plataforma SaaS para creadores de contenido: dashboard de métricas, calendario de publicaciones, brand deals CRM, AI Studio, marketplace y reportes semanales.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Prisma · NextAuth · PostgreSQL · Stripe · Anthropic Claude · Resend / SMTP

---

## Índice

- [Desarrollo local](#desarrollo-local)
- [Despliegue con Portainer](#despliegue-con-portainer) ← producción recomendada
- [Despliegue en VPS sin Docker](#despliegue-en-vps-sin-docker)
- [Variables de entorno](#variables-de-entorno)
- [Configuración post-despliegue](#configuración-post-despliegue)
- [Arquitectura](#arquitectura)
- [Planes](#planes)

---

## Desarrollo local

```bash
git clone <repo>
cd influctor
npm install
cp .env.example .env.local   # edita con tus valores
npm run db:push               # crea las tablas
npm run db:seed               # datos de prueba (opcional)
npm run dev                   # http://localhost:3000
```

**Requisitos:** Node.js 18+ · PostgreSQL (ver opciones en CLAUDE.md)

---

## Despliegue con Portainer

> Recomendado para servidores que ya tienen otros contenedores corriendo (Supabase, bases de datos, etc.).
> El stack crea su propia red y volúmenes aislados — **no interfiere con nada existente**.

### Qué contiene el stack

| Contenedor | Imagen | Descripción |
|---|---|---|
| `influctor-db` | `postgres:16-alpine` | PostgreSQL **sin** puerto expuesto al host |
| `influctor-app` | build local | Next.js — puerto `3010` en el host (configurable) |
| `influctor-cron` | build local | Alpine + curl — ejecuta los 6 cron jobs |

**Aislamiento:** red `influctor_net`, volumen `influctor_db_data`, nombres de contenedor con prefijo `influctor-`. PostgreSQL no accesible desde fuera del stack.

---

### Paso 1 — Preparar el servidor

El servidor necesita tener Docker instalado. Si ya tienes Portainer corriendo, pasa al paso 2.

```bash
# Instalar Docker (si no está instalado)
curl -fsSL https://get.docker.com | sh

# Instalar Portainer
docker volume create portainer_data
docker run -d \
  --name portainer \
  --restart unless-stopped \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Entra a `http://tu-servidor:9000` y crea tu cuenta de administrador de Portainer.

---

### Paso 2 — Crear el stack en Portainer

1. En Portainer: **Stacks → Add stack**
2. Dale nombre: `influctor`
3. En **Build method** elige una opción:
   - **Repository** → apunta a este repo git (rama `main`)
   - **Web editor** → pega el contenido de `docker-compose.yml`
4. En **Environment variables** define las siguientes variables:

| Variable | Descripción | Cómo generarla |
|---|---|---|
| `DB_PASSWORD` | Contraseña de PostgreSQL | `openssl rand -base64 24 \| tr -dc 'a-zA-Z0-9' \| head -c 24` |
| `NEXTAUTH_SECRET` | Secreto de NextAuth | `openssl rand -base64 32` |
| `APP_URL` | URL pública sin trailing slash | `https://app.tudominio.com` |
| `CRON_SECRET` | Secreto para los cron jobs | `openssl rand -base64 24 \| tr -dc 'a-zA-Z0-9' \| head -c 32` |
| `APP_PORT` | Puerto en el host *(opcional, default: 3010)* | `3010` |

> También puedes subir el archivo `.env.docker.example` como `.env` en la sección **Load variables from .env file**.

5. Click **Deploy the stack**

El primer despliegue tarda ~3-5 minutos (build de la imagen). Los siguientes son más rápidos.

---

### Paso 3 — Configurar el proxy reverso

La app queda en el puerto `3010` (o el que hayas elegido). Apúntale tu dominio:

#### Opción A — Traefik (si ya lo usas en el servidor)

Descomenta las líneas `labels:` en `docker-compose.yml` y ajusta el dominio:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=traefik_proxy"
  - "traefik.http.routers.influctor.rule=Host(`app.tudominio.com`)"
  - "traefik.http.routers.influctor.entrypoints=websecure"
  - "traefik.http.routers.influctor.tls=true"
  - "traefik.http.services.influctor.loadbalancer.server.port=3000"
```

Y agrega la red de Traefik al servicio `app`:

```yaml
networks:
  - influctor_net
  - traefik_proxy
```

#### Opción B — Nginx en el host

```nginx
server {
    listen 80;
    server_name app.tudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.tudominio.com;

    ssl_certificate     /etc/ssl/tudominio.crt;
    ssl_certificate_key /etc/ssl/tudominio.key;

    location / {
        proxy_pass         http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

---

### Actualizar a una nueva versión

En Portainer → Stacks → `influctor` → **Editor** → cambia la imagen o haz pull del repo → **Update the stack**.

O desde el servidor:

```bash
cd /ruta/al/repo
git pull origin main
# En Portainer: Stacks → influctor → Update the stack (check "Re-pull image")
```

---

## Despliegue en VPS sin Docker

Si prefieres PM2 + Nginx/Traefik directamente en el servidor:

```bash
sudo bash install.sh
```

El instalador interactivo configura Node.js, PM2, PostgreSQL, proxy reverso (Nginx o Traefik) y cron jobs automáticamente.

Para actualizaciones posteriores:

```bash
bash /var/www/influctor/deploy.sh
```

---

## Variables de entorno

Las variables mínimas para arrancar están en el stack. Las claves de servicios externos (Stripe, Anthropic, Instagram, etc.) **se configuran desde el panel de administración** en `/admin/settings` después de que la app esté corriendo — se guardan cifradas en la base de datos.

| Variable en el stack | Descripción |
|---|---|
| `DB_PASSWORD` | Contraseña de PostgreSQL (solo para el stack) |
| `NEXTAUTH_SECRET` | Secreto para firmar sesiones de NextAuth |
| `APP_URL` | URL pública, ej: `https://app.tudominio.com` |
| `CRON_SECRET` | Token de autenticación para los cron jobs |
| `APP_PORT` | Puerto en el host (default: `3010`) |

---

## Configuración post-despliegue

Una vez que la app está corriendo:

### 1. Crear el primer usuario (admin)

Ve a `https://tu-dominio.com/register` y crea tu cuenta. El primer usuario registrado tiene acceso al panel de administración.

### 2. Configurar servicios externos

Ve a `https://tu-dominio.com/admin/settings` y configura:

| Sección | Qué configurar |
|---|---|
| **Stripe** | Secret key, webhook secret, Price IDs de Creator y Pro |
| **Anthropic** | API key para las funciones de IA |
| **Email** | Resend API key **o** credenciales SMTP (host, port, user, pass) |
| **Instagram / Meta** | App ID y App Secret para conectar cuentas |
| **TikTok** | Client Key y Client Secret |
| **App** | URL pública y Cron Secret |

### 3. Configurar webhook de Stripe

En [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → Add endpoint:

- **URL:** `https://tu-dominio.com/api/stripe/webhook`
- **Eventos:**
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `checkout.session.completed`

Copia el **Signing Secret** y ponlo en `Admin → Configuración → Stripe → Webhook Secret`.

---

## Arquitectura

```
src/
├── app/
│   ├── api/              # API routes (autenticadas con getApiSession)
│   │   ├── ai/           # AI Studio — generación con Claude
│   │   ├── auth/         # NextAuth + Instagram/TikTok OAuth
│   │   ├── competitors/  # Tracker de competidores
│   │   ├── content/      # Calendario de contenido
│   │   ├── cron/         # 6 jobs programados
│   │   ├── deals/        # Brand Deals CRM
│   │   ├── email/        # Reportes semanales
│   │   ├── income/       # Registro de ingresos
│   │   ├── marketplace/  # Listings + aplicaciones + pagos
│   │   ├── playbooks/    # Progreso de playbooks
│   │   ├── social/       # Sync/publish Instagram y TikTok
│   │   └── stripe/       # Checkout, portal, webhook
│   ├── admin/            # Panel de administración
│   ├── dashboard/        # Panel principal
│   ├── login/            # Autenticación
│   ├── register/         # Registro
│   ├── forgot-password/  # Recuperación de contraseña
│   └── reset-password/   # Restablecimiento de contraseña
├── components/
│   ├── layout/           # DashboardLayout, Sidebar
│   └── ui/               # Card, Badge, UpgradeGate, etc.
└── lib/
    ├── auth.ts           # NextAuth config
    ├── config.ts         # Config DB-first + SMTP/servicios
    ├── email.ts          # Nodemailer (SMTP) + Resend
    ├── plans.ts          # Planes Free / Creator / Pro
    ├── prisma.ts         # Prisma client singleton
    └── session.ts        # getSessionUser / getApiSession
```

### Cron jobs

| Job | Horario | Función |
|---|---|---|
| `publish-scheduled` | Cada minuto | Publica posts programados en Instagram y TikTok |
| `sync-instagram` | Diario 6am UTC | Sincroniza métricas de Instagram |
| `sync-tiktok` | Diario 7am UTC | Sincroniza métricas de TikTok |
| `weekly-report` | Lunes 9am UTC | Envía reportes semanales por email |
| `trial-reminder` | Diario 10am UTC | Notifica a usuarios con trial próximo a vencer |
| `ai-reset` | Día 1 del mes 00:05 UTC | Resetea uso mensual de IA + baja trials expirados |

---

## Planes

| Plan | Precio | Límite IA | Funciones |
|---|---|---|---|
| Free | $0 | 10/mes | Dashboard básico |
| Creator | $19/mes | 100/mes | Marketplace, reportes email, publicación |
| Pro | $49/mes | Ilimitado | Todo + listings en marketplace |

Los Price IDs de Stripe se configuran en `Admin → Configuración → Stripe`.
