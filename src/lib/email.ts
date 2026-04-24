import { Resend } from 'resend'
import { getResendKey, getAppUrl } from '@/lib/config'

export const FROM_EMAIL = process.env.EMAIL_FROM ?? 'Influctor <onboarding@resend.dev>'

// Legacy singleton (used by existing send functions that read env directly)
export const resend = new Resend(process.env.RESEND_API_KEY)

// Config-aware helpers for new send functions
async function makeResend() {
  const key = await getResendKey()
  return new Resend(key ?? '')
}
async function appUrl() {
  return (await getAppUrl()) ?? 'http://localhost:3000'
}

// ─── Data types ───────────────────────────────────────────────────────────────

export interface WeeklyReportData {
  userName: string
  userEmail: string
  weekLabel: string
  summary: {
    followersGained: number
    followersChange: number
    reach: number
    reachChange: number
    engagementRate: number
    engChange: number
    income: number
    incomeChange: number
  }
  topContent: Array<{ title: string; views: number; likes: number; platform: string }>
  goalsProgress: Array<{ title: string; progress: number; current: number; target: number }>
  recommendations: string[]
  goalsNextWeek: string[]
  aiUsage: number
  aiLimit: number
}

// ─── HTML Template ────────────────────────────────────────────────────────────

function arrow(change: number) {
  return change >= 0 ? '↑' : '↓'
}

function changeColor(change: number) {
  return change >= 0 ? '#34d399' : '#f87171'
}

function progressBar(pct: number) {
  const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#7c3aed' : '#f59e0b'
  return `
    <div style="background:#1a1a2e;border-radius:4px;height:6px;overflow:hidden;margin:4px 0 2px">
      <div style="background:${color};height:6px;width:${Math.min(pct, 100)}%;border-radius:4px"></div>
    </div>`
}

export function buildWeeklyReportHtml(d: WeeklyReportData): string {
  const s = d.summary

  const kpiCards = [
    { label: 'Nuevos seguidores', value: `+${s.followersGained.toLocaleString()}`, change: s.followersChange, icon: '📈' },
    { label: 'Alcance total', value: `${(s.reach / 1000).toFixed(1)}K`, change: s.reachChange, icon: '👁️' },
    { label: 'Engagement', value: `${s.engagementRate}%`, change: s.engChange, icon: '⚡' },
    { label: 'Ingresos', value: `$${s.income.toLocaleString()}`, change: s.incomeChange, icon: '💰' },
  ]

  const kpiHtml = kpiCards.map(k => `
    <td style="width:25%;padding:0 6px">
      <div style="background:#13131f;border:1px solid #1a1a2e;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:22px;margin-bottom:6px">${k.icon}</div>
        <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:2px">${k.value}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${k.label}</div>
        <div style="font-size:12px;font-weight:600;color:${changeColor(k.change)}">${arrow(k.change)} ${Math.abs(k.change)}%</div>
      </div>
    </td>`).join('')

  const topContentHtml = d.topContent.map((c, i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a2e">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:28px">
              <div style="width:24px;height:24px;border-radius:50%;background:${i === 0 ? '#92400e' : '#1a1a2e'};color:${i === 0 ? '#fbbf24' : '#6b7280'};font-size:11px;font-weight:700;text-align:center;line-height:24px">#${i + 1}</div>
            </td>
            <td style="padding-left:10px">
              <div style="font-size:13px;color:#e5e7eb;font-weight:500">${c.title}</div>
              <div style="font-size:11px;color:#6b7280">${c.platform}</div>
            </td>
            <td style="text-align:right;white-space:nowrap">
              <div style="font-size:13px;font-weight:700;color:#ffffff">${(c.views / 1000).toFixed(1)}K</div>
              <div style="font-size:11px;color:#6b7280">❤️ ${c.likes.toLocaleString()}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')

  const goalsHtml = d.goalsProgress.map(g => `
    <div style="margin-bottom:14px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#d1d5db;font-weight:500">${g.title}</td>
          <td style="font-size:12px;font-weight:700;color:#ffffff;text-align:right">${g.progress}%</td>
        </tr>
      </table>
      ${progressBar(g.progress)}
      <div style="font-size:10px;color:#6b7280">${g.current.toLocaleString()} / ${g.target.toLocaleString()}</div>
    </div>`).join('')

  const recsHtml = d.recommendations.map(r => `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:#0d0d1a;border-radius:8px;margin-bottom:8px">
      <span style="color:#34d399;font-size:13px;flex-shrink:0">✓</span>
      <span style="font-size:12px;color:#d1d5db">${r}</span>
    </div>`).join('')

  const nextWeekHtml = d.goalsNextWeek.map(g => `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0">
      <div style="width:14px;height:14px;border-radius:50%;border:2px solid #5b21b6;flex-shrink:0;margin-top:1px"></div>
      <span style="font-size:12px;color:#9ca3af">${g}</span>
    </div>`).join('')

  const aiPct = d.aiLimit > 0 ? Math.round((d.aiUsage / d.aiLimit) * 100) : 0

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Reporte Semanal · Influctor</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f">
    <tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e1b4b,#0f0f1e);border-radius:16px 16px 0 0;padding:28px 32px;border:1px solid #1a1a2e;border-bottom:none">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="display:inline-flex;align-items:center;gap:8px">
                  <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#6d28d9);text-align:center;line-height:28px;font-size:13px">⚡</div>
                  <span style="font-size:16px;font-weight:700;color:#ffffff">influctor</span>
                </div>
                <div style="margin-top:16px">
                  <div style="font-size:22px;font-weight:700;color:#ffffff;margin-bottom:4px">Tu Reporte Semanal</div>
                  <div style="font-size:13px;color:#8b5cf6">${d.weekLabel}</div>
                </div>
              </td>
              <td style="text-align:right;vertical-align:top">
                <div style="font-size:12px;color:#6b7280">Hola, ${d.userName} 👋</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- KPIs -->
        <tr><td style="background:#0d0d1a;padding:24px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Resumen de la semana</div>
          <table width="100%" cellpadding="0" cellspacing="0"><tr style="margin:0 -6px">${kpiCards.length > 0 ? kpiHtml : ''}</tr></table>
        </td></tr>

        <!-- Top Content + Goals -->
        <tr><td style="background:#09090f;padding:0 32px 24px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr valign="top">
              <!-- Top content -->
              <td style="width:55%;padding-right:16px;padding-top:24px">
                <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">📊 Mejor contenido</div>
                <table width="100%" cellpadding="0" cellspacing="0">${topContentHtml}</table>
              </td>
              <!-- Goals -->
              <td style="width:45%;padding-left:16px;padding-top:24px;border-left:1px solid #1a1a2e">
                <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">🎯 Progreso de metas</div>
                ${goalsHtml}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Insights -->
        <tr><td style="background:#0d0d1a;padding:24px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">✨ Insights de la semana</div>
          ${recsHtml}
        </td></tr>

        <!-- Next week goals -->
        <tr><td style="background:#09090f;padding:24px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">📅 Objetivos próxima semana</div>
          ${nextWeekHtml}
        </td></tr>

        <!-- AI Usage -->
        <tr><td style="background:linear-gradient(135deg,#1e1b4b20,#09090f);padding:20px 32px;border:1px solid #1a1a2e;border-top:none;border-radius:0 0 16px 16px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:12px;color:#8b5cf6;font-weight:600;margin-bottom:4px">⚡ Uso de IA esta semana</div>
                <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${d.aiUsage} generaciones usadas${d.aiLimit > 0 ? ` de ${d.aiLimit}` : ''}</div>
                ${d.aiLimit > 0 ? `<div style="background:#1a1a2e;border-radius:4px;height:4px;overflow:hidden"><div style="background:#7c3aed;height:4px;width:${aiPct}%;border-radius:4px"></div></div>` : ''}
              </td>
              <td style="text-align:right">
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reports"
                   style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:12px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none">
                  Ver reporte completo →
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center">
          <div style="font-size:11px;color:#374151">
            © ${new Date().getFullYear()} Influctor · Social Growth Platform<br>
            <span style="color:#4b5563">Recibiste este email porque tienes activados los reportes semanales.</span>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Deal stage notification ─────────────────────────────────────────────────

export interface DealStageData {
  userName:  string
  userEmail: string
  brand:     string
  oldStage:  string
  newStage:  string
  value:     number
  currency:  string
}

const STAGE_LABEL: Record<string, string> = {
  outreach:    'Outreach',
  negotiation: 'Negociación',
  contract:    'Contrato',
  active:      'Activo',
  delivered:   'Entregado',
  completed:   'Completado',
  declined:    'Rechazado',
}

const STAGE_COLOR: Record<string, string> = {
  outreach:    '#6b7280',
  negotiation: '#f59e0b',
  contract:    '#3b82f6',
  active:      '#7c3aed',
  delivered:   '#06b6d4',
  completed:   '#10b981',
  declined:    '#ef4444',
}

export function buildDealStageHtml(d: DealStageData): string {
  const newColor  = STAGE_COLOR[d.newStage]  ?? '#7c3aed'
  const newLabel  = STAGE_LABEL[d.newStage]  ?? d.newStage
  const oldLabel  = STAGE_LABEL[d.oldStage]  ?? d.oldStage
  const isWon     = d.newStage === 'completed'
  const isLost    = d.newStage === 'declined'
  const emoji     = isWon ? '🎉' : isLost ? '😔' : '📬'
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Deal actualizado · Influctor</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f">
    <tr><td align="center" style="padding:32px 16px">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#1e1b4b,#0f0f1e);border-radius:16px 16px 0 0;padding:28px 32px;border:1px solid #1a1a2e;border-bottom:none">
          <div style="font-size:28px;margin-bottom:8px">${emoji}</div>
          <div style="font-size:20px;font-weight:700;color:#ffffff">Deal actualizado</div>
          <div style="font-size:13px;color:#8b5cf6;margin-top:4px">Hola ${d.userName}, hay novedades en tu pipeline</div>
        </td></tr>
        <tr><td style="background:#0d0d1a;padding:28px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="font-size:18px;font-weight:700;color:#ffffff;margin-bottom:6px">${d.brand}</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:20px">Valor: <span style="color:#ffffff;font-weight:600">${d.currency} ${d.value.toLocaleString()}</span></div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;background:#13131f;border:1px solid #1a1a2e;border-radius:10px;padding:14px">
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Antes</div>
                <div style="font-size:14px;font-weight:600;color:#9ca3af">${oldLabel}</div>
              </td>
              <td style="text-align:center;width:40px;color:#4b5563;font-size:20px">→</td>
              <td style="text-align:center;background:#13131f;border:2px solid ${newColor};border-radius:10px;padding:14px">
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Ahora</div>
                <div style="font-size:14px;font-weight:700;color:${newColor}">${newLabel}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#09090f;padding:20px 32px;border:1px solid #1a1a2e;border-top:none;border-radius:0 0 16px 16px;text-align:center">
          <a href="${appUrl}/deals" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:13px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none">Ver pipeline →</a>
        </td></tr>
        <tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#374151">© ${new Date().getFullYear()} Influctor</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendDealStageNotification(data: DealStageData) {
  if (!process.env.RESEND_API_KEY) return
  const label = STAGE_LABEL[data.newStage] ?? data.newStage
  return resend.emails.send({
    from: FROM_EMAIL,
    to:   data.userEmail,
    subject: `📬 Deal con ${data.brand} avanzó a ${label}`,
    html: buildDealStageHtml(data),
  })
}

// ─── Goal achieved notification ───────────────────────────────────────────────

export interface GoalAchievedData {
  userName:    string
  userEmail:   string
  goalTitle:   string
  targetValue: number
  unit:        string
  category:    string
}

export function buildGoalAchievedHtml(d: GoalAchievedData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Meta alcanzada · Influctor</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f">
    <tr><td align="center" style="padding:32px 16px">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#064e3b,#0f0f1e);border-radius:16px 16px 0 0;padding:28px 32px;border:1px solid #1a1a2e;border-bottom:none">
          <div style="font-size:36px;margin-bottom:8px">🎯</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff">¡Meta alcanzada!</div>
          <div style="font-size:13px;color:#34d399;margin-top:4px">Felicitaciones, ${d.userName} — lo lograste</div>
        </td></tr>
        <tr><td style="background:#0d0d1a;padding:28px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e;text-align:center">
          <div style="font-size:16px;font-weight:600;color:#ffffff;margin-bottom:6px">${d.goalTitle}</div>
          <div style="font-size:28px;font-weight:800;color:#34d399;margin:12px 0">${d.targetValue.toLocaleString()} ${d.unit}</div>
          <div style="background:#064e3b;border:1px solid #059669;border-radius:8px;padding:10px 16px;display:inline-block;margin-top:6px">
            <span style="font-size:12px;font-weight:700;color:#34d399">✓ 100% completado</span>
          </div>
        </td></tr>
        <tr><td style="background:#09090f;padding:20px 32px;border:1px solid #1a1a2e;border-top:none;border-radius:0 0 16px 16px;text-align:center">
          <a href="${appUrl}/goals" style="display:inline-block;background:#059669;color:#ffffff;font-size:13px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none">Ver mis metas →</a>
        </td></tr>
        <tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#374151">© ${new Date().getFullYear()} Influctor</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendGoalAchievedNotification(data: GoalAchievedData) {
  if (!process.env.RESEND_API_KEY) return
  return resend.emails.send({
    from: FROM_EMAIL,
    to:   data.userEmail,
    subject: `🎯 ¡Meta alcanzada! ${data.goalTitle}`,
    html: buildGoalAchievedHtml(data),
  })
}

// ─── AI limit warning ─────────────────────────────────────────────────────────

export interface AiLimitWarningData {
  userName:  string
  userEmail: string
  used:      number
  limit:     number
  planName:  string
}

export function buildAiLimitWarningHtml(d: AiLimitWarningData): string {
  const pct     = Math.round((d.used / d.limit) * 100)
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Límite de IA · Influctor</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f">
    <tr><td align="center" style="padding:32px 16px">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#451a03,#0f0f1e);border-radius:16px 16px 0 0;padding:28px 32px;border:1px solid #1a1a2e;border-bottom:none">
          <div style="font-size:28px;margin-bottom:8px">⚡</div>
          <div style="font-size:20px;font-weight:700;color:#ffffff">Estás al ${pct}% de tu límite de IA</div>
          <div style="font-size:13px;color:#f59e0b;margin-top:4px">Hola ${d.userName} · Plan ${d.planName} · ${d.used} de ${d.limit} generaciones usadas</div>
        </td></tr>
        <tr><td style="background:#0d0d1a;padding:28px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="background:#1a1a2e;border-radius:6px;height:8px;overflow:hidden;margin-bottom:8px">
            <div style="background:linear-gradient(90deg,#f59e0b,#ef4444);height:8px;width:${pct}%;border-radius:6px"></div>
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:20px">${d.limit - d.used} generaciones restantes este mes</div>
          <div style="font-size:13px;color:#d1d5db;line-height:1.6">
            Cuando alcances el límite no podrás usar las funciones de IA hasta el próximo mes,
            o puedes actualizar tu plan para continuar sin interrupciones.
          </div>
        </td></tr>
        <tr><td style="background:#09090f;padding:20px 32px;border:1px solid #1a1a2e;border-top:none;border-radius:0 0 16px 16px;text-align:center">
          <a href="${appUrl}/pricing" style="display:inline-block;background:#d97706;color:#ffffff;font-size:13px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none">Ver planes →</a>
        </td></tr>
        <tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#374151">© ${new Date().getFullYear()} Influctor</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendAiLimitWarning(data: AiLimitWarningData) {
  if (!process.env.RESEND_API_KEY) return
  return resend.emails.send({
    from: FROM_EMAIL,
    to:   data.userEmail,
    subject: `⚡ Estás al ${Math.round((data.used / data.limit) * 100)}% de tu límite de IA en Influctor`,
    html: buildAiLimitWarningHtml(data),
  })
}

// ─── Publish failed notification ─────────────────────────────────────────────

export interface PublishFailedData {
  userName:    string
  userEmail:   string
  postTitle:   string
  platform:    string
  scheduledAt: Date
  attempts:    number
  lastError:   string
}

export function buildPublishFailedHtml(d: PublishFailedData): string {
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const dateStr  = d.scheduledAt.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr  = d.scheduledAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Error al publicar · Influctor</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f">
    <tr><td align="center" style="padding:32px 16px">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#450a0a,#0f0f1e);border-radius:16px 16px 0 0;padding:28px 32px;border:1px solid #1a1a2e;border-bottom:none">
          <div style="font-size:28px;margin-bottom:8px">⚠️</div>
          <div style="font-size:20px;font-weight:700;color:#ffffff">No se pudo publicar tu post</div>
          <div style="font-size:13px;color:#f87171;margin-top:4px">Hola ${d.userName} — fallaron los ${d.attempts} intentos automáticos</div>
        </td></tr>
        <tr><td style="background:#0d0d1a;padding:28px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="font-size:15px;font-weight:600;color:#ffffff;margin-bottom:4px">${d.postTitle}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:20px">Programado para ${dateStr} a las ${timeStr} · ${d.platform}</div>
          <div style="background:#1a0a0a;border:1px solid #7f1d1d;border-radius:8px;padding:12px 14px;margin-bottom:16px">
            <div style="font-size:10px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Último error</div>
            <div style="font-size:12px;color:#fca5a5;font-family:monospace;word-break:break-all">${d.lastError}</div>
          </div>
          <div style="font-size:13px;color:#9ca3af;line-height:1.6">
            Puedes revisar el post en tu calendario de contenido y volver a intentarlo manualmente,
            o corregir el problema (token expirado, URL inválida, etc.) antes de reprogramarlo.
          </div>
        </td></tr>
        <tr><td style="background:#09090f;padding:20px 32px;border:1px solid #1a1a2e;border-top:none;border-radius:0 0 16px 16px;text-align:center">
          <a href="${appUrl}/calendar" style="display:inline-block;background:#dc2626;color:#ffffff;font-size:13px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none">Ver calendario →</a>
        </td></tr>
        <tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#374151">© ${new Date().getFullYear()} Influctor</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendPublishFailedNotification(data: PublishFailedData) {
  if (!process.env.RESEND_API_KEY) return
  return resend.emails.send({
    from: FROM_EMAIL,
    to:   data.userEmail,
    subject: `⚠️ No se pudo publicar: ${data.postTitle}`,
    html: buildPublishFailedHtml(data),
  })
}

// ─── Send function ─────────────────────────────────────────────────────────────

export async function sendWeeklyReport(data: WeeklyReportData) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurada')
  }

  const html = buildWeeklyReportHtml(data)

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.userEmail,
    subject: `📊 Tu reporte semanal · ${data.weekLabel}`,
    html,
  })
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export interface WelcomeData {
  userName:  string
  userEmail: string
  trialDays: number
}

export function buildWelcomeHtml(d: WelcomeData, baseUrl: string): string {
  const trialEnd = new Date(Date.now() + d.trialDays * 86400_000)
  const trialEndStr = trialEnd.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Bienvenido a Influctor</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f">
    <tr><td align="center" style="padding:32px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#2e1065,#1e1b4b,#0f0f1e);border-radius:16px 16px 0 0;padding:36px 32px;border:1px solid #1a1a2e;border-bottom:none;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:20px">
            <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#6d28d9);text-align:center;line-height:32px;font-size:16px">⚡</div>
            <span style="font-size:18px;font-weight:700;color:#ffffff">influctor</span>
          </div>
          <div style="font-size:32px;margin-bottom:12px">🎉</div>
          <div style="font-size:24px;font-weight:700;color:#ffffff;margin-bottom:8px">¡Bienvenido, ${d.userName}!</div>
          <div style="font-size:14px;color:#a78bfa">Tu cuenta ya está lista para crecer</div>
        </td></tr>

        <!-- Trial banner -->
        <tr><td style="background:linear-gradient(90deg,#4c1d95,#5b21b6);padding:14px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e;text-align:center">
          <div style="font-size:13px;font-weight:600;color:#ffffff">
            🚀 Tienes <strong>${d.trialDays} días gratis</strong> del plan Creator — hasta el ${trialEndStr}
          </div>
        </td></tr>

        <!-- Features -->
        <tr><td style="background:#0d0d1a;padding:28px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">Qué puedes hacer ahora</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['📊', 'Dashboard de métricas', 'Conecta tu Instagram y ve tus estadísticas en tiempo real'],
              ['🤖', 'IA para contenido', '200 generaciones al mes para scripts, captions y hashtags'],
              ['💼', 'Brand Deals CRM', 'Gestiona todas tus colaboraciones con marcas en un lugar'],
              ['📅', 'Calendario de contenido', 'Programa y publica directamente en Instagram'],
            ].map(([icon, title, desc]) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #1a1a2e;vertical-align:top">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:36px;vertical-align:top;padding-top:2px">
                      <div style="width:28px;height:28px;border-radius:8px;background:#1a1a2e;text-align:center;line-height:28px;font-size:14px">${icon}</div>
                    </td>
                    <td style="padding-left:12px">
                      <div style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:2px">${title}</div>
                      <div style="font-size:12px;color:#6b7280">${desc}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`).join('')}
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="background:#09090f;padding:28px 32px;border:1px solid #1a1a2e;border-top:none;border-radius:0 0 16px 16px;text-align:center">
          <a href="${baseUrl}/dashboard"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px">
            Ir al dashboard →
          </a>
          <div style="margin-top:16px;font-size:12px;color:#4b5563">
            ¿Dudas? Responde este email y te ayudamos.
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center">
          <div style="font-size:11px;color:#374151">
            © ${new Date().getFullYear()} Influctor · Social Growth Platform
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendWelcomeEmail(data: WelcomeData) {
  const client = await makeResend()
  const base   = await appUrl()
  return client.emails.send({
    from:    FROM_EMAIL,
    to:      data.userEmail,
    subject: `¡Bienvenido a Influctor, ${data.userName}! 🚀`,
    html:    buildWelcomeHtml(data, base),
  })
}

// ─── Trial ending email ───────────────────────────────────────────────────────

export interface TrialEndingData {
  userName:    string
  userEmail:   string
  daysLeft:    number
  trialEndDate: Date
}

export function buildTrialEndingHtml(d: TrialEndingData, baseUrl: string): string {
  const dateStr = d.trialEndDate.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  const urgentColor = d.daysLeft <= 1 ? '#ef4444' : d.daysLeft <= 3 ? '#f59e0b' : '#8b5cf6'
  const emoji = d.daysLeft <= 1 ? '🔴' : d.daysLeft <= 3 ? '🟡' : '⏰'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Tu trial termina pronto · Influctor</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f">
    <tr><td align="center" style="padding:32px 16px">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e1b4b,#0f0f1e);border-radius:16px 16px 0 0;padding:32px 32px 24px;border:1px solid #1a1a2e;border-bottom:none;text-align:center">
          <div style="font-size:36px;margin-bottom:12px">${emoji}</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff;margin-bottom:6px">
            Tu trial termina en ${d.daysLeft} día${d.daysLeft !== 1 ? 's' : ''}
          </div>
          <div style="font-size:13px;color:#9ca3af">Hola ${d.userName} — el ${dateStr} vuelves al plan Free</div>
        </td></tr>

        <!-- Countdown -->
        <tr><td style="background:${urgentColor}18;padding:20px 32px;border-left:1px solid ${urgentColor}30;border-right:1px solid ${urgentColor}30;text-align:center">
          <div style="display:inline-block;background:${urgentColor}22;border:1px solid ${urgentColor}44;border-radius:12px;padding:12px 28px">
            <div style="font-size:36px;font-weight:800;color:${urgentColor};line-height:1">${d.daysLeft}</div>
            <div style="font-size:11px;color:${urgentColor};font-weight:600;text-transform:uppercase;letter-spacing:1px">día${d.daysLeft !== 1 ? 's' : ''} restante${d.daysLeft !== 1 ? 's' : ''}</div>
          </div>
        </td></tr>

        <!-- What you lose -->
        <tr><td style="background:#0d0d1a;padding:24px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Qué perderás al terminar el trial</div>
          ${[
            'Publicación directa en Instagram',
            '195 generaciones de IA restantes del mes',
            'Reportes semanales automáticos',
            'Brand Deals CRM ilimitado',
            'Contract Builder',
          ].map(f => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #13131f">
            <div style="width:16px;height:16px;border-radius:50%;background:#ef444420;border:1px solid #ef4444;flex-shrink:0;text-align:center;line-height:16px;font-size:9px;color:#ef4444">✕</div>
            <span style="font-size:13px;color:#d1d5db">${f}</span>
          </div>`).join('')}
        </td></tr>

        <!-- Pricing -->
        <tr><td style="background:#09090f;padding:24px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="background:linear-gradient(135deg,#1e1b4b,#13131f);border:1px solid #3b1d8a;border-radius:12px;padding:20px 24px;text-align:center">
            <div style="font-size:11px;font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Plan Creator</div>
            <div style="font-size:32px;font-weight:800;color:#ffffff;margin-bottom:4px">$19<span style="font-size:14px;font-weight:400;color:#6b7280">/mes</span></div>
            <div style="font-size:12px;color:#9ca3af;margin-bottom:16px">Todo lo que tienes ahora, para siempre</div>
            <a href="${baseUrl}/pricing"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:9px;text-decoration:none">
              Mantener acceso →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border:1px solid #1a1a2e;border-top:none;border-radius:0 0 16px 16px;background:#09090f;text-align:center">
          <div style="font-size:12px;color:#4b5563">
            Si no quieres continuar, no hagas nada — volverás al plan Free automáticamente.
          </div>
        </td></tr>
        <tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#374151">
          © ${new Date().getFullYear()} Influctor
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendTrialEndingEmail(data: TrialEndingData) {
  const client = await makeResend()
  const base   = await appUrl()
  const subject = data.daysLeft <= 1
    ? `🔴 Tu trial de Influctor termina mañana`
    : `⏰ Tu trial de Influctor termina en ${data.daysLeft} días`
  return client.emails.send({
    from:    FROM_EMAIL,
    to:      data.userEmail,
    subject,
    html:    buildTrialEndingHtml(data, base),
  })
}

// ─── Marketplace deal selected ────────────────────────────────────────────────

export interface DealSelectedData {
  creatorName:  string
  creatorEmail: string
  brandName:    string
  listingTitle: string
  agreedRate:   number
  currency:     string
  listingId:    string
}

export function buildDealSelectedHtml(d: DealSelectedData, baseUrl: string): string {
  const formatted = new Intl.NumberFormat('es', { style: 'currency', currency: d.currency, maximumFractionDigits: 0 }).format(d.agreedRate)

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>¡Fuiste seleccionado! · Influctor</title></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f">
    <tr><td align="center" style="padding:32px 16px">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">

        <tr><td style="background:linear-gradient(135deg,#064e3b,#0f0f1e);border-radius:16px 16px 0 0;padding:32px;border:1px solid #1a1a2e;border-bottom:none;text-align:center">
          <div style="font-size:40px;margin-bottom:12px">🎉</div>
          <div style="font-size:24px;font-weight:700;color:#ffffff;margin-bottom:6px">¡Fuiste seleccionado!</div>
          <div style="font-size:13px;color:#34d399">Hola ${d.creatorName} — una marca quiere trabajar contigo</div>
        </td></tr>

        <tr><td style="background:#0d0d1a;padding:28px 32px;border-left:1px solid #1a1a2e;border-right:1px solid #1a1a2e">
          <div style="background:#064e3b22;border:1px solid #059669;border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:20px">
            <div style="font-size:12px;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${d.brandName}</div>
            <div style="font-size:16px;font-weight:600;color:#ffffff;margin-bottom:12px">${d.listingTitle}</div>
            <div style="font-size:36px;font-weight:800;color:#34d399">${formatted}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px">Tarifa acordada · Pago confirmado</div>
          </div>
          <div style="font-size:13px;color:#d1d5db;line-height:1.7">
            La marca ha completado el pago a través de Influctor. Nuestro equipo procesará
            el pago a tu cuenta en los próximos días hábiles. Puedes ver los detalles de
            este deal en tu dashboard.
          </div>
        </td></tr>

        <tr><td style="background:#09090f;padding:20px 32px;border:1px solid #1a1a2e;border-top:none;border-radius:0 0 16px 16px;text-align:center">
          <a href="${baseUrl}/marketplace"
             style="display:inline-block;background:#059669;color:#ffffff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:9px;text-decoration:none">
            Ver mis deals →
          </a>
        </td></tr>
        <tr><td style="padding:16px 0;text-align:center;font-size:11px;color:#374151">© ${new Date().getFullYear()} Influctor</td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendDealSelectedEmail(data: DealSelectedData) {
  const client = await makeResend()
  const base   = await appUrl()
  return client.emails.send({
    from:    FROM_EMAIL,
    to:      data.creatorEmail,
    subject: `🎉 ¡${data.brandName} te seleccionó! Pago confirmado en Influctor`,
    html:    buildDealSelectedHtml(data, base),
  })
}
