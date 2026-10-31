'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Briefcase, Users, Plus, LogOut, Clock, Ban } from 'lucide-react'
import { supabase, signOut } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/empresa', label: 'Panel', icon: LayoutDashboard },
  { href: '/empresa/ofertas', label: 'Mis ofertas', icon: Briefcase },
  { href: '/empresa/candidatos', label: 'Candidatos', icon: Users },
]

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<'loading' | 'ok' | 'no-company' | 'pending' | 'rejected' | 'suspended'>('loading')
  const [companyName, setCompanyName] = useState('')

  // El registro es página aparte, no requiere ser empresa aún
  const isRegistro = pathname === '/empresa/registro'

  useEffect(() => {
    if (isRegistro) { setState('ok'); return }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase
        .from('profiles').select('type, status, name').eq('user_id', user.id).single()

      if (!profile || profile.type !== 'company') { setState('no-company'); return }
      setCompanyName(profile.name)
      if (profile.status === 'approved') setState('ok')
      else if (profile.status === 'pending') setState('pending')
      else if (profile.status === 'rejected') setState('rejected')
      else if (profile.status === 'suspended') setState('suspended')
    })
  }, [router, isRegistro, pathname])

  if (isRegistro) return <>{children}</>

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
      </div>
    )
  }

  // No es empresa → invitar a registrarse
  if (state === 'no-company') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
        <div className="bg-white rounded-2xl border border-brand-100 p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-700 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="text-white" size={26} />
          </div>
          <h1 className="text-xl font-bold text-brand-900 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            Portal de Empresas
          </h1>
          <p className="text-sm text-brand-500 mb-6">
            Registra tu empresa para publicar ofertas y encontrar talento con un ❤️
          </p>
          <Link href="/empresa/registro" className="btn-primary inline-block">
            Registrar mi empresa →
          </Link>
        </div>
      </div>
    )
  }

  // Estados de bloqueo (pending / rejected / suspended)
  if (state === 'pending' || state === 'rejected' || state === 'suspended') {
    const config = {
      pending:   { icon: Clock, color: 'bg-amber-500', title: 'Empresa en revisión', msg: 'Tu registro está siendo revisado por nuestro equipo. Te avisaremos por correo cuando sea aprobado. Este proceso suele tomar menos de 24 horas.' },
      rejected:  { icon: Ban, color: 'bg-red-500', title: 'Registro rechazado', msg: 'Tu registro no fue aprobado. Si crees que es un error, contáctanos a soporte@MatchJob.cl' },
      suspended: { icon: Ban, color: 'bg-gray-500', title: 'Cuenta suspendida', msg: 'Tu cuenta ha sido suspendida temporalmente. Contáctanos a soporte@MatchJob.cl para más información.' },
    }[state]
    const Icon = config.icon
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
        <div className="bg-white rounded-2xl border border-brand-100 p-8 max-w-md text-center">
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4', config.color)}>
            <Icon className="text-white" size={26} />
          </div>
          <h1 className="text-xl font-bold text-brand-900 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            {config.title}
          </h1>
          <p className="text-sm text-brand-500 mb-6">{config.msg}</p>
          <button onClick={async () => { await signOut(); router.push('/') }} className="btn-outline">
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // Aprobada → dashboard normal
  return (
    <div className="min-h-screen bg-brand-50 flex">
      <aside className="w-60 bg-brand-900 text-white flex flex-col fixed h-screen">
        <div className="px-6 py-6 border-b border-white/10">
          <h1 className="font-bold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>MatchJob</h1>
          <p className="text-xs text-white/50 mt-0.5 truncate">{companyName}</p>
        </div>

        <div className="px-4 py-4">
          <Link href="/empresa/ofertas/nueva" className="flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
            <Plus size={16} /> Nueva oferta
          </Link>
        </div>

        <nav className="flex-1">
          {NAV.map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors',
                  active ? 'bg-white/10 text-white border-r-2 border-brand-400' : 'text-white/60 hover:text-white hover:bg-white/5')}>
                <Icon size={18} /> {item.label}
              </Link>
            )
          })}
        </nav>

        <button onClick={async () => { await signOut(); router.push('/') }}
          className="flex items-center gap-3 px-6 py-4 text-sm text-white/60 hover:text-white border-t border-white/10">
          <LogOut size={18} /> Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 ml-60 p-8">{children}</main>
    </div>
  )
}
