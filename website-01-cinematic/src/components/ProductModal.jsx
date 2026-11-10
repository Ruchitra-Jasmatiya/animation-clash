import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { discountPercent, formatPrice, imgSrc } from '../lib/api'
import { useLenis } from '../lib/smooth'
import { AddButton, GoToBag, WishButton, stockInfo } from './CartButtons'

export default function ProductModal({ product, onClose }) {
  const lenis = useLenis()

  useEffect(() => {
    if (!product) return
    lenis?.stop()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { lenis?.start(); window.removeEventListener('keydown', onKey) }
  }, [product, lenis, onClose])

  return (
    <AnimatePresence>
      {product && (
        <motion.div className="modal" role="dialog" aria-modal="true" aria-label={product.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} onClick={onClose}>
          <motion.div className="modal-sheet" onClick={(e) => e.stopPropagation()} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <button className="modal-close" onClick={onClose} aria-label="Close"><span /><span /></button>
            <motion.div className="modal-img" layoutId={`img-${product.id}`}>
              <img src={imgSrc(product)} alt={product.name} onError={(e) => { e.currentTarget.src = '/images/massup-01-jar-hero.jpg' }} />
            </motion.div>
            <div className="modal-info">
              <motion.span className="eyebrow" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>{product.flavour || 'Pistachio'}{product.size ? ` · ${product.size}` : ''}</motion.span>
              <motion.h3 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.7 }}>{product.name}</motion.h3>
              <motion.p className="modal-price" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.7 }}>{discountPercent(product) > 0 && <s>{formatPrice(product.mrp)}</s>}{formatPrice(product.price)}{discountPercent(product) > 0 && <em className="off-tag">{discountPercent(product)}% off</em>}</motion.p>
              <motion.p className="modal-desc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44, duration: 0.7 }}>{product.description || 'Premium pistachio protein powder from MASSUP.'}</motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}>
                <p className={`stock-tag ${stockInfo(product).tone}`}>{stockInfo(product).text}</p>
                <div className="modal-actions">
                  <AddButton product={product} size="lg" />
                  <WishButton product={product} className="wish-lg" />
                  <GoToBag />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
