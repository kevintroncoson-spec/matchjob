'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { LogOut, MapPin, Briefcase, Heart, Bell } from 'lucide-react'
import { signOut } from '@/lib/supabase/client'
import { initials, BENEFIT_DATA } from '@/lib/utils'

async function fetchProfile() {
  const res = await fetch('/api/profile')
  if (!res.ok) throw new Error('Error')
  return res.json()
}

const MODALITY_LABEL: Record<string, string> = {
  remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial', flexible: 'Flexible',
}

export default function PerfilPage() {
  const router = useRouter()
  const { data, isLoading } = useQuery({ queryKey: ['my-profile'], queryFn: fetchProfile })
  const profile = data?.profile
  const experience = data?.experience ?? []
  const applicationsCount = data?.applicationsCount ?? 0

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50 max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-brand-100 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-brand-800 text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Mi perfil</span>
        <button onClick={async () => { await signOut(); router.push('/') }} className="text-brand-400">
          <LogOut size={18} />
        </button>
      </div>

      {/* Profile card */}
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-brand-800 to-brand-400" />
          <div className="px-5 pb-5 -mt-8">
            <div className="w-16 h-16 rounded-full bg-brand-50 border-4 border-white flex items-center justify-center text-brand-700 font-bold text-lg mb-2"
              style={{ fontFamily: 'Syne, sans-serif' }}>
              {profile?.name ? initials(profile.name) : '👤'}
            </div>
            <h1 className="text-lg font-bold text-brand-900" style={{ fontFamily: 'Syne, sans-serif' }}>{profile?.name}</h1>
            <p className="text-sm text-brand-500 flex items-center gap-1">
              <Briefcase size={13} /> {profile?.role || 'Sin rol definido'}
              {profile?.location && <><MapPin size={13} className="ml-2" /> {profile.location}</>}
            </p>

            {/* Skills */}
            {profile?.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.skills.map((s: string) => (
                  <span key={s} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-brand-50">
              <div className="text-center">
                <div className="text-xl font-bold text-brand-700" style={{ fontFamily: 'Syne, sans-serif' }}>{applicationsCount}</div>
                <div className="text-xs text-brand-400">postulaciones</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-brand-700" style={{ fontFamily: 'Syne, sans-serif' }}>{experience.length}</div>
                <div className="text-xs text-brand-400">experiencias</div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl border border-brand-100 p-5 mt-4">
          <h2 className="font-semibold text-brand-900 text-sm mb-3">Mis preferencias</h2>
          <div className="space-y-2 text-sm text-brand-600">
            {profile?.salary_min && (
              <p>💰 Renta esperada: ${profile.salary_min.toLocaleString()} – ${(profile.salary_max || profile.salary_min).toLocaleString()}</p>
            )}
            {profile?.modality && <p>🏢 Modalidad: {MODALITY_LABEL[profile.modality]}</p>}
            {profile?.availability_days != null && (
              <p>📅 Disponible: {profile.availability_days === 0 ? 'Inmediato' : profile.availability_days === -1 ? 'Conversable' : `en ${profile.availability_days} días`}</p>
            )}
          </div>

          {profile?.expected_benefits?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.expected_benefits.map((b: string) => (
                <span key={b} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">{b}</span>
              ))}
            </div>
          )}

          <button onClick={() => router.push('/onboarding')} className="btn-outline w-full mt-4 text-sm">
            Editar preferencias
          </button>
        </div>

        {/* Experience */}
        {experience.length > 0 && (
          <div className="bg-white rounded-2xl border border-brand-100 p-5 mt-4">
            <h2 className="font-semibold text-brand-900 text-sm mb-3">Experiencia laboral</h2>
            <div className="space-y-3">
              {experience.map((e: any) => (
                <div key={e.id} className="flex gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={15} className="text-brand-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-900">{e.role}</p>
                    <p className="text-xs text-brand-500">{e.company_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-brand-100 flex py-2">
        {[
          { icon: '🏠', label: 'Feed', href: '/feed' },
          { icon: '❤️', label: 'Postulaciones', href: '/perfil/postulaciones' },
          { icon: '🔔', label: 'Alertas', href: '/perfil/alertas' },
          { icon: '👤', label: 'Perfil', href: '/perfil', active: true },
        ].map(item => (
          <button key={item.label} onClick={() => router.push(item.href)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1">
            <span className="text-xl">{item.icon}</span>
            <span className={`text-[9px] font-semibold ${item.active ? 'text-brand-700' : 'text-brand-400'}`}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
