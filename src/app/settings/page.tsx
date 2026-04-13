import DashboardLayout from '@/components/layout/DashboardLayout'
import { Settings, User, Bell, Key, Shield } from 'lucide-react'
import Card from '@/components/ui/Card'

export default function SettingsPage() {
  return (
    <DashboardLayout
      title="Configuración"
      description="Personaliza tu experiencia en Influctor"
    >
      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <User size={18} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Perfil</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-2xl font-bold text-white">
                A
              </div>
              <div>
                <h4 className="font-semibold text-white">Alex Creator</h4>
                <p className="text-sm text-gray-400">demo@influctor.app</p>
              </div>
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
            <div className="p-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e35]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-violet-600/20 flex items-center justify-center">
                    <span className="text-xs text-violet-400 font-bold">A</span>
                  </div>
                  <span className="text-sm font-medium text-white">Anthropic Claude API</span>
                </div>
                <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Requerida para AI Studio</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Necesitas una API key de Anthropic para usar las funciones de IA. Configúrala en el archivo <code className="text-violet-400">.env.local</code>
              </p>
              <div className="flex items-center gap-2 bg-[#0a0a14] rounded px-3 py-2 border border-[#1a1a2e]">
                <code className="text-xs text-gray-500 flex-1">ANTHROPIC_API_KEY=sk-ant-...</code>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Obtén tu API key en <span className="text-violet-400">console.anthropic.com</span>
              </p>
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
            <p>Versión: <span className="text-white">0.1.0</span></p>
            <p>Stack: <span className="text-white">Next.js 14 · TypeScript · Tailwind · Prisma · Claude AI</span></p>
            <p>Base de datos: <span className="text-white">SQLite (local)</span></p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
