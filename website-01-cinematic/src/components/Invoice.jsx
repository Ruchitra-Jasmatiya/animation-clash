import { amountInWords, fmtDate, inr } from '../lib/format'
import '../invoice.css'

const METHOD = { cash: 'Cash', upi: 'UPI', card: 'Card', bank: 'Bank transfer', cod: 'Cash on delivery', loyalty: 'Free order reward' }
const n = (v) => Number(v) || 0
const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean)

/** A complete tax invoice / receipt. Used by the shopper (their order page) and by the store manager (billing). */
export default function Invoice({ order: o, seller: s }) {
  const paid = o.payment_status === 'paid' || o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered'
  const cancelled = o.status === 'cancelled'
  const gross = n(o.subtotal) - n(o.festival_discount) - n(o.discount) - n(o.reward_discount)
  const taxable = o.prices_include_gst ? gross - n(o.tax) : gross
  const half = n(o.tax) / 2
  const hasGst = n(o.gst_percent) > 0
  const terms = lines(s.terms_conditions)

  return (
    <article className="inv" id="invoice">
      {(paid || cancelled) && <div className={`inv-stamp ${cancelled ? 'bad' : 'ok'}`} aria-hidden="true">{cancelled ? 'CANCELLED' : 'PAID'}</div>}

      <header className="inv-head">
        <div>
          <h2 className="inv-brand">{s.store_name}</h2>
          {s.tagline && <p className="inv-tag">{s.tagline}</p>}
          {s.address && <p className="inv-pre">{s.address}</p>}
          <p>{[s.phone, s.email].filter(Boolean).join(' · ')}</p>
          {s.gstin && <p><b>GSTIN:</b> {s.gstin}</p>}
        </div>
        <div className="inv-meta">
          <h3>{hasGst && s.gstin ? 'TAX INVOICE' : 'INVOICE / RECEIPT'}</h3>
          <dl>
            <div><dt>Invoice no.</dt><dd>{o.invoice_no}</dd></div>
            <div><dt>Date</dt><dd>{fmtDate(o.created_at)}</dd></div>
            <div><dt>Payment</dt><dd>{cancelled ? 'Cancelled' : paid ? 'Paid' : o.payment_status === 'submitted' ? 'Being verified' : 'Unpaid'}</dd></div>
            <div><dt>Order source</dt><dd>{o.source === 'online' ? 'Website' : 'Store counter'}</dd></div>
          </dl>
        </div>
      </header>

      <section className="inv-parties">
        <div>
          <small>Billed to / Ship to</small>
          <b>{o.customer_name}</b>
          {o.phone && <p>{o.phone}</p>}
          {o.email && <p>{o.email}</p>}
          {o.address && <p className="inv-pre">{o.address}</p>}
        </div>
        <div>
          <small>Payment details</small>
          <p><b>Method:</b> {METHOD[o.payment_method] || o.payment_method}</p>
          {o.upi_ref && <p><b>UPI reference (UTR):</b> {o.upi_ref}</p>}
          {o.paid_at && <p><b>Paid on:</b> {fmtDate(o.paid_at)}</p>}
          {o.verified_by && <p><b>Confirmed by:</b> {o.verified_by === 'auto' || o.verified_by === 'system' ? 'MASSUP system' : 'MASSUP store team'}</p>}
        </div>
      </section>

      <div className="inv-scroll">
        <table className="inv-table">
          <thead><tr><th>#</th><th>Item</th>{s.hsn_code && <th>HSN</th>}<th className="r">Rate</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {o.items.map((it, i) => (
              <tr key={it.id ?? i}><td>{i + 1}</td><td>{it.name}</td>{s.hsn_code && <td>{s.hsn_code}</td>}<td className="r">{inr(it.unit_price)}</td><td className="r">{it.quantity}</td><td className="r">{inr(it.line_total)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="inv-bottom">
        <div className="inv-words">
          <small>Amount in words</small>
          <p>{amountInWords(o.total)}</p>
          {o.source === 'online' && <p className="inv-note">How this price was worked out: item prices × quantity, minus every offer shown on the right, plus shipping{hasGst ? o.prices_include_gst ? ', with GST already included in item prices' : ', plus GST' : ''}. Nothing is added after this total.</p>}
        </div>
        <dl className="inv-totals">
          <div><dt>Subtotal</dt><dd>{inr(o.subtotal)}</dd></div>
          {n(o.festival_discount) > 0 && <div className="good"><dt>{o.festival_name || 'Festival'} offer</dt><dd>− {inr(o.festival_discount)}</dd></div>}
          {n(o.discount) > 0 && <div className="good"><dt>Coupon {o.coupon_code && `(${o.coupon_code})`}</dt><dd>− {inr(o.discount)}</dd></div>}
          {n(o.reward_discount) > 0 && <div className="good"><dt>Scratch reward {o.reward_label && `(${o.reward_label})`}</dt><dd>− {inr(o.reward_discount)}</dd></div>}
          {hasGst && <div><dt>Taxable value</dt><dd>{inr(taxable)}</dd></div>}
          {hasGst && s.show_cgst_sgst && <><div><dt>CGST {n(o.gst_percent) / 2}%</dt><dd>{inr(half)}</dd></div><div><dt>SGST {n(o.gst_percent) / 2}%</dt><dd>{inr(half)}</dd></div></>}
          {hasGst && !s.show_cgst_sgst && <div><dt>GST {n(o.gst_percent)}%</dt><dd>{inr(o.tax)}</dd></div>}
          <div><dt>Shipping</dt><dd>{n(o.shipping) ? inr(o.shipping) : 'Free'}</dd></div>
          {n(o.loyalty_discount) > 0 && <div className="good"><dt>Free order reward</dt><dd>− {inr(o.loyalty_discount)}</dd></div>}
          <div className="grand"><dt>Total {paid ? 'paid' : 'payable'}</dt><dd>{inr(o.total)}</dd></div>
        </dl>
      </div>

      {(n(o.festival_discount) + n(o.discount) + n(o.reward_discount) + n(o.loyalty_discount)) > 0 && (
        <p className="inv-save">You saved {inr(n(o.festival_discount) + n(o.discount) + n(o.reward_discount) + n(o.loyalty_discount))} on this order.</p>
      )}
      {o.notes && <p className="inv-note"><b>Order note:</b> {o.notes}</p>}

      <section className="inv-terms">
        {terms.length > 0 && <div><h4>Terms &amp; conditions</h4><ol>{terms.map((t, i) => <li key={i}>{t}</li>)}</ol></div>}
        {s.return_policy && <div><h4>Return &amp; refund policy</h4><p className="inv-pre">{s.return_policy}</p></div>}
      </section>

      <footer className="inv-foot">
        <div>
          {s.declaration && <p className="inv-decl"><b>Declaration:</b> {s.declaration}</p>}
          <p className="inv-thanks">{s.invoice_footer}</p>
          <p className="inv-fine">This is a computer-generated invoice and is valid without a physical signature unless stated otherwise.</p>
        </div>
        <div className="inv-sign"><span /><small>For {s.store_name}</small><b>{s.signatory || 'Authorised signatory'}</b></div>
      </footer>
    </article>
  )
}
