import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Split from './Split'
import Magnetic from './Magnetic'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Full-screen call-to-action: a green circle blooms open from the centre as you scroll,
 * the headline scales in, and a ring of text keeps turning. Used at the end of Home and Shop.
 */
export default function CtaReveal({ eyebrow, title, text, to = '/products', label = 'Shop now', image, ring = 'PISTACHIO • PROTEIN • FUEL YOUR BETTER • ' }) {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: '+=100%', pin: true, scrub: 1, anticipatePin: 1, refreshPriority: -1 } })
        tl.fromTo('.cta-fill', { clipPath: 'circle(0% at 50% 56%)' }, { clipPath: 'circle(78% at 50% 56%)', ease: 'power2.in', duration: 1 }, 0)
          .fromTo('.cta-ring', { rotate: -60, scale: 0.78 }, { rotate: 120, scale: 1, ease: 'none', duration: 1.4 }, 0)
          .fromTo('.cta-title', { color: 'rgba(44,58,34,0)' }, { color: '#2c3a22', ease: 'none', duration: 0.8 }, 0.2)
          .fromTo('.cta-img', { yPercent: 40, scale: 0.7, opacity: 0 }, { yPercent: 0, scale: 1, opacity: 1, ease: 'power3.out', duration: 0.7 }, 0.55)
          .fromTo('.cta-copy .eyebrow, .cta-copy p, .cta-copy .magnetic', { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.12, ease: 'power3.out', duration: 0.5 }, 0.55)
      })
      return () => mm.revert()
    },
    { scope: root }
  )

  return (
    <section ref={root} className="cta">
      <div className="cta-fill" />
      <svg className="cta-ring" viewBox="0 0 200 200" aria-hidden="true">
        <defs><path id={`ring-${label}`} d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" /></defs>
        <text><textPath href={`#ring-${label}`} textLength="512" lengthAdjust="spacing">{ring}</textPath></text>
      </svg>
      {image && <img className="cta-img" src={image} alt="" />}
      <div className="cta-copy">
        <span className="eyebrow">{eyebrow}</span>
        <Split as="h2" text={title} className="cta-title" />
        {text && <p>{text}</p>}
        <Magnetic>
          <Link to={to} className="btn btn-dark btn-lg">{label} <span className="arrow" aria-hidden="true">↗</span></Link>
        </Magnetic>
      </div>
    </section>
  )
}