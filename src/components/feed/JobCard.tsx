'use client'

import { useState } from 'react'
import { Bookmark, Bot } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { MatchRing } from '@/components/ui/MatchRing'
import { BenefitBadge } from '@/components/ui/BenefitBadge'
import { computeMatchScore } from '@/lib/matching'
import type { Job } from '@/types'

interface JobCardProps {
  job: Job
  profileSkills: string[]
  alertTags: string[]
  onLike: (jobId: string) => Promise<void>
  onSave: (jobId: string) => void
  isLiked: boolean
  isSaved: boolean
}

export function JobCard({
  job, profileSkills, alertTags, onLike, onSave, isLiked, isSaved
}: JobCardProps) {
  const [likeAnim, setLikeAnim] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const score = computeMatchScore(job.tags, profileSkills)
  const alertHit = alertTags.some(a => job.tags.map(t => t.toLowerCase()).includes(a.toLowerCase()))

  async function handleLike() {
    if (loading) return
    setLoading(true)
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 300)
    await onLike(job.id)
    setLoading(false)
  }

  async function handleAI() {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      const data = await res.json()
      setAiAnalysis(data.analysis?.summary || 'No disponible')
    } catch { setAiAnalysis('Error al analizar. Intenta nuevamente.') }
    setAiLoading(false)
  }

  return (
    <article
      className={cn(
        'card-hover mx-3 mb-4 overflow-hidden fade-up',
        'border-t-4',
        isLiked ? 'border-t-red-400 border-red-200' : 'border-t-brand-400'
      )}
    >
      {/* Alert badge */}
      {alertHit && (
        <div className="absolute top-3 right-3 bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-lg">
          🔔 Alerta
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: '#185FA5', fontFamily: 'Syne, sans-serif' }}
          >
            {job.company?.name?.slice(0, 2).toUpperCase() || 'LA'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-brand-900 text-base leading-tight mb-0.5 truncate"
              style={{ fontFamily: 'Syne, sans-serif' }}>
              {job.title}
            </h3>
            <p className="text-brand-700 font-semibold text-xs mb-1.5">
              {job.company?.name} · {job.location}
            </p>
            <div className="flex gap-2 text-[10px] text-brand-400 flex-wrap">
              <span>📍 {job.location}</span>
              <span>⏱ {job.type}</span>
              <span>🕐 {timeAgo(job.created_at)}</span>
            </div>
          </div>
          <MatchRing score={score} size={48} />
        </div>

        {/* Description */}
        <p className="text-xs text-brand-700 leading-relaxed mb-3 line-clamp-3">
          {job.description}
        </p>

        {/* Benefits */}
        {job.benefits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.benefits.map(b => (
              <BenefitBadge key={b} benefit={b} />
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.tags.map(tag => {
            const isAlert = alertTags.map(a => a.toLowerCase()).includes(tag.toLowerCase())
            return (
              <span
                key={tag}
                className={cn(
                  'text-[10px] font-medium px-2.5 py-1 rounded-lg',
                  isAlert
                    ? 'bg-brand-50 text-brand-800 border border-brand-200'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {isAlert ? '🏷 ' : ''}{tag}
              </span>
            )
          })}
        </div>

        {/* AI Analysis */}
        {(aiAnalysis || aiLoading) && (
          <div className="bg-brand-50 rounded-xl p-3 mb-3 text-xs text-brand-800 leading-relaxed">
            {aiLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-pulse">🤖</span> Analizando con IA...
              </span>
            ) : aiAnalysis}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-brand-50">
          {isLiked && (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
              ❤️ Postulado
            </span>
          )}
          {!isLiked && <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave(job.id)}
              className={cn(
                'w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
                isSaved
                  ? 'bg-brand-50 border-brand-400 text-brand-700'
                  : 'border-brand-100 text-brand-300 hover:border-brand-300 hover:text-brand-600'
              )}
              aria-label="Guardar oferta"
            >
              <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleAI}
              disabled={aiLoading}
              className="w-8 h-8 rounded-full border border-brand-100 flex items-center justify-center text-brand-300 hover:border-brand-300 hover:text-brand-600 transition-colors disabled:opacity-50"
              aria-label="Analizar con IA"
            >
              <Bot size={14} />
            </button>

            <button
              onClick={handleLike}
              disabled={loading}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold',
                'border-2 transition-all duration-150',
                isLiked
                  ? 'bg-red-50 border-red-300 text-red-500'
                  : 'border-brand-200 text-brand-500 hover:border-red-300 hover:text-red-400',
                likeAnim && 'heart-pop'
              )}
            >
              {isLiked ? '❤️' : '🤍'} {isLiked ? 'Postulado' : 'Postular'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
