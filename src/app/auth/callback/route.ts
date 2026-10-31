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
      // Crear perfil si es primer login
      const admin = supabaseAdmin()
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .single()

      if (!existing) {
        // Pre-rellenar desde metadata OAuth
        const meta = data.user.user_metadata
        await admin.from('profiles').insert({
          user_id: data.user.id,
          name: meta.full_name || meta.name || data.user.email?.split('@')[0] || 'Usuario',
          avatar_url: meta.avatar_url || meta.picture || null,
          type: 'candidate', // por defecto; se puede cambiar en onboarding
          skills: [],
          expected_benefits: [],
        })
        // Primer login → onboarding
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
