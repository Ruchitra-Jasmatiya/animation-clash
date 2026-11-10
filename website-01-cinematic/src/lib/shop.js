// Everything the shopper does: sign in with an e-mail code, cart, wishlist, orders, rewards.
// One small store keeps the navbar numbers, the cart and the wishlist in sync across the whole site.
import { useSyncExternalStore } from 'react'
import { getCustomerToken, request, setCustomerToken } from './api'

const VID_KEY = 'massup.vid'
export const visitorId = () => {
  try {
    let v = localStorage.getItem(VID_KEY)
    if (!v) {
      v = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 36)
      localStorage.setItem(VID_KEY, v)
    }
    return v
  } catch { return 'anonymous-visitor' }
}

const call = (path, opts = {}) => request(path, { auth: 'customer', ...opts })
const post = (path, body) => call(path, { method: 'POST', body })

const EMPTY_SUMMARY = { cart: 0, wishlist: 0, orders: 0, scratch_cards: 0, to_verify: 0, loyalty: null }
let state = {
  // 'checking' while we verify a saved login, 'out' = must sign in, 'in' = shopping
  status: getCustomerToken() ? 'checking' : 'out',
  customer: null,
  summary: EMPTY_SUMMARY,
  cart: { items: [], count: 0, subtotal: '0.00', issues: [] },
  wishlist: [],       // product ids
  wishItems: [],
}
const subs = new Set()
const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()) }
export const useShop = () => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb) }, () => state)
export const getShop = () => state

let timer = null
function startPolling() {
  clearInterval(timer)
  timer = setInterval(() => { if (document.visibilityState === 'visible' && state.status === 'in') refreshAll() }, 15000)
}

export async function refreshSummary() {
  try { set({ summary: await call('/my/summary/') }) } catch { /* offline: keep the last numbers */ }
}
export async function refreshCart() {
  try { set({ cart: await call('/my/cart/') }) } catch { /* ignore */ }
}
export async function refreshWishlist() {
  try { const w = await call('/my/wishlist/'); set({ wishlist: w.ids, wishItems: w.items }) } catch { /* ignore */ }
}
export const refreshAll = () => Promise.all([refreshSummary(), refreshCart(), refreshWishlist()])

function signedIn(customer) {
  set({ status: 'in', customer })
  refreshAll()
  startPolling()
}

/** Called once when the site opens: if this browser has a saved login, keep it (no OTP again). */
export async function initSession() {
  if (!getCustomerToken()) { set({ status: 'out' }); return }
  try { signedIn(await call('/customer/me/')) } catch (e) {
    // only forget the login when the server says it is invalid, not when we're simply offline
    if (e.status === 401 || e.status === 403) { setCustomerToken(''); set({ status: 'out' }) }
    else if (state.status === 'checking') set({ status: 'in', customer: state.customer || { name: '', email: '' } })
  }
}

export const requestSignup = (name, email, phone) => post('/customer/signup/', { name, email, phone })
export const requestLogin = (email) => post('/customer/login/', { email })
export async function verifyCode(email, code) {
  const r = await post('/customer/verify/', { email, code })
  setCustomerToken(r.token)
  signedIn(r.customer)
  return r
}
export async function logout() {
  try { await post('/customer/logout/') } catch { /* already expired */ }
  forget()
}
export function forget() {
  clearInterval(timer)
  setCustomerToken('')
  set({ status: 'out', customer: null, summary: EMPTY_SUMMARY, cart: { items: [], count: 0, subtotal: '0.00', issues: [] }, wishlist: [], wishItems: [] })
}
if (typeof window !== 'undefined') window.addEventListener('massup:customer-lost', forget)

export const updateProfile = async (body) => { const c = await call('/customer/me/', { method: 'PATCH', body }); set({ customer: c }); return c }

/* ---------- cart + wishlist ---------- */
export async function addToCart(productId, quantity = 1) {
  const cart = await post('/my/cart/', { product: productId, quantity, add: true })
  set({ cart }); refreshSummary()
  return cart
}
export async function setCartQty(productId, quantity) {
  const cart = await post('/my/cart/', { product: productId, quantity })
  set({ cart }); refreshSummary()
  return cart
}
export async function clearCart() { const cart = await call('/my/cart/', { method: 'DELETE' }); set({ cart }); refreshSummary() }
export async function toggleWishlist(productId) {
  if (state.wishlist.includes(productId)) {
    const w = await call(`/my/wishlist/?product=${productId}`, { method: 'DELETE' })
    set({ wishlist: w.ids, wishItems: w.items })
  } else {
    const r = await post('/my/wishlist/', { product: productId })
    set({ wishlist: r.wishlist.ids, wishItems: r.wishlist.items })
  }
  refreshSummary()
}
export async function moveToCart(productId) {
  const r = await post('/my/wishlist/', { product: productId, move_to_cart: true })
  set({ wishlist: r.wishlist.ids, wishItems: r.wishlist.items, cart: r.cart })
  refreshSummary()
}

/* ---------- checkout, orders, rewards ---------- */
export const getQuote = (coupon_code, reward_id) => post('/my/quote/', { coupon_code, reward_id })
export const checkout = (body) => post('/my/checkout/', body).then((o) => { refreshAll(); return o })
export const getOrders = () => call('/my/orders/')
export const getOrder = (id) => call(`/my/orders/${id}/`)
export const submitPayment = (id, upi_ref) => post(`/my/orders/${id}/submit-payment/`, { upi_ref }).then((o) => { refreshSummary(); return o })
export const cancelOrder = (id) => post(`/my/orders/${id}/cancel/`).then((o) => { refreshAll(); return o })
export const getRewards = () => call('/my/rewards/')
export const scratchCard = (id) => post(`/my/rewards/${id}/scratch/`).then((r) => { refreshSummary(); return r })

/* ---------- public ---------- */
export const getOffers = () => request('/offers/')

/** Page-view counter for the admin's analytics (one tiny request per page). */
export function trackView(path) {
  if (path.startsWith('/manage')) return
  const headers = { 'Content-Type': 'application/json' }
  const t = getCustomerToken()
  if (t) headers.Authorization = `Customer ${t}`
  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  fetch(`${API}/api/track/`, { method: 'POST', headers, keepalive: true, body: JSON.stringify({ visitor_id: visitorId(), path }) }).catch(() => {})
}
