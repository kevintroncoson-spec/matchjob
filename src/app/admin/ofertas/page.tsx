'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Briefcase } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

async function fetchJobs() {
  const res = await fetch('/api/admin?resource=jobs')
  if (!res.ok) throw new Error('Error')
  return res.json()
}

async function toggleJob(target_id: string, active: boolean) {
  const res = await fetch('/api/admin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle_job', target_id, active }),
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export default function AdminOfertas() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-jobs'], queryFn: fetchJobs })
  const jobs = data?.jobs ?? []

  const mutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleJob(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-jobs'] }),
  })

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>Ofertas</h1>
        <p className="text-sm text-brand-500 mt-1">Modera las ofertas publicadas en la plataforma</p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className="text-center py-16 text-brand-400">
          <Briefcase className="mx-auto mb-3 opacity-40" size={40} />
          <p>No hay ofertas publicadas todavía</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
        {jobs.map((j: any, i: number) => (
          <div key={j.id} className={cn('flex items-center gap-4 p-4', i > 0 && 'border-t border-brand-50')}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-brand-900 truncate">{j.title}</h3>
                {!j.active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactiva</span>}
              </div>
              <p className="text-sm text-brand-500">
                {j.company?.name} · {j.location} · {j.type}
              </p>
              <p className="text-xs text-brand-400 mt-0.5">
                {j.views ?? 0} vistas · publicada {timeAgo(j.created_at)}
              </p>
            </div>

            <button
              onClick={() => mutation.mutate({ id: j.id, active: !j.active })}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium',
                j.active
                  ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              {j.active ? <><EyeOff size={15} /> Desactivar</> : <><Eye size={15} /> Activar</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
