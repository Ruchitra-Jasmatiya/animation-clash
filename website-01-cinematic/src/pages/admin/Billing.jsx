import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adm } from '../../lib/api'
import { Empty, ErrorBox, Icon, PageHead, STATUSES, Spinner, fmtDate, inr, statusLabel, useAsync, useToast } from './ui'

export default function Billing() {
  const toast = useToast()
  const nav = useNavigate()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t) }, [q])
  const { data, loading, error, reload, setData } = useAsync(() => adm.get(`/orders/?status=${status}&q=${encodeURIComponent(dq)}`), [status, dq])

  const changeStatus = async (o, s) => {
    try { const n = await adm.patch(`/orders/${o.id}/`, { status: s }); setData((l) => l.map((x) => (x.id === o.id ? n : x))); toast(`${o.invoice_no} marked ${statusLabel(s)}.`) } catch (e) { toast(e.message, 'err') }
  }

  return (
    <>
      <PageHead title="Billing" sub="Invoices, payments and orders.">
        <label className="ad-search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice, name or phone" aria-label="Search invoices" /></label>
        <Link to="/manage/billing/new" className="ad-btn primary"><Icon name="plus" size={18} /> New invoice</Link>
      </PageHead>

      <div className="ad-chips" role="tablist" aria-label="Filter by status">
        {['', ...STATUSES].map((s) => (
          <button key={s || 'all'} role="tab" aria-selected={status === s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s ? statusLabel(s) : 'All'}</button>
        ))}
      </div>

      {loading && !data ? <Spinner /> : error && !data ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? (
        <Empty icon="receipt" title="No invoices found" text="Create a bill for a customer — you can apply a coupon and print it."><Link to="/manage/billing/new" className="ad-btn primary">New invoice</Link></Empty>
      ) : (
        <div className="ad-card table-card">
          <table className="ad-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Items</th><th className="r">Total</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((o, i) => (
                <motion.tr key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} onClick={() => nav(`/manage/billing/${o.id}`)} className="click">
                  <td data-l="Invoice"><b>{o.invoice_no}</b></td>
                  <td data-l="Customer">{o.customer_name}<small>{o.phone}</small></td>
                  <td data-l="Date">{fmtDate(o.created_at)}</td>
                  <td data-l="Items">{o.items.reduce((n, it) => n + it.quantity, 0)}</td>
                  <td data-l="Total" className="r"><strong>{inr(o.total)}</strong>{Number(o.discount) > 0 && <small>saved {inr(o.discount)}</small>}</td>
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
