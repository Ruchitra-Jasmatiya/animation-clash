/* eslint-disable react-refresh/only-export-components */
import { motion } from 'framer-motion'

/** Title block for the simple store pages (bag, wishlist, orders, rewards). */
export function PageTop({ title, sub, children }) {
  return (
    <header className="page-top">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </motion.div>
      {children && <div className="page-top-actions">{children}</div>}
    </header>
  )
}

export const PAY_LABEL = { unpaid: 'Awaiting payment', submitted: 'Verifying payment', paid: 'Paid', rejected: 'Payment not found' }
export function PayBadge({ order }) {
  if (order.status === 'cancelled') return <span className="pill cancelled">Cancelled</span>
  const s = order.payment_status
  return <span className={`pill ${s}`}>{PAY_LABEL[s] || s}</span>
}
