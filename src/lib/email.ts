import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = process.env.EMAIL_FROM ?? 'Influctor <onboarding@resend.dev>'

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
                <div style="font-size:11px;color:#6b7280">${d.aiUsage} generaciones usadas${d.aiLimit > 0 ? ` de ${d.aiLimit}` : ''}</div>
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
