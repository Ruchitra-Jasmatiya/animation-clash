import { api } from './api'
import { FALLBACK_PRODUCTS } from './fallback'
import { createLive, useLive, notifyStoreChanged } from './live'

const normalise = (d) => (Array.isArray(d) ? d : d?.results || [])

const productsLive = createLive({
  key: 'massup.products.v2',
  fetcher: async (signal) => normalise(await api.list(signal)),
  fallback: FALLBACK_PRODUCTS,
  interval: 8000,
})

/**
 * Live products from Django. Cached copy shows instantly, then it re-checks every few seconds,
 * on tab focus, and instantly after the admin saves something.
 */
export function useProducts() {
  const s = useLive(productsLive)
  return { products: s.data || [], status: s.status, slow: s.slow, version: s.version, reload: productsLive.refresh }
}

export const clearProductCache = () => notifyStoreChanged()