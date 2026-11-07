import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getOffers } from '../lib/shop'

/** A small dismissible chip: today's festival offer, straight from the admin's Festivals page. */
export default function OfferStrip() {
  const [o, setO] = useState(null)
  const [hide, setHide] = useState(() => { try { return sessionStorage.getItem('massup.offer') === '1' } catch { return false } })
  useEffect(() => {
    const load = () => getOffers().then(setO).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])
  const live = o?.live
  return (
    <AnimatePresence>
      {live && !hide && (
        <motion.div className="offer-strip" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ delay: 1.2, type: 'spring', stiffness: 220, damping: 22 }}>
          <Link to="/products"><b>🪔 {live.name}: {Number(live.percent)}% off</b><span>auto-applied at checkout{live.ends ? ` · till ${new Date(live.ends).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</span></Link>
          <button aria-label="Dismiss" onClick={() => { setHide(true); try { sessionStorage.setItem('massup.offer', '1') } catch { /* ignore */ } }}>×</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
