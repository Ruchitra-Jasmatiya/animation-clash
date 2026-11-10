import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { scratchCard } from '../lib/shop'
import { formatPrice } from '../lib/api'

const when = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const STATE = { used: 'Used', expired: 'Expired', available: 'Ready to use', unscratched: 'Scratch me!' }

/** A real scratch card: rub the foil with finger or mouse. The prize is decided by the server and stays hidden until you scratch. */
export default function ScratchCard({ card, onChange }) {
  const canvas = useRef(null)
  const [data, setData] = useState(card)
  const [gone, setGone] = useState(card.revealed)
  const asked = useRef(false)
  const drawing = useRef(false)
  const last = useRef(null)
  const cleared = useRef(0)

  const reveal = useCallback(async () => {
    if (asked.current || data.revealed) return
    asked.current = true
    try { const r = await scratchCard(card.id); setData(r); onChange?.(r) } catch { asked.current = false }
  }, [card.id, data.revealed, onChange])

  useEffect(() => {
    const c = canvas.current
    if (!c || gone) return
    const ctx = c.getContext('2d')
    const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = w * dpr; c.height = h * dpr
    ctx.scale(dpr, dpr)
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#9fbb82'); g.addColorStop(0.5, '#d9e8bf'); g.addColorStop(1, '#8fae72')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,.28)'
    for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2.4 + 0.4, 0, 7); ctx.fill() }
    ctx.fillStyle = '#2c3a22'; ctx.font = '700 15px Inter Variable, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('SCRATCH HERE', w / 2, h / 2 - 2)
    ctx.font = '500 11px Inter Variable, system-ui, sans-serif'; ctx.fillText('to reveal your reward', w / 2, h / 2 + 16)
  }, [gone])

  const scratch = (e) => {
    if (!drawing.current || gone) return
    const c = canvas.current, r = c.getBoundingClientRect(), ctx = c.getContext('2d')
    const x = e.clientX - r.left, y = e.clientY - r.top
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = 34; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(last.current?.x ?? x, last.current?.y ?? y); ctx.lineTo(x, y); ctx.stroke()
    last.current = { x, y }
    cleared.current += 1
    reveal()
    if (cleared.current % 12 === 0) {
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let t = 0
      for (let i = 3; i < d.length; i += 64) if (d[i] === 0) t++
      if (t / (d.length / 64) > 0.4) setGone(true)
    }
  }
  const done = () => { drawing.current = false; last.current = null }

  const shown = data.revealed
  return (
    <motion.div className={`scratch st-${data.status}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="scratch-face" onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); scratch(e) }} onPointerMove={scratch} onPointerUp={done} onPointerCancel={done}>
        <div className="scratch-prize">
          {shown && data.label ? (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
              <small>You won</small><b>{data.label}</b>
              {Number(data.min_order) > 0 && <span>on orders above {formatPrice(data.min_order)}</span>}
            </motion.div>
          ) : <b className="q">?</b>}
        </div>
        {!gone && <canvas ref={canvas} className="scratch-foil" aria-hidden="true" />}
      </div>
      <div className="scratch-foot">
        <span className={`pill ${data.status}`}>{STATE[data.status] || data.status}</span>
        <small>{data.order ? `From ${data.order} · ` : ''}{data.valid_until ? `valid till ${when(data.valid_until)}` : ''}</small>
        {!gone && <button className="link" onClick={() => { reveal(); setGone(true) }}>Reveal</button>}
      </div>
    </motion.div>
  )
}
