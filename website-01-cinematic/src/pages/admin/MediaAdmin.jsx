import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { adm, mediaSrc } from '../../lib/api'
import { DEFAULT_MEDIA } from '../../lib/defaults'
import { Confirm, ErrorBox, Field, Icon, Modal, PageHead, Spinner, useAsync, useToast } from './ui'
import { clearMediaCache } from '../../lib/useSiteMedia'

const GROUP_HELP = {
  Home: 'Images and videos on the home page. Add Extra videos to create a new “In motion” section.',
  Shop: 'Media on the Products page. Add a Shop banner video to show a banner under the title.',
}

export default function MediaAdmin() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => adm.get('/site-media/'), [])
  const [group, setGroup] = useState('Home')
  const [edit, setEdit] = useState(null)
  const [reset, setReset] = useState(null)

  const replace = (n) => { setData((l) => l.map((x) => (x.slot === n.slot ? n : x))); setEdit(null); clearMediaCache(); toast('Updated — it is live on the website.') }
  const doReset = async () => {
    try { const n = await adm.del(`/site-media/${reset.slot}/`); setData((l) => l.map((x) => (x.slot === n.slot ? n : x))); sessionStorage.removeItem('massup.media.v1'); setReset(null); toast('Reset to the original.') } catch (e) { toast(e.message, 'err') }
  }

  const groups = [...new Set((data || []).map((d) => d.group))]
  const items = (data || []).filter((d) => d.group === group)

  return (
    <>
      <PageHead title="Site media" sub="Change any image or video on the website — no code needed." />
      {loading && !data ? <Spinner /> : error && !data ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <div className="ad-chips" role="tablist">
            {groups.map((g) => <button key={g} role="tab" aria-selected={group === g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>{g === 'Home' ? 'Home page' : 'Shop page'}</button>)}
          </div>
          <p className="ad-muted pad-b">{GROUP_HELP[group]}</p>
          <div className="ad-media">
            {items.map((m, i) => {
              const src = mediaSrc(m.url) || DEFAULT_MEDIA[m.slot]
              return (
                <motion.article key={m.slot} className="ad-card media" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                  <div className={`media-view${m.kind === 'video' ? ' vid' : ''}`}>
                    {src ? (m.kind === 'video' ? <video key={src} src={src} muted loop playsInline autoPlay preload="metadata" /> : <img src={src} alt="" loading="lazy" />) : <span className="ad-muted"><Icon name={m.kind === 'video' ? 'play' : 'image'} size={28} /><br />Not set</span>}
                    <span className={`ad-badge ${m.custom ? 's-paid' : 's-pending'}`}>{m.custom ? 'Custom' : src ? 'Default' : 'Empty'}</span>
                  </div>
                  <b>{m.label}</b>
                  <div className="ad-row">
                    <button className="ad-btn ghost sm" onClick={() => setEdit(m)}><Icon name="upload" size={16} /> {m.custom ? 'Replace' : src ? 'Change' : 'Add'}</button>
                    {m.custom && <button className="ad-btn ghost sm" onClick={() => setReset(m)}>Reset</button>}
                  </div>
                </motion.article>
              )
            })}
          </div>
        </>
      )}
      <AnimatePresence>
        {edit && <MediaEditor key="e" item={edit} onClose={() => setEdit(null)} onSaved={replace} />}
        {reset && <Confirm key="r" title="Reset to original?" text={`“${reset.label}” goes back to the built-in version.`} action="Reset" onNo={() => setReset(null)} onYes={doReset} />}
      </AnimatePresence>
    </>
  )
}

function MediaEditor({ item, onClose, onSaved }) {
  const isVideo = item.kind === 'video'
  const [mode, setMode] = useState('upload')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  const max = isVideo ? 60 : 8
  const accept = isVideo ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp,image/gif,image/avif'
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pick = (f) => {
    if (!f) return
    if (f.size > max * 1024 * 1024) return setErr(`That file is over ${max} MB.`)
    if (!(isVideo ? /^video\/(mp4|webm)$/ : /^image\//).test(f.type)) return setErr(isVideo ? 'Choose an MP4 or WebM video.' : 'Choose an image file.')
    setErr(''); setFile(f)
  }
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (mode === 'upload' && !file) return setErr('Choose a file first.')
    if (mode === 'url' && !url.trim()) return setErr('Paste a link first.')
    setBusy(true)
    try {
      let body
      if (mode === 'upload') { body = new FormData(); body.append('file', file) } else body = { url: url.trim() }
      { const saved = await adm.put(`/site-media/${item.slot}/`, body); clearMediaCache(); onSaved(saved) }
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  const shown = mode === 'upload' ? preview : url

  return (
    <Modal onClose={onClose} label={item.label}>
      <form className="ad-form" onSubmit={submit}>
        <h2>{item.label}</h2>
        <div className="ad-tabs">
          <button type="button" className={mode === 'upload' ? 'on' : ''} onClick={() => setMode('upload')}><Icon name="upload" size={16} /> Upload</button>
          <button type="button" className={mode === 'url' ? 'on' : ''} onClick={() => setMode('url')}><Icon name="link" size={16} /> {isVideo ? 'Video link' : 'Image link'}</button>
        </div>
        {mode === 'upload' ? (
          <div className="ad-drop" role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}>
            <input ref={input} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
            <Icon name="upload" size={26} /><b>{file ? file.name : `Choose ${isVideo ? 'a video' : 'an image'} from your device`}</b>
            <small>{isVideo ? 'MP4 or WebM' : 'JPG, PNG, WebP, GIF or AVIF'} · up to {max} MB</small>
          </div>
        ) : (
          <Field label={isVideo ? 'Direct link to an .mp4 or .webm file' : 'Image link'} hint={isVideo ? 'Must be a direct video file link (not a YouTube page).' : undefined}><input type="text" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
        )}
        {shown && <div className="ad-preview">{isVideo ? <video key={shown} src={shown} muted loop autoPlay playsInline controls /> : <img src={shown} alt="Preview" />}</div>}
        {err && <p className="ad-formerr" role="alert">{err}</p>}
        <div className="ad-row end"><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button><button className="ad-btn primary" disabled={busy}>{busy ? (mode === 'upload' ? 'Uploading…' : 'Saving…') : 'Save'}</button></div>
      </form>
    </Modal>
  )
}
