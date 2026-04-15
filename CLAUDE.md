# Influctor — Social Growth Platform

Stack: Next.js 14 · TypeScript · Tailwind CSS · Prisma · NextAuth · PostgreSQL · Stripe · Resend · Claude AI

---

## Desarrollo local

### Requisitos
- Node.js 18+
- PostgreSQL (ver opciones abajo)

### Instalación

```bash
git clone <repo>
cd influctor
npm install
cp .env.example .env.local   # edita con tus valores
npm run db:push               # crea las tablas en PostgreSQL
npm run db:seed               # opcional: carga datos de prueba
npm run dev
```

---

## Base de datos — PostgreSQL

### Opción A — Orion (instalador open-source, recomendado en Linux)

```bash
bash <(curl -sSL setup.oriondesign.art.br)
```

Busca **Supabase** en el menú de Orion e instálalo. Luego:

```bash
npx supabase start
```

Copia el `DB URL` que aparece en la salida y ponlo en `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### Opción B — Docker (sin instaladores)

```bash
docker run --name influctor-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=influctor \
  -p 5432:5432 -d postgres:16
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/influctor"
```

### Opción C — Neon (cloud, sin instalar nada)

1. Entra a [neon.tech](https://neon.tech) → crea un proyecto gratis
2. Copia el connection string

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### Opción D — Supabase cloud

1. Entra a [supabase.com](https://supabase.com) → nuevo proyecto
2. Settings → Database → URI

```env
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"
```

### Comandos de base de datos

```bash
npm run db:push      # aplica el schema (desarrollo / primera vez en prod)
npm run db:migrate   # aplica migraciones (prisma migrate deploy)
npm run db:studio    # abre Prisma Studio en localhost:5555
npm run db:seed      # carga datos de prueba del marketplace
```

---

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena cada sección.

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `NEXTAUTH_SECRET` | Genera con `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL base de la app (sin trailing slash) |
| `ANTHROPIC_API_KEY` | Para las funciones de IA en AI Studio |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth Google (opcional) |
| `INSTAGRAM_APP_ID/SECRET` | Para conectar cuentas de Instagram |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret del webhook de Stripe |
| `STRIPE_PRICE_CREATOR` | Price ID del plan Creator en Stripe |
| `STRIPE_PRICE_PRO` | Price ID del plan Pro en Stripe |
| `RESEND_API_KEY` | Para envío de reportes por email |

---

## Deploy en producción (Vercel)

### 1. Base de datos

Crea una base de datos PostgreSQL en Neon, Supabase o Railway y copia el connection string.

### 2. Variables de entorno en Vercel

En Vercel → Settings → Environment Variables, agrega todas las variables de `.env.example` con sus valores de producción.

```
NEXTAUTH_URL=https://tudominio.com
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<openssl rand -base64 32>
# ... resto de variables
```

### 3. Primer deploy

```bash
git push origin main
```

Vercel ejecuta automáticamente `prisma generate && next build`.

### 4. Aplicar el schema en producción

Desde tu máquina local apuntando a la base de datos de producción:

```bash
DATABASE_URL="postgresql://..." npm run db:push
```

O desde el panel de Vercel en **Functions** → Run `prisma db push`.

### 5. Stripe Webhook

En [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → Add endpoint:

- **URL**: `https://tudominio.com/api/stripe/webhook`
- **Eventos a escuchar**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Copia el **Signing Secret** y ponlo en `STRIPE_WEBHOOK_SECRET`.

### 6. Cron jobs (Vercel)

El archivo `vercel.json` ya tiene configurado:
- `0 9 * * 1` — reportes semanales por email (lunes 9am UTC)
- `* * * * *` — publicación de contenido programado

Para que funcionen necesitas que `CRON_SECRET` esté configurado en Vercel.

---

## Arquitectura

```
src/
├── app/
│   ├── api/              # API routes (todos autenticados con getApiSession)
│   │   ├── ai/           # AI Studio generation
│   │   ├── auth/         # NextAuth + Instagram OAuth callback
│   │   ├── competitors/  # CRUD de competidores
│   │   ├── content/      # CRUD de contenido
│   │   ├── cron/         # Jobs programados
│   │   ├── deals/        # Brand Deals CRM
│   │   ├── email/        # Reportes semanales
│   │   ├── income/       # Registro de ingresos
│   │   ├── marketplace/  # Listings + aplicaciones
│   │   ├── playbooks/    # Progreso de playbooks
│   │   ├── social/       # Sync/publish Instagram
│   │   └── stripe/       # Checkout, portal, webhook
│   ├── dashboard/        # Panel principal
│   ├── login/            # Autenticación
│   ├── register/         # Registro de usuario
│   └── [otras páginas]/
├── components/
│   ├── layout/           # DashboardLayout, Sidebar
│   ├── ui/               # Card, Badge, UpgradeGate, etc.
│   └── social/           # InstagramConnect
├── lib/
│   ├── auth.ts           # NextAuth config + requireAuth/getAuth
│   ├── session.ts        # getSessionUser() / getApiSession()
│   ├── prisma.ts         # Prisma client singleton
│   ├── plans.ts          # Definición de planes Free/Creator/Pro
│   └── email.ts          # Resend + plantillas HTML
└── middleware.ts          # Protección de rutas con NextAuth
```

### Autenticación

- **Server pages**: `getSessionUser()` desde `@/lib/session` — redirige a `/login` si no hay sesión
- **API routes**: `getApiSession()` desde `@/lib/session` — retorna `null` si no hay sesión (la ruta devuelve 401)
- **Client components**: `useSession()` de `next-auth/react`

### Planes

| Plan | Precio | Límite IA | Funciones |
|---|---|---|---|
| Free | $0 | 10/mes | Dashboard básico |
| Creator | $19/mes | 100/mes | Marketplace, reportes email |
| Pro | $49/mes | Ilimitado | Todo + publicar listings |

---

## Flujo de pago (Stripe)

1. Usuario hace clic en "Upgrade" → `/api/stripe/checkout` crea sesión de Stripe
2. Usuario paga en Stripe Checkout
3. Stripe llama a `/api/stripe/webhook`
4. El webhook actualiza `User.plan` + crea/actualiza registro `Subscription`
5. El usuario ve su nuevo plan reflejado en la UI inmediatamente

---

## Modelos principales (Prisma)

- `User` — cuenta, plan, uso de IA
- `Subscription` — suscripción de Stripe
- `Goal` — metas de crecimiento
- `Campaign` — campañas de contenido
- `Income` — registro de ingresos
- `BrandDeal` — CRM de brand deals
- `ContentPost` — calendario de contenido
- `SocialAccount` — cuentas de Instagram conectadas
- `SocialSnapshot` — métricas diarias por plataforma
- `InstagramMedia` — posts sincronizados de Instagram
- `Competitor` — tracker de competidores
- `MarketplaceListing` — oportunidades de marcas
- `MarketplaceApplication` — aplicaciones de creadores
- `PlaybookProgress` — progreso en playbooks
- `AiUsage` — historial de generaciones IA
