'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Briefcase, Heart, Eye, Star, Plus } from 'lucide-react'

async function fetchJobs() {
  const res = await fetch('/api/empresa?resource=jobs')
  if (!res.ok) throw new Error('Error')
  return res.json()
}

async function fetchCandidates() {
  const res = await fetch('/api/empresa?resource=candidates')
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export default function EmpresaDashboard() {
  const { data: jobsData } = useQuery({ queryKey: ['empresa-jobs'], queryFn: fetchJobs })
  const { data: candData } = useQuery({ queryKey: ['empresa-candidates'], queryFn: fetchCandidates })

  const jobs = jobsData?.jobs ?? []
  const stats = candData?.stats ?? {}
  const activeJobs = jobs.filter((j: any) => j.active).length

  const cards = [
    { label: 'Ofertas activas', value: activeJobs, icon: Briefcase, color: 'bg-brand-700' },
    { label: 'Postulaciones', value: stats.total ?? 0, icon: Heart, color: 'bg-red-500' },
    { label: 'Por revisar', value: stats.new ?? 0, icon: Eye, color: 'bg-amber-500' },
    { label: 'Guardados', value: stats.saved ?? 0, icon: Star, color: 'bg-green-600' },
  ]

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>Panel</h1>
          <p className="text-sm text-brand-500 mt-1">Resumen de tu actividad en MatchJob</p>
        </div>
        <Link href="/empresa/ofertas/nueva" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva oferta
        </Link>
      </header>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-brand-100 p-5">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="text-white" size={18} />
              </div>
              <div className="text-3xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>{card.value}</div>
              <div className="text-sm text-brand-600 mt-0.5">{card.label}</div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-brand-900">Tus ofertas recientes</h2>
          <Link href="/empresa/ofertas" className="text-sm text-brand-700 hover:underline">Ver todas →</Link>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-10">
            <Briefcase className="mx-auto mb-3 text-brand-200" size={36} />
            <p className="text-sm text-brand-500 mb-4">Aún no has publicado ofertas</p>
            <Link href="/empresa/ofertas/nueva" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Publicar primera oferta
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.slice(0, 5).map((j: any) => (
              <div key={j.id} className="flex items-center gap-3 py-3 border-t border-brand-50 first:border-0">
                <div className="flex-1">
                  <p className="font-medium text-brand-900 text-sm">{j.title}</p>
                  <p className="text-xs text-brand-400">{j.location} · {j.type} · {j.views ?? 0} vistas</p>
                </div>
                {j.active
                  ? <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">Activa</span>
                  : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Inactiva</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
