import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './database.types'

// Cliente para componentes React (browser)
export const supabase = createClientComponentClient<Database>()

// Helper: login con Google OAuth
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

// Helper: login con LinkedIn OAuth
export async function signInWithLinkedIn() {
  return supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
}

// Helper: cerrar sesión
export async function signOut() {
  return supabase.auth.signOut()
}

// Helper: obtener sesión actual
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Helper: obtener perfil del usuario
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}
