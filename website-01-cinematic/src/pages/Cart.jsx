import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { formatPrice, imgSrc, mediaSrc } from '../lib/api'
import { checkout, getQuote, getRewards, refreshCart, setCartQty, toggleWishlist, updateProfile, useShop } from '../lib/shop'
import { useToast } from '../lib/toast'
import Footer from '../components/Footer'
import { PageTop } from '../components/PageBits'

const Row = ({ label, value, good, strong }) => (
  <div className={`sum-row${good ? ' good' : ''}${strong ? ' strong' : ''}`}><dt>{label}</dt><dd>{value}</dd></div>
)
const num = (v) => Number(v) || 0

export default function Cart() {
  const { cart, customer } = useShop()
  const toast = useToast()
  const nav = useNavigate()
  const [coupon, setCoupon] = useState('')
  const [applied, setApplied] = useState('')
  const [rewardId, setRewardId] = useState('')
  const [rewards, setRewards] = useState([])
  const [quote, setQuote] = useState(null)
  const [step, setStep] = useState('bag')           // bag | details
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [f, setF] = useState(() => ({ name: customer?.name || '', phone: customer?.phone || '', address: customer?.address || '', notes: '' }))
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  useEffect(() => { refreshCart() }, [])
  useEffect(() => { getRewards().then((r) => setRewards(r.cards.filter((c) => c.status === 'available'))).catch(() => {}) }, [])

  // live price quote: recalculated on the server whenever the bag, coupon or reward changes
  const key = useMemo(() => cart.items.map((i) => `${i.product.id}:${i.quantity}`).join(',') + `|${applied}|${rewardId}`, [cart.items, applied, rewardId])
  useEffect(() => {
    let alive = true
    if (!cart.items.length) return
    getQuote(applied, rewardId || null).then((q) => { if (alive) setQuote(q) }).catch((e) => { if (alive) setErr(e.message) })
    return () => { alive = false }
  }, [key, cart.items.length, applied, rewardId])

  const change = async (p, qty) => { try { await setCartQty(p.id, qty) } catch (e) { toast(e.message, 'err') } }
  const saveForLater = async (p) => { try { await toggleWishlist(p.id); await setCartQty(p.id, 0); toast('Moved to your wishlist') } catch (e) { toast(e.message, 'err') } }

  const place = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const o = await checkout({ ...f, coupon_code: applied, reward_id: rewardId || null })
      updateProfile({ phone: f.phone, address: f.address }).catch(() => {})
      nav(`/orders/${o.id}`, { replace: true })
    } catch (e2) { setErr(e2.data?.issues ? 'Some items changed. Please review your bag.' : e2.message); refreshCart() } finally { setBusy(false) }
  }

  const q = cart.items.length ? quote : null
  const empty = !cart.items.length

  return (
    <main className="shop-page">
      <PageTop title={step === 'bag' ? 'Your bag' : 'Checkout'} sub={empty ? '' : `${cart.count} item${cart.count === 1 ? '' : 's'}`} />
      {empty ? (
        <div className="empty-state"><h2>Your bag is empty</h2><p>Add a jar and it will wait for you here.</p><Link to="/products" className="btn btn-dark btn-lg">Shop jars <span className="arrow">↗</span></Link></div>
      ) : (
        <div className="cart-grid">
          <section className="panel">
            {step === 'bag' ? (
              <ul className="bag-list">
                <AnimatePresence initial={false}>
                  {cart.items.map(({ product: p, quantity, line_total }) => {
                    const left = p.stock
                    return (
                      <motion.li key={p.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className="bag-item">
                        <img src={p.image ? mediaSrc(p.image) : imgSrc(p)} alt="" onError={(e) => { e.currentTarget.src = '/images/massup-01-jar-hero.jpg' }} />
                        <div className="bag-info">
                          <b>{p.name}</b>
                          <small>{[p.flavour, p.size].filter(Boolean).join(' · ')}</small>
                          <small className={left <= 5 ? 'warn' : ''}>{left <= 0 ? 'Sold out' : left <= 5 ? `Only ${left} left` : 'In stock'}</small>
                          <div className="bag-actions">
                            <button className="link" onClick={() => saveForLater(p)}>Move to wishlist</button>
                            <button className="link" onClick={() => change(p, 0)}>Remove</button>
                          </div>
                        </div>
                        <div className="qty" role="group" aria-label={`Quantity of ${p.name}`}>
                          <button onClick={() => change(p, quantity - 1)} aria-label="Less">−</button>
                          <span>{quantity}</span>
                          <button onClick={() => change(p, quantity + 1)} disabled={quantity >= Math.min(20, left)} aria-label="More">+</button>
                        </div>
                        <strong className="bag-price">{formatPrice(line_total)}</strong>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            ) : (
              <form id="details" onSubmit={place} className="details">
                <h2>Delivery details</h2>
                <label className="fld"><span>Full name</span><input value={f.name} onChange={set('name')} required maxLength={150} autoComplete="name" /></label>
                <label className="fld"><span>Mobile number</span><input value={f.phone} onChange={set('phone')} required inputMode="numeric" maxLength={14} autoComplete="tel" placeholder="10-digit number" /></label>
                <label className="fld"><span>Full address with pincode</span><textarea value={f.address} onChange={set('address')} required rows={3} maxLength={600} autoComplete="street-address" /></label>
                <label className="fld"><span>Note for us <em>(optional)</em></span><input value={f.notes} onChange={set('notes')} maxLength={300} /></label>
                {err && <p className="fld-err" role="alert">{err}</p>}
              </form>
            )}
            {cart.issues?.length > 0 && <p className="fld-err">{cart.issues.map((i) => `${i.name}: ${i.problem}`).join(' · ')}</p>}
          </section>

          <aside className="panel summary">
            <h2>Order summary</h2>
            {q?.free_order && <div className="free-banner">🎉 This is your free order! Up to {formatPrice(q.loyalty.cap)} off — no payment needed.</div>}
            {!q?.free_order && (
              <>
                <div className="coupon">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" maxLength={40} />
                  <button className="btn btn-light btn-sm" type="button" onClick={() => { setApplied(coupon.trim()); setRewardId('') }}>Apply</button>
                </div>
                {q?.coupon_error && <p className="fld-err">{q.coupon_error}</p>}
                {rewards.length > 0 && (
                  <label className="fld"><span>Use a scratch-card reward</span>
                    <select value={rewardId} onChange={(e) => { setRewardId(e.target.value); if (e.target.value) { setApplied(''); setCoupon('') } }}>
                      <option value="">None</option>
                      {rewards.map((r) => <option key={r.id} value={r.id}>{r.label}{num(r.min_order) ? ` (min ${formatPrice(r.min_order)})` : ''}</option>)}
                    </select>
                  </label>
                )}
                {q?.reward_error && <p className="fld-err">{q.reward_error}</p>}
              </>
            )}
            {q && (
              <dl className="sum">
                <Row label="Subtotal" value={formatPrice(q.subtotal)} />
                {num(q.festival_discount) > 0 && <Row good label={`${q.festival?.name || 'Festival'} offer (${num(q.festival?.percent)}%)`} value={`− ${formatPrice(q.festival_discount)}`} />}
                {num(q.discount) > 0 && <Row good label={`Coupon ${q.coupon_code}`} value={`− ${formatPrice(q.discount)}`} />}
                {num(q.reward_discount) > 0 && <Row good label={`Reward: ${q.reward?.label}`} value={`− ${formatPrice(q.reward_discount)}`} />}
                <Row label="Shipping" value={num(q.shipping) ? formatPrice(q.shipping) : 'Free'} />
                {num(q.gst_percent) > 0 && <Row label={`GST ${num(q.gst_percent)}%${q.prices_include_gst ? ' (included)' : ''}`} value={formatPrice(q.tax)} />}
                {num(q.loyalty_discount) > 0 && <Row good label="Free order reward" value={`− ${formatPrice(q.loyalty_discount)}`} />}
                <Row strong label="Total" value={formatPrice(q.total)} />
              </dl>
            )}
            {q?.loyalty?.enabled && !q.free_order && <p className="sum-note">{q.loyalty.to_go} more paid order{q.loyalty.to_go === 1 ? '' : 's'} until your free order.</p>}

            {step === 'bag' ? (
              <button className="btn btn-dark btn-lg block" disabled={!q || cart.issues?.length > 0} onClick={() => setStep('details')}>Continue to delivery <span className="arrow">→</span></button>
            ) : (
              <>
                <button className="btn btn-dark btn-lg block" form="details" disabled={busy || !q}>{busy ? 'Placing order…' : q?.total && num(q.total) <= 0 ? 'Place free order' : 'Place order & pay by UPI'}</button>
                <button className="link center" onClick={() => setStep('bag')}>← Back to bag</button>
              </>
            )}
            <p className="sum-note">Prices are checked again on our server when you place the order. Stock is held for you while you pay.</p>
          </aside>
        </div>
      )}
      <Footer />
    </main>
  )
}
