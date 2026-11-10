import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { adm } from '../../lib/api'
import { Confirm, Empty, ErrorBox, Field, Icon, Modal, PageHead, Spinner, useAsync, useToast } from './ui'

const KIND = { flat: 'Rupees off', percent: 'Percent off', shipping: 'Free shipping' }
const BLANK = { label: '', kind: 'flat', value: '10', max_discount: '', min_order: '0', weight: '10', valid_days: '30', active: true }

export default function RewardsAdmin() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => adm.get('/reward-pool/'), [])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  if (loading && !data) return <Spinner />
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />
  const total = data.filter((r) => r.active).reduce((n, r) => n + r.weight, 0) || 1
  const save = (n) => { setData((l) => (l.some((x) => x.id === n.id) ? l.map((x) => (x.id === n.id ? n : x)) : [...l, n])); setEdit(null) }
  const toggle = async (r) => { try { save(await adm.patch(`/reward-pool/${r.id}/`, { active: !r.active })) } catch (e) { toast(e.message, 'err') } }
  const remove = async () => { try { await adm.del(`/reward-pool/${del.id}/`); setData((l) => l.filter((x) => x.id !== del.id)); setDel(null); toast('Prize deleted.') } catch (e) { toast(e.message, 'err') } }

  return (
    <>
      <PageHead title="Scratch-card prizes" sub="Every paid order gets one scratch card. These are the prizes it can reveal — a higher chance means it shows up more often.">
        <button className="ad-btn primary" onClick={() => setEdit({ ...BLANK })}><Icon name="plus" size={18} /> New prize</button>
      </PageHead>
      {!data.length ? <Empty icon="gift" title="No prizes" text="Customers get nothing from scratch cards until you add a prize." /> : (
        <div className="ad-card table-card">
          <table className="ad-table">
            <thead><tr><th>Prize</th><th>Type</th><th>Condition</th><th>Valid for</th><th className="r">Chance</th><th>On</th><th /></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className={r.active ? '' : 'dim'}>
                  <td data-l="Prize"><b>{r.shown_as}</b></td>
                  <td data-l="Type">{KIND[r.kind]}</td>
                  <td data-l="Condition">{Number(r.min_order) ? `Orders above ₹${Number(r.min_order)}` : 'Any order'}{r.max_discount ? ` · up to ₹${Number(r.max_discount)}` : ''}</td>
                  <td data-l="Valid for">{r.valid_days} days</td>
                  <td data-l="Chance" className="r">{r.active ? `${Math.round((r.weight / total) * 100)}%` : '—'}</td>
                  <td data-l="On"><button type="button" className={`ad-switch${r.active ? ' on' : ''}`} onClick={() => toggle(r)} aria-pressed={r.active} aria-label="Prize on or off"><i /></button></td>
                  <td className="r"><button className="ad-icon-btn" onClick={() => setEdit(r)} aria-label="Edit"><Icon name="edit" size={18} /></button><button className="ad-icon-btn danger" onClick={() => setDel(r)} aria-label="Delete"><Icon name="trash" size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AnimatePresence>
        {edit && <Form r={edit} onClose={() => setEdit(null)} onSaved={(n) => { save(n); toast('Prize saved.') }} />}
        {del && <Confirm title="Delete this prize?" text="Cards already given keep their prize." onNo={() => setDel(null)} onYes={remove} />}
      </AnimatePresence>
    </>
  )
}

function Form({ r, onClose, onSaved }) {
  const [v, setV] = useState({ ...r, max_discount: r.max_discount ?? '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const body = { label: v.label, kind: v.kind, value: v.kind === 'shipping' ? 0 : v.value, max_discount: v.max_discount === '' ? null : v.max_discount, min_order: v.min_order || 0, weight: v.weight, valid_days: v.valid_days, active: v.active }
    try { onSaved(v.id ? await adm.patch(`/reward-pool/${v.id}/`, body) : await adm.post('/reward-pool/', body)) } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <Modal onClose={onClose} label="Prize">
      <form className="ad-stack gap" onSubmit={submit}>
        <div className="ad-sheet-head"><h2>{v.id ? 'Edit prize' : 'New prize'}</h2><button type="button" className="ad-icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <div className="ad-two">
          <Field label="Type"><select value={v.kind} onChange={set('kind')}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          {v.kind !== 'shipping' && <Field label={v.kind === 'percent' ? 'Percent' : 'Rupees'}><input type="number" min="1" step="0.5" value={v.value} onChange={set('value')} required /></Field>}
        </div>
        <div className="ad-two">
          {v.kind === 'percent' && <Field label="Maximum discount (₹)"><input type="number" min="0" value={v.max_discount} onChange={set('max_discount')} /></Field>}
          <Field label="Minimum order (₹)"><input type="number" min="0" value={v.min_order} onChange={set('min_order')} /></Field>
        </div>
        <div className="ad-two">
          <Field label="Chance weight" hint="10 = normal, 40 = very common"><input type="number" min="1" value={v.weight} onChange={set('weight')} required /></Field>
          <Field label="Valid for (days)"><input type="number" min="1" value={v.valid_days} onChange={set('valid_days')} required /></Field>
        </div>
        <Field label="Custom name (optional)"><input value={v.label} onChange={set('label')} maxLength={60} /></Field>
        <label className="ad-check"><input type="checkbox" checked={v.active} onChange={set('active')} /> Prize is ON</label>
        {err && <p className="ad-formerr" role="alert">{err}</p>}
        <div className="ad-row end"><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button className="ad-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Modal>
  )
}
