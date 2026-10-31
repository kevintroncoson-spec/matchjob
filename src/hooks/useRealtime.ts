'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Application } from '@/types'

// Escucha nuevas postulaciones en tiempo real para el dashboard de empresa
export function useRealtimeApplications(companyJobIds: string[], onNew: (app: Application) => void) {
  useEffect(() => {
    if (!companyJobIds.length) return

    const channel = supabase
      .channel('new-applications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications',
          filter: `job_id=in.(${companyJobIds.join(',')})`,
        },
        (payload) => {
          onNew(payload.new as Application)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [companyJobIds.join(','), onNew])
}
