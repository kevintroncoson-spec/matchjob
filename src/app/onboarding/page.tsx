'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_STEPS } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Record<string, any>>({
    salary: '', modality: '', distance: '', available: '', benefits: [],
  })

  const current = ONBOARDING_STEPS[step]
  const value = data[current.field]
  const hasValue = current.multi ? (value?.length > 0) : !!value
  const isLast = step === ONBOARDING_STEPS.length - 1

  function select(opt: string) {
    if (current.multi) {
      const arr = data[current.field] || []
      setData(d => ({ ...d, [current.field]: arr.includes(opt) ? arr.filter((v: string) => v !== opt) : [...arr, opt] }))
    } else {
      setData(d => ({ ...d, [current.field]: opt }))
    }
  }

  async function next() {
    if (!isLast) { setStep(s => s + 1); return }
    // Guardar en BD
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      router.push('/feed')
    } catch {
      router.push('/feed') // continuar de todas formas
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-brand-100 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-brand-800 text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>MatchJob</span>
        <button onClick={() => router.push('/feed')} className="text-xs text-brand-400">Saltar</button>
      </div>

      <div className="flex-1 p-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-xs text-brand-400 mb-2">Paso {step + 1} de {ONBOARDING_STEPS.length}</p>

          {/* Progress */}
          <div className="flex gap-1 mb-5">
            {ONBOARDING_STEPS.map((_, i) => (
              <div key={i} className={cn('flex-1 h-1 rounded-full',
                i < step ? 'bg-brand-700' : i === step ? 'bg-brand-400' : 'bg-brand-100')} />
            ))}
          </div>

          <h1 className="text-lg font-bold text-brand-900 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
            {current.title}
          </h1>
          <p className="text-xs text-brand-400 mb-5">{current.sub}</p>

          {/* Options */}
          <div className="flex flex-wrap gap-2 mb-6">
            {current.options.map(opt => {
              const selected = current.multi ? value?.includes(opt) : value === opt
              return (
                <button key={opt} onClick={() => select(opt)}
                  className={cn('px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                    selected ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-brand-600 border-brand-200')}>
                  {opt}
                </button>
              )
            })}
          </div>

          <button onClick={next} disabled={!hasValue || saving}
            className="btn-primary w-full disabled:opacity-40">
            {saving ? 'Guardando...' : isLast ? '🎉 Ver ofertas' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}
