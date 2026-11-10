/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'

/* ---------- formatting ---------- */
export const inr = (v, digits = 2) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(v) || 0)
export const inr0 = (v) => inr(v, 0)
export const fmtDate = (iso, withTime = true) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', withTime ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' })
}
export const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null)
export const deviceOf = (ua = '') => {
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : ''
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : ''
  return [br, os].filter(Boolean).join(' · ') || (ua ? ua.slice(0, 30) : '—')
}

/* ---------- icons ---------- */
const PATHS = {
  dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  box: 'M21 8 12 3 3 8m18 0v8l-9 5m9-13-9 5m0 8-9-5V8m9 5v8M7.5 5.5l9 5',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-5h.01',
  image: 'M4 5h16v14H4V5Zm0 11 5-5 4 4 3-3 4 4M9 9.5h.01',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Zm-3 9 2 2 4-4',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2-1.2L14.700 3h-4l-.3 2.700a7.600 7.600 0 0 0-2 1.200l-2.300-1-2 3.400 2 1.500a7.400 7.400 0 0 0 0 2.400l-2 1.500 2 3.400 2.300-1a7.600 7.600 0 0 0 2 1.200l.3 2.700h4l.3-2.700a7.600 7.600 0 0 0 2-1.200l2.300 1 2-3.400-2-1.500c.1-.4.100-.8.100-1.200Z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 3-4-4',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  print: 'M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7v-7Z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h11',
  external: 'M14 4h6v6m0-6-9 9M18 14v6H4V6h6',
  check: 'm5 12 5 5 9-10',
  x: 'M6 6l12 12M18 6 6 18',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 20h16',
  link: 'M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1',
  refresh: 'M20 11a8 8 0 1 0-2 6m2 4v-6h-6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
  play: 'M8 5v14l11-7L8 5Z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0M16 3.500a4 4 0 0 1 0 7.500M18 14.500a7 7 0 0 1 4 6.500',
  calendar: 'M4 6h16v14H4V6Zm0 5h16M8 3v4m8-4v4',
  gift: 'M3 9h18v4H3V9Zm2 4h14v8H5v-8Zm7-4v12M12 9c-2 0-4-1-4-3a2 2 0 0 1 4 0 2 2 0 0 1 4 0c0 2-2 3-4 3Z',
  chart: 'M4 20V10m6 10V4m6 16v-7m5 7H3',
  card: 'M3 6h18v12H3V6Zm0 4h18M7 15h3',
}
export function Icon({ name, size = 20 }) {
  return (
    <svg className="ad-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || ''} />
    </svg>
  )
}

/* ---------- toast ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [t, setT] = useState(null)
  const timer = useRef()
  const show = useCallback((msg, type = 'ok') => {
    clearTimeout(timer.current)
    setT({ msg, type, id: Date.now() })
    timer.current = setTimeout(() => setT(null), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <AnimatePresence>
        {t && (
          <motion.div key={t.id} className={`ad-toast ${t.type}`} role="status" initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}>
            <Icon name={t.type === 'err' ? 'x' : 'check'} size={18} /> {t.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  )
}

/* ---------- data hook ---------- */
export function useAsync(fn, deps = []) {
  const [state, set] = useState({ data: null, loading: true, error: '' })
  const reload = useCallback(async () => {
    set((s) => ({ ...s, loading: true, error: '' }))
    try {
      set({ data: await fn(), loading: false, error: '' })
    } catch (e) {
      set((s) => ({ ...s, loading: false, error: e.message || 'Something went wrong' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    reload()
  }, [reload])
  return { ...state, reload, setData: (d) => set((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) }
}

/* ---------- modal ---------- */
export function Modal({ onClose, children, wide = false, label = 'Dialog' }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <motion.div className="ad-modal" role="dialog" aria-modal="true" aria-label={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className={`ad-sheet${wide ? ' wide' : ''}`} data-lenis-prevent initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
        {children}
      </motion.div>
    </motion.div>
  )
}

export function Confirm({ title, text, action = 'Delete', onYes, onNo }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal onClose={onNo} label={title}>
      <div className="ad-confirm">
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="ad-row end">
          <button className="ad-btn ghost" onClick={onNo}>Cancel</button>
          <button className="ad-btn danger" disabled={busy} onClick={async () => { setBusy(true); try { await onYes() } finally { setBusy(false) } }}>{busy ? 'Working…' : action}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------- small pieces ---------- */
export function PageHead({ title, sub, children }) {
  return (
    <div className="ad-pagehead">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="ad-row">{children}</div>
    </div>
  )
}
export const Empty = ({ icon = 'box', title, text, children }) => (
  <div className="ad-empty">
    <span><Icon name={icon} size={30} /></span>
    <h3>{title}</h3>
    {text && <p>{text}</p>}
    {children}
  </div>
)
export const Spinner = ({ label = 'Loading…' }) => <div className="ad-spin" role="status"><i />{label}</div>
export const ErrorBox = ({ message, onRetry }) => (
  <div className="ad-error" role="alert">{message} {onRetry && <button className="ad-link" onClick={onRetry}>Try again</button>}</div>
)

const STATUS_LABEL = { pending: 'Pending', paid: 'Paid', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }
export const PAY_LABEL = { unpaid: 'Unpaid', submitted: 'To verify', paid: 'Paid', rejected: 'Not found' }
export const PayBadge = ({ order }) => (order.status === 'cancelled' ? <span className="ad-badge s-cancelled">Cancelled</span> : <span className={`ad-badge p-${order.payment_status}`}>{PAY_LABEL[order.payment_status] || order.payment_status}</span>)
export const StatusBadge = ({ status }) => <span className={`ad-badge s-${status}`}>{STATUS_LABEL[status] || status}</span>
export const STATUSES = Object.keys(STATUS_LABEL)
export const statusLabel = (s) => STATUS_LABEL[s] || s

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-IN') }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const c = animate(0, Number(value) || 0, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setN })
    return () => c.stop()
  }, [value])
  return <>{format(n)}</>
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`ad-field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}
