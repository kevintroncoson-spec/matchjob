'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'

const INDUSTRIES = ['Tecnología', 'Finanzas', 'Retail', 'Salud', 'Educación', 'Manufactura', 'Servicios', 'Otro']
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

export default function RegistroEmpresa() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', company_rut: '', company_website: '', company_size: '11-50',
    company_industry: 'Tecnología', contact_email: '', contact_phone: '', location: 'Santiago',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.name || !form.contact_email) {
      setError('Nombre de empresa y email de contacto son obligatorios')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error en el registro')
      router.push('/empresa') // el layout mostrará el estado "pending"
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-brand-100 p-8 max-w-lg w-full">
        <div className="w-12 h-12 rounded-xl bg-brand-700 flex items-center justify-center mb-4">
          <Building2 className="text-white" size={22} />
        </div>
        <h1 className="text-xl font-bold text-brand-900 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
          Registra tu empresa
        </h1>
        <p className="text-sm text-brand-500 mb-6">
          Completa los datos. Revisaremos tu solicitud antes de activar la cuenta.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Nombre de la empresa *</label>
            <input className="input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ej: TechCorp SpA" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-brand-600 mb-1.5">RUT</label>
              <input className="input" value={form.company_rut} onChange={e => update('company_rut', e.target.value)} placeholder="76.123.456-7" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-600 mb-1.5">Sitio web</label>
              <input className="input" value={form.company_website} onChange={e => update('company_website', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-brand-600 mb-1.5">Industria</label>
              <select className="input" value={form.company_industry} onChange={e => update('company_industry', e.target.value)}>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-600 mb-1.5">Tamaño</label>
              <select className="input" value={form.company_size} onChange={e => update('company_size', e.target.value)}>
                {SIZES.map(s => <option key={s} value={s}>{s} empleados</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-brand-600 mb-1.5">Email de contacto *</label>
              <input className="input" type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} placeholder="rrhh@empresa.cl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-600 mb-1.5">Teléfono</label>
              <input className="input" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} placeholder="+56 9 ..." />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Ubicación</label>
            <input className="input" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Santiago, Chile" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
            {loading ? 'Enviando...' : 'Enviar solicitud de registro'}
          </button>

          <p className="text-xs text-brand-400 text-center">
            Al registrarte aceptas los Términos y la Política de Privacidad de MatchJob
          </p>
        </div>
      </div>
    </div>
  )
}
