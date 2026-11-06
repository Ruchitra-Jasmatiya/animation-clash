import { motion, useScroll, useSpring } from 'framer-motion'

/** Thin pistachio bar at the very top that fills as you scroll the page. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 })
  return <motion.div className="scroll-progress" aria-hidden="true" style={{ scaleX }} />
}