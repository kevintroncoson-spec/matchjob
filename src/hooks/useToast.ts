'use client'

import { useState, useCallback, useRef } from 'react'

interface Toast {
  message: string
  icon: string
  visible: boolean
}

export function useToast() {
  const [toast, setToast] = useState<Toast>({ message: '', icon: '✓', visible: false })
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const show = useCallback((message: string, icon = '✓') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, icon, visible: true })
    timerRef.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }))
      timerRef.current = null
    }, 3000)
  }, [])

  return { toast, show }
}
