// All talking to the Django backend lives here.
const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'massup.token'

export const PLACEHOLDER_IMG = '/images/massup-01-jar-hero.jpg'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ }
}

/** Uploaded files come back as /media/... (served via the backend); URLs pass through untouched. */
export function imgSrc(product) {
  const s = (product && (product.image_display || product.image_url)) || ''
  if (!s) return PLACEHOLDER_IMG
  if (s.startsWith('/media/')) return API + s
  return s
}

export const formatPrice = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)
}

async function request(path, { method = 'GET', body, auth = false, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (auth) headers.Authorization = `Token ${getToken()}`
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers,
    signal,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  let data = null
  try { data = await res.json() } catch { /* not json */ }
  if (!res.ok) {
    const err = new Error(extractError(data) || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

function extractError(data) {
  if (!data) return ''
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const first = Object.entries(data)[0]
  if (!first) return ''
  const [k, v] = first
  return `${k}: ${Array.isArray(v) ? v[0] : v}`
}

export const api = {
  list: (signal) => request('/products/', { signal }),
  create: (fd) => request('/products/', { method: 'POST', body: fd, auth: true }),
  update: (id, fd) => request(`/products/${id}/`, { method: 'PATCH', body: fd, auth: true }),
  remove: (id) => request(`/products/${id}/`, { method: 'DELETE', auth: true }),
  login: (username, password) => request('/auth/login/', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me/', { auth: true }),
  logout: () => request('/auth/logout/', { method: 'POST', auth: true }),
}
