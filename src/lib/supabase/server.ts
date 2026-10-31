import { createRouteHandlerClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

// Cliente para Server Components
export function supabaseServer() {
  return createServerComponentClient<Database>({ cookies })
}

// Cliente para Route Handlers (API routes)
export function supabaseRoute() {
  return createRouteHandlerClient<Database>({ cookies })
}

// Cliente admin con Service Role (solo para operaciones privilegiadas en servidor)
export function supabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
