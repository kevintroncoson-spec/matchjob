'use client'

import { signInWithGoogle, signInWithLinkedIn } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import EmailAuth from '@/components/EmailAuth'
// redeploy 2026-11-07: forzar rebuild para tomar el nuevo backend Supabase

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 bg-brand-700 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-lg">
        💼
      </div>

      <h1 className="text-4xl font-bold text-brand-900 leading-tight mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
        Encuentra trabajo<br />
        <span className="text-brand-700">con un ❤️</span>
      </h1>

      <p className="text-brand-500 text-base leading-relaxed mb-10 max-w-sm">
        Descubre ofertas que hacen match con tu perfil.<br />
        Postula con un like. Simple como Instagram.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <EmailAuth />

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-brand-100" />
          <span className="text-xs text-brand-300">o con redes</span>
          <div className="flex-1 h-px bg-brand-100" />
        </div>

        <button onClick={() => signInWithGoogle()} className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z" fill="#4285F4"/>
            <path d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.92-2.26A5.43 5.43 0 0 1 9 14.72a5.44 5.44 0 0 1-5.12-3.76H.9v2.34A9 9 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.88 10.96A5.54 5.54 0 0 1 3.6 9a5.54 5.54 0 0 1 .28-1.96V4.7H.9A9 9 0 0 0 0 9a9 9 0 0 0 .9 4.3l2.98-2.34z" fill="#FBBC05"/>
            <path d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .9 4.7l2.98 2.34A5.44 5.44 0 0 1 9 3.58z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <button onClick={() => signInWithLinkedIn()} className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-[#0077B5] text-white font-semibold text-sm hover:bg-[#006399] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          Continuar con LinkedIn
        </button>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-brand-100" />
          <span className="text-xs text-brand-300">o</span>
          <div className="flex-1 h-px bg-brand-100" />
        </div>

        <button onClick={() => router.push('/empresa')} className="w-full px-6 py-3.5 rounded-2xl border-2 border-brand-700 text-brand-700 font-semibold text-sm hover:bg-brand-50 transition-colors">
          🏢 Ingresar como empresa
        </button>
      </div>

      <div className="flex gap-8 mt-12">
        {[['2.4K+','Ofertas activas'],['18K+','Candidatos'],['94%','Match rate']].map(([n, l]) => (
          <div key={l} className="text-center">
            <div className="text-xl font-bold text-brand-700" style={{ fontFamily: 'Syne, sans-serif' }}>{n}</div>
            <div className="text-xs text-brand-400">{l}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-brand-300 mt-10">
        Al continuar aceptas los Términos y la Política de Privacidad de MatchJob
      </p>
    </main>
  )
}
