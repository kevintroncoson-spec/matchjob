'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CandidateCard } from '@/components/dashboard/CandidateCard'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useRealtimeApplications } from '@/hooks/useRealtime'
import type { Application, Profile } from '@/types'

type DashTab = 'candidates' | 'alerts' | 'stats'
const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'viewed', label: 'Vistos' },
  { value: 'saved', label: 'Guardados' },
  { value: 'rejected', label: 'Descartados' },
]

async function fetchDashboard(status: string) {
  const res = await fetch(`/api/dashboard?status=${status}`)
  if (!res.ok) throw new Error('Error cargando dashboard')
  return res.json()
}

async function updateStatus(appId: string, status: string) {
  const res = await fetch('/api/dashboard', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_id: appId, status }),
  })
  if (!res.ok) throw new Error('Error actualizando estado')
  return res.json()
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast, show: showToast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<DashTab>('candidates')
  const [statusFilter, setStatusFilter] = useState('all')
  const [reminders, setReminders] = useState<Set<string>>(new Set())
  const [newCount, setNewCount] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', statusFilter],
    queryFn: () => fetchDashboard(statusFilter),
  })

  const applications: Application[] = data?.applications ?? []
  const stats = data?.stats ?? {}

  // Actualizar estado de candidato
  const mutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) => updateStatus(appId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })

  // Realtime: nuevas postulaciones
  const jobIds = [...new Set(applications.map(a => a.job_id))]
  useRealtimeApplications(jobIds, useCallback((app) => {
    setNewCount(n => n + 1)
    showToast('¡Nueva postulación recibida! ❤️', '🔔')
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }, [showToast, queryClient]))

  function handleContact(candidate: Profile) {
    showToast(`Abriendo email para ${candidate.name}...`, '✉️')
    // En producción: abrir modal de contacto o mailto
    window.open(`mailto:?subject=MatchJob - Tu postulación&body=Hola ${candidate.name}...`)
  }

  function toggleReminder(appId: string, active: boolean) {
    setReminders(r => {
      const n = new Set(r)
      if (active) { n.add(appId); showToast('Recordatorio activado', '⏰') }
      else { n.delete(appId); showToast('Recordatorio desactivado', '✓') }
      return n
    })
  }

  const pendingReminders = [...reminders].filter(id =>
    applications.find(a => a.id === id && a.status !== 'rejected')
  )

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      {/* Header */}
      <header className="bg-brand-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-base" style={{ fontFamily: 'Syne, sans-serif' }}>
            MatchJob
          </span>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">Panel Empresa</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-full bg-white/10">
            <Bell size={16} className="text-white" />
            {(newCount > 0 || stats.new > 0) && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {stats.new || newCount}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push('/feed')}
            className="flex items-center gap-1 text-xs text-white/70 border border-white/20 px-2.5 py-1.5 rounded-full"
          >
            <ArrowLeft size={12} /> App
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-brand-100 flex">
        {(['candidates', 'alerts', 'stats'] as DashTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t ? 'border-brand-700 text-brand-700' : 'border-transparent text-brand-400'
            }`}
          >
            {t === 'candidates' ? '👥 Candidatos' : t === 'alerts' ? '🔔 Alertas' : '📈 Stats'}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto pb-8">

        {/* CANDIDATES TAB */}
        {tab === 'candidates' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 p-3">
              {[
                { n: stats.total, l: 'Total', c: 'text-brand-700' },
                { n: stats.new, l: 'Nuevos❤️', c: 'text-red-500' },
                { n: stats.viewed, l: 'Vistos', c: 'text-green-700' },
                { n: stats.saved, l: 'Guard.', c: 'text-amber-700' },
              ].map(s => (
                <div key={s.l} className="bg-white rounded-xl border border-brand-100 p-2 text-center">
                  <div className={`font-bold text-xl ${s.c}`} style={{ fontFamily: 'Syne, sans-serif' }}>{s.n ?? 0}</div>
                  <div className="text-[9px] text-brand-400 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Reminder banner */}
            {pendingReminders.length > 0 && (
              <div className="mx-3 mb-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                <span className="text-base">⏰</span>
                <div>
                  <strong>Recordatorio:</strong> {pendingReminders.length} candidato{pendingReminders.length > 1 ? 's' : ''} esperando respuesta.{' '}
                  <button
                    onClick={() => { setReminders(new Set()); showToast('Recordatorios respondidos', '✅') }}
                    className="underline font-semibold"
                  >
                    Marcar como respondidos
                  </button>
                </div>
              </div>
            )}

            {/* Email notice */}
            <div className="mx-3 mb-2 bg-brand-50 border-l-4 border-brand-700 rounded-r-xl p-3 text-xs text-brand-800">
              📧 <strong>Email enviado</strong> a tu correo por cada nueva postulación.
            </div>

            {/* Status filters */}
            <div className="flex gap-2 px-3 mb-3 overflow-x-auto">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-colors ${
                    statusFilter === f.value ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-brand-600 border-brand-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
              </div>
            )}

            {applications.map(app => (
              <CandidateCard
                key={app.id}
                application={app}
                onStatusChange={(id, status) => {
                  mutation.mutate({ appId: id, status })
                  const labels: Record<string, string> = { viewed: 'marcado como visto', saved: 'guardado', rejected: 'descartado' }
                  showToast(`${app.candidate?.name} ${labels[status]}`, status === 'rejected' ? '✕' : '✅')
                }}
                onContact={handleContact}
                onReminder={toggleReminder}
                hasReminder={reminders.has(app.id)}
              />
            ))}

            {!isLoading && applications.length === 0 && (
              <div className="text-center py-10 text-sm text-brand-400">
                No hay candidatos en esta categoría
              </div>
            )}
          </>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div className="p-3 space-y-3">
            <h2 className="font-bold text-brand-900 text-base" style={{ fontFamily: 'Syne, sans-serif' }}>
              📈 Analytics
            </h2>
            <div className="bg-white rounded-xl border border-brand-100 p-4 space-y-3">
              {[
                { label: 'Total postulaciones', value: stats.total ?? 0, color: 'bg-brand-700' },
                { label: 'Tasa de revisión', value: stats.total ? Math.round(((stats.viewed ?? 0) / stats.total) * 100) + '%' : '0%', color: 'bg-green-600' },
                { label: 'Guardados para entrevista', value: stats.saved ?? 0, color: 'bg-amber-500' },
                { label: 'Descartados', value: stats.rejected ?? 0, color: 'bg-red-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-brand-600 mb-1">
                    <span>{item.label}</span>
                    <span className="font-bold text-brand-900">{item.value}</span>
                  </div>
                  {typeof item.value === 'number' && stats.total > 0 && (
                    <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.value / stats.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {tab === 'alerts' && (
          <AlertsTab onToast={showToast} />
        )}
      </main>

      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
    </div>
  )
}

// ─── Alerts sub-component ─────────────────────────────────────
function AlertsTab({ onToast }: { onToast: (msg: string, icon?: string) => void }) {
  const [tags, setTags] = useState<string[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    fetch('/api/alerts').then(r => r.json()).then(d => {
      if (d.alerts?.[0]?.tags) setTags(d.alerts[0].tags)
    })
  }, [])

  async function addTag(tag: string) {
    tag = tag.trim()
    if (!tag || tags.includes(tag)) return
    const newTags = [...tags, tag]
    setTags(newTags)
    setInput('')
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
    onToast(`Alerta creada: "${tag}"`, '🔔')
  }

  async function removeTag(tag: string) {
    const params = new URLSearchParams({ tag })
    await fetch(`/api/alerts?${params}`, { method: 'DELETE' })
    setTags(t => t.filter(x => x !== tag))
    onToast('Alerta eliminada', '🗑')
  }

  return (
    <div className="p-3">
      <h2 className="font-bold text-brand-900 text-base mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
        🔔 Alertas empresa
      </h2>
      <p className="text-xs text-brand-400 mb-4">Recibe notificación cuando candidatos con estas habilidades postulen.</p>
      <div className="bg-white rounded-xl border border-brand-100 p-4 mb-3">
        <div className="flex gap-2 mb-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag(input)}
            className="flex-1 px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:border-brand-400"
            placeholder="ej: React, Python, UX..."
          />
          <button onClick={() => addTag(input)} className="px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-xl">
            +
          </button>
        </div>
        {tags.length === 0 && <p className="text-xs text-brand-400 text-center py-3">Sin alertas activas</p>}
        {tags.map(tag => {
          const matches = 0 // En producción: contar desde applications
          return (
            <div key={tag} className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl mb-2">
              <span className="text-base">🔔</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-brand-900">{tag}</div>
                <div className="text-[10px] text-brand-400">Activa</div>
              </div>
              <button
                onClick={() => removeTag(tag)}
                className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
