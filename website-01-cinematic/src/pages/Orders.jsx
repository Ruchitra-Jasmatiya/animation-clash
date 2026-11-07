import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fmtDate, inr } from '../lib/format'
import { getOrders } from '../lib/shop'
import Footer from '../components/Footer'
import { PageTop, PayBadge } from '../components/PageBits'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    const load = () => getOrders().then((d) => alive && setOrders(d)).catch((e) => alive && setErr(e.message))
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 12000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  return (
    <main className="shop-page">
      <PageTop title="Your orders" sub="Every order you have placed, with its payment status and invoice." />
      {err && <p className="fld-err">{err}</p>}
      {!orders ? <p className="muted-center">Loading…</p> : !orders.length ? (
        <div className="empty-state"><h2>No orders yet</h2><p>When you place an order it will show up here.</p><Link to="/products" className="btn btn-dark btn-lg">Shop jars <span className="arrow">↗</span></Link></div>
      ) : (
        <ul className="order-list">
          {orders.map((o, i) => (
            <motion.li key={o.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
              <Link to={`/orders/${o.id}`} className="order-row">
                <div>
                  <b>{o.invoice_no}</b>
                  <small>{fmtDate(o.created_at)} · {o.items.reduce((n, it) => n + it.quantity, 0)} item(s)</small>
                  <small className="order-items">{o.items.map((it) => `${it.name} × ${it.quantity}`).join(', ')}</small>
                </div>
                <div className="order-right">
                  <PayBadge order={o} />
                  {o.status !== 'cancelled' && o.payment_status === 'paid' && <span className="pill ship">{o.status === 'delivered' ? 'Delivered' : o.status === 'shipped' ? 'Shipped' : 'Processing'}</span>}
                  <strong>{inr(o.total)}</strong>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
      <Footer />
    </main>
  )
}
