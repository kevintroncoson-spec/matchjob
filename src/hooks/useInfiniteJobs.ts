'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import type { FeedResponse } from '@/types'

async function fetchJobs({ pageParam, filter }: { pageParam: string | null; filter: string }): Promise<FeedResponse> {
  const params = new URLSearchParams({ limit: '10', filter })
  if (pageParam) params.set('cursor', pageParam)
  const res = await fetch(`/api/jobs?${params}`)
  if (!res.ok) throw new Error('Error cargando ofertas')
  return res.json()
}

export function useInfiniteJobs(filter: string) {
  return useInfiniteQuery({
    queryKey: ['jobs', filter],
    queryFn: ({ pageParam }) => fetchJobs({ pageParam: pageParam as string | null, filter }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  })
}
