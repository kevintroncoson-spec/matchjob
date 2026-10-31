'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Star, X, Mail, Phone, ChevronDown, ChevronUp, Users, Briefcase } from 'lucide-react'
import { cn, initials } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'viewed', label: 'Vistos' },
  { value: 'saved', label: 'Guardados' },
  { value: 'rejected', label: 'Descartados' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new:      { label: 'Nuevo',      cls: 'bg-brand-50 text-brand-800' },
  viewed:   { label: 'Visto',      cls: 'bg-green-50 text-green-800' },
  saved:    { label: 'Guardado',   cls: 'bg-amber-50 text-amber-800' },
  rejected: { label: 'Descartado', cls: 'bg-red-50 text-red-800' },
}

async function fetchCandidates(status: string) {
  const res = await fetch(`/api/empresa?resource=candidates&status=${status}`)
  if (!res.ok) throw new Error('Error')
  return res.json()
}

async function updateCandidate(application_id: string, status: string) {
  const res = await fetch('/api/empresa', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_candidate', application_id, status }),
  })
  if (!res.ok) throw new Error('Error')
  return res.json()
}

export default function EmpresaCandidatos() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['empresa-candidates', filter],
    queryFn: () => fetchCandidates(filter),
  })
  const candidates = data?.candidates ?? []
  const stats = data?.stats ?? {}

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateCandidate(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresa-candidates'] }),
  })

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>Candidatos</h1>
        <p className="text-sm text-brand-500 mt-1">Postulantes a tus ofertas ({stats.total ?? 0})</p>
      </header>

      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              filter === f.value ? 'bg-brand-700 text-white' : 'bg-white text-brand-600 border border-brand-100')}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && candidates.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-brand-100">
          <Users className="mx-auto mb-3 text-brand-200" size={40} />
          <p className="text-brand-500">No hay candidatos en esta categoría</p>
        </div>
      )}

      <div className="space-y-3">
        {candidates.map((app: any) => {
          const c = app.candidate
          const badge = STATUS_BADGE[app.status] || STATUS_BADGE.new
          const isOpen = expanded === app.id
          return (
            <div key={app.id} className="bg-white rounded-2xl border border-brand-100 p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0"
                  style={{ fontFamily: 'Syne, sans-serif' }}>
                  {initials(c.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-brand-900">{c.name}</h3>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', badge.cls)}>{badge.label}</span>
                    {app.status === 'new' && <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-lg">❤️ Postuló</span>}
                  </div>
                  <p className="text-sm text-brand-500">{c.role} · {c.location}</p>
                  <p className="text-xs text-brand-400 mb-2">Postuló a: {app.job?.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.skills ?? []).slice(0, 5).map((s: string) => (
                      <span key={s} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded: contacto + experiencia (solo porque postuló) */}
              {isOpen && (
                <div className="mt-4 pt-4 border-t border-brand-50 space-y-4">
                  {/* Datos de contacto */}
                  <div className="bg-brand-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-brand-800 uppercase tracking-wide mb-2">📋 Datos de contacto</p>
                    <div className="space-y-1.5">
                      {c.contact_email || c.email ? (
                        <div className="flex items-center gap-2 text-sm text-brand-800">
                          <Mail size={14} /> {c.contact_email || c.email}
                        </div>
                      ) : null}
                      {c.phone && (
                        <div className="flex items-center gap-2 text-sm text-brand-800">
                          <Phone size={14} /> {c.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preferencias del onboarding */}
                  <div className="text-sm text-brand-600 space-y-1">
                    <p className="font-semibold text-brand-900">Preferencias</p>
                    {c.salary_min && <p>💰 Renta: ${c.salary_min.toLocaleString()} – ${(c.salary_max || c.salary_min).toLocaleString()}</p>}
                    {c.modality && <p>🏢 Modalidad: {c.modality}</p>}
                    {c.availability_days != null && <p>📅 Disponible: {c.availability_days === 0 ? 'Inmediato' : `en ${c.availability_days} días`}</p>}
                  </div>

                  {/* Experiencia laboral */}
                  {(c.work_experience ?? []).length > 0 && (
                    <div>
                      <p className="font-semibold text-brand-900 text-sm mb-2">Experiencia laboral</p>
                      <div className="space-y-2">
                        {c.work_experience.map((e: any) => (
                          <div key={e.id} className="flex gap-3 items-start">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                              <Briefcase size={13} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-brand-900">{e.role}</p>
                              <p className="text-xs text-brand-500">{e.company_name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => mutation.mutate({ id: app.id, status: 'viewed' })}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-800 border border-green-200">
                    <Check size={12} /> Visto
                  </button>
                  <button onClick={() => mutation.mutate({ id: app.id, status: 'saved' })}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    <Star size={12} /> Guardar
                  </button>
                  <button onClick={() => mutation.mutate({ id: app.id, status: 'rejected' })}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200">
                    <X size={12} /> Descartar
                  </button>
                </div>
                <button onClick={() => setExpanded(isOpen ? null : app.id)}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 border border-brand-100 px-3 py-1.5 rounded-lg">
                  {isOpen ? <><ChevronUp size={12} /> Ocultar</> : <><ChevronDown size={12} /> Ver perfil</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
