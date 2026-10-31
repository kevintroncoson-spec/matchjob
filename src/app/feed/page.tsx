'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Building2, X, Heart, Star, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useInfiniteJobs } from '@/hooks/useInfiniteJobs'
import { useToast } from '@/hooks/useToast'
import { SwipeCard } from '@/components/feed/SwipeCard'
import { Toast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const FILTERS = ['Todos', 'Remoto', 'Híbrido', 'Full-time', 'Fintech', 'Startup']

export default function FeedPage() {
  const router = useRouter()
  const { toast, show: showToast } = useToast()
  const [filter, setFilter] = useState('Todos')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [alertTags, setAlertTags] = useState<string[]>([])
  const [current, setCurrent] = useState(0)          // índice de la carta actual
  const [likedCount, setLikedCount] = useState(0)
  const [history, setHistory] = useState<{ jobId: string; dir: string }[]>([])

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteJobs(filter)
  const jobs = data?.pages.flatMap(p => p.jobs) ?? []

  // Cargar perfil y alertas
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (p) setProfile(p as Profile)
      const { data: alerts } = await supabase.from('alerts').select('tags').eq('user_id', user.id).eq('active', true).single()
      if (alerts) setAlertTags(alerts.tags as string[])
    })
  }, [router])

  // Cuando quedan pocas cartas, cargar más
  useEffect(() => {
    if (jobs.length - current <= 2 && hasNextPage) fetchNextPage()
  }, [current, jobs.length, hasNextPage, fetchNextPage])

  // Reset al cambiar filtro
  useEffect(() => { setCurrent(0) }, [filter])

  const applyJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })
      const d = await res.json()
      if (d.action === 'applied') setLikedCount(c => c + 1)
    } catch { /* silencioso */ }
  }, [])

  const handleSwipe = useCallback((dir: 'left' | 'right' | 'up', jobId: string) => {
    if (dir === 'right') {
      applyJob(jobId)
      showToast('¡Postulación enviada! 📧', '❤️')
    } else if (dir === 'up') {
      showToast('Oferta guardada', '⭐')
    } else {
      showToast('Oferta descartada', '✕')
    }
    setHistory(h => [...h, { jobId, dir }])
    setCurrent(c => c + 1)
  }, [applyJob, showToast])

  // Botones disparan el mismo swipe programáticamente
  const [triggerDir, setTriggerDir] = useState<{ dir: 'left' | 'right' | 'up'; key: number } | null>(null)
  function button(dir: 'left' | 'right' | 'up') {
    const topJob = jobs[current]
    if (!topJob) return
    handleSwipe(dir, topJob.id)
  }

  function undo() {
    if (current === 0) return
    setCurrent(c => c - 1)
    setHistory(h => h.slice(0, -1))
    showToast('Última acción deshecha', '↩️')
  }

  const topJob = jobs[current]
  const noMore = !isLoading && current >= jobs.length && !hasNextPage

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-brand-100 px-4 h-14 flex items-center justify-between flex-shrink-0">
        <span className="font-bold text-brand-800 text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>MatchJob</span>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/perfil/alertas')}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-brand-200 text-brand-700">
            <Bell size={13} /> Alertas
            {alertTags.length > 0 && <span className="bg-brand-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{alertTags.length}</span>}
          </button>
          <button onClick={() => router.push('/empresa')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-900 text-white">
            <Building2 size={13} /> Empresa
          </button>
        </div>
      </nav>

      {/* Filtros */}
      <div className="flex gap-2 px-3 py-3 overflow-x-auto flex-shrink-0">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors
              ${filter === f ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-brand-600 border-brand-200'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Zona de cartas */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
        {isLoading && (
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
        )}

        {noMore && (
          <div className="text-center">
            <div className="text-5xl mb-3">🎉</div>
            <p className="font-bold text-brand-900 text-lg mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>¡Viste todas las ofertas!</p>
            <p className="text-sm text-brand-500 mb-4">Vuelve pronto para ver nuevas oportunidades</p>
            <button onClick={() => { setCurrent(0); setFilter('Todos') }} className="btn-outline text-sm">
              Empezar de nuevo
            </button>
          </div>
        )}

        {!isLoading && !noMore && (
          <div className="relative w-full max-w-sm" style={{ height: '520px' }}>
            {/* Renderizar hasta 3 cartas apiladas */}
            {jobs.slice(current, current + 3).map((job, i) => (
              <SwipeCard
                key={job.id}
                job={job}
                profileSkills={profile?.skills ?? []}
                alertTags={alertTags}
                onSwipe={handleSwipe}
                isTop={i === 0}
                stackIndex={i}
              />
            ))}
          </div>
        )}
      </main>

      {/* Botones de acción (flotantes sobre el bottom nav) */}
      {!isLoading && !noMore && topJob && (
        <div className="fixed bottom-20 left-0 right-0 z-40 flex items-center justify-center gap-4">
          <button onClick={() => button('left')}
            className="w-14 h-14 rounded-full bg-white shadow-lg border border-red-100 flex items-center justify-center text-red-500 active:scale-90 transition-transform">
            <X size={26} />
          </button>
          <button onClick={() => button('up')}
            className="w-12 h-12 rounded-full bg-white shadow-lg border border-amber-100 flex items-center justify-center text-amber-500 active:scale-90 transition-transform">
            <Star size={22} />
          </button>
          <button onClick={() => button('right')}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-500 shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform">
            <Heart size={30} fill="white" />
          </button>
          <button onClick={undo} disabled={current === 0}
            className="w-12 h-12 rounded-full bg-white shadow-lg border border-brand-100 flex items-center justify-center text-brand-400 active:scale-90 transition-transform disabled:opacity-30">
            <RotateCcw size={20} />
          </button>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-100 flex py-2">
        {[
          { icon: '🏠', label: 'Feed', href: '/feed', active: true },
          { icon: '❤️', label: 'Postulaciones', href: '/perfil/postulaciones', active: false },
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

      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
    </div>
  )
}
