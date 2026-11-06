import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Split from '../components/Split'
import Magnetic from '../components/Magnetic'
import ProductCard from '../components/ProductCard'
import Footer from '../components/Footer'
import CtaReveal from '../components/CtaReveal'
import { useApp } from '../lib/app-context'
import { useProducts } from '../lib/useProducts'
import { useSiteMedia } from '../lib/useSiteMedia'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const img = (n) => `/images/massup-${n}.jpg`

const STORY = [
  { no: '01', title: 'Hand-picked pistachios', text: 'It starts with whole, roasted pistachios chosen for colour, aroma and crunch.', src: img('02-nuts-flying') },
  { no: '02', title: 'Ground to silk', text: 'Slowly milled until the texture turns soft, green and impossibly smooth.', src: img('08-pistachio-macro') },
  { no: '03', title: 'Blended with care', text: 'Folded together with protein so every scoop tastes as good as it fuels.', src: img('03-powder-scoop') },
  { no: '04', title: 'Sealed fresh', text: 'Locked into a jar built to keep the flavour bright from first scoop to last.', src: img('10-lid-open') },
  { no: '05', title: 'Shaken, poured, done', text: 'Cold milk, one scoop, ten seconds. A creamy pistachio shake, any time.', src: img('04-shake-pour') },
]

const SPOT = [
  { title: 'Real pistachio flavour', text: 'A rich, nutty taste you can actually recognise, not a sugary imitation.', src: img('01-jar-hero') },
  { title: 'Smooth, creamy texture', text: 'Mixes into milk or water without the chalk. Sip it slowly or down it fast.', src: img('05-shake-swirl') },
  { title: 'Made for every day', text: 'Pre-workout, post-workout or mid-afternoon. One jar, many routines.', src: img('06-jar-garden') },
  { title: 'Designed to be seen', text: 'A jar that looks as good on the counter as the shake does in the glass.', src: img('07-jar-orbit') },
]

const GALLERY = [
  [img('02-nuts-flying'), img('06-jar-garden'), img('09-lid-closeup')],
  [img('03-powder-scoop'), img('07-jar-orbit'), img('10-lid-open')],
  [img('04-shake-pour'), img('11-jar-bowl'), img('08-pistachio-macro')],
]

const STATEMENT = 'MASSUP is protein that finally tastes like something. Real pistachio, silky texture, and a clean way to fuel the way you move.'

export default function Home() {
  const root = useRef(null)
  const { ready } = useApp()
  const [active, setActive] = useState(0)
  const { products } = useProducts()
  const media = useSiteMedia()
  const heroSrc = media.url('hero_video')
  const showSrc = media.url('showcase_video')
  const reels = [1, 2, 3].filter((i) => media.custom(`reel_video_${i}`)).map((i) => media.url(`reel_video_${i}`))
  const spotSrc = media.url(`spot_${active + 1}`)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 600)
    return () => clearTimeout(t)
  }, [])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      const q = (s) => gsap.utils.toArray(s, root.current)

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // ---------- hero parallax ----------
        gsap.to('.hero-word', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
        gsap.to('.hero-arch', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
        gsap.to('.hero-arch video', { scale: 1.18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
        q('.hero-float').forEach((el, i) =>
          gsap.to(el, { yPercent: -60 - i * 40, rotate: i % 2 ? 12 : -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
        )

        // ---------- hero: the big wordmark scatters as you leave ----------
        q('.hero-letter-mask').forEach((el, i) =>
          gsap.to(el, { yPercent: (i % 2 ? 1 : -1) * (14 + i * 4), rotate: (i % 2 ? 1 : -1) * (4 + i), ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
        )
        gsap.to('.hero-copy.left', { xPercent: -14, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } })
        gsap.to('.hero-copy.right', { xPercent: 14, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } })

        // ---------- scroll-velocity marquees ----------
        q('.marquee').forEach((m, i) => {
          const track = m.querySelector('.marquee-track')
          const dir = i % 2 ? 1 : -1
          const tween = gsap.fromTo(track, { xPercent: dir === -1 ? 0 : -50 }, { xPercent: dir === -1 ? -50 : 0, duration: 32, ease: 'none', repeat: -1 })
          ScrollTrigger.create({
            trigger: m,
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: (self) => {
              const v = self.getVelocity() / 180
              gsap.to(tween, { timeScale: 1 + Math.abs(v) * (self.direction === 1 ? 1 : -1) * 1, duration: 0.25, overwrite: true })
              gsap.to(tween, { timeScale: 1, duration: 1.2, delay: 0.25, overwrite: 'auto' })
              gsap.to(track, { skewX: gsap.utils.clamp(-9, 9, -self.getVelocity() / 260), duration: 0.3, overwrite: 'auto' })
              gsap.to(track, { skewX: 0, duration: 0.9, delay: 0.3, ease: 'power3.out', overwrite: 'auto' })
            },
          })
        })

        // ---------- statement: words light up with scroll ----------
        gsap.fromTo(q('.stmt-word'), { opacity: 0.14 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top 72%', end: 'bottom 55%', scrub: true } })
        q('.stmt-img').forEach((el, i) =>
          gsap.fromTo(el, { yPercent: 18 + i * 12, rotate: i % 2 ? 10 : -10, scale: 0.85 }, { yPercent: -18 - i * 12, rotate: i % 2 ? -8 : 8, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true } })
        )

        // ---------- big word with the photo living inside the letters ----------
        q('.mw-line').forEach((el, i) => {
          gsap.fromTo(el, { backgroundPositionY: '0%', xPercent: i ? 4 : -12 }, { backgroundPositionY: '100%', xPercent: i ? -3 : 8, ease: 'none', scrollTrigger: { trigger: '.maskword', start: 'top bottom', end: 'bottom top', scrub: true } })
        })
        gsap.fromTo('.mw-note', { y: 50, opacity: 0 }, { y: 0, opacity: 1, ease: 'power3.out', scrollTrigger: { trigger: '.mw-note', start: 'top 92%', end: 'top 70%', scrub: true } })

        // ---------- showcase: video frame grows, background turns forest ----------
        const show = gsap.timeline({ scrollTrigger: { trigger: '.showcase', start: 'top top', end: '+=170%', pin: true, scrub: 1, anticipatePin: 1 } })
        show
          .fromTo('.showcase-frame', { scale: 0.42, borderRadius: 220 }, { scale: 1, borderRadius: 28, ease: 'power2.inOut', duration: 1 }, 0)
          .to('.showcase', { backgroundColor: '#2c3a22', ease: 'none', duration: 0.8 }, 0)
          .fromTo('.showcase-row.r1', { xPercent: 22 }, { xPercent: -22, ease: 'none', duration: 1.4 }, 0)
          .fromTo('.showcase-row.r2', { xPercent: -22 }, { xPercent: 22, ease: 'none', duration: 1.4 }, 0)
          .fromTo('.showcase-caption', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4 }, 0.9)

        // ---------- gallery columns drift at different speeds ----------
        q('.gal-col').forEach((col, i) =>
          gsap.fromTo(col, { yPercent: i === 1 ? 10 : -6 }, { yPercent: i === 1 ? -16 : 12, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: 0.6 } })
        )
        q('.gal-item').forEach((fig) =>
          gsap.fromTo(fig, { clipPath: 'inset(16% 10% 16% 10% round 44px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none', scrollTrigger: { trigger: fig, start: 'top 94%', end: 'top 52%', scrub: true } })
        )
        q('.gal-item img').forEach((im) =>
          gsap.fromTo(im, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom 40%', scrub: true } })
        )
      })

      // ---------- story: pinned horizontal scroll (desktop only) ----------
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const track = root.current.querySelector('.story-track')
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth)
        const tween = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: '.story',
            start: 'top top',
            end: () => `+=${dist()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (s) => gsap.set('.story-bar i', { scaleX: s.progress }),
          },
        })
        q('.story-card').forEach((card) =>
          gsap.fromTo(card, { opacity: 0.3, scale: 0.9 }, { opacity: 1, scale: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 96%', end: 'left 58%', scrub: true } })
        )
        q('.story-img img').forEach((im) =>
          gsap.fromTo(im, { xPercent: -9 }, { xPercent: 9, ease: 'none', scrollTrigger: { trigger: im.closest('.story-card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } })
        )
      })

      // ---------- story: simple reveals on phones/tablets ----------
      mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
        q('.story-card').forEach((c) =>
          gsap.from(c, { y: 70, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%' } })
        )
      })

      // ---------- featured cards rise at different speeds ----------
      mm.add('(min-width: 700px) and (prefers-reduced-motion: no-preference)', () => {
        q('.feat-slot').forEach((el, i) =>
          gsap.fromTo(el, { y: [90, 30, 130][i % 3] }, { y: [-20, -70, -40][i % 3], ease: 'none', scrollTrigger: { trigger: '.featured', start: 'top bottom', end: 'bottom top', scrub: 0.6 } })
        )
      })

      // ---------- hero follows the mouse a little (mouse devices only) ----------
      mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const hero = root.current.querySelector('.hero')
        const arch = [gsap.quickTo('.hero-arch', 'x', { duration: 0.9, ease: 'power3' }), gsap.quickTo('.hero-arch', 'y', { duration: 0.9, ease: 'power3' })]
        const f1 = [gsap.quickTo('.hero-float.f1', 'x', { duration: 1.1, ease: 'power3' }), gsap.quickTo('.hero-float.f1', 'y', { duration: 1.1, ease: 'power3' })]
        const f2 = [gsap.quickTo('.hero-float.f2', 'x', { duration: 1.3, ease: 'power3' }), gsap.quickTo('.hero-float.f2', 'y', { duration: 1.3, ease: 'power3' })]
        const word = gsap.quickTo('.hero-word', 'x', { duration: 1.4, ease: 'power3' })
        const move = (e) => {
          const nx = e.clientX / window.innerWidth - 0.5
          const ny = e.clientY / window.innerHeight - 0.5
          arch[0](nx * -26); arch[1](ny * -18)
          f1[0](nx * 60); f1[1](ny * 46)
          f2[0](nx * -48); f2[1](ny * -38)
          word(nx * 30)
        }
        hero.addEventListener('pointermove', move)
        return () => hero.removeEventListener('pointermove', move)
      })

      // ---------- spotlight: swap the sticky jar image ----------
      q('.spot-item').forEach((el, i) =>
        ScrollTrigger.create({ trigger: el, start: 'top 58%', end: 'bottom 58%', onToggle: (s) => s.isActive && setActive(i) })
      )

      return () => mm.revert()
    },
    { scope: root }
  )

  const featured = products.slice(0, 3)

  return (
    <main ref={root} className="home">
      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-word" aria-hidden="true">
          {'MASSUP'.split('').map((c, i) => (
            <span className="hero-letter-mask" key={i}>
              <motion.span initial={{ y: '110%' }} animate={ready ? { y: '0%' } : { y: '110%' }} transition={{ duration: 1.3, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}>
                {c}
              </motion.span>
            </span>
          ))}
        </div>
        <h1 className="sr-only">MASSUP — Pistachio Protein Powder</h1>

        <motion.div className="hero-arch" initial={{ clipPath: 'inset(100% 0 0 0 round 999px 999px 0 0)' }} animate={ready ? { clipPath: 'inset(0% 0 0 0 round 999px 999px 28px 28px)' } : {}} transition={{ duration: 1.6, delay: 0.2, ease: [0.76, 0, 0.24, 1] }}>
          <video key={heroSrc} autoPlay loop muted playsInline preload="auto" poster={media.custom('hero_video') ? undefined : '/images/poster-1.jpg'} aria-label="MASSUP product video">
            <source src={heroSrc} />
          </video>
        </motion.div>

        <img className="hero-float f1" src={media.url('hero_float_1')} alt="" />
        <img className="hero-float f2" src={media.url('hero_float_2')} alt="" />

        <div className="hero-copy left">
          <Split text="Good fuel." trigger="ready" delay={0.9} className="hero-line" />
          <Split text="Great *feeling.*" trigger="ready" delay={1.05} className="hero-line" />
        </div>
        <motion.div className="hero-copy right" initial={{ opacity: 0, y: 30 }} animate={ready ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}>
          <p>Premium pistachio protein powder, crafted for everyday performance and a cleaner way to fuel your day.</p>
          <Magnetic>
            <Link to="/products" className="btn btn-dark btn-lg">
              Shop now <span className="arrow" aria-hidden="true">↗</span>
            </Link>
          </Magnetic>
        </motion.div>

        <div className="hero-badge" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <defs><path id="circ" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
            <text><textPath href="#circ">PISTACHIO • PROTEIN • FUEL YOUR BETTER •</textPath></text>
          </svg>
          <span>↓</span>
        </div>
      </section>

      {/* ================= MARQUEE ================= */}
      <section className="marquees" aria-hidden="true">
        {[0, 1].map((r) => (
          <div className="marquee" key={r}>
            <div className="marquee-track">
              {Array.from({ length: 2 }).map((_, k) => (
                <span key={k}>
                  {(r ? ['Creamy', 'Clean', 'Pistachio', 'Protein', 'Daily'] : ['Good fuel', 'Great feeling', 'Real pistachio', 'Fuel your better']).map((w, i) => (
                    <b key={i} className={i % 2 ? 'outline' : ''}>{w}<i>✦</i></b>
                  ))}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ================= STATEMENT ================= */}
      <section className="statement">
        <img className="stmt-img a" src={img('02-nuts-flying')} alt="" loading="lazy" />
        <img className="stmt-img b" src={img('03-powder-scoop')} alt="" loading="lazy" />
        <img className="stmt-img c" src={img('08-pistachio-macro')} alt="" loading="lazy" />
        <p className="stmt-text">
          <span className="eyebrow">What is MASSUP</span>
          {STATEMENT.split(' ').map((w, i) => <span className="stmt-word" key={i}>{w} </span>)}
        </p>
      </section>

      {/* ================= BIG WORD (photo inside the letters) ================= */}
      <section className="maskword" aria-label="Real pistachio">
        <div className="mw-line" style={{ backgroundImage: `url(${media.url('story_2')})` }} aria-hidden="true">REAL</div>
        <div className="mw-line" style={{ backgroundImage: `url(${media.url('story_1')})` }} aria-hidden="true">PISTACHIO</div>
        <h2 className="sr-only">Real pistachio</h2>
        <p className="mw-note">Roasted, milled and blended — with nothing hiding behind the flavour.</p>
      </section>

      {/* ================= STORY (pinned horizontal) ================= */}
      <section className="story" id="story">
        <div className="story-head">
          <span className="eyebrow">Our story</span>
          <Split as="h2" text="From orchard to *scoop*" className="h2" />
          <div className="story-bar" aria-hidden="true"><i /></div>
        </div>
        <div className="story-track">
          {STORY.map((s, i) => (
            <article className="story-card" key={s.no}>
              <div className="story-img"><img src={media.url(`story_${i + 1}`)} alt={s.title} loading="lazy" /></div>
              <div className="story-text">
                <span className="story-no">{s.no}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= SHOWCASE (video grows) ================= */}
      <section className="showcase" aria-label="MASSUP in motion">
        <div className="showcase-rows" aria-hidden="true">
          <div className="showcase-row r1">SMOOTH · CREAMY · SMOOTH · CREAMY</div>
          <div className="showcase-row r2">PISTACHIO · PROTEIN · PISTACHIO</div>
        </div>
        <div className="showcase-frame">
          <video key={showSrc} autoPlay loop muted playsInline preload="metadata" poster={media.custom('showcase_video') ? undefined : '/images/poster-2.jpg'} aria-label="MASSUP in motion">
            <source src={showSrc} />
          </video>
        </div>
        <p className="showcase-caption">One scoop. Zero compromise.</p>
      </section>

      {/* ================= REEL (only when videos are added in the admin) ================= */}
      {reels.length > 0 && (
        <section className="reel">
          <div className="reel-head">
            <span className="eyebrow">In motion</span>
            <Split as="h2" text="Watch it *move*" className="h2" />
          </div>
          <div className="reel-row">
            {reels.map((src, i) => (
              <motion.div className="reel-card" key={src} initial={{ opacity: 0, y: 80, rotate: i % 2 ? 2 : -2 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 1, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}>
                <video autoPlay loop muted playsInline preload="metadata"><source src={src} /></video>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ================= SPOTLIGHT (sticky) ================= */}
      <section className="spot">
        <div className="spot-sticky">
          <div className="spot-ring" aria-hidden="true" />
          <div className="spot-stage">
            <AnimatePresence mode="popLayout">
              <motion.img key={spotSrc} src={spotSrc} alt={SPOT[active].title} initial={{ opacity: 0, scale: 1.12, filter: 'blur(14px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
            </AnimatePresence>
          </div>
          <div className="spot-dots" aria-hidden="true">
            {SPOT.map((_, i) => <i key={i} className={i === active ? 'on' : ''} />)}
          </div>
        </div>
        <div className="spot-list">
          {SPOT.map((s, i) => (
            <div className={`spot-item${i === active ? ' on' : ''}`} key={s.title}>
              <span className="story-no">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section className="gallery">
        <div className="gallery-head">
          <span className="eyebrow">The look</span>
          <Split as="h2" text="Made to be *looked* at" className="h2" />
        </div>
        <div className="gal-grid">
          {GALLERY.map((col, ci) => (
            <div className="gal-col" key={ci}>
              {col.map((_, j) => (
                <figure className="gal-item" key={j}>
                  <img src={media.url(`gallery_${ci * 3 + j + 1}`)} alt="MASSUP pistachio protein" loading="lazy" />
                </figure>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ================= FEATURED PRODUCTS (live) ================= */}
      <section className="featured">
        <div className="featured-head">
          <div>
            <span className="eyebrow">The collection</span>
            <Split as="h2" text="Fuel every *goal*" className="h2" />
          </div>
          <Magnetic>
            <Link to="/products" className="btn btn-line">All products <span className="arrow" aria-hidden="true">↗</span></Link>
          </Magnetic>
        </div>
        <div className="grid grid-3">
          {featured.map((p, i) => (
            <div className="feat-slot" key={p.id}>
              <ProductCard product={p} index={i} onOpen={() => navigate('/products')} />
            </div>
          ))}
        </div>
      </section>

      <CtaReveal eyebrow="Ready when you are" title="Taste the *green.*" text="One scoop, ten seconds, a creamier way to fuel the day." image={media.url('spot_2')} />

      <Footer />
    </main>
  )
}