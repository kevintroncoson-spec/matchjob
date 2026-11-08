'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Briefcase } from 'lucide-react'
import { ALL_SKILL_TAGS } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/ui/Toast'

type Experience = {
  id: string
  company_name: string
  role: string
  is_current: boolean
  start_date: string | null
  end_date: string | null
}

export default function EditarPerfilPage() {
  const router = useRouter()
  const { toast, show } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')

  const [experience, setExperience] = useState<Experience[]>([])
  const [expRole, setExpRole] = useState('')
  const [expCompany, setExpCompany] = useState('')
  const [expCurrent, setExpCurrent] = useState(false)
  const [addingExp, setAddingExp] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        const p = d.profile
        if (p) {
          setName(p.name ?? '')
          setRole(p.role ?? '')
          setLocation(p.location ?? '')
          setPhone(p.phone ?? '')
          setBio(p.bio ?? '')
          setSkills(p.skills ?? [])
        }
        setExperience(d.experience ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function addSkill(t: string) {
    t = t.trim()
    if (t && !skills.includes(t)) setSkills([...skills, t])
    setSkillInput('')
  }
  function removeSkill(t: string) {
    setSkills(skills.filter(s => s !== t))
  }

  async function guardar() {
    if (!name.trim()) { show('Escribe tu nombre', '⚠️'); return }
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, location, phone, bio, skills }),
    })
    setSaving(false)
    if (res.ok) {
      show('Perfil actualizado', '✅')
      setTimeout(() => router.push('/perfil'), 700)
    } else {
      show('No se pudo guardar', '⚠️')
    }
  }

  async function addExperience() {
    if (!expRole.trim() || !expCompany.trim()) { show('Cargo y empresa son obligatorios', '⚠️'); return }
    setAddingExp(true)
    const res = await fetch('/api/profile/experience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: expRole, company_name: expCompany, is_current: expCurrent }),
    })
    setAddingExp(false)
    if (res.ok) {
      const d = await res.json()
      setExperience(e => [d.experience, ...e])
      setExpRole(''); setExpCompany(''); setExpCurrent(false)
      show('Experiencia agregada', '✅')
    } else {
      show('No se pudo agregar', '⚠️')
    }
  }

  async function removeExperience(id: string) {
    const res = await fetch(`/api/profile/experience?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setExperience(e => e.filter(x => x.id !== id))
      show('Experiencia eliminada', '🗑')
    }
  }

  const suggestions = ALL_SKILL_TAGS.filter(t =>
    !skills.includes(t) && (skillInput === '' || t.toLowerCase().includes(skillInput.toLowerCase()))
  ).slice(0, 8)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50 max-w-md mx-auto pb-24">
      <nav className="sticky top-0 z-40 bg-white border-b border-brand-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.push('/perfil')} className="text-brand-500"><ArrowLeft size={20} /></button>
        <span className="font-bold text-brand-800 text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Editar perfil</span>
      </nav>

      <div className="p-4 space-y-4">
        {/* Datos personales */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-brand-900 text-sm">Datos personales</h2>
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Nombre *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Cargo o título profesional</label>
            <input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="Ej: Desarrollador Frontend" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Ubicación</label>
            <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Santiago, Chile" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Teléfono</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+56 9 ..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Sobre mí</label>
            <textarea className="input min-h-[80px] resize-none" value={bio} onChange={e => setBio(e.target.value)} placeholder="Cuenta brevemente tu experiencia y lo que buscas..." />
          </div>
        </div>

        {/* Habilidades */}
        <div className="card p-5">
          <h2 className="font-semibold text-brand-900 text-sm mb-2">Habilidades</h2>
          <input
            className="input mb-2"
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }}
            placeholder="Escribe y presiona Enter (ej: React)"
          />
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.map(s => (
                <span key={s} className="text-xs bg-brand-50 text-brand-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  {s}
                  <button onClick={() => removeSkill(s)} className="font-bold">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(t => (
              <button key={t} onClick={() => addSkill(t)} className="text-xs border border-dashed border-brand-200 text-brand-500 px-2.5 py-1 rounded-lg hover:bg-brand-50">
                + {t}
              </button>
            ))}
          </div>
        </div>

        {/* Experiencia laboral */}
        <div className="card p-5">
          <h2 className="font-semibold text-brand-900 text-sm mb-3">Experiencia laboral</h2>
          {experience.length > 0 && (
            <div className="space-y-2 mb-4">
              {experience.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                    <Briefcase size={14} className="text-brand-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-900 truncate">{e.role}</p>
                    <p className="text-xs text-brand-500 truncate">{e.company_name}{e.is_current ? ' · Actual' : ''}</p>
                  </div>
                  <button onClick={() => removeExperience(e.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-brand-50 pt-3">
            <input className="input" value={expRole} onChange={e => setExpRole(e.target.value)} placeholder="Cargo (ej: Frontend Developer)" />
            <input className="input" value={expCompany} onChange={e => setExpCompany(e.target.value)} placeholder="Empresa (ej: TechCorp)" />
            <label className="flex items-center gap-2 text-xs text-brand-600">
              <input type="checkbox" checked={expCurrent} onChange={e => setExpCurrent(e.target.checked)} />
              Trabajo aquí actualmente
            </label>
            <button onClick={addExperience} disabled={addingExp} className="btn-outline w-full text-sm flex items-center justify-center gap-1">
              <Plus size={15} /> {addingExp ? 'Agregando...' : 'Agregar experiencia'}
            </button>
          </div>
        </div>

        <button onClick={guardar} disabled={saving} className="btn-primary w-full">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
    </div>
  )
}
