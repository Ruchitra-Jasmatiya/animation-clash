import { useEffect, useState } from 'react'
import { getOffers } from '../lib/shop'

const d = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

/** Today's festival offer (if any) and the next Indian festivals. Everything comes from the admin's Festivals page. */
export default function OfferCalendar() {
  const [o, setO] = useState(null)
  useEffect(() => { getOffers().then(setO).catch(() => {}) }, [])
  if (!o) return null
  return (
    <div className="offer-cal">
      {o.live && <div className="offer live"><b>{o.live.name} offer — {Number(o.live.percent)}% off</b><span>{o.live.tagline || 'Applied automatically at checkout.'} Ends {d(o.live.ends)}.</span></div>}
      <ul>
        {o.upcoming.map((f) => <li key={f.name + f.date}><b>{f.name}</b><span>{d(f.date)}</span><em>{f.offer ? `${Number(f.percent)}% off` : 'No offer'}</em></li>)}
      </ul>
    </div>
  )
}
