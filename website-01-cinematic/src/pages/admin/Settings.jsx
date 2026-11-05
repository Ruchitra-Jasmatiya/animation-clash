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
