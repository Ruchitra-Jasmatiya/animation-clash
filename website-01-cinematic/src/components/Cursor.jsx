import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/** Soft follower cursor for mouse devices. Elements can set data-cursor="View" for a label. */
export default function Cursor() {
  const [enabled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  const [label, setLabel] = useState('')
  const [hover, setHover] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 420, damping: 34, mass: 0.35 })
  const sy = useSpring(y, { stiffness: 420, damping: 34, mass: 0.35 })

  useEffect(() => {
    if (!enabled) return
    const move = (e) => { x.set(e.clientX); y.set(e.clientY) }
    const over = (e) => {
      const t = e.target.closest?.('[data-cursor], a, button, input, select, textarea, label')
      setHover(!!t)
      setLabel(t?.dataset?.cursor || '')
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
    }
  }, [enabled, x, y])

  if (!enabled) return null
  const big = !!label
  return (
    <motion.div
      className="cursor"
      aria-hidden="true"
      style={{ x: sx, y: sy }}
      animate={{ width: big ? 92 : hover ? 44 : 14, height: big ? 92 : hover ? 44 : 14, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <span className={`cursor-label${big ? ' on' : ''}`}>{label}</span>
    </motion.div>
  )
}
