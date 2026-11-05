import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { adm } from '../../lib/api'
import { Confirm, ErrorBox, Icon, PageHead, STATUSES, Spinner, fmtDate, inr, statusLabel, useAsync, useToast } from './ui'

const METHOD = { cash: 'Cash', upi: 'UPI', card: 'Card', bank: 'Bank transfer', cod: 'Cash on delivery' }

export default function InvoiceView() {
  const { id } = useParams()
  const toast = useToast()
  const nav = useNavigate()
  const { data, loading, error, reload, setData } = useAsync(async () => {
    const [order, settings] = await Promise.all([adm.get(`/orders/${id}/`), adm.get('/settings/')])
    return { order, settings }
  }, [id])
  const [del, setDel] = useState(false)

  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />
  const { order: o, settings: s } = data

  const patch = async (body, msg) => {
    try { const n = await adm.patch(`/orders/${o.id}/`, body); setData((d) => ({ ...d, order: n })); toast(msg) } catch (e) { toast(e.message, 'err') }
  }
  const remove = async () => { try { await adm.del(`/orders/${o.id}/`); toast('Invoice deleted.'); nav('/manage/billing') } catch (e) { toast(e.message, 'err') } }

  return (
    <>
      <PageHead title={o.invoice_no} sub={`${o.customer_name} · ${fmtDate(o.created_at)}`}>
        <Link to="/manage/billing" className="ad-btn ghost ad-noprint">← All invoices</Link>
        <select className={`ad-status big s-${o.status} ad-noprint`} value={o.status} onChange={(e) => patch({ status: e.target.value }, `Marked ${statusLabel(e.target.value)}.`)} aria-label="Invoice status">
          {STATUSES.map((x) => <option key={x} value={x}>{statusLabel(x)}</option>)}
        </select>
        <button className="ad-btn primary ad-noprint" onClick={() => window.print()}><Icon name="print" size={18} /> Print / Save PDF</button>
        <button className="ad-icon-btn danger ad-noprint" onClick={() => setDel(true)} aria-label="Delete invoice"><Icon name="trash" size={18} /></button>
      </PageHead>

      <article className="invoice">
        <header>
          <div>
            <h2>{s.store_name}</h2>
            {s.tagline && <em>{s.tagline}</em>}
            <p>{s.address}</p>
            <p>{[s.phone, s.email].filter(Boolean).join(' · ')}</p>
            {s.gstin && <p>GSTIN: {s.gstin}</p>}
          </div>
          <div className="meta">
            <h3>INVOICE</h3>
            <p><b>{o.invoice_no}</b></p>
            <p>{fmtDate(o.created_at, false)}</p>
            <span className={`ad-badge s-${o.status}`}>{statusLabel(o.status)}</span>
          </div>
        </header>

        <section className="bill-to">
          <small>Billed to</small>
          <b>{o.customer_name}</b>
          {o.phone && <p>{o.phone}</p>}
          {o.email && <p>{o.email}</p>}
          {o.address && <p className="pre">{o.address}</p>}
        </section>

        <table>
          <thead><tr><th>Item</th><th className="r">Price</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead>
          <tbody>{o.items.map((it) => <tr key={it.id}><td>{it.name}</td><td className="r">{inr(it.unit_price)}</td><td className="r">{it.quantity}</td><td className="r">{inr(it.line_total)}</td></tr>)}</tbody>
        </table>

        <dl className="inv-totals">
          <div><dt>Subtotal</dt><dd>{inr(o.subtotal)}</dd></div>
          {Number(o.discount) > 0 && <div><dt>Discount {o.coupon_code && `(${o.coupon_code})`}</dt><dd>− {inr(o.discount)}</dd></div>}
          <div><dt>Shipping</dt><dd>{Number(o.shipping) ? inr(o.shipping) : 'Free'}</dd></div>
          {Number(o.gst_percent) > 0 && <div><dt>GST {Number(o.gst_percent)}% {o.prices_include_gst ? '(included in price)' : ''}</dt><dd>{inr(o.tax)}</dd></div>}
          <div className="grand"><dt>Total</dt><dd>{inr(o.total)}</dd></div>
        </dl>

        <footer>
          <p><b>Payment:</b> {METHOD[o.payment_method] || o.payment_method}</p>
          {o.notes && <p><b>Notes:</b> {o.notes}</p>}
          <p className="thanks">{s.invoice_footer}</p>
        </footer>
      </article>

      <AnimatePresence>{del && <Confirm title={`Delete ${o.invoice_no}?`} text="This permanently removes the invoice. To keep a record, mark it Cancelled instead." onNo={() => setDel(false)} onYes={remove} />}</AnimatePresence>
    </>
  )
}
