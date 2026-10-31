'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Building2, Briefcase, Users, Heart, Clock, TrendingUp } from 'lucide-react'

async function fetchStats() {
  const res = await fetch('/api/admin?resource=stats')
  if (!res.ok) throw new Error('Error cargando métricas')
  return res.json()
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: fetchStats })
  const stats = data?.stats ?? {}

  const cards = [
    { label: 'Candidatos', value: stats.total_candidates, icon: Users, color: 'bg-brand-700', sub: `+${stats.new_candidates_last_week ?? 0} esta semana` },
    { label: 'Empresas', value: stats.total_companies, icon: Building2, color: 'bg-green-600', sub: `${stats.approved_companies ?? 0} aprobadas` },
    { label: 'Ofertas activas', value: stats.active_jobs, icon: Briefcase, color: 'bg-amber-500', sub: 'publicadas' },
    { label: 'Postulaciones', value: stats.total_applications, icon: Heart, color: 'bg-red-500', sub: `+${stats.applications_last_week ?? 0} esta semana` },
  ]

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>
          Panel de control
        </h1>
        <p className="text-sm text-brand-500 mt-1">Resumen general de MatchJob</p>
      </header>

      {/* Alerta de empresas pendientes */}
      {stats.pending_companies > 0 && (
        <Link
          href="/admin/empresas?status=pending"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 hover:bg-amber-100 transition-colors"
        >
          <Clock className="text-amber-600" size={20} />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">
              {stats.pending_companies} empresa{stats.pending_companies > 1 ? 's' : ''} esperando aprobación
            </p>
            <p className="text-xs text-amber-700">Revisa y aprueba para que puedan publicar ofertas →</p>
          </div>
        </Link>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-brand-100 p-5">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="text-white" size={18} />
              </div>
              <div className="text-3xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>
                {isLoading ? '—' : (card.value ?? 0)}
              </div>
              <div className="text-sm text-brand-600 mt-0.5">{card.label}</div>
              <div className="text-xs text-brand-400 mt-1">{card.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/admin/empresas" className="bg-white rounded-2xl border border-brand-100 p-5 hover:border-brand-300 transition-colors">
          <Building2 className="text-brand-700 mb-2" size={22} />
          <h3 className="font-semibold text-brand-900">Gestionar empresas</h3>
          <p className="text-xs text-brand-500 mt-1">Aprobar, rechazar o suspender empresas</p>
        </Link>
        <Link href="/admin/ofertas" className="bg-white rounded-2xl border border-brand-100 p-5 hover:border-brand-300 transition-colors">
          <Briefcase className="text-brand-700 mb-2" size={22} />
          <h3 className="font-semibold text-brand-900">Moderar ofertas</h3>
          <p className="text-xs text-brand-500 mt-1">Ver y desactivar ofertas publicadas</p>
        </Link>
        <Link href="/admin/candidatos" className="bg-white rounded-2xl border border-brand-100 p-5 hover:border-brand-300 transition-colors">
          <Users className="text-brand-700 mb-2" size={22} />
          <h3 className="font-semibold text-brand-900">Ver candidatos</h3>
          <p className="text-xs text-brand-500 mt-1">Listado de candidatos registrados</p>
        </Link>
      </div>
    </div>
  )
}
