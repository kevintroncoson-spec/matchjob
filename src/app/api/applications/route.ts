import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute, supabaseAdmin } from '@/lib/supabase/server'
import { computeMatchScore } from '@/lib/matching'
import { sendApplicationEmail } from '@/lib/email'

// POST /api/applications — registrar un like (postulación)
export async function POST(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { job_id } = await request.json()
  if (!job_id) return NextResponse.json({ error: 'job_id requerido' }, { status: 400 })

  const admin = supabaseAdmin()

  // Obtener perfil del candidato
  const { data: candidate } = await admin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!candidate) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  // Obtener job + empresa
  const { data: job } = await admin
    .from('jobs')
    .select('*, company:profiles!jobs_company_id_fkey(*)')
    .eq('id', job_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 })

  // Insertar postulación (UNIQUE constraint previene duplicados)
  const { data: application, error: appError } = await admin
    .from('applications')
    .insert({ job_id, candidate_id: candidate.id, status: 'new' })
    .select()
    .single()

  if (appError) {
    if (appError.code === '23505') {
      // Ya había postulado → retiramos (toggle)
      await admin
        .from('applications')
        .delete()
        .eq('job_id', job_id)
        .eq('candidate_id', candidate.id)
      return NextResponse.json({ action: 'removed' })
    }
    return NextResponse.json({ error: appError.message }, { status: 400 })
  }

  // Notificar a la empresa por email (fire-and-forget)
  const matchScore = computeMatchScore(job.tags, candidate.skills)
  const companyProfile = job.company as any
  if (companyProfile?.user_id) {
    const { data: companyUser } = await admin.auth.admin.getUserById(companyProfile.user_id)
    if (companyUser?.user?.email) {
      sendApplicationEmail({
        companyEmail: companyUser.user.email,
        companyName: companyProfile.name,
        candidate,
        job,
        matchScore,
      }).catch(console.error)
    }
  }

  return NextResponse.json({ action: 'applied', application, matchScore })
}

// DELETE /api/applications?job_id=... — retirar postulación
export async function DELETE(request: NextRequest) {
  const supabase = supabaseRoute()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const job_id = searchParams.get('job_id')
  if (!job_id) return NextResponse.json({ error: 'job_id requerido' }, { status: 400 })

  const admin = supabaseAdmin()
  const { data: candidate } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!candidate) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  await admin.from('applications').delete().eq('job_id', job_id).eq('candidate_id', candidate.id)

  return NextResponse.json({ action: 'removed' })
}
