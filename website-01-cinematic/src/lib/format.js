export const inr = (v, digits = 2) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(v) || 0)
export const fmtDate = (iso, withTime = true) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const below100 = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`)
const below1000 = (n) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + below100(n % 100) : ''}` : below100(n))

/** 1234.5 -> "Rupees One Thousand Two Hundred Thirty Four and Fifty Paise Only" (Indian numbering). */
export function amountInWords(value) {
  const total = Math.round((Number(value) || 0) * 100)
  const rupees = Math.floor(total / 100), paise = total % 100
  if (!rupees && !paise) return 'Rupees Zero Only'
  const parts = []
  const crore = Math.floor(rupees / 10000000), lakh = Math.floor((rupees / 100000) % 100)
  const thousand = Math.floor((rupees / 1000) % 100), rest = rupees % 1000
  if (crore) parts.push(`${below1000(crore)} Crore`)
  if (lakh) parts.push(`${below100(lakh)} Lakh`)
  if (thousand) parts.push(`${below100(thousand)} Thousand`)
  if (rest) parts.push(below1000(rest))
  let out = `Rupees ${parts.join(' ') || 'Zero'}`
  if (paise) out += ` and ${below100(paise)} Paise`
  return `${out} Only`
}
