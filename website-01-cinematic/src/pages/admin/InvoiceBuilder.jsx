import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { adm, imgSrc } from '../../lib/api'
import { Field, Icon, PageHead, Spinner, inr, useAsync, useToast } from './ui'

const METHODS = [['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card'], ['bank', 'Bank transfer'], ['cod', 'Cash on delivery']]

export default function InvoiceBuilder() {
  const toast = useToast()
  const nav = useNavigate()
  const { data: products, loading } = useAsync(() => adm.get('/products/'), [])
  const [cust, setCust] = useState({ customer_name: '', phone: '', email: '', address: '', notes: '' })
  const [method, setMethod] = useState('upi')
  const [paid, setPaid] = useState(true)
  const [lines, setLines] = useState([]) // {key, product?, name, price, quantity, edited}
  const [custom, setCustom] = useState({ name: '', price: '' })
  const [code, setCode] = useState('')
  const [pq, setPq] = useState('')
  const [totals, setTotals] = useState(null)
  const [couponMsg, setCouponMsg] = useState({ type: '', text: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const payload = useMemo(() => lines.map((l) => ({ ...(l.product ? { product: l.product } : { name: l.name }), ...(l.edited || !l.product ? { unit_price: String(l.price) } : {}), quantity: Number(l.quantity) || 1 })), [lines])

  // live totals straight from the server (so what you see is what gets billed)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await adm.post('/orders/preview/', { lines: payload, coupon_code: code })
        setTotals(r); setCouponMsg(code ? { type: 'ok', text: `Coupon ${r.coupon_code} applied — you save ${inr(r.discount)}` } : { type: '', text: '' })
      } catch (e) {
        const msg = e.data?.coupon_code?.[0] || e.message
        setCouponMsg({ type: 'err', text: msg })
        if (!e.data?.coupon_code) setTotals(null)
        else adm.post('/orders/preview/', { lines: payload }).then(setTotals).catch(() => {})
      }
    }, 350)
    return () => clearTimeout(t)
  }, [payload, code])

  const shown = useMemo(() => (products || []).filter((p) => !pq.trim() || `${p.name} ${p.flavour}`.toLowerCase().includes(pq.trim().toLowerCase())), [products, pq])

  const addProduct = (p) => setLines((ls) => {
    const i = ls.findIndex((l) => l.product === p.id && !l.edited)
    if (i >= 0) return ls.map((l, k) => (k === i ? { ...l, quantity: l.quantity + 1 } : l))
    return [...ls, { key: `${p.id}-${Date.now()}`, product: p.id, name: p.name, price: p.price, quantity: 1, image: imgSrc(p) }]
  })
  const addCustom = () => {
    if (!custom.name.trim() || custom.price === '') return
    setLines((ls) => [...ls, { key: `c-${Date.now()}`, name: custom.name.trim(), price: custom.price, quantity: 1 }])
    setCustom({ name: '', price: '' })
  }
  const upd = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const submit = async () => {
    setErr('')
    if (!cust.customer_name.trim()) return setErr('Enter the customer name.')
    if (!lines.length) return setErr('Add at least one item.')
    setBusy(true)
    try {
      const o = await adm.post('/orders/', { ...cust, payment_method: method, status: paid ? 'paid' : 'pending', coupon_code: code, lines: payload })
      toast(`Invoice ${o.invoice_no} created.`)
      nav(`/manage/billing/${o.id}`)
    } catch (e) {
      setErr(e.data?.coupon_code?.[0] || e.data?.lines?.[0] || e.message)
    } finally { setBusy(false) }
  }

  return (
    <>
      <PageHead title="New invoice" sub="Bill a customer. Totals are calculated securely on the server."><Link to="/manage/billing" className="ad-btn ghost">Cancel</Link></PageHead>
      <div className="ad-builder">
        <div className="ad-stack gap">
          <section className="ad-card pad">
            <h2>Customer</h2>
            <div className="ad-two">
              <Field label="Name *"><input value={cust.customer_name} onChange={(e) => setCust({ ...cust, customer_name: e.target.value })} maxLength={150} /></Field>
              <Field label="Phone"><input value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} inputMode="tel" maxLength={30} /></Field>
            </div>
            <Field label="Email"><input type="email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} /></Field>
            <Field label="Address"><textarea rows={2} value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} /></Field>
          </section>

          <section className="ad-card pad">
            <div className="ad-card-head"><h2>Add items</h2>
              <label className="ad-search small"><Icon name="search" size={16} /><input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Find product" aria-label="Find product" /></label></div>
            {loading ? <Spinner /> : (
              <div className="ad-picker">
                {shown.map((p) => (
                  <button key={p.id} type="button" className="pick" onClick={() => addProduct(p)} disabled={!p.in_stock} title={p.in_stock ? 'Add to invoice' : 'Sold out'}>
                    <img src={imgSrc(p)} alt="" /><span><b>{p.name}</b><small>{inr(p.price)}{!p.in_stock ? ' · sold out' : ''}</small></span><Icon name="plus" size={18} />
                  </button>
                ))}
                {!shown.length && <p className="ad-muted pad">No products match.</p>}
              </div>
            )}
            <div className="ad-custom">
              <input placeholder="Custom item (e.g. Delivery gift)" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} aria-label="Custom item name" />
              <input type="number" min="0" step="0.01" placeholder="₹ price" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} aria-label="Custom item price" />
              <button type="button" className="ad-btn ghost" onClick={addCustom}>Add</button>
            </div>
          </section>

          <section className="ad-card pad">
            <h2>Items on this invoice</h2>
            {!lines.length ? <p className="ad-muted">Nothing added yet — pick a product above.</p> : (
              <ul className="ad-lines">
                <AnimatePresence initial={false}>
                  {lines.map((l) => (
                    <motion.li key={l.key} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
                      <b>{l.name}</b>
                      <label className="price">₹<input type="number" min="0" step="0.01" value={l.price} onChange={(e) => upd(l.key, { price: e.target.value, edited: true })} aria-label={`Price of ${l.name}`} /></label>
                      <div className="qty">
                        <button type="button" onClick={() => upd(l.key, { quantity: Math.max(1, l.quantity - 1) })} aria-label="Less">−</button>
                        <input type="number" min="1" max="999" value={l.quantity} onChange={(e) => upd(l.key, { quantity: Math.max(1, Math.min(999, Number(e.target.value) || 1)) })} aria-label="Quantity" />
                        <button type="button" onClick={() => upd(l.key, { quantity: Math.min(999, l.quantity + 1) })} aria-label="More">+</button>
                      </div>
                      <strong>{inr(Number(l.price) * l.quantity)}</strong>
                      <button type="button" className="ad-icon-btn danger" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label={`Remove ${l.name}`}><Icon name="trash" size={17} /></button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </div>

        <aside className="ad-summary">
          <div className="ad-card pad sticky">
            <h2>Summary</h2>
            <Field label="Coupon code"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="e.g. WELCOME10" maxLength={40} /></Field>
            {couponMsg.text && <p className={`ad-note ${couponMsg.type}`}>{couponMsg.text}</p>}
            <dl className="ad-totals">
              <div><dt>Subtotal</dt><dd>{inr(totals?.subtotal)}</dd></div>
              {Number(totals?.discount) > 0 && <div className="good"><dt>Discount</dt><dd>− {inr(totals.discount)}</dd></div>}
              <div><dt>Shipping</dt><dd>{Number(totals?.shipping) ? inr(totals.shipping) : 'Free'}</dd></div>
              {Number(totals?.gst_percent) > 0 && <div><dt>GST {Number(totals.gst_percent)}% {totals.prices_include_gst ? '(included)' : ''}</dt><dd>{inr(totals.tax)}</dd></div>}
              <div className="grand"><dt>Total</dt><dd>{inr(totals?.total)}</dd></div>
            </dl>
            <Field label="Payment method"><select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <label className="ad-check"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Payment received</label>
            <Field label="Notes (optional)"><textarea rows={2} value={cust.notes} onChange={(e) => setCust({ ...cust, notes: e.target.value })} /></Field>
            {err && <p className="ad-formerr" role="alert">{err}</p>}
            <button className="ad-btn primary lg block" disabled={busy} onClick={submit}>{busy ? 'Creating…' : 'Create invoice'}</button>
          </div>
        </aside>
      </div>
    </>
  )
}
