import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Split from '../components/Split'
import ProductCard from '../components/ProductCard'
import ProductModal from '../components/ProductModal'
import Footer from '../components/Footer'
import CtaReveal from '../components/CtaReveal'
import { useProducts } from '../lib/useProducts'
import { useSiteMedia } from '../lib/useSiteMedia'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SORTS = [
  { v: 'new', label: 'Newest' },
  { v: 'low', label: 'Price: low to high' },
  { v: 'high', label: 'Price: high to low' },
  { v: 'az', label: 'Name: A to Z' },
]

const RIBBON = ['02-nuts-flying', '03-powder-scoop', '05-shake-swirl', '08-pistachio-macro', '09-lid-closeup', '10-lid-open', '11-jar-bowl']

/** A number that rolls up/down smoothly when it changes. */
function Count({ value }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => Math.round(v))
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.7, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [value, mv])
  return <motion.span>{text}</motion.span>
}

const HERO_FLOATS = ['08-pistachio-macro', '02-nuts-flying', '03-powder-scoop']

export default function Products() {
  const root = useRef(null)
  const { products, status, slow, reload } = useProducts()
  const media = useSiteMedia()
  const bannerSrc = media.custom('shop_banner_video') ? media.url('shop_banner_video') : ''
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('new')
  const [stockOnly, setStockOnly] = useState(false)
  const [flavour, setFlavour] = useState('all')
  const [fresh, setFresh] = useState(() => new Set())
  const seen = useRef(null)
  const [open, setOpen] = useState(null)
  const [toast, setToast] = useState('')

  const flavours = useMemo(() => [...new Set(products.map((p) => (p.flavour || '').trim()).filter(Boolean))], [products])
  const activeFlavour = flavour === 'all' || flavours.includes(flavour) ? flavour : 'all'

  const list = useMemo(() => {
    let out = products.filter((p) => (stockOnly ? p.in_stock !== false : true) && (activeFlavour === 'all' || (p.flavour || '').trim() === activeFlavour))
    const needle = q.trim().toLowerCase()
    if (needle) out = out.filter((p) => `${p.name} ${p.flavour} ${p.description}`.toLowerCase().includes(needle))
    const num = (p) => Number(p.price) || 0
    if (sort === 'low') out = [...out].sort((a, b) => num(a) - num(b))
    if (sort === 'high') out = [...out].sort((a, b) => num(b) - num(a))
    if (sort === 'az') out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [products, q, sort, stockOnly, activeFlavour])

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 700)
    return () => clearTimeout(t)
  }, [list.length])

  // when the admin adds a jar while this page is open, point it out
  useEffect(() => {
    if (status !== 'ready') return
    const ids = new Set(products.map((p) => p.id))
    if (seen.current) {
      const added = products.filter((p) => !seen.current.has(p.id))
      if (added.length) {
        setFresh(new Set(added.map((p) => p.id)))
        setToast(added.length === 1 ? `Just landed: ${added[0].name}` : `${added.length} new jars just landed`)
      }
    }
    seen.current = ids
  }, [products, status])

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
        gsap.to('.pp-orb', { yPercent: -80, scale: 1.25, ease: 'none', scrollTrigger: { trigger: '.pp-hero', start: 'top top', end: 'bottom top', scrub: true } })
        gsap.utils.toArray('.pp-float', root.current).forEach((el, i) =>
          gsap.to(el, { yPercent: -90 - i * 60, rotate: (i % 2 ? 1 : -1) * 28, ease: 'none', scrollTrigger: { trigger: '.pp-hero', start: 'top top', end: 'bottom top', scrub: true } })
        )

        // flavour words slide sideways while you scroll past
        gsap.utils.toArray('.pp-words', root.current).forEach((el, i) =>
          gsap.fromTo(el, { xPercent: i ? -22 : 0 }, { xPercent: i ? 0 : -22, ease: 'none', scrollTrigger: { trigger: '.pp-wordband', start: 'top bottom', end: 'bottom top', scrub: true } })
        )

        // ribbon: pinned, slides sideways with scroll
        const track = root.current.querySelector('.ribbon-track')
        if (track) {
          const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80)
          gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.ribbon', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } })
          gsap.utils.toArray('.ribbon-item', root.current).forEach((el, i) =>
            gsap.fromTo(el, { yPercent: i % 2 ? 8 : -8, rotate: i % 2 ? 3 : -3 }, { yPercent: i % 2 ? -8 : 8, rotate: i % 2 ? -3 : 3, ease: 'none', scrollTrigger: { trigger: '.ribbon', start: 'top top', end: () => `+=${dist()}`, scrub: true } })
          )
          gsap.to('.ribbon-bar i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.ribbon', start: 'top top', end: () => `+=${dist()}`, scrub: true } })
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
        {HERO_FLOATS.map((n, i) => (
          <motion.img key={n} className={`pp-float f${i + 1}`} src={media.url(`ribbon_${i + 1}`)} alt="" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 + i * 0.15, duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
        ))}
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

      <section className="pp-wordband" aria-hidden="true">
        {[0, 1].map((r) => (
          <div className="pp-words" key={r}>
            {Array.from({ length: 3 }).map((_, k) => (
              <span key={k}>
                {(r ? ['Creamy', 'Smooth', 'Everyday', 'Pistachio'] : ['Pick your jar', 'Real pistachio', 'Fuel your better']).map((w, i) => (
                  <b key={i} className={i % 2 ? 'outline' : ''}>{w}<i>✦</i></b>
                ))}
              </span>
            ))}
          </div>
        ))}
      </section>

      {bannerSrc && (
        <motion.section className="pp-banner" initial={{ clipPath: 'inset(12% 8% 12% 8% round 40px)', opacity: 0.4 }} whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 28px)', opacity: 1 }} viewport={{ once: true, margin: '0px 0px -15% 0px' }} transition={{ duration: 1.3, ease: [0.76, 0, 0.24, 1] }}>
          <video key={bannerSrc} autoPlay loop muted playsInline preload="metadata"><source src={bannerSrc} /></video>
        </motion.section>
      )}

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

        {flavours.length > 1 && (
          <div className="flavours" role="tablist" aria-label="Filter by flavour">
            {['all', ...flavours].map((f) => (
              <button key={f} type="button" role="tab" aria-selected={activeFlavour === f} className={`flv${activeFlavour === f ? ' on' : ''}`} onClick={() => setFlavour(f)}>
                {activeFlavour === f && <motion.span layoutId="flv-pill" className="flv-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                <span>{f === 'all' ? 'All jars' : f}</span>
              </button>
            ))}
          </div>
        )}

        <p className="count" aria-live="polite">
          {status === 'loading' ? 'Loading the collection…' : <><b><Count value={list.length} /></b> {list.length === 1 ? 'product' : 'products'}</>}
          {status === 'ready' && <span className="live" title="Updates the moment the store changes"><i />Live</span>}
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
              {list.map((p, i) => <ProductCard key={p.id} product={p} index={i} onOpen={setOpen} fresh={fresh.has(p.id)} />)}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="empty">
            <h3>Nothing matches that.</h3>
            <p>Try a different word, or clear the filters.</p>
            <button className="btn btn-line" onClick={() => { setQ(''); setStockOnly(false); setFlavour('all') }}>Clear filters</button>
          </div>
        )}
      </section>

      <section className="ribbon" aria-label="Inside the jar">
        <div className="ribbon-head">
          <span className="eyebrow">Inside the jar</span>
          <h2 className="h2">Keep <em>scrolling.</em></h2>
          <div className="ribbon-bar" aria-hidden="true"><i /></div>
        </div>
        <div className="ribbon-track">
          {RIBBON.map((n, i) => (
            <figure className="ribbon-item" key={n} style={{ '--i': i }}>
              <img src={media.url(`ribbon_${i + 1}`)} alt="" loading="lazy" />
            </figure>
          ))}
        </div>
      </section>

      <CtaReveal eyebrow="Found your jar?" title="Scoop it. *Shake* it." text="Add a jar, mix it with cold milk, and taste the difference." to="/products#shop" label="Back to the jars" image={media.url('ribbon_3')} />

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