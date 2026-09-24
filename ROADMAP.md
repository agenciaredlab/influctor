# Influctor — Roadmap de trabajo

Backlog vivo para el equipo de agentes (`influctor-lead-builder` + builders + verificadores, ver
`C:\Users\medin\.claude\agents\influctor-*.md`). Generado por una re-auditoría real del código
actual (2026-09-22, commit `225c1e1`), no por notas viejas — reemplaza cualquier auditoría
anterior como fuente de verdad.

**Convención de estado:** `pendiente` → `en progreso` → `hecho` (con fecha) o `bloqueado` (con
razón). `influctor-lead-builder` es quien actualiza este archivo en cada ciclo.

**Regla de prioridad:** 🔴 crítico primero (seguridad/fuga de ingresos/datos), después 🟡
importante (funcionalidad real rota o a medio construir), después 🟢 menor/cosmético.

---

## 🔴 Crítico

- [x] **Competitor Research sin límite de plan ni tracking de uso de IA** — **hecho (2026-09-24)**
  `src/app/api/competitors/research/route.ts` — a diferencia de `ai/generate`, `ab-test` y
  `repurpose`, esta ruta llamaba a Anthropic directo con solo un rate-limit de 5 req/min, sin
  chequear `lib/plans.ts` ni registrar en `AiUsage`. Fix en commit `4969281`: gate de
  `aiGenerationsPerMonth` antes de Anthropic + registro en `AiUsage`/`aiUsageThisMonth`, 6 tests
  nuevos, tsc limpio. `influctor-code-auditor` lo aprobó sin críticos.
  **Nota de arquitectura del ciclo de verificación (2026-09-23/24):** el guardián original
  intentaba `docker build` LOCAL en la PC de pruebas — eso nunca funciona ahí (Avast intercepta
  TLS dentro de cualquier contenedor, reproducido con un `apk update` de Alpine vacío, sin
  Influctor de por medio; ni ERP ni Redchat compilan Docker local tampoco). Corregido: el build
  corre en GitHub Actions (`workflow_dispatch` sobre `claude/auto-work`, con el job `deploy`
  guardado por rama — commits `a747428`/`a18bce4`) y la PC local solo hace `docker pull` de la
  imagen ya construida + `docker compose up` (nunca `build`) vía `docker-compose.verify.yml`
  (nuevo, no confundir con `docker-compose.yml` real). Verificado de punta a punta: build en
  Actions exitoso con `deploy` salteado, imagen bajada y levantada limpia, límite probado en las
  dos direcciones reales (usuario al límite → `429 limitReached:true`; usuario con cupo → pasa el
  gate). Promovido a producción.
  Hallazgos menores del auditor (preexistentes, idénticos en `ab-test` y `ai/generate`, no bloquean): si
  el `User` no existe en BD con JWT válido se saltan gate y tracking; el gate no contempla
  `aiUsageResetAt` de un mes anterior (bloquea hasta que corre `cron/ai-reset`); carrera gate/incremento
  acotada por el rate-limit.

- [ ] **Reporte semanal no se envía si Resend/SMTP se configuró solo desde `/admin/settings`**
  `src/app/api/cron/weekly-report/route.ts:24` y `src/app/api/email/weekly-report/route.ts:143`
  chequean `process.env.RESEND_API_KEY` directo y devuelven 503 si no está seteado en el entorno
  — mientras que `lib/email.ts`'s `sendMail()` real ya es DB-first (soporta Resend Y SMTP vía
  `lib/config.ts`). Resultado: el cron nunca manda el reporte semanal si el admin siguió el
  camino "correcto" documentado (cargar la clave desde el panel, no en `.env.local`). Estado:
  **pendiente**.

## 🟡 Importante

- [ ] **3 rutas de IA leen credenciales directo de `process.env` en vez de `lib/config.ts`**
  `src/app/api/ab-test/route.ts:34`, `src/app/api/competitors/research/route.ts:10-11,46`,
  `src/app/api/repurpose/route.ts:96` — usan `process.env.ANTHROPIC_API_KEY`/Instagram directo en
  vez de `getAnthropicKey()`/`getInstagramAppId()`/`getInstagramAppSecret()`. Si el admin solo
  configuró la key vía el panel (sin `.env.local`), estas 3 features rompen con "API key no
  configurada" mientras `ai/generate` (que sí usa el sistema DB-first) sigue andando —
  inconsistente y confuso. Estado: **pendiente**.

- [ ] **Cliente Anthropic muerto a nivel de módulo en `src/lib/anthropic.ts`**
  Exporta un cliente creado una sola vez al boot con `process.env.ANTHROPIC_API_KEY` (nunca puede
  recoger una key seteada después vía DB sin reiniciar el proceso). Hoy no lo usa nadie (cada ruta
  crea su propio cliente inline), pero es una trampa para la próxima feature que lo importe.
  Eliminarlo o dejarlo explícitamente marcado como no-usar. Estado: **pendiente**.

- [ ] **YouTube y LinkedIn en `/settings` son tarjetas "Próximamente" sin nada atrás**
  `src/app/settings/page.tsx:61-76` — sin ruta, sin OAuth, sin soporte real más allá del campo
  genérico `platform` de `SocialAccount`. Decidir: ¿se construyen de verdad, o se sacan de la
  pantalla de conexiones hasta que se prioricen? (decisión de producto, no solo código — si hace
  falta la opinión de Camilo, marcar bloqueado con esa nota en vez de decidir solo). Estado:
  **pendiente**.

- [ ] **Campo muerto `priceId` en `lib/plans.ts`**
  `src/lib/plans.ts:40,77` definen `priceId: process.env.STRIPE_PRICE_CREATOR/PRO`, pero ni
  `stripe/checkout` ni `stripe/webhook` lo usan — ambos llaman correctamente a
  `getStripePriceCreator()`/`getStripePricePro()` de `lib/config.ts`. Confirmado por grep: `.priceId`
  no se referencia en ningún otro lado. Quitarlo evita que alguien asuma que cambiarlo afecta el
  checkout real. Estado: **pendiente**.

- [ ] **Modelo de Team/Organización no existe — Pro promete "5 miembros de equipo" sin nada atrás**
  `prisma/schema.prisma` no tiene ningún concepto de equipo/organización/membresía.
  `src/lib/plans.ts:98` lista `'Hasta 5 miembros de equipo'` como feature de Pro, vaporware total
  hoy. Esto es una brecha de arquitectura real, no un fix rápido — requiere diseño de producto
  antes de que un builder toque código (¿qué puede ver/hacer un miembro invitado? ¿comparte plan y
  límites con el dueño? ¿tiene su propio login?). Estado: **bloqueado — necesita decisión de
  producto de Camilo antes de implementar**.

- [ ] **12 archivos de test fallando en la suite completa (68/590 tests)**
  Detectado 2026-09-23 al correr `npx vitest run` sobre `claude/auto-work` (estos archivos tienen el
  mismo código que la rama default, así que las fallas ya existían): `auth/register`, `content`,
  `cron/publish-scheduled`, `cron/sync-instagram`, `cron/sync-tiktok`, `cron/weekly-report`, `deals`,
  `email/weekly-report`, `social/instagram/publish` (espera 200/422, recibe 500), `stripe/webhook`,
  `lib/email`, `lib/storage`. Hay que distinguir regresión real de mocks desactualizados (probablemente
  por la migración DB-first a `lib/config.ts`). Contradice la nota de "Ya verificado" que solo cubría
  tsc/build, no vitest. Estado: **pendiente**.

## 🟢 Menor / cosmético

- [ ] Revisar archivos de test duplicados de TikTok sync: `src/app/api/social/tiktok/__tests__/sync.test.ts`
  vs `src/app/api/social/tiktok/sync/__tests__/route.test.ts` — probable resto de un refactor,
  confirmar si uno quedó obsoleto. Estado: **pendiente**.
- [ ] Quitar export muerto `FROM_EMAIL` de `src/lib/email.ts:5` (sin referencias fuera del archivo).
  Estado: **pendiente**.
- [ ] Nota (no accionable todavía): `src/lib/rate-limit.ts` cae a limitar en memoria si no hay
  `REDIS_URL` — los límites dejan de ser globales si algún día el deploy pasa a múltiples
  instancias. Solo documentar, no requiere acción mientras el deploy sea de una sola instancia.

---

## Ya verificado y resuelto (no re-abrir sin evidencia nueva)

Confirmado real en el código actual (2026-09-22), no solo por mensaje de commit:
- Los 6 hallazgos críticos de la auditoría de 2026-07-18 (límites de plan, cron auto-publish,
  IDOR en publish, Stripe webhook sin bypass, cron secret deny-by-default en las 6 rutas,
  Outreach Tracker con modelo/API/UI real) siguen corregidos y funcionando.
- `lib/storage.ts` ya es 100% DB-first (contradice la nota vieja de la auditoría de julio que
  decía que no lo era) — usa `lib/config.ts` para S3/MinIO, no `.env.local`.
- `npx tsc --noEmit` y `npm run build` pasan limpios sobre el código actual.

## Backlog de features (referencia, no priorizado todavía)

La auditoría de julio dejó 57 ideas de features nuevas catalogadas en un artifact
(`https://claude.ai/code/artifact/9c98b1fb-9713-48be-968f-009315ef5e2b`, snapshot en
`C:\Users\medin\AppData\Local\Temp\claude\...\influctor_production_audit.html` — esa ruta es de
una sesión vieja y puede no existir más). No están re-validadas contra el código actual. Una vez
que los ítems 🔴/🟡 de arriba estén resueltos, vale la pena revisar ese artifact (o pedirle a
Camilo una lista fresca) antes de empezar a construir features nuevas desde ahí.
