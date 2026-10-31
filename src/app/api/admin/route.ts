import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute, supabaseAdmin } from '@/lib/supabase/server'

// Verifica que el usuario sea admin
async function requireAdmin() {
  const supabase = supabaseRoute()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401 as const }

  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, type')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.type !== 'admin') {
    return { error: 'Solo administradores', status: 403 as const }
  }
  return { profile, admin }
}

// GET /api/admin?resource=stats | companies | jobs | candidates | audit
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource') || 'stats'

  switch (resource) {
    case 'stats': {
      const { data } = await admin.from('admin_stats').select('*').single()
      return NextResponse.json({ stats: data })
    }

    case 'companies': {
      const status = searchParams.get('status')
      let q = admin.from('profiles').select('*').eq('type', 'company').order('created_at', { ascending: false })
      if (status && status !== 'all') q = q.eq('status', status)
      const { data } = await q
      return NextResponse.json({ companies: data ?? [] })
    }

    case 'jobs': {
      const { data } = await admin
        .from('jobs')
        .select('*, company:profiles!jobs_company_id_fkey(name, status)')
        .order('created_at', { ascending: false })
      return NextResponse.json({ jobs: data ?? [] })
    }

    case 'candidates': {
      const { data } = await admin
        .from('profiles')
        .select('*')
        .eq('type', 'candidate')
        .order('created_at', { ascending: false })
        .limit(100)
      return NextResponse.json({ candidates: data ?? [] })
    }

    case 'audit': {
      const { data } = await admin
        .from('audit_log')
        .select('*, actor:profiles!audit_log_actor_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(50)
      return NextResponse.json({ audit: data ?? [] })
    }

    default:
      return NextResponse.json({ error: 'Recurso inválido' }, { status: 400 })
  }
}

// PATCH /api/admin — aprobar/rechazar/suspender empresa, o togglear oferta
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const body = await request.json()
  const { action, target_id, reason, active } = body

  switch (action) {
    case 'approve_company': {
      const { error } = await admin.rpc('approve_company', { company_profile_id: target_id })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    case 'reject_company':
    case 'suspend_company': {
      const newStatus = action === 'reject_company' ? 'rejected' : 'suspended'
      const { error } = await admin.rpc('set_company_status', {
        company_profile_id: target_id,
        new_status: newStatus,
        reason: reason ?? null,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    case 'toggle_job': {
      const { error } = await admin.from('jobs').update({ active }).eq('id', target_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }
}
