import DashboardLayout from '@/components/layout/DashboardLayout'
import { Settings, User, Key, Shield, Link2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import InstagramConnect from '@/components/social/InstagramConnect'
import TikTokConnect from '@/components/social/TikTokConnect'
import { getSessionUser } from '@/lib/session'

export default async function SettingsPage() {
  let userName = ''
  let userEmail = ''
  let userInitial = 'U'

  try {
    const user = await getSessionUser()
    if (user) {
      userName = user.name ?? ''
      userEmail = user.email
      userInitial = (user.name ?? user.email).charAt(0).toUpperCase()
    }
  } catch {}

  return (
    <DashboardLayout
      title="Configuración"
      description="Personaliza tu experiencia y conecta tus redes sociales"
    >
      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <User size={18} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Perfil</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-2xl font-bold text-white">
              {userInitial}
            </div>
            <div>
              {userName && <h4 className="font-semibold text-white">{userName}</h4>}
              <p className="text-sm text-gray-400">{userEmail}</p>
            </div>
          </div>
        </Card>

        {/* Connected Social Accounts */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <Link2 size={18} className="text-pink-400" />
            <h3 className="text-sm font-semibold text-white">Cuentas de Redes Sociales</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Conecta tus cuentas para ver métricas reales, sincronizar datos y desbloquear todo el potencial de Influctor.
          </p>
          <div className="space-y-4">
            {/* Instagram */}
            <InstagramConnect />

            {/* TikTok */}
            <TikTokConnect />

            {/* YouTube — Coming Soon */}
            <div className="flex items-center gap-3 p-4 bg-[#0f0f1a] border border-[#1e1e35] rounded-xl opacity-60">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center text-xl">▶️</div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm">YouTube</div>
                <div className="text-xs text-gray-500">Próximamente</div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-gray-700 text-gray-400">Próximo</span>
            </div>

            {/* LinkedIn — Coming Soon */}
            <div className="flex items-center gap-3 p-4 bg-[#0f0f1a] border border-[#1e1e35] rounded-xl opacity-60">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-xl">💼</div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm">LinkedIn</div>
                <div className="text-xs text-gray-500">Próximamente</div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-gray-700 text-gray-400">Próximo</span>
            </div>
          </div>
        </Card>

        {/* API Keys */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <Key size={18} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Integraciones & API Keys</h3>
          </div>
          <div className="space-y-4">
            {/* Claude API */}
            <div className="p-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e35]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-violet-600/20 flex items-center justify-center">
                    <span className="text-xs text-violet-400 font-bold">A</span>
                  </div>
                  <span className="text-sm font-medium text-white">Anthropic Claude API</span>
                </div>
                <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">AI Studio</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Agrega tu API key en <code className="text-violet-400">.env.local</code> para usar todas las funciones de IA.
              </p>
              <div className="flex items-center gap-2 bg-[#0a0a14] rounded px-3 py-2 border border-[#1a1a2e]">
                <code className="text-xs text-gray-500 flex-1">ANTHROPIC_API_KEY=sk-ant-...</code>
              </div>
              <p className="text-xs text-gray-600 mt-2">Obtén tu key en <span className="text-violet-400">console.anthropic.com</span></p>
            </div>

            {/* Meta App */}
            <div className="p-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e35]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center">
                    <span className="text-xs text-blue-400 font-bold">f</span>
                  </div>
                  <span className="text-sm font-medium text-white">Meta (Instagram) App</span>
                </div>
                <span className="text-xs text-pink-400 bg-pink-400/10 px-2 py-0.5 rounded-full">Conexión IG</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Necesario para conectar cuentas de Instagram. Crea tu app en{' '}
                <span className="text-blue-400">developers.facebook.com</span>
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 bg-[#0a0a14] rounded px-3 py-2 border border-[#1a1a2e]">
                  <code className="text-xs text-gray-500 flex-1">INSTAGRAM_APP_ID=123456789</code>
                </div>
                <div className="flex items-center gap-2 bg-[#0a0a14] rounded px-3 py-2 border border-[#1a1a2e]">
                  <code className="text-xs text-gray-500 flex-1">INSTAGRAM_APP_SECRET=abc123...</code>
                </div>
              </div>
              <div className="mt-3 p-2.5 bg-violet-900/10 border border-violet-500/20 rounded-lg">
                <p className="text-[10px] text-violet-300 font-medium mb-1">Setup rápido:</p>
                <ol className="text-[10px] text-gray-400 space-y-0.5 list-decimal list-inside">
                  <li>Crea app en developers.facebook.com (tipo: Business)</li>
                  <li>Agrega producto: Instagram Graph API</li>
                  <li>En Instagram {'>'} Configuración: Redirect URI = http://localhost:3000/api/auth/instagram/callback</li>
                  <li>Copia App ID y App Secret a .env.local</li>
                  <li>Reinicia el servidor</li>
                </ol>
              </div>
            </div>

            {/* TikTok App */}
            <div className="p-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e35]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#EE1D52]/20 flex items-center justify-center text-xs">🎵</div>
                  <span className="text-sm font-medium text-white">TikTok Developer App</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#EE1D5215', color: '#EE1D52' }}>Conexión TikTok</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Crea tu app en{' '}
                <span className="text-[#69C9D0]">developers.tiktok.com</span>
                {' '}→ Login Kit → Add products
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 bg-[#0a0a14] rounded px-3 py-2 border border-[#1a1a2e]">
                  <code className="text-xs text-gray-500 flex-1">TIKTOK_CLIENT_KEY=awxxxxxx</code>
                </div>
                <div className="flex items-center gap-2 bg-[#0a0a14] rounded px-3 py-2 border border-[#1a1a2e]">
                  <code className="text-xs text-gray-500 flex-1">TIKTOK_CLIENT_SECRET=xxxxxxxx</code>
                </div>
              </div>
              <div className="mt-3 p-2.5 bg-[#EE1D52]/5 border border-[#EE1D52]/20 rounded-lg">
                <p className="text-[10px] text-[#EE1D52] font-medium mb-1">Redirect URI a configurar:</p>
                <code className="text-[10px] text-gray-400">{'{APP_URL}'}/api/auth/tiktok/callback</code>
                <p className="text-[10px] text-gray-500 mt-1">Scopes necesarios: user.info.basic · user.info.stats · video.list</p>
              </div>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <Shield size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Acerca de Influctor</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-400">
            <p>Versión: <span className="text-white">0.2.0</span></p>
            <p>Stack: <span className="text-white">Next.js 14 · TypeScript · Tailwind · Prisma · Claude AI</span></p>
            <p>Base de datos: <span className="text-white">SQLite (local)</span></p>
            <p>Integraciones: <span className="text-white">Instagram Graph API (v21.0)</span></p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
