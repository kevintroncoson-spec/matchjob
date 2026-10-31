import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute, supabaseAdmin } from '@/lib/supabase/server'
import { analyzeMatchWithAI } from '@/lib/matching'

// POST /api/ai/match
// Rate limited: 10 req/min por usuario
const requestCounts = new Map<string, { count: number; reset: number }>()

export async function POST(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Rate limiting básico
  const now = Date.now()
  const userRate = requestCounts.get(user.id)
  if (userRate && now < userRate.reset && userRate.count >= 10) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 })
  }
  if (!userRate || now >= userRate.reset) {
    requestCounts.set(user.id, { count: 1, reset: now + 60_000 })
  } else {
    requestCounts.get(user.id)!.count++
  }

  const { job_id } = await request.json()
  if (!job_id) return NextResponse.json({ error: 'job_id requerido' }, { status: 400 })

  const admin = supabaseAdmin()

  const [{ data: profile }, { data: job }] = await Promise.all([
    admin.from('profiles').select('*').eq('user_id', user.id).single(),
    admin.from('jobs').select('*, company:profiles!jobs_company_id_fkey(id, name)').eq('id', job_id).single(),
  ])

  if (!profile || !job) return NextResponse.json({ error: 'Datos no encontrados' }, { status: 404 })

  try {
    const analysis = await analyzeMatchWithAI(job as any, profile as any)
    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('AI match error:', error)
    return NextResponse.json({ error: 'Error en análisis IA' }, { status: 500 })
  }
}
