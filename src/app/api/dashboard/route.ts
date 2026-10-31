import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute, supabaseAdmin } from '@/lib/supabase/server'

// GET /api/dashboard?job_id=...&status=...
// Solo accesible para empresas
export async function GET(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('id, type').eq('user_id', user.id).single()
  if (!profile || profile.type !== 'company') {
    return NextResponse.json({ error: 'Solo empresas pueden acceder' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('job_id')
  const status = searchParams.get('status')

  // Obtener IDs de las ofertas de esta empresa
  let jobsQuery = admin.from('jobs').select('id').eq('company_id', profile.id).eq('active', true)
  if (jobId) jobsQuery = admin.from('jobs').select('id').eq('id', jobId).eq('company_id', profile.id)

  const { data: jobs } = await jobsQuery
  const jobIds = (jobs || []).map(j => j.id)
  if (jobIds.length === 0) return NextResponse.json({ applications: [], stats: {} })

  // Obtener postulaciones con perfil del candidato
  let appQuery = admin
    .from('applications')
    .select(`
      *,
      candidate:profiles!applications_candidate_id_fkey(*),
      job:jobs!applications_job_id_fkey(id, title, tags)
    `)
    .in('job_id', jobIds)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') appQuery = appQuery.eq('status', status)

  const { data: applications, error } = await appQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calcular stats
  const all = applications || []
  const stats = {
    total: all.length,
    new: all.filter(a => a.status === 'new').length,
    viewed: all.filter(a => a.status === 'viewed').length,
    saved: all.filter(a => a.status === 'saved').length,
    rejected: all.filter(a => a.status === 'rejected').length,
  }

  return NextResponse.json({ applications, stats })
}

// PATCH /api/dashboard — actualizar estado de postulación
export async function PATCH(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { application_id, status } = await request.json()
  const validStatuses = ['new', 'viewed', 'saved', 'rejected']
  if (!validStatuses.includes(status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  const admin = supabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  // Verificar que la postulación pertenece a una oferta de esta empresa
  const { data: app } = await admin
    .from('applications')
    .select('id, job:jobs!applications_job_id_fkey(company_id)')
    .eq('id', application_id)
    .single()

  if (!app || (app.job as any)?.company_id !== profile.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: updated, error } = await admin
    .from('applications')
    .update({ status })
    .eq('id', application_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: updated })
}
