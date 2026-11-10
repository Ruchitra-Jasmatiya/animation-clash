import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { adm } from '../../lib/api'
import { Confirm, Empty, ErrorBox, Field, Icon, Modal, PageHead, Spinner, fmtDate, useAsync, useToast } from './ui'

const STATE = { live: 'Live now', scheduled: 'Scheduled', off: 'Off', past: 'Finished' }
const BLANK = { name: '', date: '', start_date: '', end_date: '', discount_percent: '10', max_discount: '', min_order: '0', tagline: '', note: '', active: true }

export default function Festivals() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => adm.get('/festivals/'), [])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [showPast, setShowPast] = useState(false)

  const save = (n) => { setData((l) => (l.some((x) => x.id === n.id) ? l.map((x) => (x.id === n.id ? n : x)) : [...l, n].sort((a, b) => a.date.localeCompare(b.date)))); setEdit(null) }
  const toggle = async (f) => { try { save(await adm.patch(`/festivals/${f.id}/`, { active: !f.active })); toast(!f.active ? `${f.name} offer is ON.` : `${f.name} offer is OFF.`) } catch (e) { toast(e.message, 'err') } }
  const remove = async () => { try { await adm.del(`/festivals/${del.id}/`); setData((l) => l.filter((x) => x.id !== del.id)); setDel(null); toast('Festival deleted.') } catch (e) { toast(e.message, 'err') } }

  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />
  const rows = data.filter((f) => showPast || f.state !== 'past')
  const live = data.filter((f) => f.state === 'live')

  return (
    <>
      <PageHead title="Festival offers" sub="Indian festival calendar. Switch an offer ON and customers see the discount on the website straight away.">
        <button className="ad-btn ghost" onClick={() => setShowPast((v) => !v)}>{showPast ? 'Hide finished' : 'Show finished'}</button>
        <button className="ad-btn primary" onClick={() => setEdit({ ...BLANK })}><Icon name="plus" size={18} /> Custom offer</button>
      </PageHead>
      {live.length > 0 && <div className="ad-card pad ad-live">🎉 Live now: <b>{live.map((f) => `${f.name} (${Number(f.discount_percent)}% off)`).join(', ')}</b></div>}
      {!rows.length ? <Empty icon="calendar" title="No upcoming festivals" text="Add a custom offer." /> : (
        <div className="ad-fest">
          {rows.map((f, i) => (
            <motion.article key={f.id} className={`ad-card fest s-${f.state}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
              <div className="fest-date"><b>{new Date(f.date + 'T00:00').getDate()}</b><span>{new Date(f.date + 'T00:00').toLocaleString('en-IN', { month: 'short' })}</span></div>
              <div className="fest-body">
                <h3>{f.name}</h3>
                <small>{f.state === 'past' ? 'Finished' : f.days_left === 0 ? 'Today' : `In ${f.days_left} days`} · offer {fmtDate(f.start_date, false)} – {fmtDate(f.end_date, false)}</small>
                {f.note && <small>{f.note}</small>}
                <div className="ad-row"><span className={`ad-badge fs-${f.state}`}>{STATE[f.state]}</span><span className="ad-badge">{Number(f.discount_percent)}% off{f.max_discount ? ` (max ₹${Number(f.max_discount)})` : ''}{Number(f.min_order) ? ` · min ₹${Number(f.min_order)}` : ''}</span></div>
              </div>
              <div className="fest-act">
                <button type="button" className={`ad-switch${f.active ? ' on' : ''}`} onClick={() => toggle(f)} aria-pressed={f.active} aria-label={`${f.name} offer on or off`}><i /><span>{f.active ? 'On' : 'Off'}</span></button>
                <button className="ad-icon-btn" onClick={() => setEdit(f)} aria-label="Edit"><Icon name="edit" size={18} /></button>
                <button className="ad-icon-btn danger" onClick={() => setDel(f)} aria-label="Delete"><Icon name="trash" size={18} /></button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
      <AnimatePresence>
        {edit && <FestForm f={edit} onClose={() => setEdit(null)} onSaved={(n) => { save(n); toast('Festival saved.') }} />}
        {del && <Confirm title={`Delete ${del.name}?`} text="Customers will no longer see this offer." onNo={() => setDel(null)} onYes={remove} />}
      </AnimatePresence>
    </>
  )
}

function FestForm({ f, onClose, onSaved }) {
  const [v, setV] = useState({ ...f, max_discount: f.max_discount ?? '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const body = { name: v.name, date: v.date, start_date: v.start_date || v.date, end_date: v.end_date || v.date, discount_percent: v.discount_percent, max_discount: v.max_discount === '' ? null : v.max_discount, min_order: v.min_order || 0, tagline: v.tagline, note: v.note, active: v.active }
    try { onSaved(v.id ? await adm.patch(`/festivals/${v.id}/`, body) : await adm.post('/festivals/', body)) } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <Modal onClose={onClose} label="Festival offer">
      <form className="ad-stack gap" onSubmit={submit}>
        <div className="ad-sheet-head"><h2>{v.id ? 'Edit offer' : 'New offer'}</h2><button type="button" className="ad-icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <Field label="Festival name"><input value={v.name} onChange={set('name')} required maxLength={80} /></Field>
        <div className="ad-two">
          <Field label="Festival date"><input type="date" value={v.date} onChange={set('date')} required /></Field>
          <Field label="Discount (%)"><input type="number" min="0" max="90" step="0.5" value={v.discount_percent} onChange={set('discount_percent')} required /></Field>
        </div>
        <div className="ad-two">
          <Field label="Offer starts" hint="Blank = festival day"><input type="date" value={v.start_date} onChange={set('start_date')} /></Field>
          <Field label="Offer ends" hint="Blank = festival day"><input type="date" value={v.end_date} onChange={set('end_date')} /></Field>
        </div>
        <div className="ad-two">
          <Field label="Maximum discount (₹)" hint="Blank = no limit"><input type="number" min="0" value={v.max_discount} onChange={set('max_discount')} /></Field>
          <Field label="Minimum order (₹)"><input type="number" min="0" value={v.min_order} onChange={set('min_order')} /></Field>
        </div>
        <Field label="Short message on the website"><input value={v.tagline} onChange={set('tagline')} maxLength={140} placeholder="Light up Diwali with pistachio protein" /></Field>
        <label className="ad-check"><input type="checkbox" checked={v.active} onChange={set('active')} /> Offer is ON</label>
        {err && <p className="ad-formerr" role="alert">{err}</p>}
        <div className="ad-row end"><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button className="ad-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Modal>
  )
}
