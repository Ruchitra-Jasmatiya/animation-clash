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
export const mediaSrc = (s) => (s && s.startsWith('/media/') ? API + s : s)

export function imgSrc(product) {
  const s = (product && (product.image_display || product.image_url)) || ''
  return s ? mediaSrc(s) : PLACEHOLDER_IMG
}

export const formatPrice = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)
}

export const discountPercent = (p) => {
  const price = Number(p?.price), mrp = Number(p?.mrp)
  return mrp > price && price >= 0 ? Math.round(((mrp - price) / mrp) * 100) : 0
}

const CUSTOMER_KEY = 'massup.customer'
export const getCustomerToken = () => {
  try { return localStorage.getItem(CUSTOMER_KEY) || '' } catch { return '' }
}
export const setCustomerToken = (t) => {
  try { t ? localStorage.setItem(CUSTOMER_KEY, t) : localStorage.removeItem(CUSTOMER_KEY) } catch { /* private mode */ }
}
const onAdminPage = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/manage')

/** auth: true = store manager (Token), 'customer' = shopper (Customer), 'auto' = whichever applies to this page. */
export async function request(path, { method = 'GET', body, auth = false, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (auth === 'auto') auth = onAdminPage() ? true : 'customer'
  if (auth === 'customer') headers.Authorization = `Customer ${getCustomerToken()}`
  else if (auth) headers.Authorization = `Token ${getToken()}`
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers,
    signal,
    cache: 'no-store',
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  if (auth === 'customer' && res.status === 401) window.dispatchEvent(new Event('massup:customer-lost'))
  else if (auth && res.status === 401) window.dispatchEvent(new Event('massup:auth-lost'))
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
  list: (signal) => request('/products/', { signal, auth: 'auto' }),
  create: (fd) => request('/products/', { method: 'POST', body: fd, auth: true }),
  update: (id, fd) => request(`/products/${id}/`, { method: 'PATCH', body: fd, auth: true }),
  remove: (id) => request(`/products/${id}/`, { method: 'DELETE', auth: true }),
  login: (username, password) => request('/auth/login/', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me/', { auth: true }),
  logout: () => request('/auth/logout/', { method: 'POST', auth: true }),
}

/** Signed-in calls for the store manager. */
export const adm = {
  get: (p) => request(p, { auth: true }),
  post: (p, body) => request(p, { method: 'POST', body, auth: true }),
  patch: (p, body) => request(p, { method: 'PATCH', body, auth: true }),
  put: (p, body) => request(p, { method: 'PUT', body, auth: true }),
  del: (p) => request(p, { method: 'DELETE', auth: true }),
}
export const publicGet = (p) => request(p)
