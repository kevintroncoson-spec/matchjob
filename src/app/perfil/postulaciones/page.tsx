'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  new:      { label: 'Enviada',    cls: 'bg-brand-50 text-brand-700' },
  viewed:   { label: 'Vista',      cls: 'bg-green-50 text-green-700' },
  saved:    { label: 'Preseleccionado', cls: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'No seleccionado', cls: 'bg-gray-100 text-gray-500' },
}

export default function PostulacionesPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
      if (!profile) { setLoading(false); return }
      const { data } = await supabase
        .from('applications')
        .select('*, job:jobs!applications_job_id_fkey(title, location, company:profiles!jobs_company_id_fkey(name))')
        .eq('candidate_id', profile.id)
        .order('created_at', { ascending: false })
      setApplications(data ?? [])
      setLoading(false)
    })
  }, [router])

  return (
    <div className="min-h-screen bg-brand-50 max-w-md mx-auto pb-20">
      <nav className="sticky top-0 z-40 bg-white border-b border-brand-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.push('/feed')} className="text-brand-500"><ArrowLeft size={20} /></button>
        <span className="font-bold text-brand-800 text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>❤️ Mis postulaciones</span>
      </nav>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="mx-auto mb-3 text-brand-200" size={40} />
            <p className="font-semibold text-brand-900 mb-1">Aún no has postulado</p>
            <p className="text-sm text-brand-500 mb-4">Desliza a la derecha en las ofertas que te gusten</p>
            <button onClick={() => router.push('/feed')} className="btn-primary text-sm">Ver ofertas</button>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => {
              const st = STATUS_LABEL[app.status] || STATUS_LABEL.new
              return (
                <div key={app.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-brand-900">{app.job?.title}</h3>
                      <p className="text-sm text-brand-500">{app.job?.company?.name} · {app.job?.location}</p>
                      <p className="text-[10px] text-brand-300 mt-1">Postulaste {timeAgo(app.created_at)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${st.cls}`}>{st.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-brand-100 flex py-2">
        {[
          { icon: '🏠', label: 'Feed', href: '/feed', active: false },
          { icon: '❤️', label: 'Postulaciones', href: '/perfil/postulaciones', active: true },
          { icon: '🔔', label: 'Alertas', href: '/perfil/alertas', active: false },
          { icon: '👤', label: 'Perfil', href: '/perfil', active: false },
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
