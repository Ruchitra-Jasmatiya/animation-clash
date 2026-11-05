import { useEffect, useState } from 'react'
import { mediaSrc, publicGet } from './api'
import { DEFAULT_MEDIA } from './defaults'

const KEY = 'massup.media.v1'
const read = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { return null }
}

/**
 * Images/videos chosen in the admin (Site media). Falls back to the built-in defaults,
 * so the site always looks complete even if the backend is asleep.
 */
export function useSiteMedia() {
  const [items, setItems] = useState(() => read() || [])

  useEffect(() => {
    let alive = true
    publicGet('/site-media/')
      .then((list) => {
        if (!alive || !Array.isArray(list)) return
        setItems(list)
        try { sessionStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const bySlot = Object.fromEntries(items.map((i) => [i.slot, i]))
  return {
    url: (slot) => mediaSrc(bySlot[slot]?.url) || DEFAULT_MEDIA[slot] || '',
    custom: (slot) => !!bySlot[slot]?.url,
  }
}
