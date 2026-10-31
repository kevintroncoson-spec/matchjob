'use client'

import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { initials, timeAgo } from '@/lib/utils'

async function fetchCandidates() {
  const res = await fetch('/api/admin?resource=candidates')
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export default function AdminCandidatos() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-candidates'], queryFn: fetchCandidates })
  const candidates = data?.candidates ?? []

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>Candidatos</h1>
        <p className="text-sm text-brand-500 mt-1">Listado de candidatos registrados ({candidates.length})</p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && candidates.length === 0 && (
        <div className="text-center py-16 text-brand-400">
          <Users className="mx-auto mb-3 opacity-40" size={40} />
          <p>No hay candidatos registrados todavía</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {candidates.map((c: any) => (
          <div key={c.id} className="bg-white rounded-2xl border border-brand-100 p-4 flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0"
              style={{ fontFamily: 'Syne, sans-serif' }}>
              {initials(c.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-brand-900 truncate">{c.name}</h3>
              <p className="text-xs text-brand-500">{c.role ?? 'Sin rol'} · {c.location ?? 'Chile'}</p>
              {c.skills && c.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.skills.slice(0, 4).map((s: string) => (
                    <span key={s} className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-brand-400 mt-2">Registrado {timeAgo(c.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
