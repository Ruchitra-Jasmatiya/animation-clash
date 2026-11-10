import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { adm } from '../../lib/api'
import { Confirm, Empty, ErrorBox, Field, Icon, Modal, PageHead, Spinner, fmtDate, fromLocalInput, inr0, toLocalInput, useAsync, useToast } from './ui'

const BLANK = { code: '', description: '', discount_type: 'percent', value: '', min_order: '0', max_discount: '', usage_limit: '', starts_at: '', expires_at: '', active: true }

const rule = (c) => `${c.discount_type === 'percent' ? `${Number(c.value)}% off` : `${inr0(c.value)} off`}${Number(c.min_order) > 0 ? ` over ${inr0(c.min_order)}` : ''}${c.discount_type === 'percent' && c.max_discount ? `, up to ${inr0(c.max_discount)}` : ''}`

export default function Coupons() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => adm.get('/coupons/'), [])
  const [editing, setEditing] = useState(null)
  const [del, setDel] = useState(null)

  const toggle = async (c) => {
    try { const n = await adm.patch(`/coupons/${c.id}/`, { active: !c.active }); setData((l) => l.map((x) => (x.id === c.id ? n : x))) } catch (e) { toast(e.message, 'err') }
  }
  const remove = async () => { try { await adm.del(`/coupons/${del.id}/`); setData((l) => l.filter((x) => x.id !== del.id)); setDel(null); toast('Coupon deleted.') } catch (e) { toast(e.message, 'err') } }
  const saved = (c, isNew) => { setData((l) => (isNew ? [c, ...l] : l.map((x) => (x.id === c.id ? c : x)))); setEditing(null); toast(isNew ? 'Coupon created.' : 'Coupon updated.') }
  const [now] = useState(() => Date.now())

  return (
    <>
      <PageHead title="Coupons & discounts" sub="Codes you can apply when billing a customer.">
        <button className="ad-btn primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} /> New coupon</button>
      </PageHead>
      {loading && !data ? <Spinner /> : error && !data ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? (
        <Empty icon="tag" title="No coupons yet" text="Create a code like WELCOME10 for 10% off."><button className="ad-btn primary" onClick={() => setEditing('new')}>Create coupon</button></Empty>
      ) : (
        <div className="ad-coupons">
          <AnimatePresence initial={false}>
            {data.map((c) => {
              const expired = c.expires_at && new Date(c.expires_at).getTime() < now
              const used = c.usage_limit != null && c.used_count >= c.usage_limit
              const state = !c.active ? 'Paused' : expired ? 'Expired' : used ? 'Used up' : 'Live'
              return (
                <motion.article key={c.id} layout className={`ad-card coupon ${state === 'Live' ? 'live' : 'off'}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}>
                  <div className="ticket"><code>{c.code}</code><span className={`ad-badge ${state === 'Live' ? 's-paid' : 's-cancelled'}`}>{state}</span></div>
                  <b>{rule(c)}</b>
                  {c.description && <p className="ad-muted">{c.description}</p>}
                  <small>Used {c.used_count}{c.usage_limit != null ? ` of ${c.usage_limit}` : ''} times{c.expires_at ? ` · ends ${fmtDate(c.expires_at, false)}` : ''}</small>
                  <div className="prod-foot">
                    <button type="button" className={`ad-switch${c.active ? ' on' : ''}`} onClick={() => toggle(c)} aria-pressed={c.active}><i /><span>{c.active ? 'Active' : 'Paused'}</span></button>
                    <div className="ad-row">
                      <button className="ad-icon-btn" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}><Icon name="edit" size={18} /></button>
                      <button className="ad-icon-btn danger" onClick={() => setDel(c)} aria-label={`Delete ${c.code}`}><Icon name="trash" size={18} /></button>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}
      <AnimatePresence>
        {editing && <CouponEditor key="e" coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={saved} />}
        {del && <Confirm key="d" title={`Delete ${del.code}?`} text="Past invoices keep the code they used." onNo={() => setDel(null)} onYes={remove} />}
      </AnimatePresence>
    </>
  )
}

function CouponEditor({ coupon, onClose, onSaved }) {
  const isNew = !coupon
  const [f, setF] = useState(() => (coupon ? { ...BLANK, ...coupon, max_discount: coupon.max_discount ?? '', usage_limit: coupon.usage_limit ?? '', starts_at: toLocalInput(coupon.starts_at), expires_at: toLocalInput(coupon.expires_at) } : BLANK))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const body = {
      code: f.code, description: f.description, discount_type: f.discount_type, value: f.value, min_order: f.min_order || '0',
      max_discount: f.discount_type === 'percent' && f.max_discount !== '' ? f.max_discount : null,
      usage_limit: f.usage_limit === '' ? null : Number(f.usage_limit), starts_at: fromLocalInput(f.starts_at), expires_at: fromLocalInput(f.expires_at), active: f.active,
    }
    try { onSaved(isNew ? await adm.post('/coupons/', body) : await adm.patch(`/coupons/${coupon.id}/`, body), isNew) } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <Modal onClose={onClose} label={isNew ? 'New coupon' : 'Edit coupon'}>
      <form className="ad-form" onSubmit={submit}>
        <h2>{isNew ? 'New coupon' : 'Edit coupon'}</h2>
        <div className="ad-stack">
          <div className="ad-two">
            <Field label="Code" hint="Letters & numbers, e.g. WELCOME10"><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') })} maxLength={40} required /></Field>
            <Field label="Type"><select value={f.discount_type} onChange={set('discount_type')}><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select></Field>
          </div>
          <div className="ad-two">
            <Field label={f.discount_type === 'percent' ? 'Percent (%)' : 'Amount (₹)'}><input type="number" min="0.01" step="0.01" max={f.discount_type === 'percent' ? 100 : undefined} value={f.value} onChange={set('value')} required /></Field>
            <Field label="Minimum order (₹)"><input type="number" min="0" step="0.01" value={f.min_order} onChange={set('min_order')} /></Field>
          </div>
          <div className="ad-two">
            {f.discount_type === 'percent' && <Field label="Maximum discount (₹)" hint="Optional cap"><input type="number" min="0" step="0.01" value={f.max_discount} onChange={set('max_discount')} /></Field>}
            <Field label="Usage limit" hint="Blank = unlimited"><input type="number" min="1" value={f.usage_limit} onChange={set('usage_limit')} /></Field>
          </div>
          <div className="ad-two">
            <Field label="Starts (optional)"><input type="datetime-local" value={f.starts_at} onChange={set('starts_at')} /></Field>
            <Field label="Expires (optional)"><input type="datetime-local" value={f.expires_at} onChange={set('expires_at')} /></Field>
          </div>
          <Field label="Note to yourself"><input value={f.description} onChange={set('description')} maxLength={200} /></Field>
          <label className="ad-check"><input type="checkbox" checked={f.active} onChange={set('active')} /> Active</label>
        </div>
        {err && <p className="ad-formerr" role="alert">{err}</p>}
        <div className="ad-row end"><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button className="ad-btn primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create coupon' : 'Save'}</button></div>
      </form>
    </Modal>
  )
}
