'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ALL_SKILL_TAGS, BENEFIT_DATA } from '@/lib/utils'

const JOB_TYPES = ['Full-time', 'Part-time', 'Freelance', 'Práctica']
const MODALITIES = ['Remoto', 'Híbrido', 'Presencial']

export default function NuevaOferta() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', location: 'Remoto', type: 'Full-time',
    salary_min: '', salary_max: '',
  })
  const [tags, setTags] = useState<string[]>([])
  const [benefits, setBenefits] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  function toggleBenefit(key: string) {
    setBenefits(b => b.includes(key) ? b.filter(x => x !== key) : [...b, key])
  }
  function addTag(t: string) {
    t = t.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  async function handleSubmit() {
    if (!form.title || !form.description) {
      setError('Título y descripción son obligatorios')
      return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_job',
          ...form,
          salary_min: form.salary_min ? parseInt(form.salary_min) : null,
          salary_max: form.salary_max ? parseInt(form.salary_max) : null,
          tags, benefits,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear la oferta')
      router.push('/empresa/ofertas')
    } catch (e: any) {
      setError(e.message); setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/empresa/ofertas" className="flex items-center gap-2 text-sm text-brand-500 mb-4 hover:text-brand-700">
        <ArrowLeft size={16} /> Volver a ofertas
      </Link>

      <h1 className="text-2xl font-bold text-brand-900 mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
        Nueva oferta laboral
      </h1>

      <div className="bg-white rounded-2xl border border-brand-100 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-brand-600 mb-1.5">Título del cargo *</label>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Senior Frontend Engineer" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-600 mb-1.5">Descripción *</label>
          <textarea className="input min-h-[100px] resize-none" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe el rol, responsabilidades y lo que buscan..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Modalidad</label>
            <select className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
              {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Tipo</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Renta mín. (CLP)</label>
            <input className="input" type="number" value={form.salary_min} onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))} placeholder="1500000" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Renta máx. (CLP)</label>
            <input className="input" type="number" value={form.salary_max} onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))} placeholder="2500000" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-600 mb-1.5">Habilidades requeridas</label>
          <input className="input mb-2" value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(tagInput))}
            placeholder="Escribe y presiona Enter (ej: React)" />
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map(t => (
              <span key={t} className="text-xs bg-brand-50 text-brand-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                {t}
                <button onClick={() => setTags(tags.filter(x => x !== t))} className="font-bold">×</button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SKILL_TAGS.filter(t => !tags.includes(t)).slice(0, 10).map(t => (
              <button key={t} onClick={() => addTag(t)} className="text-xs border border-dashed border-brand-200 text-brand-500 px-2.5 py-1 rounded-lg hover:bg-brand-50">
                + {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-600 mb-1.5">Beneficios</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BENEFIT_DATA).map(([key, data]) => (
              <button key={key} onClick={() => toggleBenefit(key)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  benefits.includes(key) ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-brand-600 border-brand-200'
                }`}>
                {data.icon} {data.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
          {loading ? 'Publicando...' : 'Publicar oferta'}
        </button>
      </div>
    </div>
  )
}
