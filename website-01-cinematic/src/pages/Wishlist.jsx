import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatPrice, imgSrc, mediaSrc } from '../lib/api'
import { moveToCart, toggleWishlist, useShop } from '../lib/shop'
import { useToast } from '../lib/toast'
import Footer from '../components/Footer'
import { PageTop } from '../components/PageBits'

export default function Wishlist() {
  const { wishItems } = useShop()
  const toast = useToast()
  const act = async (fn, msg) => { try { await fn(); toast(msg) } catch (e) { toast(e.message, 'err') } }
  return (
    <main className="shop-page">
      <PageTop title="Your wishlist" sub={wishItems.length ? `${wishItems.length} saved` : ''} />
      {!wishItems.length ? (
        <div className="empty-state"><h2>Nothing saved yet</h2><p>Tap the heart on any jar to keep it here.</p><Link to="/products" className="btn btn-dark btn-lg">Browse jars <span className="arrow">↗</span></Link></div>
      ) : (
        <div className="wish-grid">
          {wishItems.map(({ product: p }, i) => (
            <motion.article key={p.id} className="wish-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <img src={p.image ? mediaSrc(p.image) : imgSrc(p)} alt={p.name} onError={(e) => { e.currentTarget.src = '/images/massup-01-jar-hero.jpg' }} />
              <div>
                <b>{p.name}</b>
                <small>{[p.flavour, p.size].filter(Boolean).join(' · ')}</small>
                <strong>{formatPrice(p.price)}</strong>
                <small className={p.stock <= 5 ? 'warn' : ''}>{!p.available ? 'Sold out' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}</small>
                <div className="row">
                  <button className="btn btn-dark btn-sm" disabled={!p.available} onClick={() => act(() => moveToCart(p.id), 'Moved to your bag')}>Move to bag</button>
                  <button className="link" onClick={() => act(() => toggleWishlist(p.id), 'Removed')}>Remove</button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
      <Footer />
    </main>
  )
}
