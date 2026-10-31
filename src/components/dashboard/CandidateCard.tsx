'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Bell, Check, Star, X } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import { MatchRing } from '@/components/ui/MatchRing'
import type { Application } from '@/types'

// Re-export computeMatchScore for use in this component context
function matchScore(app: Application): number {
  const candidate = app.candidate
  const job = app.job
  if (!candidate?.skills || !job?.tags) return 50
  return computeMatchScore(job.tags, candidate.skills)
}

const STATUS_MAP = {
  new:      { label: 'Nuevo',      bg: 'bg-brand-50',  text: 'text-brand-800' },
  viewed:   { label: 'Visto',      bg: 'bg-green-50',  text: 'text-green-800' },
  saved:    { label: 'Guardado',   bg: 'bg-amber-50',  text: 'text-amber-800' },
  rejected: { label: 'Descartado', bg: 'bg-red-50',    text: 'text-red-800'   },
}

interface CandidateCardProps {
  application: Application
  onStatusChange: (appId: string, status: string) => void
  onContact: (candidate: NonNullable<Application['candidate']>) => void
  onReminder: (appId: string, active: boolean) => void
  hasReminder: boolean
}

export function CandidateCard({
  application, onStatusChange, onContact, onReminder, hasReminder
}: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false)
  const candidate = application.candidate!
  const status = STATUS_MAP[application.status] || STATUS_MAP.new
  const score = matchScore(application)

  return (
    <div className={cn(
      'card mx-3 mb-3 overflow-hidden',
      application.status === 'new' && 'border-brand-300'
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{ backgroundColor: '#E6F1FB', color: '#185FA5', fontFamily: 'Syne, sans-serif' }}
          >
            {initials(candidate.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-brand-900 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
                {candidate.name}
              </span>
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-lg', status.bg, status.text)}>
                {status.label}
              </span>
              {application.status === 'new' && (
                <span className="text-[9px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-lg">
                  ❤️ Nuevo
                </span>
              )}
            </div>
            <p className="text-xs text-brand-500">{candidate.role} · {candidate.location}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(candidate.skills || []).slice(0, 4).map(s => (
                <span key={s} className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{s}</span>
              ))}
            </div>
          </div>
          <MatchRing score={score} size={44} />
        </div>

        {/* Candidate preferences (expanded) */}
        {expanded && (
          <div className="bg-brand-50 rounded-xl p-3 mb-3 text-xs text-brand-700 space-y-1.5">
            <p className="font-bold text-brand-900 mb-2">Preferencias del candidato</p>
            {candidate.salary_min && (
              <p>💰 <strong>Renta esperada:</strong> ${candidate.salary_min.toLocaleString()} – ${(candidate.salary_max || candidate.salary_min).toLocaleString()}</p>
            )}
            {candidate.modality && (
              <p>🏢 <strong>Modalidad:</strong> {candidate.modality}</p>
            )}
            {candidate.max_commute_minutes != null && (
              <p>🚌 <strong>Traslado:</strong> {candidate.max_commute_minutes === 0 ? 'No aplica' : `Hasta ${candidate.max_commute_minutes} min`}</p>
            )}
            {candidate.availability_days != null && (
              <p>📅 <strong>Disponible:</strong> {candidate.availability_days === 0 ? 'Inmediato' : `En ${candidate.availability_days} días`}</p>
            )}
            {(candidate.expected_benefits || []).length > 0 && (
              <p>🎁 <strong>Beneficios:</strong> {candidate.expected_benefits.join(', ')}</p>
            )}
            {candidate.bio && <p className="mt-2 italic text-brand-600">"{candidate.bio}"</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button onClick={() => onStatusChange(application.id, 'viewed')}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-800 border border-green-200">
            <Check size={10} /> Visto
          </button>
          <button onClick={() => onStatusChange(application.id, 'saved')}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
            <Star size={10} /> Guardar
          </button>
          <button onClick={() => onStatusChange(application.id, 'rejected')}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200">
            <X size={10} /> Descartar
          </button>
          <button onClick={() => onContact(candidate)}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-brand-700 text-white ml-auto">
            <Mail size={10} /> Contactar
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[10px] font-medium text-brand-600 border border-brand-100 px-2.5 py-1 rounded-lg"
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? 'Ocultar' : 'Ver perfil'}
          </button>
          <button
            onClick={() => onReminder(application.id, !hasReminder)}
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg border',
              hasReminder
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'border-brand-100 text-brand-400'
            )}
          >
            <Bell size={10} />
            {hasReminder ? 'Recordatorio activo' : 'Recordar responder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Re-export from lib so imports are clean
function computeMatchScore(tags: string[], skills: string[]) {
  const j = tags.map(t => t.toLowerCase())
  const s = skills.map(t => t.toLowerCase())
  const hits = j.filter(tag => s.some(sk => sk.includes(tag) || tag.includes(sk)))
  return Math.min(99, Math.max(10, Math.round((hits.length / j.length) * 100)))
}
