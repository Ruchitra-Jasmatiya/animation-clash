import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'

/** Counts to 100 while the jar unmasks, then lifts away like a curtain (exit) as the hero starts. */
export default function Preloader({ onDone }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    const controls = animate(0, 100, {
      duration: 2.1,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setN(Math.round(v)),
      onComplete: () => setTimeout(onDone, 200),
    })
    return () => controls.stop()
  }, [onDone])

  return (
    <motion.div className="preloader" exit={{ y: '-100%', transition: { duration: 1.05, ease: [0.76, 0, 0.24, 1] } }}>
      <div className="preloader-inner">
        <motion.div
          className="preloader-jar"
          initial={{ clipPath: 'inset(100% 0 0 0)' }}
          animate={{ clipPath: 'inset(0% 0 0 0)' }}
          transition={{ duration: 2.1, ease: [0.65, 0, 0.35, 1] }}
        >
          <img src="/images/massup-01-jar-hero.jpg" alt="" />
        </motion.div>
        <div className="preloader-meta">
          <span className="preloader-brand">MASSUP<i>.</i></span>
          <span className="preloader-count">{String(n).padStart(3, '0')}</span>
        </div>
      </div>
    </motion.div>
  )
}
