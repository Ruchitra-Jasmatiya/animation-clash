import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { adm, discountPercent, formatPrice, imgSrc } from '../../lib/api'
import { clearProductCache } from '../../lib/useProducts'
import { Confirm, Empty, ErrorBox, Field, Icon, Modal, PageHead, Spinner, useAsync, useToast } from './ui'

const BLANK = { name: '', price: '', mrp: '', size: '', flavour: 'Pistachio', description: '', in_stock: true, stock: '50', image_url: '' }

export default function ProductsAdmin() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => adm.get('/products/'), [])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [del, setDel] = useState(null)

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (data || []).filter((p) => !n || `${p.name} ${p.flavour}`.toLowerCase().includes(n))
  }, [data, q])

  const saved = (p, isNew) => {
    setData((l) => (isNew ? [p, ...l] : l.map((x) => (x.id === p.id ? p : x))))
    clearProductCache(); setEditing(null)
    toast(isNew ? 'Product added — it is live on the website.' : 'Changes saved.')
  }
  const toggleStock = async (p) => {
    const fd = new FormData(); fd.append('in_stock', p.in_stock ? 'false' : 'true')
    try { const s = await adm.patch(`/products/${p.id}/`, fd); setData((l) => l.map((x) => (x.id === p.id ? s : x))); clearProductCache() } catch (e) { toast(e.message, 'err') }
  }
  const remove = async () => {
    try { await adm.del(`/products/${del.id}/`); setData((l) => l.filter((x) => x.id !== del.id)); clearProductCache(); setDel(null); toast('Product deleted.') } catch (e) { toast(e.message, 'err') }
  }

  return (
    <>
      <PageHead title="Products" sub={`${data?.length ?? 0} on the website`}>
        <label className="ad-search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" /></label>
        <button className="ad-btn primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} /> Add product</button>
      </PageHead>

      {loading && !data ? <Spinner /> : error && !data ? <ErrorBox message={error} onRetry={reload} /> : !list.length ? (
        <Empty icon="box" title={q ? 'Nothing matches' : 'No products yet'} text={q ? 'Try another word.' : 'Add your first product — it appears on the Products page immediately.'}>
          {!q && <button className="ad-btn primary" onClick={() => setEditing('new')}>Add product</button>}
        </Empty>
      ) : (
        <motion.div className="ad-products" layout>
          <AnimatePresence initial={false}>
            {list.map((p) => {
              const off = discountPercent(p)
              return (
                <motion.article key={p.id} layout className="ad-card prod" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.4 }}>
                  <div className="prod-img"><img src={imgSrc(p)} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = '/images/massup-01-jar-hero.jpg' }} />{off > 0 && <span className="ad-badge s-paid">{off}% off</span>}</div>
                  <div className="prod-body">
                    <b title={p.name}>{p.name}</b>
                    <small>{p.flavour || '—'} · {p.size || 'no size'}</small>
                    <small className={Number(p.stock) <= 5 ? 'ad-lowstock' : ''}>{Number(p.stock)} unit{Number(p.stock) === 1 ? '' : 's'} in stock</small>
                    <div className="prod-price">{off > 0 && <s>{formatPrice(p.mrp)}</s>}<strong>{formatPrice(p.price)}</strong></div>
                  </div>
                  <div className="prod-foot">
                    <button type="button" className={`ad-switch${p.in_stock ? ' on' : ''}`} onClick={() => toggleStock(p)} aria-pressed={p.in_stock} aria-label="In stock"><i /><span>{p.in_stock ? 'In stock' : 'Sold out'}</span></button>
                    <div className="ad-row">
                      <button className="ad-icon-btn" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Icon name="edit" size={18} /></button>
                      <button className="ad-icon-btn danger" onClick={() => setDel(p)} aria-label={`Delete ${p.name}`}><Icon name="trash" size={18} /></button>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {editing && <ProductEditor key="ed" product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={saved} />}
        {del && <Confirm key="del" title={`Delete “${del.name}”?`} text="It disappears from the website straight away. Past invoices keep their record of it." onNo={() => setDel(null)} onYes={remove} />}
      </AnimatePresence>
    </>
  )
}

function ProductEditor({ product, onClose, onSaved }) {
  const isNew = !product
  const [f, setF] = useState(() => (product ? { name: product.name, price: product.price, mrp: product.mrp || '', size: product.size || '', flavour: product.flavour || '', description: product.description || '', in_stock: product.in_stock !== false, stock: String(product.stock ?? 50), image_url: product.image_url || '' } : BLANK))
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
    if (isNew && !file && !f.image_url.trim()) return setErr('Add an image: upload one or paste an image link.')
    setBusy(true)
    const fd = new FormData()
    fd.append('name', f.name.trim()); fd.append('price', f.price); fd.append('mrp', f.mrp === '' ? '' : f.mrp)
    fd.append('size', f.size.trim()); fd.append('flavour', f.flavour.trim()); fd.append('description', f.description.trim())
    fd.append('in_stock', f.in_stock ? 'true' : 'false')
    fd.append('stock', String(Math.max(0, parseInt(f.stock, 10) || 0)))
    if (mode === 'upload' && file) fd.append('image', file)
    else if (mode === 'url' && f.image_url.trim() && f.image_url.trim() !== product?.image_url) fd.append('image_url', f.image_url.trim())
    try {
      onSaved(isNew ? await adm.post('/products/', fd) : await adm.patch(`/products/${product.id}/`, fd), isNew)
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <Modal onClose={onClose} wide label={isNew ? 'Add product' : 'Edit product'}>
      <form className="ad-form" onSubmit={submit}>
        <h2>{isNew ? 'Add product' : 'Edit product'}</h2>
        <div className="ad-two-col">
          <div className="ad-stack">
            <Field label="Name"><input value={f.name} onChange={set('name')} maxLength={200} required /></Field>
            <div className="ad-two">
              <Field label="Selling price (₹)"><input type="number" min="0" step="0.01" value={f.price} onChange={set('price')} required /></Field>
              <Field label="Original price / MRP (₹)" hint="Optional — shows a discount"><input type="number" min="0" step="0.01" value={f.mrp} onChange={set('mrp')} /></Field>
            </div>
            <div className="ad-two">
              <Field label="Size"><input value={f.size} onChange={set('size')} placeholder="1 kg" maxLength={40} /></Field>
              <Field label="Flavour"><input value={f.flavour} onChange={set('flavour')} maxLength={80} /></Field>
            </div>
            <Field label="Description"><textarea rows={4} value={f.description} onChange={set('description')} /></Field>
            <Field label="Units in stock" hint="Goes down by itself when customers pay; 0 = sold out"><input type="number" min="0" step="1" value={f.stock} onChange={set('stock')} /></Field>
            <label className="ad-check"><input type="checkbox" checked={f.in_stock} onChange={set('in_stock')} /> Show as available</label>
          </div>
          <div className="ad-stack">
            <div className="ad-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'url'} className={mode === 'url' ? 'on' : ''} onClick={() => setMode('url')}><Icon name="link" size={16} /> Image link</button>
              <button type="button" role="tab" aria-selected={mode === 'upload'} className={mode === 'upload' ? 'on' : ''} onClick={() => setMode('upload')}><Icon name="upload" size={16} /> Upload</button>
            </div>
            {mode === 'url' ? (
              <Field label="Image link"><input type="text" inputMode="url" value={f.image_url} onChange={set('image_url')} placeholder="https://…/jar.jpg" /></Field>
            ) : (
              <div className="ad-drop" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}>
                <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={(e) => pick(e.target.files?.[0])} />
                <Icon name="upload" size={26} /><b>{file ? file.name : 'Choose from your device'}</b><small>or drop an image here · up to 5 MB</small>
              </div>
            )}
            <div className="ad-preview">{shown ? <img src={shown} alt="Preview" /> : <span>Image preview</span>}</div>
          </div>
        </div>
        {err && <p className="ad-formerr" role="alert">{err}</p>}
        <div className="ad-row end"><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button className="ad-btn primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}</button></div>
      </form>
    </Modal>
  )
}
