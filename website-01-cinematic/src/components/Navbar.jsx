import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLenis } from '../lib/smooth'
import Magnetic from './Magnetic'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
]

export default function Navbar() {
  const [openPath, setOpenPath] = useState(null)
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  const { pathname } = useLocation()
  const open = openPath === pathname
  const setOpen = (v) => setOpenPath((typeof v === 'function' ? v(open) : v) ? pathname : null)
  const navigate = useNavigate()
  const lenis = useLenis()

  // hide on scroll down, show on scroll up
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setSolid(y > 40)
      if (Math.abs(y - last) > 6) setHidden(y > last && y > 240)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!lenis) return
    open ? lenis.stop() : lenis.start()
    return () => lenis.start()
  }, [open, lenis])

  const goStory = (e) => {
    e.preventDefault()
    setOpen(false)
    const scroll = () => {
      const el = document.getElementById('story')
      if (el) lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' })
    }
    if (pathname === '/') scroll()
    else { navigate('/'); setTimeout(scroll, 1800) }
  }

  return (
    <>
      <motion.header
        className={`nav${solid ? ' is-solid' : ''}${open ? ' menu-open' : ''}`}
        animate={{ y: hidden && !open ? '-140%' : '0%' }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <nav className="nav-pill" aria-label="Main">
          <Link to="/" className="brand" aria-label="MASSUP home">
            MASSUP<i>.</i>
          </Link>

          <div className="nav-links">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <span>{l.label}</span>
              </NavLink>
            ))}
            <a href="/#story" className="nav-link" onClick={goStory}><span>Our story</span></a>
          </div>

          <div className="nav-right">
            <Magnetic strength={0.25}>
              <Link to="/products" className="btn btn-dark btn-sm">
                Shop now <span className="arrow" aria-hidden="true">↗</span>
              </Link>
            </Magnetic>
            <button className={`burger${open ? ' is-open' : ''}`} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <span /><span />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div className="menu" initial={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }} animate={{ clipPath: 'circle(150% at calc(100% - 40px) 40px)' }} exit={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }} transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}>
            <div className="menu-links">
              {[...links, { to: '/#story', label: 'Our story', story: true }].map((l, i) => (
                <div className="menu-row" key={l.label}>
                  <motion.div initial={{ y: '110%' }} animate={{ y: 0, transition: { delay: 0.25 + i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] } }} exit={{ y: '110%' }}>
                    {l.story ? (
                      <a href="/#story" onClick={goStory}><em>0{i + 1}</em>{l.label}</a>
                    ) : (
                      <Link to={l.to}><em>0{i + 1}</em>{l.label}</Link>
                    )}
                  </motion.div>
                </div>
              ))}
            </div>
            <p className="menu-foot">Fuel your better.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
