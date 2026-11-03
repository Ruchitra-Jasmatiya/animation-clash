import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/** Wraps a child so it gently follows the cursor (fine pointers only). */
export default function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null)
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 })
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 })

  const move = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const leave = () => { x.set(0); y.set(0) }

  return (
    <motion.span ref={ref} className={`magnetic ${className}`} style={{ x, y, display: 'inline-block' }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </motion.span>
  )
}
