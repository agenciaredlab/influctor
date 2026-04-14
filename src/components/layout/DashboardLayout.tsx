import Sidebar from './Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
  actions?: React.ReactNode
}

export default function DashboardLayout({ children, title, description, actions }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#07070f]">
      <Sidebar />
      <main className="pl-56">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-[#07070f]/90 backdrop-blur-md border-b border-[#1a1a2e] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </header>

        {/* Page content */}
        <div className="p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
