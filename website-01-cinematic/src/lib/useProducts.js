import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { FALLBACK_PRODUCTS } from './fallback'

const CACHE_KEY = 'massup.products.v1'
const readCache = () => {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null') } catch { return null }
}
const writeCache = (v) => {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(v)) } catch { /* ignore */ }
}

/**
 * Loads products from Django. Shows the last good copy instantly, refreshes in
 * the background, and only falls back to sample data after ~25s (a sleeping free
 * host can take that long to wake).
 */
export function useProducts() {
  const [products, setProducts] = useState(() => readCache() || [])
  const [status, setStatus] = useState(() => (readCache() ? 'ready' : 'loading')) // loading | ready | fallback
  const [slow, setSlow] = useState(false)

  const load = useCallback(async () => {
    const ctrl = new AbortController()
    const slowTimer = setTimeout(() => setSlow(true), 4000)
    const giveUp = setTimeout(() => ctrl.abort(), 25000)
    try {
      const data = await api.list(ctrl.signal)
      const list = Array.isArray(data) ? data : data?.results || []
      writeCache(list)
      setProducts(list)
      setStatus('ready')
    } catch {
      if (!readCache()) {
        setProducts(FALLBACK_PRODUCTS)
        setStatus('fallback')
      }
    } finally {
      clearTimeout(slowTimer)
      clearTimeout(giveUp)
      setSlow(false)
    }
  }, [])

  useEffect(() => {
    // fetching on mount is the point of this effect; state is only set after the request settles
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  return { products, status, slow, reload: load }
}

export const clearProductCache = () => {
  try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}
