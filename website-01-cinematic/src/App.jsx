import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SmoothScroll, useLenis } from './lib/smooth'
import { AppContext } from './lib/app-context'
import Navbar from './components/Navbar'
import Cursor from './components/Cursor'
import Preloader from './components/Preloader'
import Home from './pages/Home'
import Products from './pages/Products'
import Manage from './pages/Manage'

/** Every route change starts at the top; ScrollTrigger re-measures once the new page is in. */
function ScrollReset() {
  const { pathname } = useLocation()
  const lenis = useLenis()
  useEffect(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
    else window.scrollTo(0, 0)
    const t = setTimeout(() => ScrollTrigger.refresh(), 250)
    return () => clearTimeout(t)
  }, [pathname, lenis])
  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} className="page" exit={{ opacity: 0, transition: { delay: 0.55, duration: 0.01 } }}>
        <motion.div className="curtain" aria-hidden="true" initial={{ scaleY: 1, transformOrigin: 'top' }} animate={{ scaleY: 0, transformOrigin: 'top', transition: { duration: 0.8, delay: 0.1, ease: [0.76, 0, 0.24, 1] } }} exit={{ scaleY: 1, transformOrigin: 'bottom', transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } }} />
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="*" element={<Products />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const ctx = useMemo(() => ({ ready }), [ready])

  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', !ready)
  }, [ready])

  return (
    <BrowserRouter>
      <SmoothScroll>
        <AppContext.Provider value={ctx}>
          <ScrollReset />
          <Cursor />
          <Navbar />
          <AnimatedRoutes />
          <AnimatePresence>{!ready && <Preloader key="pre" onDone={() => setReady(true)} />}</AnimatePresence>
        </AppContext.Provider>
      </SmoothScroll>
    </BrowserRouter>
  )
}
