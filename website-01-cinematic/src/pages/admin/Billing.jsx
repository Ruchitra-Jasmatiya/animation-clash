import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adm } from '../../lib/api'
import { Empty, ErrorBox, Icon, PageHead, PayBadge, STATUSES, Spinner, fmtDate, inr, statusLabel, useAsync, useToast } from './ui'

const VIEWS = [
  { k: 'all', label: 'All orders', q: '' },
  { k: 'verify', label: 'Payments to verify', q: 'payment=submitted' },
  { k: 'paid', label: 'Paid', q: 'payment=paid' },
  { k: 'unpaid', label: 'Unpaid', q: 'payment=unpaid' },
  { k: 'online', label: 'Website orders', q: 'source=online' },
  { k: 'counter', label: 'Counter bills', q: 'source=counter' },
]

export default function Billing() {
  const toast = useToast()
  const nav = useNavigate()
  const [view, setView] = useState('all')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t) }, [q])
  const vq = VIEWS.find((v) => v.k === view).q
  const { data, loading, error, reload, setData } = useAsync(() => adm.get(`/orders/?status=${status}&q=${encodeURIComponent(dq)}&${vq}`), [status, dq, vq])

  // new website orders show up on their own
  useEffect(() => { const t = setInterval(() => { adm.get(`/orders/?status=${status}&q=${encodeURIComponent(dq)}&${vq}`).then(setData).catch(() => {}) }, 10000); return () => clearInterval(t) }, [status, dq, vq, setData])

  const swap = (n) => setData((l) => l.map((x) => (x.id === n.id ? n : x)))
  const changeStatus = async (o, s) => {
    try { swap(await adm.patch(`/orders/${o.id}/`, { status: s })); toast(`${o.invoice_no} marked ${statusLabel(s)}.`) } catch (e) { toast(e.message, 'err') }
  }
  const confirm = async (o) => { try { swap(await adm.post(`/orders/${o.id}/confirm-payment/`)); toast(`Payment confirmed for ${o.invoice_no}. Scratch card sent.`) } catch (e) { toast(e.message, 'err') } }
  const reject = async (o) => { try { swap(await adm.post(`/orders/${o.id}/reject-payment/`)); toast(`${o.invoice_no}: payment marked not found.`) } catch (e) { toast(e.message, 'err') } }

  return (
    <>
      <PageHead title="Orders & billing" sub="Every website order and counter bill, with payment status.">
        <label className="ad-search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice, name, phone, email, UTR" aria-label="Search orders" /></label>
        <Link to="/manage/billing/new" className="ad-btn primary"><Icon name="plus" size={18} /> New counter bill</Link>
      </PageHead>

      <div className="ad-chips" role="tablist" aria-label="View">
        {VIEWS.map((v) => <button key={v.k} role="tab" aria-selected={view === v.k} className={view === v.k ? 'on' : ''} onClick={() => setView(v.k)}>{v.label}</button>)}
      </div>
      <div className="ad-chips" role="tablist" aria-label="Order status">
        {['', ...STATUSES].map((s) => <button key={s || 'all'} role="tab" aria-selected={status === s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s ? statusLabel(s) : 'Any status'}</button>)}
      </div>

      {loading && !data ? <Spinner /> : error && !data ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? (
        <Empty icon="receipt" title="No orders found" text="Website orders appear here the moment a customer checks out." />
      ) : (
        <div className="ad-card table-card">
          <table className="ad-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th className="r">Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((o, i) => (
                <motion.tr key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} onClick={() => nav(`/manage/billing/${o.id}`)} className="click">
                  <td data-l="Order"><b>{o.invoice_no}</b><small>{o.source === 'online' ? 'Website' : 'Counter'}</small></td>
                  <td data-l="Customer">{o.customer_name}<small>{o.email || o.phone}</small></td>
                  <td data-l="Date">{fmtDate(o.created_at)}</td>
                  <td data-l="Items">{o.items.reduce((n, it) => n + it.quantity, 0)}</td>
                  <td data-l="Total" className="r"><strong>{inr(o.total)}</strong></td>
                  <td data-l="Payment" onClick={(e) => e.stopPropagation()}>
                    <PayBadge order={o} />
                    {o.upi_ref && <small>UTR {o.upi_ref}</small>}
                    {o.payment_status === 'submitted' && o.status !== 'cancelled' && (
                      <span className="ad-mini"><button className="ad-btn primary sm" onClick={() => confirm(o)}>Confirm</button><button className="ad-btn ghost sm" onClick={() => reject(o)}>Not found</button></span>
                    )}
                  </td>
                  <td data-l="Status" onClick={(e) => e.stopPropagation()}>
                    <select className={`ad-status s-${o.status}`} value={o.status} onChange={(e) => changeStatus(o, e.target.value)} aria-label={`Status of ${o.invoice_no}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
