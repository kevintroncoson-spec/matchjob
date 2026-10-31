'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Building2, Briefcase, Users, LogOut } from 'lucide-react'
import { supabase, signOut } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { href: '/admin/ofertas', label: 'Ofertas', icon: Briefcase },
  { href: '/admin/candidatos', label: 'Candidatos', icon: Users },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  // Verificar que sea admin
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase
        .from('profiles').select('type').eq('user_id', user.id).single()
      if (profile?.type === 'admin') {
        setAuthorized(true)
      } else {
        router.push('/')
      }
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-brand-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-900 text-white flex flex-col fixed h-screen">
        <div className="px-6 py-6 border-b border-white/10">
          <h1 className="font-bold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>MatchJob</h1>
          <p className="text-xs text-white/50 mt-0.5">Panel Administrador</p>
        </div>

        <nav className="flex-1 py-4">
          {NAV.map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors',
                  active ? 'bg-white/10 text-white border-r-2 border-brand-400' : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={async () => { await signOut(); router.push('/') }}
          className="flex items-center gap-3 px-6 py-4 text-sm text-white/60 hover:text-white border-t border-white/10"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>

      {/* Contenido */}
      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  )
}
