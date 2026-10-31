'use client'

import { useEffect } from 'react'

// Registra el service worker para habilitar la PWA
export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencioso: si falla, la app sigue funcionando sin offline
      })
    }
  }, [])
  return null
}
