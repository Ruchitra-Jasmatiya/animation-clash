import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fmtDate, inr } from '../lib/format'
import { cancelOrder, getOrder, submitPayment } from '../lib/shop'
import { useToast } from '../lib/toast'
import Footer from '../components/Footer'
import Invoice from '../components/Invoice'
import { PageTop, PayBadge } from '../components/PageBits'

function Countdown({ to }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((new Date(to) - Date.now()) / 1000)))
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(to) - Date.now()) / 1000))), 1000)
    return () => clearInterval(t)
  }, [to])
  const m = String(Math.floor(left / 60)).padStart(2, '0'), s = String(left % 60).padStart(2, '0')
  return <b className={left < 120 ? 'warn' : ''}>{left ? `${m}:${s}` : 'expired'}</b>
}

export default function OrderDetail() {
  const { id } = useParams()
  const toast = useToast()
  const [o, setO] = useState(null)
  const [err, setErr] = useState('')
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => getOrder(id).then(setO).catch((e) => setErr(e.message)), [id])
  useEffect(() => { load() }, [load])
  // while we wait for the store to confirm the payment, keep checking
  const waiting = o && o.status !== 'cancelled' && o.payment_status !== 'paid'
  useEffect(() => {
    if (!waiting) return
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 5000)
    return () => clearInterval(t)
  }, [waiting, load])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { setO(await submitPayment(id, ref)); toast('Thanks! We are verifying your payment.') } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return
    try { setO(await cancelOrder(id)); toast('Order cancelled') } catch (e) { toast(e.message, 'err') }
  }

  if (!o) return <main className="shop-page"><PageTop title="Order" />{err ? <p className="fld-err">{err}</p> : <p className="muted-center">Loading…</p>}</main>
  const pay = o.payment
  const paid = o.payment_status === 'paid' && o.status !== 'cancelled'

  return (
    <main className="shop-page">
      <PageTop title={o.invoice_no} sub={`Placed ${fmtDate(o.created_at)}`}>
        <PayBadge order={o} />
        <Link to="/orders" className="btn btn-light btn-sm">← All orders</Link>
      </PageTop>

      {paid && (
        <div className="notice good">
          <b>Payment confirmed 🎉</b>
          <span>Thank you! {o.loyalty_free ? 'Your free order is confirmed.' : 'A scratch card is waiting for you in Rewards.'}</span>
          {!o.loyalty_free && <Link to="/rewards" className="btn btn-dark btn-sm">Scratch my card</Link>}
        </div>
      )}
      {o.status === 'cancelled' && <div className="notice bad"><b>This order was cancelled.</b><span>Any stock, coupon or reward used was returned.</span></div>}

      {o.status !== 'cancelled' && !paid && pay && (
        <section className="panel pay">
          <div className="pay-qr">
            <div className="qr-box" dangerouslySetInnerHTML={{ __html: pay.qr_svg }} role="img" aria-label={`UPI QR code for ${inr(pay.amount)}`} />
            <small>New QR for this order only</small>
          </div>
          <div className="pay-info">
            {o.payment_status === 'submitted' ? (
              <>
                <h2>Verifying your payment…</h2>
                <p>We received your reference <b>{o.upi_ref}</b>. The store is confirming it — this page updates by itself. You can safely close it; your order is saved.</p>
                <div className="verify-dots" aria-hidden="true"><i /><i /><i /></div>
              </>
            ) : (
              <>
                <h2>Pay {inr(pay.amount)} with any UPI app</h2>
                <ol className="pay-steps">
                  <li>Open GPay, PhonePe, Paytm or any UPI app and scan this QR.</li>
                  <li>Pay exactly <b>{inr(pay.amount)}</b> to <b>{pay.payee}</b> ({pay.upi_id}).</li>
                  <li>Type the <b>UPI reference / UTR number</b> from your app below and press “I have paid”.</li>
                </ol>
                <a className="btn btn-light btn-sm pay-app" href={pay.upi_uri}>Open my UPI app (phone)</a>
                {pay.expires_at && <p className="pay-timer">Order held for you: <Countdown to={pay.expires_at} /></p>}
                <form onSubmit={submit} className="pay-form">
                  <label className="fld"><span>UPI reference / UTR</span><input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="e.g. 412345678901" maxLength={30} required /></label>
                  {o.payment_status === 'rejected' && <p className="fld-err">We couldn't find that payment. Please check the reference and send it again.</p>}
                  {err && <p className="fld-err" role="alert">{err}</p>}
                  <div className="pay-actions">
                    <button className="btn btn-dark btn-lg" disabled={busy || ref.length < 8}>{busy ? 'Sending…' : 'I have paid'}</button>
                    <button type="button" className="link" onClick={cancel}>Cancel order</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      )}

      {o.status !== 'cancelled' && !paid && !pay && <div className="notice"><b>Payment is not set up yet.</b><span>Please contact the store to complete this order.</span></div>}

      <div className="invoice-actions">
        <h2>Invoice &amp; receipt</h2>
        <button className="btn btn-light btn-sm" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      <Invoice order={o} seller={o.seller} />
      <Footer />
    </main>
  )
}
