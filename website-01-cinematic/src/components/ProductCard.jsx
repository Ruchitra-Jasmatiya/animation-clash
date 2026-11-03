import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { formatPrice, imgSrc } from '../lib/api'

/** Product tile: masked image reveal, 3D tilt on hover, shared-element handoff to the quick view. */
export default function ProductCard({ product, index = 0, onOpen }) {
  const ref = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 180, damping: 18 })
  const sy = useSpring(my, { stiffness: 180, damping: 18 })
  const rotateX = useTransform(sy, [-0.5, 0.5], [7, -7])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-9, 9])
  const imgX = useTransform(sx, [-0.5, 0.5], ['-3%', '3%'])
  const imgY = useTransform(sy, [-0.5, 0.5], ['-3%', '3%'])

  const move = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const leave = () => { mx.set(0); my.set(0) }

  return (
    <motion.article
      layout
      className={`card${product.in_stock === false ? ' is-sold' : ''}`}
      initial={{ opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.28 } }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, delay: (index % 3) * 0.09, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.button
        ref={ref}
        type="button"
        className="card-media"
        data-cursor="View"
        onPointerMove={move}
        onPointerLeave={leave}
        onClick={() => onOpen?.(product)}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        aria-label={`Quick view ${product.name}`}
      >
        <motion.div className="card-img" layoutId={`img-${product.id}`} style={{ x: imgX, y: imgY }}>
          <img src={imgSrc(product)} alt={product.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = '/images/massup-01-jar-hero.jpg' }} />
        </motion.div>
        {product.in_stock === false && <span className="badge badge-sold">Sold out</span>}
        {product.size && <span className="badge">{product.size}</span>}
      </motion.button>

      <div className="card-body">
        <div>
          <h3>{product.name}</h3>
          <p className="card-flavour">{product.flavour || 'Pistachio'}</p>
        </div>
        <span className="card-price">{formatPrice(product.price)}</span>
      </div>
    </motion.article>
  )
}
