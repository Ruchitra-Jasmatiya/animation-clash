import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adm } from '../../lib/api'
import { CountUp, Empty, ErrorBox, Icon, PageHead, Spinner, PayBadge, fmtDate, inr, inr0, useAsync } from './ui'

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => adm.get('/dashboard/'), [])
  const [hover, setHover] = useState(null)

  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />
  const max = Math.max(1, ...data.daily.map((d) => Number(d.revenue)))
  const day = hover != null ? data.daily[hover] : null

  const stats = [
    { label: 'Revenue (paid)', value: data.revenue, fmt: (n) => inr0(n), icon: 'receipt' },
    { label: 'Orders', value: data.orders, icon: 'dashboard' },
    { label: 'Website orders', value: data.online_orders, icon: 'card' },
    { label: 'Pending', value: data.pending, icon: 'refresh' },
    { label: 'Customers', value: data.customers, icon: 'users' },
    { label: 'New today', value: data.customers_today, icon: 'user' },
    { label: 'Visitors today', value: data.visitors_today, icon: 'chart' },
    { label: 'Products', value: data.products, icon: 'box' },
  ]

  return (
    <>
      <PageHead title="Dashboard" sub="How the shop is doing.">
        <Link to="/manage/billing/new" className="ad-btn primary"><Icon name="plus" size={18} /> New counter bill</Link>
      </PageHead>

      {data.to_verify > 0 && (
        <div className="ad-card ad-alert"><span><b>{data.to_verify} payment{data.to_verify === 1 ? '' : 's'} waiting for you.</b> Customers say they paid — check your UPI app and confirm.</span><Link className="ad-btn primary sm" to="/manage/billing">Verify now</Link></div>
      )}
      {data.low_stock.length > 0 && (
        <div className="ad-card ad-alert"><span><b>Low stock:</b> {data.low_stock.map((p) => `${p.name} (${p.stock})`).join(', ')}</span><Link className="ad-btn ghost sm" to="/manage/products">Update stock</Link></div>
      )}
      <div className="ad-stats four">
        {stats.map((s, i) => (
          <motion.div key={s.label} className="ad-card stat" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <span className="stat-ic"><Icon name={s.icon} /></span>
            <small>{s.label}</small>
            <b><CountUp value={s.value} format={s.fmt} /></b>
          </motion.div>
        ))}
      </div>

      <div className="ad-grid-2">
        <section className="ad-card">
          <div className="ad-card-head">
            <h2>Last 14 days</h2>
            <span className="ad-muted">{day ? `${fmtDate(day.date, false)} · ${inr(day.revenue)} · ${day.orders} invoice${day.orders === 1 ? '' : 's'}` : 'Hover a bar'}</span>
          </div>
          <div className="ad-chart" onMouseLeave={() => setHover(null)}>
            {data.daily.map((d, i) => (
              <button key={d.date} type="button" className={`bar${hover === i ? ' on' : ''}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} aria-label={`${fmtDate(d.date, false)}: ${inr(d.revenue)}`}>
                <motion.i initial={{ height: 0 }} animate={{ height: `${Math.max(3, (Number(d.revenue) / max) * 100)}%` }} transition={{ delay: 0.15 + i * 0.03, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                <span>{new Date(d.date).getDate()}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="ad-card">
          <div className="ad-card-head"><h2>Top products</h2></div>
          {data.top_products.length ? (
            <ol className="ad-top-list">
              {data.top_products.map((t, i) => (
                <li key={t.name}><span className="rank">{i + 1}</span><div><b>{t.name}</b><small>{t.qty} sold</small></div><em>{inr0(t.revenue)}</em></li>
              ))}
            </ol>
          ) : <p className="ad-muted pad">Sales will appear here after your first invoice.</p>}
        </section>
      </div>

      <section className="ad-card">
        <div className="ad-card-head"><h2>Recent orders</h2><Link className="ad-link" to="/manage/billing">View all</Link></div>
        {data.recent.length ? (
          <div className="ad-list">
            {data.recent.map((o) => (
              <Link key={o.id} to={`/manage/billing/${o.id}`} className="ad-list-row">
                <div><b>{o.invoice_no}</b><small>{o.customer_name} · {fmtDate(o.created_at)}</small></div>
                <PayBadge order={o} />
                <strong>{inr(o.total)}</strong>
              </Link>
            ))}
          </div>
        ) : <Empty icon="receipt" title="No invoices yet" text="Create your first bill and it shows up here."><Link to="/manage/billing/new" className="ad-btn primary">Create invoice</Link></Empty>}
      </section>

      <div className="ad-quick">
        <Link to="/manage/festivals" className="ad-card quick"><Icon name="calendar" /><b>Festival offers</b><small>Diwali, Holi, Eid…</small></Link>
        <Link to="/manage/analytics" className="ad-card quick"><Icon name="chart" /><b>Website analytics</b><small>Visitors and logins</small></Link>
        <Link to="/manage/products" className="ad-card quick"><Icon name="box" /><b>Add a product</b><small>Photos, price, discount</small></Link>
        <Link to="/manage/coupons" className="ad-card quick"><Icon name="tag" /><b>Make a coupon</b><small>{data.active_coupons} active now</small></Link>
        <Link to="/manage/media" className="ad-card quick"><Icon name="image" /><b>Change website media</b><small>Home & shop images, videos</small></Link>
        <Link to="/manage/security" className="ad-card quick"><Icon name="shield" /><b>See who signed in</b><small>Every login & change</small></Link>
      </div>
    </>
  )
}
