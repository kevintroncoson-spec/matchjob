import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute, supabaseAdmin } from '@/lib/supabase/server'

// Resuelve el perfil de empresa del usuario autenticado
async function getCompanyProfile() {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const }

  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.type !== 'company') {
    return { error: 'Solo empresas', status: 403 as const }
  }
  return { profile, admin, userId: user.id }
}

// GET /api/empresa?resource=me | jobs | candidates
export async function GET(request: NextRequest) {
  const ctx = await getCompanyProfile()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { profile, admin } = ctx

  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource') || 'me'

  switch (resource) {
    case 'me':
      return NextResponse.json({ profile })

    case 'jobs': {
      const { data } = await admin
        .from('jobs')
        .select('*')
        .eq('company_id', profile.id)
        .order('created_at', { ascending: false })
      return NextResponse.json({ jobs: data ?? [] })
    }

    case 'candidates': {
      // Solo si la empresa está aprobada
      if (profile.status !== 'approved') {
        return NextResponse.json({ candidates: [], stats: {}, blocked: true })
      }

      const status = searchParams.get('status')
      const { data: jobs } = await admin.from('jobs').select('id').eq('company_id', profile.id)
      const jobIds = (jobs ?? []).map(j => j.id)
      if (!jobIds.length) return NextResponse.json({ candidates: [], stats: {} })

      let q = admin
        .from('applications')
        .select(`
          *,
          candidate:profiles!applications_candidate_id_fkey(*),
          job:jobs!applications_job_id_fkey(id, title)
        `)
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })

      if (status && status !== 'all') q = q.eq('status', status)
      const { data: apps } = await q

      // Adjuntar experiencia laboral de cada candidato
      const withExp = await Promise.all((apps ?? []).map(async (app: any) => {
        const { data: exp } = await admin
          .from('work_experience')
          .select('*')
          .eq('profile_id', app.candidate_id)
          .order('start_date', { ascending: false })
          .limit(2)
        return { ...app, candidate: { ...app.candidate, work_experience: exp ?? [] } }
      }))

      const all = apps ?? []
      const stats = {
        total: all.length,
        new: all.filter((a: any) => a.status === 'new').length,
        viewed: all.filter((a: any) => a.status === 'viewed').length,
        saved: all.filter((a: any) => a.status === 'saved').length,
      }
      return NextResponse.json({ candidates: withExp, stats })
    }

    default:
      return NextResponse.json({ error: 'Recurso inválido' }, { status: 400 })
  }
}

// POST /api/empresa — registrar empresa o crear oferta
export async function POST(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = supabaseAdmin()
  const body = await request.json()
  const { action } = body

  if (action === 'register') {
    // Convertir el perfil del usuario en empresa (queda pending)
    const { name, company_rut, company_website, company_size, company_industry, contact_email, contact_phone, location } = body
    const { error } = await admin
      .from('profiles')
      .update({
        type: 'company',
        status: 'pending',    // ← espera aprobación del admin
        name,
        company_rut,
        company_website,
        company_size,
        company_industry,
        contact_email,
        contact_phone,
        location,
      })
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, status: 'pending' })
  }

  if (action === 'create_job') {
    const { data: profile } = await admin.from('profiles').select('id, status, type').eq('user_id', user.id).single()
    if (!profile || profile.type !== 'company') return NextResponse.json({ error: 'Solo empresas' }, { status: 403 })
    if (profile.status !== 'approved') {
      return NextResponse.json({ error: 'Tu empresa aún no ha sido aprobada' }, { status: 403 })
    }

    const { title, description, tags, benefits, location, type, salary_min, salary_max, address } = body
    const { data, error } = await admin
      .from('jobs')
      .insert({
        company_id: profile.id,
        title, description,
        tags: tags ?? [],
        benefits: benefits ?? [],
        location, type,
        salary_min: salary_min ?? null,
        salary_max: salary_max ?? null,
        active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, job: data })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}

// PATCH /api/empresa — actualizar estado de candidato o togglear oferta
export async function PATCH(request: NextRequest) {
  const ctx = await getCompanyProfile()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { profile, admin } = ctx

  const body = await request.json()
  const { action } = body

  if (action === 'update_candidate') {
    const { application_id, status } = body
    // Notificar al candidato de la acción
    const { data: app } = await admin
      .from('applications')
      .select('candidate_id, job:jobs!applications_job_id_fkey(title, company_id)')
      .eq('id', application_id)
      .single()

    if (!app || (app.job as any)?.company_id !== profile.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await admin.from('applications').update({ status }).eq('id', application_id)

    // Crear notificación para el candidato
    const { data: candidate } = await admin.from('profiles').select('user_id').eq('id', app.candidate_id).single()
    if (candidate) {
      const titles: Record<string, string> = {
        viewed: 'Tu perfil fue visto',
        saved: 'Te guardaron como candidato',
        rejected: 'Actualización de postulación',
      }
      await admin.from('notifications').insert({
        user_id: candidate.user_id,
        type: status,
        title: titles[status] || 'Actualización',
        company_name: profile.name,
        job_title: (app.job as any)?.title,
        read: false,
      })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle_job') {
    const { job_id, active } = body
    await admin.from('jobs').update({ active }).eq('id', job_id).eq('company_id', profile.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
