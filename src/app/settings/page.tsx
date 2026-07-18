import DashboardLayout from '@/components/layout/DashboardLayout'
import { User, Shield, Link2 } from 'lucide-react'
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

        {/* About */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <Shield size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Acerca de Influctor</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-400">
            <p>Versión: <span className="text-white">0.2.0</span></p>
            <p>Stack: <span className="text-white">Next.js 14 · TypeScript · Tailwind · Prisma · Claude AI</span></p>
            <p>Base de datos: <span className="text-white">PostgreSQL</span></p>
            <p>Integraciones: <span className="text-white">Instagram Graph API (v21.0)</span></p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
