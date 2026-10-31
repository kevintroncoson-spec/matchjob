'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, X } from 'lucide-react'
import { ALL_SKILL_TAGS } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/ui/Toast'

export default function AlertasPage() {
  const router = useRouter()
  const { toast, show } = useToast()
  const [tags, setTags] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/alerts').then(r => r.json()).then(d => {
      if (d.alerts?.[0]?.tags) setTags(d.alerts[0].tags)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function save(newTags: string[]) {
    setTags(newTags)
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
  }

  function addTag(t: string) {
    t = t.trim()
    if (!t || tags.includes(t)) return
    save([...tags, t])
    setInput('')
    show(`Alerta creada: "${t}"`, '🔔')
  }

  function removeTag(t: string) {
    save(tags.filter(x => x !== t))
    show('Alerta eliminada', '🗑')
  }

  const suggestions = ALL_SKILL_TAGS.filter(t =>
    !tags.includes(t) && (input === '' || t.toLowerCase().includes(input.toLowerCase()))
  ).slice(0, 8)

  return (
    <div className="min-h-screen bg-brand-50 max-w-md mx-auto pb-20">
      <nav className="sticky top-0 z-40 bg-white border-b border-brand-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.push('/feed')} className="text-brand-500"><ArrowLeft size={20} /></button>
        <span className="font-bold text-brand-800 text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>🔔 Alertas</span>
      </nav>

      <div className="p-4">
        <p className="text-sm text-brand-500 mb-4">
          Te avisamos cuando aparezcan ofertas con las habilidades que te interesan.
        </p>

        <div className="card p-4 mb-4">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag(input)}
            className="input mb-3"
            placeholder="Escribe una habilidad (ej: React, UX...)"
          />
          <div className="flex flex-wrap gap-2">
            {suggestions.map(t => (
              <button key={t} onClick={() => addTag(t)}
                className="text-xs border border-dashed border-brand-200 text-brand-500 px-3 py-1.5 rounded-lg hover:bg-brand-50">
                + {t}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="font-semibold text-brand-900 text-sm mb-3">Mis alertas activas ({tags.length})</p>
          {loading ? (
            <p className="text-xs text-brand-400 text-center py-4">Cargando...</p>
          ) : tags.length === 0 ? (
            <div className="text-center py-6">
              <Bell className="mx-auto mb-2 text-brand-200" size={32} />
              <p className="text-xs text-brand-400">Aún no tienes alertas. Agrega habilidades arriba.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tags.map(t => (
                <div key={t} className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl">
                  <Bell size={16} className="text-brand-700" />
                  <span className="flex-1 text-sm font-medium text-brand-900">{t}</span>
                  <button onClick={() => removeTag(t)}
                    className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-brand-100 flex py-2">
        {[
          { icon: '🏠', label: 'Feed', href: '/feed', active: false },
          { icon: '❤️', label: 'Postulaciones', href: '/perfil/postulaciones', active: false },
          { icon: '🔔', label: 'Alertas', href: '/perfil/alertas', active: true },
          { icon: '👤', label: 'Perfil', href: '/perfil', active: false },
        ].map(item => (
          <button key={item.label} onClick={() => router.push(item.href)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1">
            <span className="text-xl">{item.icon}</span>
            <span className={`text-[9px] font-semibold ${item.active ? 'text-brand-700' : 'text-brand-400'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
    </div>
  )
}
