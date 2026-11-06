import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Magnetic from './Magnetic'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <motion.h2 className="footer-cta" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
          Fuel your <em>better.</em>
        </motion.h2>
        <Magnetic>
          <Link to="/products" className="btn btn-cream btn-lg">
            Shop the jar <span className="arrow" aria-hidden="true">↗</span>
          </Link>
        </Magnetic>
      </div>

      <div className="footer-mid">
        <nav className="footer-nav" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <a href="/#story">Our story</a>
        </nav>
        <p className="footer-note">Premium pistachio protein, made for everyday performance.</p>
      </div>

      <div className="footer-word" aria-hidden="true">
        {'MASSUP'.split('').map((c, i) => (
          <motion.span key={i} initial={{ y: '105%' }} whileInView={{ y: '0%' }} viewport={{ once: true, margin: '0px 0px -5% 0px' }} transition={{ duration: 1.2, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}>
            {c}
          </motion.span>
        ))}
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} MASSUP</span>
        <Link to="/manage" className="footer-manage">Manage store</Link>
      </div>
    </footer>
  )
}