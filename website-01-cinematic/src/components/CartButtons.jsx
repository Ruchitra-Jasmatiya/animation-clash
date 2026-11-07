/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addToCart, toggleWishlist, useShop } from '../lib/shop'
import { useToast } from '../lib/toast'

/** "Only 3 left" / "In stock" / "Sold out" — numbers come straight from the admin's stock field. */
export function stockInfo(p) {
  const n = Number(p.stock)
  if (p.in_stock === false || (Number.isFinite(n) && n <= 0)) return { tone: 'out', text: 'Sold out', max: 0 }
  if (Number.isFinite(n) && n <= 5) return { tone: 'low', text: `Only ${n} left`, max: n }
  return { tone: 'ok', text: Number.isFinite(n) ? `In stock · ${n} available` : 'In stock', max: Number.isFinite(n) ? n : 20 }
}

export function useShopActions() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = async (fn, ok) => {
    if (busy) return
    setBusy(true)
    try { await fn(); if (ok) toast(ok) } catch (e) { toast(e.message || 'Something went wrong', 'err') } finally { setBusy(false) }
  }
  return {
    busy,
    add: (p, qty = 1) => run(() => addToCart(p.id, qty), `${p.name} added to your bag`),
    wish: (p, on) => run(() => toggleWishlist(p.id), on ? 'Removed from wishlist' : 'Saved to your wishlist'),
  }
}

export function WishButton({ product, className = '' }) {
  const { wishlist } = useShop()
  const { wish, busy } = useShopActions()
  const on = wishlist.includes(product.id)
  return (
    <button type="button" className={`wish${on ? ' on' : ''} ${className}`} disabled={busy} aria-pressed={on} aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => wish(product, on)}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5s-7.500-4.600-9.200-9.400C1.700 7.800 3.700 5 6.700 5c2 0 3.400 1.100 5.300 3.300C13.900 6.100 15.300 5 17.300 5c3 0 5 2.800 3.900 6.100-1.700 4.800-9.200 9.400-9.200 9.400Z" /></svg>
    </button>
  )
}

export function AddButton({ product, size = 'sm', label = 'Add to bag' }) {
  const { add, busy } = useShopActions()
  const { cart } = useShop()
  const inBag = cart.items.find((i) => i.product.id === product.id)?.quantity || 0
  const s = stockInfo(product)
  return (
    <button type="button" className={`btn btn-dark btn-${size} add-btn`} disabled={busy || s.max <= 0 || inBag >= s.max} onClick={() => add(product)}>
      {s.max <= 0 ? 'Sold out' : inBag >= s.max ? 'Max in bag' : label}{inBag > 0 && s.max > 0 && inBag < s.max ? ` (${inBag})` : ''}
    </button>
  )
}

export function GoToBag() {
  const nav = useNavigate()
  const { cart } = useShop()
  if (!cart.count) return null
  return <button type="button" className="link" onClick={() => nav('/cart')}>View bag ({cart.count})</button>
}
