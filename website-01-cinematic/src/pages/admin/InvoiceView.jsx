import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { adm } from '../../lib/api'
import Invoice from '../../components/Invoice'
import { Confirm, ErrorBox, Icon, PageHead, PayBadge, STATUSES, Spinner, fmtDate, statusLabel, useAsync, useToast } from './ui'

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

  const apply = (n, msg) => { setData((d) => ({ ...d, order: n })); toast(msg) }
  const patch = async (body, msg) => { try { apply(await adm.patch(`/orders/${o.id}/`, body), msg) } catch (e) { toast(e.message, 'err') } }
  const confirm = async () => { try { apply(await adm.post(`/orders/${o.id}/confirm-payment/`), 'Payment confirmed. The customer has their receipt and scratch card.') } catch (e) { toast(e.message, 'err') } }
  const reject = async () => { try { apply(await adm.post(`/orders/${o.id}/reject-payment/`), 'Marked: payment not found.') } catch (e) { toast(e.message, 'err') } }
  const remove = async () => { try { await adm.del(`/orders/${o.id}/`); toast('Invoice deleted.'); nav('/manage/billing') } catch (e) { toast(e.message, 'err') } }
  const needsPay = o.payment_status !== 'paid' && o.status !== 'cancelled' && o.source === 'online'

  return (
    <>
      <PageHead title={o.invoice_no} sub={`${o.customer_name} · ${fmtDate(o.created_at)}`}>
        <Link to="/manage/billing" className="ad-btn ghost ad-noprint">← All orders</Link>
        <PayBadge order={o} />
        <select className={`ad-status big s-${o.status} ad-noprint`} value={o.status} onChange={(e) => patch({ status: e.target.value }, `Marked ${statusLabel(e.target.value)}.`)} aria-label="Order status">
          {STATUSES.map((x) => <option key={x} value={x}>{statusLabel(x)}</option>)}
        </select>
        <button className="ad-btn primary ad-noprint" onClick={() => window.print()}><Icon name="print" size={18} /> Print / Save PDF</button>
        <button className="ad-icon-btn danger ad-noprint" onClick={() => setDel(true)} aria-label="Delete invoice"><Icon name="trash" size={18} /></button>
      </PageHead>

      {needsPay && (
        <section className="ad-card pad ad-paybox ad-noprint">
          <div>
            <h2>Payment {o.payment_status === 'submitted' ? 'waiting for your check' : o.payment_status === 'rejected' ? 'marked not found' : 'not received yet'}</h2>
            <p className="ad-muted">
              {o.payment_status === 'submitted'
                ? <>Customer says they paid <b>₹{o.total}</b> and gave UPI reference <code>{o.upi_ref}</code>. Open your UPI app / bank statement, find that reference, then confirm.</>
                : <>Waiting for the customer to pay <b>₹{o.total}</b> by the QR code. You can also confirm manually if the money is in your account.</>}
            </p>
          </div>
          <div className="ad-row">
            <button className="ad-btn primary" onClick={confirm}><Icon name="check" size={18} /> Payment received — confirm</button>
            {o.payment_status === 'submitted' && <button className="ad-btn ghost" onClick={reject}>Not found</button>}
          </div>
        </section>
      )}

      <Invoice order={o} seller={s} />

      <AnimatePresence>{del && <Confirm title={`Delete ${o.invoice_no}?`} text="This permanently removes the invoice. To keep a record, mark it Cancelled instead." onNo={() => setDel(false)} onYes={remove} />}</AnimatePresence>
    </>
  )
}
