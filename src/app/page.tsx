import Link from 'next/link'
import { Target, BarChart3, Megaphone, Sparkles, ArrowRight, TrendingUp, Users, DollarSign } from 'lucide-react'
import Logo from '@/components/Logo'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#07070f] flex flex-col">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative px-8 py-5 flex items-center justify-between border-b border-[#1a1a2e]/60">
        <Logo size="md" showTagline={false} />
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Ir al Dashboard <ArrowRight size={14} />
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
          <Sparkles size={14} />
          Plataforma de Crecimiento con IA
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white max-w-3xl leading-tight mb-6">
          Crece en redes sociales{' '}
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            de forma inteligente
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-xl mb-10 leading-relaxed">
          Gestiona tus metas, campañas e ingresos. Mide tu progreso real y crea contenido con IA. Todo en un solo lugar.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl text-lg transition-all shadow-lg shadow-violet-900/40 hover:shadow-violet-900/60"
        >
          Empezar ahora gratis
          <ArrowRight size={18} />
        </Link>

        <p className="text-sm text-gray-600 mt-4">Demo disponible · Sin tarjeta de crédito</p>

        {/* Stats row */}
        <div className="flex items-center gap-8 mt-16 text-center">
          {[
            { icon: Users, value: '150K+', label: 'Creadores activos' },
            { icon: TrendingUp, value: '340%', label: 'Crecimiento promedio' },
            { icon: DollarSign, value: '$2.4M', label: 'Ingresos gestionados' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <stat.icon size={20} className="text-violet-400 mb-1" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div className="relative max-w-5xl mx-auto px-8 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Target,
            color: 'text-violet-400',
            bg: 'bg-violet-400/10',
            title: 'Metas Inteligentes',
            desc: 'Establece y trackea objetivos SMART con evaluación automática de tu progreso.',
          },
          {
            icon: Megaphone,
            color: 'text-pink-400',
            bg: 'bg-pink-400/10',
            title: 'Gestión de Campañas',
            desc: 'Maneja múltiples campañas en todas las plataformas con métricas en tiempo real.',
          },
          {
            icon: BarChart3,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            title: 'Analytics & Ingresos',
            desc: 'Mide el impacto real de tu trabajo y controla todas tus fuentes de ingresos.',
          },
          {
            icon: Sparkles,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            title: 'AI Studio',
            desc: 'Genera captions, hashtags, ideas de contenido y estrategias con inteligencia artificial.',
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="p-5 rounded-xl border border-[#1e1e35] bg-[#0f0f1a] hover:border-[#2a2a4a] transition-all"
          >
            <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-3`}>
              <feature.icon size={20} className={feature.color} />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1.5">{feature.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
