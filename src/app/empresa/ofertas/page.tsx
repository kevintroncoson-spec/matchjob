'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Eye, EyeOff, Briefcase } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

async function fetchJobs() {
  const res = await fetch('/api/empresa?resource=jobs')
  if (!res.ok) throw new Error('Error')
  return res.json()
}

async function toggleJob(job_id: string, active: boolean) {
  const res = await fetch('/api/empresa', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle_job', job_id, active }),
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export default function EmpresaOfertas() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['empresa-jobs'], queryFn: fetchJobs })
  const jobs = data?.jobs ?? []

  const mutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleJob(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresa-jobs'] }),
  })

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>Mis ofertas</h1>
          <p className="text-sm text-brand-500 mt-1">Gestiona tus ofertas publicadas</p>
        </div>
        <Link href="/empresa/ofertas/nueva" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva oferta
        </Link>
      </header>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-brand-100">
          <Briefcase className="mx-auto mb-3 text-brand-200" size={40} />
          <p className="text-brand-500 mb-4">Aún no has publicado ofertas</p>
          <Link href="/empresa/ofertas/nueva" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Publicar primera oferta
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((j: any) => (
          <div key={j.id} className="bg-white rounded-2xl border border-brand-100 p-5 flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-brand-900">{j.title}</h3>
                {j.active
                  ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-lg">Activa</span>
                  : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">Inactiva</span>}
              </div>
              <p className="text-sm text-brand-500 mb-2">{j.location} · {j.type}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(j.tags ?? []).slice(0, 5).map((t: string) => (
                  <span key={t} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>
              <p className="text-xs text-brand-400">{j.views ?? 0} vistas · publicada {timeAgo(j.created_at)}</p>
            </div>

            <button
              onClick={() => mutation.mutate({ id: j.id, active: !j.active })}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium',
                j.active ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-green-600 text-white hover:bg-green-700')}>
              {j.active ? <><EyeOff size={15} /> Pausar</> : <><Eye size={15} /> Activar</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
