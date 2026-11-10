import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { adm } from '../../lib/api'
import { CountUp, ErrorBox, Icon, PageHead, Spinner, deviceOf, fmtDate, useAsync } from './ui'

export default function Analytics() {
  const { data, loading, error, reload, setData } = useAsync(() => adm.get('/analytics/'), [])
  const [hover, setHover] = useState(null)
  useEffect(() => { const t = setInterval(() => adm.get('/analytics/').then(setData).catch(() => {}), 15000); return () => clearInterval(t) }, [setData])
  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />
  const d = data
  const max = Math.max(1, ...d.series.map((s) => s.views))
  const day = hover != null ? d.series[hover] : null
  const tiles = [
    { l: 'Online now', v: d.online_now, i: 'refresh', n: 'last 5 minutes' },
    { l: 'Visitors today', v: d.visitors_today, i: 'users', n: `${d.visitors_yesterday} yesterday` },
    { l: 'All-time visitors', v: d.visitors_total, i: 'users', n: `${d.page_views_total} page views` },
    { l: 'Registered emails', v: d.customers_total, i: 'user', n: `${d.customers_today} new today` },
    { l: 'Emails that logged in', v: d.emails_logged_in, i: 'check', n: `${d.logins_total} logins in total` },
    { l: 'Logins today', v: d.logins_today, i: 'shield', n: `${d.otp_sent_today} OTPs sent · ${d.otp_verified_today} verified` },
    { l: 'Website orders', v: d.orders_online, i: 'receipt', n: 'not cancelled' },
    { l: 'Scratch cards', v: d.scratch_cards_given, i: 'gift', n: `${d.scratch_cards_scratched} scratched` },
  ]
  return (
    <>
      <PageHead title="Analytics" sub="Who is visiting and using your website. Updates automatically." />
      <div className="ad-stats four">
        {tiles.map((s, i) => (
          <motion.div key={s.l} className="ad-card stat" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5 }}>
            <span className="stat-ic"><Icon name={s.i} /></span><small>{s.l}</small><b><CountUp value={s.v} /></b><small>{s.n}</small>
          </motion.div>
        ))}
      </div>
      <div className="ad-grid-2">
        <section className="ad-card">
          <div className="ad-card-head"><h2>Last 14 days</h2><span className="ad-muted">{day ? `${fmtDate(day.date, false)} · ${day.visitors} visitors · ${day.views} views · ${day.signups} sign-ups · ${day.logins} logins` : 'Hover a bar'}</span></div>
          <div className="ad-chart" onMouseLeave={() => setHover(null)}>
            {d.series.map((s, i) => (
              <button key={s.date} type="button" className={`bar${hover === i ? ' on' : ''}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} aria-label={`${fmtDate(s.date, false)}: ${s.views} page views`}>
                <motion.i initial={{ height: 0 }} animate={{ height: `${Math.max(3, (s.views / max) * 100)}%` }} transition={{ delay: 0.1 + i * 0.03, duration: 0.7 }} /><span>{new Date(s.date).getDate()}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="ad-card">
          <div className="ad-card-head"><h2>Popular pages</h2></div>
          <ol className="ad-top-list">{d.top_pages.map((p, i) => <li key={p.path}><span className="rank">{i + 1}</span><div><b>{p.path}</b></div><em>{p.n} views</em></li>)}</ol>
          {!d.top_pages.length && <p className="ad-muted pad">No visits yet.</p>}
          <div className="ad-card-head"><h2>Devices</h2></div>
          <div className="ad-row pad-b" style={{ padding: '0 20px 18px' }}>{Object.entries(d.devices).map(([k, n]) => <span key={k} className="ad-badge">{k || 'unknown'} · {n}</span>)}</div>
        </section>
      </div>
      <section className="ad-card">
        <div className="ad-card-head"><h2>Recent logins</h2><span className="ad-muted">Each one passed the email OTP check</span></div>
        <div className="ad-list">
          {d.recent_logins.map((l, i) => <div key={i} className="ad-list-row"><div><b>{l.name}</b><small>{l.email}</small></div><span className="ad-muted">{deviceOf(l.user_agent)} · {l.ip}</span><span>{fmtDate(l.at)}</span></div>)}
          {!d.recent_logins.length && <p className="ad-muted pad" style={{ padding: 20 }}>Nobody has logged in yet.</p>}
        </div>
      </section>
    </>
  )
}
