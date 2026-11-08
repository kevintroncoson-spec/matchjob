import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute, supabaseAdmin } from '@/lib/supabase/server'

// Mapea las opciones del onboarding a valores de BD
const SALARY_MAP: Record<string, [number, number]> = {
  'Hasta $800K':   [0, 800000],
  '$800K–$1.2M':   [800000, 1200000],
  '$1.2M–$1.8M':   [1200000, 1800000],
  '$1.8M–$2.5M':   [1800000, 2500000],
  '$2.5M–$3.5M':   [2500000, 3500000],
  'Sobre $3.5M':   [3500000, 5000000],
}
const MODALITY_MAP: Record<string, string> = {
  '100% Remoto': 'remote',
  'Híbrido (2–3 días)': 'hybrid',
  'Presencial': 'onsite',
  'Flexible / Indistinto': 'flexible',
}
const COMMUTE_MAP: Record<string, number> = {
  'No aplica (remoto)': 0, 'Hasta 20 min': 20, 'Hasta 30 min': 30,
  'Hasta 45 min': 45, 'Hasta 1 hora': 60, 'Más de 1 hora': 90,
}
const AVAILABILITY_MAP: Record<string, number> = {
  'Inmediato': 0, 'En 15 días': 15, 'En 1 mes': 30, 'En 2 meses': 60, 'Conversable': -1,
}

// POST /api/profile — guardar onboarding
export async function POST(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { salary, modality, distance, available, benefits, name, role, location, skills, phone } = body

  const [salary_min, salary_max] = SALARY_MAP[salary] ?? [null, null]

  const admin = supabaseAdmin()
  const { error } = await admin
    .from('profiles')
    .update({
      ...(name && { name }),
      ...(role && { role }),
      ...(location && { location }),
      ...(phone && { phone }),
      ...(skills && { skills }),
      salary_min, salary_max,
      modality: MODALITY_MAP[modality] ?? null,
      max_commute_minutes: COMMUTE_MAP[distance] ?? 0,
      availability_days: AVAILABILITY_MAP[available] ?? 0,
      expected_benefits: benefits ?? [],
    })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// GET /api/profile — obtener perfil propio + experiencia + postulaciones
export async function GET() {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { data: experience } = await admin
    .from('work_experience').select('*').eq('profile_id', profile.id)
    .order('start_date', { ascending: false })

  const { count: applicationsCount } = await admin
    .from('applications').select('id', { count: 'exact', head: true }).eq('candidate_id', profile.id)

  return NextResponse.json({ profile, experience: experience ?? [], applicationsCount: applicationsCount ?? 0 })
}

// PATCH /api/profile — editar datos del perfil (sin tocar las preferencias del onboarding)
export async function PATCH(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, role, location, bio, phone, skills } = await request.json()

  const update: Record<string, any> = {}
  if (typeof name === 'string' && name.trim()) update.name = name.trim()
  if (role !== undefined) update.role = role || null
  if (location !== undefined) update.location = location || null
  if (bio !== undefined) update.bio = bio || null
  if (phone !== undefined) update.phone = phone || null
  if (Array.isArray(skills)) update.skills = skills

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { error } = await admin.from('profiles').update(update).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
