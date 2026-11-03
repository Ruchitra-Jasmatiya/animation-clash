import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api, formatPrice, getToken, imgSrc, setToken } from '../lib/api'
import { clearProductCache } from '../lib/useProducts'

const EMPTY = { name: '', price: '', size: '', flavour: 'Pistachio', description: '', in_stock: true, image_url: '' }

export default function Manage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(!!getToken())
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null) // null | 'new' | product
  const [confirm, setConfirm] = useState(null)
  const [msg, setMsg] = useState('')

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try { setProducts(await api.list()) } catch (e) { flash(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!getToken()) return
    api.me().then(() => { setAuthed(true); load() }).catch(() => setToken('')).finally(() => setChecking(false))
  }, [load])

  const logout = async () => {
    try { await api.logout() } catch { /* token may be stale */ }
    setToken(''); setAuthed(false)
  }

  const remove = async (p) => {
    try {
      await api.remove(p.id)
      setProducts((l) => l.filter((x) => x.id !== p.id))
      clearProductCache(); setConfirm(null); flash('Product deleted.')
    } catch (e) { flash(e.message) }
  }

  const saved = (p, isNew) => {
    setProducts((l) => (isNew ? [p, ...l] : l.map((x) => (x.id === p.id ? p : x))))
    clearProductCache(); setEditing(null); flash(isNew ? 'Product added — it is live on the site.' : 'Changes saved.')
  }

  if (checking) return <main className="mg"><p className="mg-center">Checking sign-in…</p></main>
  if (!authed) return <Login onDone={() => { setAuthed(true); load() }} />

  return (
    <main className="mg">
      <header className="mg-head">
        <div>
          <span className="eyebrow">Store manager</span>
          <h1>Products</h1>
        </div>
        <div className="mg-actions">
          <Link to="/products" className="btn btn-line btn-sm">View site ↗</Link>
          <button className="btn btn-dark btn-sm" onClick={() => setEditing('new')}>+ Add product</button>
          <button className="btn btn-line btn-sm" onClick={logout}>Log out</button>
        </div>
      </header>

      {loading && !products.length ? <p className="mg-center">Loading…</p> : null}
      {!loading && !products.length ? <p className="mg-center">No products yet. Add your first one.</p> : null}

      <motion.ul className="mg-list" layout>
        <AnimatePresence initial={false}>
          {products.map((p) => (
            <motion.li key={p.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.4 }}>
              <img src={imgSrc(p)} alt="" />
              <div className="mg-info">
                <strong>{p.name}</strong>
                <span>{formatPrice(p.price)} · {p.size || '—'} · {p.in_stock ? 'In stock' : 'Sold out'}</span>
              </div>
              <div className="mg-row-actions">
                <button className="btn btn-line btn-sm" onClick={() => setEditing(p)}>Edit / rename</button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirm(p)}>Delete</button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence>
        {editing && <Editor key="ed" product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={saved} onAuthLost={() => { setToken(''); setAuthed(false) }} />}
        {confirm && (
          <motion.div key="cf" className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)}>
            <motion.div className="confirm" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h3>Delete “{confirm.name}”?</h3>
              <p>This removes it from the website immediately and can't be undone.</p>
              <div className="mg-actions">
                <button className="btn btn-line btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(confirm)}>Yes, delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{msg && <motion.div className="toast" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>{msg}</motion.div>}</AnimatePresence>
    </main>
  )
}

function Login({ onDone }) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await api.login(u.trim(), p)
      setToken(r.token); onDone()
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <main className="mg mg-login">
      <motion.form className="login-card" onSubmit={submit} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
        <span className="eyebrow">Store manager</span>
        <h1>Sign in</h1>
        <label>Username<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></label>
        {err && <p className="form-err" role="alert">{err}</p>}
        <button className="btn btn-dark btn-lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/products" className="login-back">← Back to the site</Link>
      </motion.form>
    </main>
  )
}

function Editor({ product, onClose, onSaved, onAuthLost }) {
  const isNew = !product
  const [f, setF] = useState(() => (product ? { name: product.name, price: product.price, size: product.size || '', flavour: product.flavour || '', description: product.description || '', in_stock: product.in_stock !== false, image_url: product.image_url || '' } : EMPTY))
  const [mode, setMode] = useState(product && !product.image_url && product.image_display ? 'upload' : 'url')
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const shown = preview || (mode === 'url' && f.image_url ? f.image_url : product ? imgSrc(product) : '')

  const pick = (fl) => {
    if (!fl) return
    if (!/^image\//.test(fl.type)) return setErr('Please choose an image file.')
    if (fl.size > 5 * 1024 * 1024) return setErr('Image must be 5 MB or smaller.')
    setErr(''); setFile(fl)
  }

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (isNew && !file && !f.image_url.trim()) return setErr('Add an image: upload one or paste an image URL.')
    setBusy(true)
    const fd = new FormData()
    fd.append('name', f.name.trim())
    fd.append('price', f.price)
    fd.append('size', f.size.trim())
    fd.append('flavour', f.flavour.trim())
    fd.append('description', f.description.trim())
    fd.append('in_stock', f.in_stock ? 'true' : 'false')
    if (mode === 'upload' && file) fd.append('image', file)
    else if (mode === 'url' && f.image_url.trim() && f.image_url.trim() !== product?.image_url) fd.append('image_url', f.image_url.trim())
    try {
      const saved = isNew ? await api.create(fd) : await api.update(product.id, fd)
      onSaved(saved, isNew)
    } catch (e2) {
      if (e2.status === 401 || e2.status === 403) return onAuthLost()
      setErr(e2.message)
    } finally { setBusy(false) }
  }

  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="editor" onSubmit={submit} onClick={(e) => e.stopPropagation()} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
        <h2>{isNew ? 'Add product' : 'Edit product'}</h2>
        <div className="editor-grid">
          <div className="editor-col">
            <label>Name<input value={f.name} onChange={set('name')} maxLength={200} required /></label>
            <div className="two">
              <label>Price (₹)<input type="number" min="0" step="0.01" value={f.price} onChange={set('price')} required /></label>
              <label>Size<input value={f.size} onChange={set('size')} placeholder="1 kg" maxLength={40} /></label>
            </div>
            <label>Flavour<input value={f.flavour} onChange={set('flavour')} maxLength={80} /></label>
            <label>Description<textarea rows={4} value={f.description} onChange={set('description')} /></label>
            <label className="check"><input type="checkbox" checked={f.in_stock} onChange={set('in_stock')} /> In stock</label>
          </div>
          <div className="editor-col">
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'url'} className={mode === 'url' ? 'on' : ''} onClick={() => setMode('url')}>Image URL</button>
              <button type="button" role="tab" aria-selected={mode === 'upload'} className={mode === 'upload' ? 'on' : ''} onClick={() => setMode('upload')}>Upload</button>
            </div>
            {mode === 'url' ? (
              <label>Image link<input type="url" value={f.image_url} onChange={set('image_url')} placeholder="https://…/jar.jpg" /></label>
            ) : (
              <div className="drop" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}>
                <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={(e) => pick(e.target.files?.[0])} />
                <strong>{file ? file.name : 'Choose from your device'}</strong>
                <span>or drop an image here · max 5 MB</span>
              </div>
            )}
            <div className="editor-preview">{shown ? <img src={shown} alt="Preview" /> : <span>Image preview</span>}</div>
          </div>
        </div>
        {err && <p className="form-err" role="alert">{err}</p>}
        <div className="mg-actions end">
          <button type="button" className="btn btn-line btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark btn-sm" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}</button>
        </div>
      </motion.form>
    </motion.div>
  )
}
