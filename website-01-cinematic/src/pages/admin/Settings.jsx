import { useState } from 'react'
import { adm, setToken } from '../../lib/api'
import { ErrorBox, Field, PageHead, Spinner, useAsync, useToast } from './ui'

export default function Settings({ user }) {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => adm.get('/settings/'), [])
  const [draft, setDraft] = useState(null)
  const f = draft ?? data
  const setF = (v) => setDraft((prev) => (typeof v === 'function' ? v(prev ?? data) : v))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { setF(await adm.put('/settings/', f)); toast('Settings saved.') } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  if (loading && !f) return <Spinner />
  if (error && !f) return <ErrorBox message={error} onRetry={reload} />

  return (
    <>
      <PageHead title="Settings" sub="Shown on invoices and used for tax and shipping." />
      <div className="ad-grid-2 start">
        <form className="ad-card pad ad-stack gap" onSubmit={save}>
          <h2>Store details</h2>
          <div className="ad-two">
            <Field label="Store name"><input value={f.store_name} onChange={set('store_name')} maxLength={100} required /></Field>
            <Field label="Tagline"><input value={f.tagline} onChange={set('tagline')} maxLength={120} /></Field>
          </div>
          <Field label="Address (printed on invoices)"><textarea rows={2} value={f.address} onChange={set('address')} /></Field>
          <div className="ad-two">
            <Field label="Phone"><input value={f.phone} onChange={set('phone')} maxLength={40} /></Field>
            <Field label="Email"><input type="email" value={f.email} onChange={set('email')} /></Field>
          </div>
          <h2>Tax & shipping</h2>
          <div className="ad-two">
            <Field label="GSTIN"><input value={f.gstin} onChange={set('gstin')} maxLength={20} /></Field>
            <Field label="GST rate (%)" hint="0 = no tax line"><input type="number" min="0" max="100" step="0.01" value={f.gst_percent} onChange={set('gst_percent')} /></Field>
          </div>
          <label className="ad-check"><input type="checkbox" checked={f.prices_include_gst} onChange={set('prices_include_gst')} /> Product prices already include GST</label>
          <div className="ad-two">
            <Field label="Shipping fee (₹)"><input type="number" min="0" step="0.01" value={f.shipping_fee} onChange={set('shipping_fee')} /></Field>
            <Field label="Free shipping above (₹)" hint="0 = never free"><input type="number" min="0" step="0.01" value={f.free_shipping_above} onChange={set('free_shipping_above')} /></Field>
          </div>
          <label className="ad-check"><input type="checkbox" checked={f.show_cgst_sgst} onChange={set('show_cgst_sgst')} /> Show GST as CGST + SGST on invoices</label>
          <Field label="HSN code" hint="Printed next to items"><input value={f.hsn_code} onChange={set('hsn_code')} maxLength={12} /></Field>

          <h2 className="ad-formblock">UPI payments</h2>
          <div className="ad-two">
            <Field label="Your UPI ID" hint="Money from every QR code comes here"><input value={f.upi_id} onChange={set('upi_id')} placeholder="yourname@bank" /></Field>
            <Field label="Name shown in the UPI app"><input value={f.upi_name} onChange={set('upi_name')} maxLength={60} /></Field>
          </div>
          <div className="ad-two">
            <Field label="Minutes to pay" hint="Unpaid orders are cancelled after this"><input type="number" min="5" max="1440" value={f.payment_window_minutes} onChange={set('payment_window_minutes')} /></Field>
            <Field label="Low-stock warning at"><input type="number" min="0" value={f.low_stock_threshold} onChange={set('low_stock_threshold')} /></Field>
          </div>
          <label className="ad-check"><input type="checkbox" checked={f.auto_confirm_payments} onChange={set('auto_confirm_payments')} /> <span><b>Testing only:</b> treat every submitted payment as paid automatically</span></label>

          <h2 className="ad-formblock">Free-order loyalty</h2>
          <label className="ad-check"><input type="checkbox" checked={f.loyalty_enabled} onChange={set('loyalty_enabled')} /> Loyalty is ON</label>
          <div className="ad-two">
            <Field label="Paid orders before a free one"><input type="number" min="1" max="100" value={f.loyalty_every} onChange={set('loyalty_every')} /></Field>
            <Field label="Free order up to (₹)"><input type="number" min="0" value={f.loyalty_cap} onChange={set('loyalty_cap')} /></Field>
          </div>

          <h2 className="ad-formblock">Invoice wording</h2>
          <Field label="Terms & conditions" hint="One point per line"><textarea rows={6} value={f.terms_conditions} onChange={set('terms_conditions')} /></Field>
          <Field label="Return & refund policy"><textarea rows={3} value={f.return_policy} onChange={set('return_policy')} /></Field>
          <Field label="Declaration"><textarea rows={2} value={f.declaration} onChange={set('declaration')} /></Field>
          <Field label="Signatory name"><input value={f.signatory} onChange={set('signatory')} maxLength={80} /></Field>
          <Field label="Invoice footer message"><textarea rows={2} value={f.invoice_footer} onChange={set('invoice_footer')} /></Field>
          {err && <p className="ad-formerr" role="alert">{err}</p>}
          <button className="ad-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </form>
        <Password user={user} />
      </div>
    </>
  )
}

function Password({ user }) {
  const toast = useToast()
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [again, setAgain] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (nw !== again) return setErr('The two new passwords don’t match.')
    setBusy(true)
    try {
      const r = await adm.post('/auth/change-password/', { current_password: cur, new_password: nw })
      setToken(r.token); setCur(''); setNw(''); setAgain(''); toast('Password changed.')
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <form className="ad-card pad ad-stack gap" onSubmit={submit}>
      <h2>Change password</h2>
      <p className="ad-muted">Signed in as <b>{user}</b>. Use a long password you don’t use anywhere else.</p>
      <Field label="Current password"><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required /></Field>
      <Field label="New password" hint="At least 8 characters, not too common, not all numbers"><input type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" required /></Field>
      <Field label="New password again"><input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required /></Field>
      {err && <p className="ad-formerr" role="alert">{err}</p>}
      <button className="ad-btn primary" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button>
    </form>
  )
}
