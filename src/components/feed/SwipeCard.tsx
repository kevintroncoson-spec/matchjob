'use client'

import { useState, useRef } from 'react'
import { Bookmark } from 'lucide-react'
import { MatchRing } from '@/components/ui/MatchRing'
import { BenefitBadge } from '@/components/ui/BenefitBadge'
import { computeMatchScore } from '@/lib/matching'
import { timeAgo } from '@/lib/utils'
import type { Job } from '@/types'

interface SwipeCardProps {
  job: Job
  profileSkills: string[]
  alertTags: string[]
  onSwipe: (dir: 'left' | 'right' | 'up', jobId: string) => void
  isTop: boolean
  stackIndex: number
}

export function SwipeCard({ job, profileSkills, alertTags, onSwipe, isTop, stackIndex }: SwipeCardProps) {
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [leaving, setLeaving] = useState<'left' | 'right' | 'up' | null>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)

  const score = computeMatchScore(job.tags, profileSkills)
  const alertHit = alertTags.some(a => job.tags.map(t => t.toLowerCase()).includes(a.toLowerCase()))

  // Umbrales de decisión
  const THRESHOLD = 100

  function onStart(clientX: number, clientY: number) {
    if (!isTop) return
    dragging.current = true
    startPos.current = { x: clientX, y: clientY }
  }

  function onMove(clientX: number, clientY: number) {
    if (!dragging.current || !isTop) return
    setDrag({ x: clientX - startPos.current.x, y: clientY - startPos.current.y })
  }

  function onEnd() {
    if (!dragging.current || !isTop) return
    dragging.current = false
    const { x, y } = drag

    // Decidir dirección
    if (y < -THRESHOLD && Math.abs(y) > Math.abs(x)) {
      triggerLeave('up')
    } else if (x > THRESHOLD) {
      triggerLeave('right')
    } else if (x < -THRESHOLD) {
      triggerLeave('left')
    } else {
      setDrag({ x: 0, y: 0 }) // volver al centro
    }
  }

  function triggerLeave(dir: 'left' | 'right' | 'up') {
    setLeaving(dir)
    setTimeout(() => onSwipe(dir, job.id), 300)
  }

  // Estilo de la tarjeta según arrastre o salida
  const rotate = drag.x / 20
  let transform = `translate(${drag.x}px, ${drag.y}px) rotate(${rotate}deg)`
  if (leaving === 'right') transform = 'translate(150%, -40px) rotate(25deg)'
  if (leaving === 'left') transform = 'translate(-150%, -40px) rotate(-25deg)'
  if (leaving === 'up') transform = 'translate(0, -150%) rotate(0deg)'

  // Cartas de fondo un poco más pequeñas y desplazadas
  const scale = isTop ? 1 : 1 - stackIndex * 0.04
  const translateY = isTop ? 0 : stackIndex * 12

  // Indicadores de decisión (aparecen al arrastrar)
  const showLike = drag.x > 40
  const showNope = drag.x < -40
  const showSave = drag.y < -40 && Math.abs(drag.y) > Math.abs(drag.x)

  return (
    <div
      className="absolute inset-0 select-none"
      style={{
        transform: isTop ? transform : `scale(${scale}) translateY(${translateY}px)`,
        transition: dragging.current ? 'none' : 'transform 0.3s ease',
        zIndex: isTop ? 30 : 20 - stackIndex,
        cursor: isTop ? 'grab' : 'default',
        touchAction: 'none',
      }}
      onMouseDown={e => onStart(e.clientX, e.clientY)}
      onMouseMove={e => onMove(e.clientX, e.clientY)}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={e => onStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => onMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={onEnd}
    >
      <div className="h-full bg-white rounded-3xl border border-brand-100 shadow-lg overflow-hidden flex flex-col relative">
        {/* Indicadores */}
        {isTop && showLike && (
          <div className="absolute top-8 left-6 z-40 border-4 border-green-500 text-green-500 font-bold text-2xl px-4 py-1 rounded-xl rotate-[-20deg]">
            POSTULAR ❤️
          </div>
        )}
        {isTop && showNope && (
          <div className="absolute top-8 right-6 z-40 border-4 border-red-500 text-red-500 font-bold text-2xl px-4 py-1 rounded-xl rotate-[20deg]">
            PASAR ✕
          </div>
        )}
        {isTop && showSave && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 border-4 border-amber-500 text-amber-500 font-bold text-2xl px-4 py-1 rounded-xl">
            GUARDAR ⭐
          </div>
        )}

        {/* Franja superior de color */}
        <div className="h-2 bg-gradient-to-r from-brand-700 to-brand-400 flex-shrink-0" />

        <div className="p-5 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
              style={{ backgroundColor: '#185FA5', fontFamily: 'Syne, sans-serif' }}>
              {job.company?.name?.slice(0, 2).toUpperCase() || 'LA'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-brand-900 text-lg leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
                {job.title}
              </h3>
              <p className="text-brand-700 font-semibold text-sm">{job.company?.name}</p>
              <p className="text-brand-400 text-xs mt-0.5">📍 {job.location} · {job.type}</p>
            </div>
          </div>

          {/* Match Laboral */}
          <div className="flex items-center gap-3 bg-brand-50 rounded-2xl p-3 mb-4">
            <MatchRing score={score} size={56} />
            <div>
              <p className="text-xs font-bold text-brand-800 uppercase tracking-wide">Match Laboral</p>
              <p className="text-xs text-brand-500">Compatibilidad con tu perfil</p>
            </div>
          </div>

          {alertHit && (
            <div className="inline-block bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1 rounded-lg mb-3">
              🔔 Coincide con tu alerta
            </div>
          )}

          {/* Descripción */}
          <p className="text-sm text-brand-700 leading-relaxed mb-4">{job.description}</p>

          {/* Beneficios */}
          {job.benefits.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-brand-800 uppercase tracking-wide mb-2">Beneficios</p>
              <div className="flex flex-wrap gap-2">
                {job.benefits.map(b => <BenefitBadge key={b} benefit={b} />)}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="mb-2">
            <p className="text-xs font-bold text-brand-800 uppercase tracking-wide mb-2">Habilidades</p>
            <div className="flex flex-wrap gap-1.5">
              {job.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">{tag}</span>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-brand-300 mt-4">Publicada {timeAgo(job.created_at)}</p>
        </div>
      </div>
    </div>
  )
}
