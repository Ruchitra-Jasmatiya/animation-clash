import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLenis } from '../lib/smooth'
import Magnetic from './Magnetic'
import { logout, useShop } from '../lib/shop'

const Ico = ({ d }) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const ICON = {
  heart: 'M12 20.5s-7.500-4.600-9.200-9.400C1.700 7.800 3.700 5 6.700 5c2 0 3.400 1.100 5.300 3.300C13.900 6.100 15.300 5 17.300 5c3 0 5 2.800 3.900 6.100-1.700 4.800-9.200 9.400-9.200 9.400Z',
  bag: 'M5 8h14l-1 12H6L5 8Zm3 0a4 4 0 0 1 8 0',
  gift: 'M4 11h16v9H4v-9Zm-1-4h18v4H3V7Zm9 0v13M12 7c-1-3-5-4-5-1.500S10 7 12 7Zm0 0c1-3 5-4 5-1.500S14 7 12 7Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
}
const Count = ({ n }) => (n > 0 ? <i className="nav-count">{n > 99 ? '99+' : n}</i> : null)

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
  { to: '/rewards', label: 'Rewards' },
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
  const { summary, customer } = useShop()
  const [acct, setAcct] = useState(false)

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
            <Link to="/rewards" className="nav-ic nav-rewards" aria-label="Rewards"><Ico d={ICON.gift} /><span className="nav-ic-label">Rewards</span><Count n={summary.scratch_cards} /></Link>
            <Link to="/wishlist" className="nav-ic" aria-label={`Wishlist, ${summary.wishlist} saved`}><Ico d={ICON.heart} /><Count n={summary.wishlist} /></Link>
            <Link to="/cart" className="nav-ic" aria-label={`Bag, ${summary.cart} items`}><Ico d={ICON.bag} /><Count n={summary.cart} /></Link>
            <div className="acct">
              <button className="nav-ic avatar" aria-label="Account" aria-expanded={acct} onClick={() => setAcct((a) => !a)}>{(customer?.name || customer?.email || '?').trim()[0]?.toUpperCase()}</button>
              {acct && (
                <div className="acct-menu" onMouseLeave={() => setAcct(false)}>
                  <p><b>{customer?.name}</b><small>{customer?.email}</small></p>
                  <Link to="/orders" onClick={() => setAcct(false)}>My orders {summary.to_verify > 0 && <em>{summary.to_verify} verifying</em>}</Link>
                  <Link to="/rewards" onClick={() => setAcct(false)}>Rewards</Link>
                  <Link to="/wishlist" onClick={() => setAcct(false)}>Wishlist</Link>
                  <button onClick={() => { setAcct(false); logout() }}>Log out</button>
                </div>
              )}
            </div>
            <Magnetic strength={0.25}>
              <Link to="/products" className="btn btn-dark btn-sm shop-btn">
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
