import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseRoute } from '@/lib/supabase/server'

// GET /api/jobs?cursor=...&filter=...&limit=10
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const filter = searchParams.get('filter') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

  const supabase = supabaseRoute()

  let query = supabase
    .from('jobs')
    .select(`
      *,
      company:profiles!jobs_company_id_fkey(id, name, avatar_url, location)
    `)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // +1 para saber si hay más

  // Cursor-based pagination
  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  // Filtros
  if (filter && filter !== 'Todos') {
    const f = filter.toLowerCase()
    query = query.or(
      `location.ilike.%${f}%,type.ilike.%${f}%,tags.cs.{${filter}}`
    )
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hasMore = data.length > limit
  const jobs = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore ? jobs[jobs.length - 1].created_at : null

  // Incrementar views en background
  if (jobs.length > 0) {
    const supabaseB = supabaseRoute()
    jobs.forEach(job => {
      supabaseB.rpc('increment_job_views', { job_id: job.id }).then(() => {})
    })
  }

  return NextResponse.json({ jobs, cursor: nextCursor, hasMore })
}
