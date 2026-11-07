import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SmoothScroll, useLenis } from './lib/smooth'
import { AppContext } from './lib/app-context'
import Navbar from './components/Navbar'
import ScrollProgress from './components/ScrollProgress'
import Preloader from './components/Preloader'
import Home from './pages/Home'
import Products from './pages/Products'
import AdminApp from './pages/admin/AdminApp'
import Auth from './pages/Auth'
import Cart from './pages/Cart'
import Wishlist from './pages/Wishlist'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Rewards from './pages/Rewards'
import OfferStrip from './components/OfferStrip'
import { ToastProvider } from './lib/toast'
import { initSession, trackView, useShop } from './lib/shop'

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
      <motion.div key={location.pathname.startsWith('/manage') ? '/manage' : location.pathname} className="page" exit={{ opacity: 0, transition: { delay: 0.55, duration: 0.01 } }}>
        <motion.div className="curtain" aria-hidden="true" initial={{ scaleY: 1, transformOrigin: 'top' }} animate={{ scaleY: 0, transformOrigin: 'top', transition: { duration: 0.8, delay: 0.1, ease: [0.76, 0, 0.24, 1] } }} exit={{ scaleY: 1, transformOrigin: 'bottom', transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } }} />
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/manage/*" element={<AdminApp />} />
          <Route path="*" element={<Products />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/manage')
  const [ready, setReady] = useState(() => window.location.pathname.startsWith('/manage'))
  const ctx = useMemo(() => ({ ready }), [ready])
  const { status } = useShop()
  const done = useCallback(() => setReady(true), [])

  useEffect(() => { if (!isAdmin) initSession() }, [isAdmin])
  useEffect(() => { trackView(pathname) }, [pathname])

  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', !ready && status === 'in')
  }, [ready, status])

  return (
    <AppContext.Provider value={ctx}>
      <ScrollReset />
      {isAdmin ? <AnimatedRoutes /> : status === 'in' ? (
        <>
          <ScrollProgress />
          <Navbar />
          <AnimatedRoutes />
          <OfferStrip />
        </>
      ) : status === 'checking' ? <div className="boot" aria-label="Loading"><i /></div> : <Auth />}
      <AnimatePresence>{!ready && status === 'in' && !isAdmin && <Preloader key="pre" onDone={done} />}</AnimatePresence>
    </AppContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SmoothScroll>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </SmoothScroll>
    </BrowserRouter>
  )
}
