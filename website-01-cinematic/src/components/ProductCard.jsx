import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { discountPercent, formatPrice, imgSrc } from '../lib/api'
import { AddButton, WishButton, stockInfo } from './CartButtons'

/** Product tile: masked image reveal, 3D tilt on hover, shared-element handoff to the quick view. */
export default function ProductCard({ product, index = 0, onOpen, fresh = false }) {
  const ref = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 180, damping: 18 })
  const sy = useSpring(my, { stiffness: 180, damping: 18 })
  const rotateX = useTransform(sy, [-0.5, 0.5], [7, -7])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-9, 9])
  const imgX = useTransform(sx, [-0.5, 0.5], ['-3%', '3%'])
  const imgY = useTransform(sy, [-0.5, 0.5], ['-3%', '3%'])

  const off = discountPercent(product)
  const stock = stockInfo(product)
  const [now] = useState(() => Date.now())
  const isNew = product.created_at && now - new Date(product.created_at).getTime() < 5 * 24 * 3600 * 1000
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
      className={`card${product.in_stock === false ? ' is-sold' : ''}${fresh ? ' is-fresh' : ''}`}
      initial={{ opacity: 0, y: 90, rotate: index % 2 ? 1.6 : -1.6 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.28 } }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, delay: (index % 3) * 0.09, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.button
        ref={ref}
        type="button"
        className="card-media"
       
        onPointerMove={move}
        onPointerLeave={leave}
        onClick={() => onOpen?.(product)}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        aria-label={`Quick view ${product.name}`}
      >
        <motion.div className="card-img" layoutId={`img-${product.id}`} style={{ x: imgX, y: imgY }}>
          <img src={imgSrc(product)} alt={product.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = '/images/massup-01-jar-hero.jpg' }} />
        </motion.div>
        <span className="card-shine" aria-hidden="true" />
        <span className="card-view" aria-hidden="true">Quick view <i>↗</i></span>
        {isNew && product.in_stock !== false && <span className="badge badge-new">New</span>}
        {product.in_stock === false && <span className="badge badge-sold">Sold out</span>}
        {off > 0 && product.in_stock !== false && <span className="badge badge-off">{off}% off</span>}
        {product.size && <span className="badge">{product.size}</span>}
      </motion.button>

      <WishButton product={product} className="card-wish" />

      <div className="card-body">
        <div>
          <h3>{product.name}</h3>
          <p className="card-flavour">{product.flavour || 'Pistachio'}</p>
        </div>
        <span className="card-price">{off > 0 && <s>{formatPrice(product.mrp)}</s>}{formatPrice(product.price)}</span>
      </div>
      <div className="card-buy">
        <span className={`stock-tag ${stock.tone}`}>{stock.text}</span>
        <AddButton product={product} />
      </div>
    </motion.article>
  )
}
