// Tiny "live data" engine: shows the last good copy instantly, then keeps it fresh.
//  - refreshes on mount, every `interval` ms while the tab is visible, when the tab regains focus / goes online
//  - the admin panel calls notifyStoreChanged() after any save, which makes every open tab refresh immediately
import { useSyncExternalStore } from 'react'

const CHANNEL = 'massup-live'
const BUMP_KEY = 'massup.bump'
const registry = new Set()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null

const readCache = (key) => {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null') } catch { return null }
}
const writeCache = (key, v) => {
  try { sessionStorage.setItem(key, JSON.stringify(v)) } catch { /* private mode */ }
}

export function createLive({ key, fetcher, fallback = null, interval = 10000 }) {
  const cached = readCache(key)
  let state = { data: cached, status: cached ? 'ready' : 'loading', slow: false, version: 0 }
  const subs = new Set()
  let timer = null
  let slowTimer = null
  let inflight = false
  let fails = 0

  const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()) }

  async function refresh() {
    if (inflight) return
    inflight = true
    const ctrl = new AbortController()
    const giveUp = setTimeout(() => ctrl.abort(), 25000)
    if (!state.data) slowTimer = setTimeout(() => set({ slow: true }), 4000)
    try {
      const data = await fetcher(ctrl.signal)
      fails = 0
      writeCache(key, data)
      if (JSON.stringify(data) !== JSON.stringify(state.data) || state.status !== 'ready') {
        set({ data, status: 'ready', slow: false, version: state.version + 1 })
      } else if (state.slow) set({ slow: false })
    } catch {
      fails += 1
      if (!state.data && fallback) set({ data: fallback, status: 'fallback', slow: false })
    } finally {
      clearTimeout(giveUp)
      clearTimeout(slowTimer)
      inflight = false
    }
  }

  const schedule = () => {
    clearTimeout(timer)
    if (!subs.size) return
    const wait = Math.min(interval * 2 ** Math.min(fails, 3), 60000)
    timer = setTimeout(async () => {
      if (document.visibilityState === 'visible') await refresh()
      schedule()
    }, wait)
  }

  const wake = () => { if (subs.size && document.visibilityState === 'visible') { refresh(); schedule() } }

  const resource = {
    refresh,
    subscribe(fn) {
      const first = subs.size === 0
      subs.add(fn)
      if (first) {
        document.addEventListener('visibilitychange', wake)
        window.addEventListener('focus', wake)
        window.addEventListener('online', wake)
      }
      refresh()
      schedule()
      return () => {
        subs.delete(fn)
        if (!subs.size) {
          clearTimeout(timer)
          document.removeEventListener('visibilitychange', wake)
          window.removeEventListener('focus', wake)
          window.removeEventListener('online', wake)
        }
      }
    },
    getSnapshot: () => state,
    clear() { try { sessionStorage.removeItem(key) } catch { /* ignore */ } },
  }
  registry.add(resource)
  return resource
}

export const useLive = (resource) => useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot)

const refreshAll = () => registry.forEach((r) => r.refresh())
if (channel) channel.onmessage = (e) => e.data === 'changed' && refreshAll()
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => e.key === BUMP_KEY && refreshAll())

/** Call after the admin saves anything: other open tabs refresh now; this tab refreshes the next time the site is shown. */
export function notifyStoreChanged() {
  registry.forEach((r) => r.clear())
  refreshAll()
  try { channel?.postMessage('changed') } catch { /* ignore */ }
  try { localStorage.setItem(BUMP_KEY, String(Date.now())) } catch { /* ignore */ }
}