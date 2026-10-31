'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Ban, Globe, Mail, Phone, Building2 } from 'lucide-react'
import { cn, initials } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'suspended', label: 'Suspendidas' },
  { value: 'all', label: 'Todas' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:  { label: 'Aprobada',   cls: 'bg-green-50 text-green-700 border-green-200' },
  rejected:  { label: 'Rechazada',  cls: 'bg-red-50 text-red-700 border-red-200' },
  suspended: { label: 'Suspendida', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

async function fetchCompanies(status: string) {
  const res = await fetch(`/api/admin?resource=companies&status=${status}`)
  if (!res.ok) throw new Error('Error')
  return res.json()
}

async function companyAction(action: string, target_id: string, reason?: string) {
  const res = await fetch('/api/admin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, target_id, reason }),
  })
  if (!res.ok) throw new Error('Error en la acción')
  return res.json()
}

export default function AdminEmpresas() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('pending')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', filter],
    queryFn: () => fetchCompanies(filter),
  })
  const companies = data?.companies ?? []

  const mutation = useMutation({
    mutationFn: ({ action, id, reason }: { action: string; id: string; reason?: string }) =>
      companyAction(action, id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>
          Empresas
        </h1>
        <p className="text-sm text-brand-500 mt-1">Aprueba o gestiona las empresas de la plataforma</p>
      </header>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              filter === f.value ? 'bg-brand-700 text-white' : 'bg-white text-brand-600 border border-brand-100'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && companies.length === 0 && (
        <div className="text-center py-16 text-brand-400">
          <Building2 className="mx-auto mb-3 opacity-40" size={40} />
          <p>No hay empresas en esta categoría</p>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {companies.map((c: any) => {
          const badge = STATUS_BADGE[c.status] || STATUS_BADGE.pending
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-brand-100 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 font-bold flex-shrink-0"
                  style={{ fontFamily: 'Syne, sans-serif' }}>
                  {initials(c.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-brand-900">{c.name}</h3>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg border', badge.cls)}>
                      {badge.label}
                    </span>
                  </div>

                  {c.company_industry && (
                    <p className="text-sm text-brand-500 mb-2">{c.company_industry} · {c.company_size ?? '—'} empleados</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-brand-500">
                    {c.company_rut && <span>RUT: {c.company_rut}</span>}
                    {c.contact_email && <span className="flex items-center gap-1"><Mail size={12} /> {c.contact_email}</span>}
                    {c.contact_phone && <span className="flex items-center gap-1"><Phone size={12} /> {c.contact_phone}</span>}
                    {c.company_website && (
                      <a href={c.company_website} target="_blank" rel="noopener" className="flex items-center gap-1 text-brand-700 hover:underline">
                        <Globe size={12} /> Sitio web
                      </a>
                    )}
                  </div>

                  {c.rejection_reason && (
                    <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-2">
                      Motivo: {c.rejection_reason}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {c.status === 'pending' && (
                    <>
                      <button
                        onClick={() => mutation.mutate({ action: 'approve_company', id: c.id })}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700"
                      >
                        <Check size={15} /> Aprobar
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Motivo del rechazo (opcional):')
                          mutation.mutate({ action: 'reject_company', id: c.id, reason: reason ?? undefined })
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50"
                      >
                        <X size={15} /> Rechazar
                      </button>
                    </>
                  )}
                  {c.status === 'approved' && (
                    <button
                      onClick={() => {
                        const reason = prompt('Motivo de la suspensión:')
                        if (reason !== null) mutation.mutate({ action: 'suspend_company', id: c.id, reason })
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50"
                    >
                      <Ban size={15} /> Suspender
                    </button>
                  )}
                  {(c.status === 'rejected' || c.status === 'suspended') && (
                    <button
                      onClick={() => mutation.mutate({ action: 'approve_company', id: c.id })}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700"
                    >
                      <Check size={15} /> Reactivar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
