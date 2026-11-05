import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adm, api, getToken, setToken } from '../../lib/api'
import { clearProductCache } from '../../lib/useProducts'
import { Icon, ToastProvider } from './ui'
import Dashboard from './Dashboard'
import ProductsAdmin from './ProductsAdmin'
import Billing from './Billing'
import InvoiceBuilder from './InvoiceBuilder'
import InvoiceView from './InvoiceView'
import Coupons from './Coupons'
import MediaAdmin from './MediaAdmin'
import Security from './Security'
import Settings from './Settings'
import '../../admin.css'

const NAV = [
  { to: '/manage', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/manage/products', label: 'Products', icon: 'box' },
  { to: '/manage/billing', label: 'Billing', icon: 'receipt' },
  { to: '/manage/coupons', label: 'Coupons', icon: 'tag' },
  { to: '/manage/media', label: 'Site media', icon: 'image' },
  { to: '/manage/security', label: 'Security log', icon: 'shield' },
  { to: '/manage/settings', label: 'Settings', icon: 'gear' },
]

export default function AdminApp() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(!!getToken())

  const signOut = useCallback(() => { setToken(''); setUser(null) }, [])

  useEffect(() => {
    if (!getToken()) return
    adm.get('/auth/me/').then((r) => setUser(r.username)).catch(() => setToken('')).finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    window.addEventListener('massup:auth-lost', signOut)
    return () => window.removeEventListener('massup:auth-lost', signOut)
  }, [signOut])

  useEffect(() => { clearProductCache() }, [user])

  return (
    <ToastProvider>
      <div className="ad-root" data-lenis-prevent>
        {checking ? <div className="ad-boot"><i /></div> : !user ? <Login onDone={setUser} /> : <Shell user={user} onLogout={async () => { try { await api.logout() } catch { /* already expired */ } signOut() }} />}
      </div>
    </ToastProvider>
  )
}

function Shell({ user, onLogout }) {
  const { pathname } = useLocation()
  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <Link to="/manage" className="ad-brand">MASSUP<i>.</i><small>Store manager</small></Link>
        <nav aria-label="Manager">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `ad-nav${isActive ? ' on' : ''}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.i layoutId="navpill" className="ad-pill" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <Icon name={n.icon} /> <span>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ad-side-foot">
          <a className="ad-nav" href="/" target="_blank" rel="noreferrer"><Icon name="external" /> <span>View website</span></a>
          <div className="ad-user"><span><Icon name="user" size={18} /></span><div><b>{user}</b><small>Administrator</small></div></div>
          <button className="ad-nav" onClick={onLogout}><Icon name="logout" /> <span>Sign out</span></button>
        </div>
      </aside>

      <header className="ad-top">
        <Link to="/manage" className="ad-brand">MASSUP<i>.</i></Link>
        <button className="ad-icon-btn" onClick={onLogout} aria-label="Sign out"><Icon name="logout" /></button>
      </header>

      <main className="ad-main">
        <motion.div key={pathname} className="ad-page" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductsAdmin />} />
              <Route path="billing" element={<Billing />} />
              <Route path="billing/new" element={<InvoiceBuilder />} />
              <Route path="billing/:id" element={<InvoiceView />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="media" element={<MediaAdmin />} />
              <Route path="security" element={<Security />} />
              <Route path="settings" element={<Settings user={user} />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </motion.div>
      </main>

      <nav className="ad-bottom" aria-label="Manager (mobile)">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `ad-tab${isActive ? ' on' : ''}`}>
            <Icon name={n.icon} size={21} /><span>{n.label.replace('Security log', 'Security').replace('Site media', 'Media')}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function Login({ onDone }) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await api.login(u.trim(), p)
      setToken(r.token); onDone(r.username)
    } catch (e2) {
      setErr(e2.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="ad-login">
      <div className="ad-login-art" aria-hidden="true">
        <img src="/images/massup-01-jar-hero.jpg" alt="" />
        <p>Fuel your <em>better.</em></p>
      </div>
      <motion.form className="ad-login-card" onSubmit={submit} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
        <span className="ad-brand big">MASSUP<i>.</i></span>
        <h1>Welcome back</h1>
        <p className="ad-muted">Sign in to manage products, invoices, coupons and your website.</p>
        <label className="ad-field"><span>Username</span><input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoFocus required /></label>
        <label className="ad-field"><span>Password</span><input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></label>
        {err && <p className="ad-formerr" role="alert">{err}</p>}
        <button className="ad-btn primary lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="ad-muted center">← Back to the website</Link>
        <p className="ad-fine">Every sign-in attempt is recorded in the Security log.</p>
      </motion.form>
    </div>
  )
}
