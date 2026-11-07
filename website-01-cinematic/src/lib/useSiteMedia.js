import { mediaSrc, publicGet } from './api'
import { DEFAULT_MEDIA } from './defaults'
import { createLive, useLive, notifyStoreChanged } from './live'

const mediaLive = createLive({
  key: 'massup.media.v2',
  fetcher: async () => {
    const list = await publicGet('/site-media/')
    if (!Array.isArray(list)) throw new Error('bad media')
    return list
  },
  interval: 10000,
})

/**
 * Images/videos chosen in the admin (Site media). Live, and falls back to the built-in defaults,
 * so the site always looks complete even if the backend is asleep.
 */
export function useSiteMedia() {
  const items = useLive(mediaLive).data || []
  const bySlot = Object.fromEntries(items.map((i) => [i.slot, i]))
  return {
    url: (slot) => mediaSrc(bySlot[slot]?.url) || DEFAULT_MEDIA[slot] || '',
    custom: (slot) => !!bySlot[slot]?.url,
  }
}

export const clearMediaCache = () => notifyStoreChanged()
