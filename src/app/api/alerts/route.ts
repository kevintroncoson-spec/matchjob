import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute, supabaseAdmin } from '@/lib/supabase/server'

// GET /api/alerts — listar alertas del usuario
export async function GET(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alerts: data })
}

// POST /api/alerts — crear o actualizar alertas
export async function POST(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { tags } = await request.json()
  if (!Array.isArray(tags)) return NextResponse.json({ error: 'tags debe ser un array' }, { status: 400 })

  const admin = supabaseAdmin()

  // Upsert: actualizar si existe, crear si no
  const { data: existing } = await admin
    .from('alerts')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()

  let result
  if (existing) {
    result = await admin
      .from('alerts')
      .update({ tags })
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await admin
      .from('alerts')
      .insert({ user_id: user.id, tags, active: true })
      .select()
      .single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ alert: result.data })
}

// DELETE /api/alerts?tag=... — eliminar un tag de las alertas
export async function DELETE(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tagToRemove = searchParams.get('tag')

  const admin = supabaseAdmin()
  const { data: alert } = await admin
    .from('alerts')
    .select('id, tags')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()

  if (!alert) return NextResponse.json({ message: 'Sin alertas' })

  const newTags = (alert.tags as string[]).filter(t => t !== tagToRemove)
  await admin.from('alerts').update({ tags: newTags }).eq('id', alert.id)

  return NextResponse.json({ tags: newTags })
}
