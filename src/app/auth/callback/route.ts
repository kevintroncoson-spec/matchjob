import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/feed'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const admin = supabaseAdmin()
      const meta = data.user.user_metadata ?? {}

      const { data: profile } = await admin
        .from('profiles')
        .select('id, avatar_url, contact_email, role, skills, salary_min')
        .eq('user_id', data.user.id)
        .single()

      if (!profile) {
        // Por si el trigger de la BD no creó el perfil: lo creamos con los datos del proveedor
        await admin.from('profiles').insert({
          user_id: data.user.id,
          name: meta.full_name || meta.name || data.user.email?.split('@')[0] || 'Usuario',
          avatar_url: meta.avatar_url || meta.picture || null,
          contact_email: data.user.email ?? null,
          type: 'candidate',
          skills: [],
          expected_benefits: [],
        })
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Completar datos del proveedor (foto/correo) que falten, sin pisar lo que el usuario ya editó
      const fill: Record<string, any> = {}
      if (!profile.avatar_url && (meta.avatar_url || meta.picture)) fill.avatar_url = meta.avatar_url || meta.picture
      if (!profile.contact_email && data.user.email) fill.contact_email = data.user.email
      if (Object.keys(fill).length > 0) {
        await admin.from('profiles').update(fill).eq('user_id', data.user.id)
      }

      // Perfil recién creado / sin completar → onboarding; si ya tiene preferencias → feed
      const incompleto = profile.salary_min == null && !profile.role && (profile.skills?.length ?? 0) === 0
      return NextResponse.redirect(`${origin}${incompleto ? '/onboarding' : next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
