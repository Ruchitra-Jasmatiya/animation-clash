import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Split from '../components/Split'
import ProductCard from '../components/ProductCard'
import ProductModal from '../components/ProductModal'
import Footer from '../components/Footer'
import { useProducts } from '../lib/useProducts'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SORTS = [
  { v: 'new', label: 'Newest' },
  { v: 'low', label: 'Price: low to high' },
  { v: 'high', label: 'Price: high to low' },
  { v: 'az', label: 'Name: A to Z' },
]

const RIBBON = ['02-nuts-flying', '03-powder-scoop', '05-shake-swirl', '08-pistachio-macro', '09-lid-closeup', '10-lid-open', '11-jar-bowl']

export default function Products() {
  const root = useRef(null)
  const { products, status, slow, reload } = useProducts()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('new')
  const [stockOnly, setStockOnly] = useState(false)
  const [open, setOpen] = useState(null)
  const [toast, setToast] = useState('')

  const list = useMemo(() => {
    let out = products.filter((p) => (stockOnly ? p.in_stock !== false : true))
    const needle = q.trim().toLowerCase()
    if (needle) out = out.filter((p) => `${p.name} ${p.flavour} ${p.description}`.toLowerCase().includes(needle))
    const num = (p) => Number(p.price) || 0
    if (sort === 'low') out = [...out].sort((a, b) => num(a) - num(b))
    if (sort === 'high') out = [...out].sort((a, b) => num(b) - num(a))
    if (sort === 'az') out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [products, q, sort, stockOnly])

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 700)
    return () => clearTimeout(t)
  }, [list.length])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('.pp-title-wrap', { yPercent: -25, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.pp-hero', start: 'top top', end: 'bottom top', scrub: true } })
        gsap.to('.pp-orb', { yPercent: -80, ease: 'none', scrollTrigger: { trigger: '.pp-hero', start: 'top top', end: 'bottom top', scrub: true } })

        // ribbon: pinned, slides sideways with scroll
        const track = root.current.querySelector('.ribbon-track')
        if (track) {
          const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80)
          gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.ribbon', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } })
          gsap.utils.toArray('.ribbon-item', root.current).forEach((el, i) =>
            gsap.fromTo(el, { yPercent: i % 2 ? 8 : -8 }, { yPercent: i % 2 ? -8 : 8, ease: 'none', scrollTrigger: { trigger: '.ribbon', start: 'top top', end: () => `+=${dist()}`, scrub: true } })
          )
        }
      })
      return () => mm.revert()
    },
    { scope: root }
  )

  return (
    <main ref={root} className="pp">
      <section className="pp-hero">
        <div className="pp-orb" aria-hidden="true" />
        <div className="pp-title-wrap">
          <span className="eyebrow">The collection</span>
          <h1 className="pp-title">
            <Split text="Pick your" trigger="ready" delay={0.2} />
            <br />
            <Split text="*jar.*" trigger="ready" delay={0.4} />
          </h1>
          <motion.p className="pp-sub" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 1, ease: [0.16, 1, 0.3, 1] }}>
            Pistachio protein in every size. New jars appear here the moment they're added to the store.
          </motion.p>
        </div>
      </section>

      <section className="pp-shop" id="shop">
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Search products</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jars, flavours…" type="search" />
          </label>
          <div className="toolbar-right">
            <button type="button" className={`chip${stockOnly ? ' on' : ''}`} aria-pressed={stockOnly} onClick={() => setStockOnly((s) => !s)}>In stock</button>
            <label className="select">
              <span className="sr-only">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <p className="count" aria-live="polite">
          {status === 'loading' ? 'Loading the collection…' : `${list.length} ${list.length === 1 ? 'product' : 'products'}`}
        </p>

        {status === 'fallback' && (
          <div className="notice">
            Couldn't reach the store just now, so you're seeing sample products.
            <button type="button" onClick={reload}>Try again</button>
          </div>
        )}

        {status === 'loading' ? (
          <>
            <div className="grid grid-3" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="card skeleton" key={i}><div className="card-media" /><div className="card-body"><div className="sk-line" /><div className="sk-line short" /></div></div>
              ))}
            </div>
            {slow && <p className="wake">Waking the kitchen — the store was asleep. This can take a few seconds…</p>}
          </>
        ) : list.length ? (
          <motion.div className="grid grid-3" layout>
            <AnimatePresence mode="popLayout">
              {list.map((p, i) => <ProductCard key={p.id} product={p} index={i} onOpen={setOpen} />)}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="empty">
            <h3>Nothing matches that.</h3>
            <p>Try a different word, or clear the filters.</p>
            <button className="btn btn-line" onClick={() => { setQ(''); setStockOnly(false) }}>Clear filters</button>
          </div>
        )}
      </section>

      <section className="ribbon" aria-label="Inside the jar">
        <div className="ribbon-head">
          <span className="eyebrow">Inside the jar</span>
          <h2 className="h2">Keep <em>scrolling.</em></h2>
        </div>
        <div className="ribbon-track">
          {RIBBON.map((n, i) => (
            <figure className="ribbon-item" key={n} style={{ '--i': i }}>
              <img src={`/images/massup-${n}.jpg`} alt="" loading="lazy" />
            </figure>
          ))}
        </div>
      </section>

      <Footer />

      <ProductModal
        product={open}
        onClose={() => setOpen(null)}
        onAdd={(p) => { setOpen(null); setToast(`${p.name} — ordering opens soon. This demo has no checkout yet.`) }}
      />
      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>{toast}</motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
