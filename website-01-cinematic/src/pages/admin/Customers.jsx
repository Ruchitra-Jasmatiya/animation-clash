import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { adm } from '../../lib/api'
import { Empty, ErrorBox, Icon, Modal, PageHead, PayBadge, Spinner, deviceOf, fmtDate, inr, useAsync, useToast } from './ui'

export default function Customers() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [open, setOpen] = useState(null)
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t) }, [q])
  const { data, loading, error, reload, setData } = useAsync(() => adm.get(`/customers/?q=${encodeURIComponent(dq)}`), [dq])

  const block = async (c) => {
    try {
      const n = await adm.patch(`/customers/${c.id}/`, { is_blocked: !c.is_blocked })
      setData((l) => l.map((x) => (x.id === c.id ? { ...x, ...n } : x)))
      toast(n.is_blocked ? `${c.email} is blocked and signed out.` : `${c.email} can sign in again.`)
    } catch (e) { toast(e.message, 'err') }
  }

  return (
    <>
      <PageHead title="Customers" sub="Everyone who registered with an email and OTP.">
        <label className="ad-search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" aria-label="Search customers" /></label>
      </PageHead>
      {loading && !data ? <Spinner /> : error && !data ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? (
        <Empty icon="users" title="No customers yet" text="People appear here as soon as they sign up on your website." />
      ) : (
        <div className="ad-card table-card">
          <table className="ad-table">
            <thead><tr><th>Customer</th><th>Joined</th><th>Last login</th><th className="r">Logins</th><th className="r">Orders</th><th className="r">Spent</th><th>Access</th></tr></thead>
            <tbody>
              {data.map((c, i) => (
                <motion.tr key={c.id} className="click" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} onClick={() => setOpen(c.id)}>
                  <td data-l="Customer"><b>{c.name}</b><small>{c.email}</small></td>
                  <td data-l="Joined">{fmtDate(c.created_at, false)}</td>
                  <td data-l="Last login">{fmtDate(c.last_login_at)}</td>
                  <td data-l="Logins" className="r">{c.login_count}</td>
                  <td data-l="Orders" className="r">{c.orders}</td>
                  <td data-l="Spent" className="r"><strong>{inr(c.spent || 0)}</strong></td>
                  <td data-l="Access" onClick={(e) => e.stopPropagation()}><button className={`ad-btn sm ${c.is_blocked ? 'danger' : 'ghost'}`} onClick={() => block(c)}>{c.is_blocked ? 'Blocked · Unblock' : 'Block'}</button></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AnimatePresence>{open && <Detail id={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  )
}

function Detail({ id, onClose }) {
  const { data: c, loading, error } = useAsync(() => adm.get(`/customers/${id}/`), [id])
  return (
    <Modal onClose={onClose} wide label="Customer">
      <div className="ad-sheet-head"><h2>{c ? c.name : 'Customer'}</h2><button className="ad-icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} /> : (
        <div className="ad-stack gap">
          <div className="ad-kv">
            <div><small>Email</small><b>{c.email}</b></div>
            <div><small>Phone</small><b>{c.phone || '—'}</b></div>
            <div><small>Joined</small><b>{fmtDate(c.created_at)}</b></div>
            <div><small>Last IP</small><b>{c.last_ip || '—'}</b></div>
            <div><small>In bag now</small><b>{c.cart_items} item{c.cart_items === 1 ? '' : 's'}</b></div>
            <div><small>In wishlist</small><b>{c.wishlist_items}</b></div>
            <div><small>Orders</small><b>{c.orders}</b></div>
            <div><small>Total spent</small><b>{inr(c.spent || 0)}</b></div>
          </div>
          {c.address && <div><small>Address</small><p className="pre">{c.address}</p></div>}
          <h3>Orders</h3>
          {c.recent_orders.length ? (
            <div className="ad-list">{c.recent_orders.map((o) => <a key={o.id} className="ad-list-row" href={`/manage/billing/${o.id}`}><div><b>{o.invoice_no}</b><small>{fmtDate(o.created_at)}</small></div><PayBadge order={o} /><strong>{inr(o.total)}</strong></a>)}</div>
          ) : <p className="ad-muted">No orders yet.</p>}
          <h3>Scratch cards</h3>
          {c.scratch_cards.length ? <div className="ad-row">{c.scratch_cards.map((r, i) => <span key={i} className="ad-badge">{r.status === 'hidden' ? 'Unscratched' : r.label} · {r.status}</span>)}</div> : <p className="ad-muted">None yet.</p>}
          <h3>Recent logins</h3>
          <div className="ad-list">{c.logins.map((l, i) => <div key={i} className="ad-list-row"><div><b>{fmtDate(l.at)}</b><small>{deviceOf(l.user_agent)}</small></div><span className="ad-muted">{l.ip}</span></div>)}</div>
        </div>
      )}
    </Modal>
  )
}
