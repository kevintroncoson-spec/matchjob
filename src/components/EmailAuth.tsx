'use client'

import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function EmailAuth() {
  const [modo, setModo] = useState<'registro' | 'login'>('registro')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null); setAviso(null)
    if (!email.trim() || !password) { setError('Email y contraseña son obligatorios.'); return }
    if (modo === 'registro' && !nombre.trim()) { setError('Escribe tu nombre.'); return }

    setCargando(true)
    if (modo === 'registro') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: nombre.trim() } },
      })
      setCargando(false)
      if (error) { setError(traducir(error.message)); return }
      if (!data.session) {
        setAviso('Cuenta creada. Si pide confirmar correo, desactiva "Confirm email" en Supabase y luego inicia sesión.')
        setModo('login')
        return
      }
      window.location.assign('/onboarding')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      setCargando(false)
      if (error) { setError(traducir(error.message)); return }
      window.location.assign('/feed')
    }
  }

  return (
    <form onSubmit={enviar} className="w-full space-y-3 text-left">
      {modo === 'registro' && (
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre"
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-400 transition-colors" />
      )}
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" autoComplete="email"
        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-400 transition-colors" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña (mín. 6)" autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-400 transition-colors" />

      {error && <p className="text-xs text-red-500 px-1">{error}</p>}
      {aviso && <p className="text-xs text-green-600 px-1 leading-relaxed">{aviso}</p>}

      <button type="submit" disabled={cargando}
        className="w-full px-6 py-3.5 rounded-2xl bg-brand-700 text-white font-semibold text-sm hover:bg-brand-800 transition-colors disabled:opacity-60">
        {cargando ? 'Procesando...' : (modo === 'registro' ? 'Crear cuenta' : 'Entrar')}
      </button>

      <p className="text-xs text-brand-400 text-center">
        {modo === 'registro' ? '¿Ya tienes cuenta? ' : '¿Nuevo aquí? '}
        <button type="button" onClick={() => { setModo(modo === 'registro' ? 'login' : 'registro'); setError(null); setAviso(null) }}
          className="text-brand-700 font-semibold underline">
          {modo === 'registro' ? 'Inicia sesión' : 'Crea una cuenta'}
        </button>
      </p>
    </form>
  )
}

function traducir(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.'
  if (/already registered|already been registered/i.test(msg)) return 'Ese email ya está registrado. Inicia sesión.'
  if (/at least 6|password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.'
  if (/Email not confirmed/i.test(msg)) return 'Debes confirmar tu email (o desactiva "Confirm email" en Supabase).'
  return msg
}
