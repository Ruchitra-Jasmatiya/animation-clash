import { motion } from 'framer-motion'

/**
 * A looping animation of pistachios cracking open: the shell wobbles, splits along its seam,
 * the green kernel pops out, tiny shell bits fly, then it all closes again.
 * Pure SVG + Framer Motion - no image or video needed.
 */
const SEAM = 'L92 190 L108 160 L92 130 L108 100 L92 70 Z'
const LEFT = `M100 38 C50 38 32 100 40 150 C48 205 75 228 100 228 ${SEAM}`
const RIGHT = `M100 38 C150 38 168 100 160 150 C152 205 125 228 100 228 ${SEAM}`

// [dx, dy, radius, isGreen]
const SHARDS = [
  [-78, -64, 5, 0], [-46, -104, 4, 1], [4, -118, 6, 0], [58, -96, 4, 1], [86, -52, 5, 0],
  [-96, -6, 4, 1], [98, 4, 6, 0], [-66, 52, 4, 0], [70, 58, 5, 1], [-20, 92, 3, 1], [30, 100, 4, 0],
]

const T = [0, 0.3, 0.4, 0.82, 1] // crack at 30-40 %, hold open, close again

function Nut({ delay = 0, className = '', spin = 0 }) {
  const loop = { duration: 6.6, repeat: Infinity, delay, times: T, ease: 'easeInOut' }
  const id = `shell-${className.replace(/\W/g, '')}`
  return (
    <motion.svg
      className={`nut ${className}`}
      viewBox="-60 -70 320 360"
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.4, rotate: spin - 25 }}
      animate={{ opacity: 1, scale: 1, rotate: spin }}
      transition={{ duration: 1.4, delay: 0.5 + delay * 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6ecca" />
          <stop offset="1" stopColor="#d8c58c" />
        </linearGradient>
        <radialGradient id={`${id}-k`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#c4e07f" />
          <stop offset="1" stopColor="#7fa83f" />
        </radialGradient>
      </defs>

      {/* soft glow behind the kernel */}
      <motion.circle cx="100" cy="135" r="78" fill="rgba(251,246,230,0.65)"
        animate={{ scale: [0.5, 0.5, 1.2, 1.05, 0.5], opacity: [0, 0, 0.9, 0.35, 0] }} transition={loop} style={{ originX: '50%', originY: '50%' }} />

      {/* kernel */}
      <motion.g animate={{ scale: [0.5, 0.5, 1.04, 1.04, 0.5], y: [8, 8, -20, -20, 8], opacity: [0, 0, 1, 1, 0] }} transition={loop} style={{ originX: 0.5, originY: 0.5 }}>
        <ellipse cx="100" cy="135" rx="31" ry="56" fill={`url(#${id}-k)`} stroke="#b5607a" strokeOpacity="0.55" strokeWidth="3" />
        <path d="M100 86 C93 112 93 160 100 186" fill="none" stroke="#6f9534" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="88" cy="108" rx="7" ry="16" fill="#ffffff" opacity="0.28" />
      </motion.g>

      {/* shell halves (whole nut shakes first, then the halves swing apart) */}
      <motion.g animate={{ rotate: [0, 0, -3, 3, -3, 3, 0, 0] }} transition={{ duration: 6.6, repeat: Infinity, delay, times: [0, 0.14, 0.18, 0.22, 0.26, 0.3, 0.32, 1], ease: 'easeInOut' }} style={{ originX: 0.5, originY: 1 }}>
        <motion.path d={LEFT} fill={`url(#${id})`} stroke="#b49a5a" strokeWidth="2.5" strokeLinejoin="round"
          animate={{ x: [0, 0, -40, -40, 0], y: [0, 0, 6, 6, 0], rotate: [0, 0, -20, -20, 0] }} transition={loop} style={{ originX: 1, originY: 1 }} />
        <motion.path d={RIGHT} fill={`url(#${id})`} stroke="#b49a5a" strokeWidth="2.5" strokeLinejoin="round"
          animate={{ x: [0, 0, 40, 40, 0], y: [0, 0, 6, 6, 0], rotate: [0, 0, 20, 20, 0] }} transition={loop} style={{ originX: 0, originY: 1 }} />
      </motion.g>

      {/* flying shell bits and kernel crumbs */}
      {SHARDS.map(([dx, dy, r, green], i) => (
        <motion.circle key={i} cx="100" cy="135" r={r} fill={green ? '#9cc25c' : '#e4d39a'} stroke={green ? 'none' : '#b49a5a'} strokeWidth="1.2"
          animate={{ x: [0, 0, dx, dx * 1.25, 0], y: [0, 0, dy, dy + 36, 0], opacity: [0, 0, 1, 0, 0], scale: [0.4, 0.4, 1, 0.6, 0.4] }}
          transition={{ duration: 6.6, repeat: Infinity, delay, times: [0, 0.34, 0.48, 0.74, 1], ease: 'easeOut' }} />
      ))}
    </motion.svg>
  )
}

export default function PistaCrack() {
  return (
    <div className="pista-stage" aria-hidden="true">
      <motion.div className="nut-bob a" animate={{ y: [0, -14, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}><Nut className="n1" delay={0} spin={-8} /></motion.div>
      <motion.div className="nut-bob b" animate={{ y: [0, 12, 0] }} transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}><Nut className="n2" delay={2.2} spin={12} /></motion.div>
      <motion.div className="nut-bob c" animate={{ y: [0, -10, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}><Nut className="n3" delay={4.1} spin={-18} /></motion.div>
    </div>
  )
}
