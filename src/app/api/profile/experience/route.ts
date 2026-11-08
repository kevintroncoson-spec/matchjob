import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute, supabaseAdmin } from '@/lib/supabase/server'

// Devuelve el id del perfil del usuario autenticado
async function getProfileId(userId: string): Promise<string | undefined> {
  const admin = supabaseAdmin()
  const { data } = await admin.from('profiles').select('id').eq('user_id', userId).single()
  return data?.id
}

// POST /api/profile/experience — agregar una experiencia laboral
export async function POST(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { company_name, role, is_current, start_date, end_date } = await request.json()
  if (!company_name?.trim() || !role?.trim()) {
    return NextResponse.json({ error: 'Empresa y cargo son obligatorios' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('work_experience')
    .insert({
      profile_id: profileId,
      company_name: company_name.trim(),
      role: role.trim(),
      is_current: !!is_current,
      start_date: start_date || null,
      end_date: is_current ? null : (end_date || null),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ experience: data })
}

// DELETE /api/profile/experience?id=... — eliminar una experiencia propia
export async function DELETE(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  if (!profileId) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const admin = supabaseAdmin()
  // El filtro por profile_id asegura que solo borra experiencias propias
  const { error } = await admin.from('work_experience').delete().eq('id', id).eq('profile_id', profileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
