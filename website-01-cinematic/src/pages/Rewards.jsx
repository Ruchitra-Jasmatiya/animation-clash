import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatPrice } from '../lib/api'
import { fmtDate } from '../lib/format'
import { getRewards } from '../lib/shop'
import Footer from '../components/Footer'
import { PageTop } from '../components/PageBits'
import ScratchCard from '../components/ScratchCard'
import OfferCalendar from '../components/OfferCalendar'

export default function Rewards() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    const load = () => getRewards().then((r) => alive && setD(r)).catch((e) => alive && setErr(e.message))
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 15000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  if (!d) return <main className="shop-page"><PageTop title="Rewards" />{err ? <p className="fld-err">{err}</p> : <p className="muted-center">Loading…</p>}</main>
  const L = d.loyalty
  const stats = [
    ['Orders placed', d.stats.orders], ['Paid orders', d.stats.paid_orders], ['Total spent', formatPrice(d.stats.spent)],
    ['In your bag', d.stats.cart], ['In your wishlist', d.stats.wishlist], ['Scratch cards', d.cards.length],
  ]
  const fresh = d.cards.filter((c) => c.status === 'unscratched')

  return (
    <main className="shop-page">
      <PageTop title="Your rewards" sub="Scratch cards, your free-order progress and everything you have done with us." />

      <section className="panel loyal">
        <div>
          <span className="eyebrow">Loyalty</span>
          <h2>{L.next_is_free ? 'Your next order is FREE 🎉' : `${L.to_go} more paid order${L.to_go === 1 ? '' : 's'} to your free order`}</h2>
          <p>{L.enabled ? `Place ${L.every} paid orders and your next one is on us — up to ${formatPrice(L.cap)}. Free orders won so far: ${L.free_orders_won}.` : 'The free-order reward is paused right now.'}</p>
          {L.next_is_free && <Link to="/products" className="btn btn-dark btn-lg">Claim it — shop now</Link>}
        </div>
        <div className="dots" role="img" aria-label={`${L.progress} of ${L.every} orders done`}>
          {Array.from({ length: L.every }, (_, i) => <motion.i key={i} className={i < L.progress ? 'on' : ''} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}>{i + 1}</motion.i>)}
          <i className={`gift${L.next_is_free ? ' on' : ''}`}>🎁</i>
        </div>
      </section>

      <div className="stat-grid">{stats.map(([k, v]) => <div key={k} className="stat-tile"><b>{v}</b><small>{k}</small></div>)}</div>

      <h2 className="sec">Scratch cards {fresh.length > 0 && <span className="pill unscratched">{fresh.length} new</span>}</h2>
      {d.cards.length ? (
        <div className="scratch-grid">{d.cards.map((c) => <ScratchCard key={c.id} card={c} onChange={() => getRewards().then(setD).catch(() => {})} />)}</div>
      ) : <p className="muted">Every paid order gives you a scratch card — ₹ off, % off or free shipping. Your first one is one order away.</p>}

      <h2 className="sec">Festival offers</h2>
      <OfferCalendar />

      <h2 className="sec">Order record</h2>
      {d.recent_paid.length ? (
        <ul className="record">
          {d.recent_paid.map((o) => (
            <li key={o.invoice_no}><span>{o.invoice_no}</span><span>{fmtDate(o.at)}</span><b>{o.free ? 'Free order' : formatPrice(o.total)}</b></li>
          ))}
        </ul>
      ) : <p className="muted">Your paid orders will be listed here.</p>}
      <Footer />
    </main>
  )
}
