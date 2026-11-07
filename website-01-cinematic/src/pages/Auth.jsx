import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { requestLogin, requestSignup, verifyCode } from '../lib/shop'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

/** The first thing every visitor sees: sign up once, then log in with an e-mail code. The website opens only after that. */
export default function Auth() {
  const [mode, setMode] = useState('signup')          // signup | login
  const [step, setStep] = useState('form')            // form | code
  const [f, setF] = useState({ name: '', email: '', phone: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(0)
  const codeRef = useRef(null)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const email = f.email.trim().toLowerCase()

  const send = async (e) => {
    e?.preventDefault()
    setErr('')
    if (mode === 'signup' && f.name.trim().length < 2) return setErr('Please enter your name.')
    if (!EMAIL.test(email)) return setErr('Please enter a valid e-mail address.')
    setBusy(true)
    try {
      if (mode === 'signup') await requestSignup(f.name.trim(), email, f.phone.trim())
      else await requestLogin(email)
      setStep('code'); setCode(''); setWait(30)
      setTimeout(() => codeRef.current?.focus(), 80)
    } catch (e2) {
      if (e2.data?.code === 'exists') { setMode('login'); setErr('This e-mail is already registered — we switched you to Log in. Press Send code.') }
      else if (e2.data?.code === 'missing') { setMode('signup'); setErr('No account with this e-mail yet — please sign up (it takes 20 seconds).') }
      else setErr(e2.message)
    } finally { setBusy(false) }
  }

  const verify = async (e) => {
    e?.preventDefault()
    if (code.length !== 6) return setErr('Enter the 6-digit code.')
    setBusy(true); setErr('')
    try { await verifyCode(email, code) } catch (e2) { setErr(e2.message); setCode(''); codeRef.current?.focus() } finally { setBusy(false) }
  }

  const onCode = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(v)
  }

  return (
    <div className="auth">
      <div className="auth-art" aria-hidden="true">
        <img src="/images/massup-01-jar-hero.jpg" alt="" />
        <div className="auth-art-copy">
          <b>MASSUP<i>.</i></b>
          <p>Premium pistachio protein. Sign in once — shop, track orders and collect rewards.</p>
          <ul>
            <li>Scratch cards on every paid order</li>
            <li>Your 11th order free (up to ₹5,000)</li>
            <li>Festival offers all year round</li>
          </ul>
        </div>
      </div>

      <motion.div className="auth-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
        <span className="auth-brand">MASSUP<i>.</i></span>
        <AnimatePresence mode="wait" initial={false}>
          {step === 'form' ? (
            <motion.form key="form" onSubmit={send} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
              <div className="auth-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setErr('') }}>Sign up</button>
                <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr('') }}>Log in</button>
              </div>
              <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
              <p className="auth-sub">{mode === 'signup' ? 'Register once with your e-mail. We will send a 6-digit code to confirm it is you.' : 'Enter your registered e-mail. We will send you a 6-digit login code.'}</p>

              {mode === 'signup' && (
                <label className="fld"><span>Full name</span><input value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} autoFocus /></label>
              )}
              <label className="fld"><span>E-mail</span><input type="email" inputMode="email" value={f.email} onChange={set('email')} autoComplete="email" maxLength={254} autoFocus={mode === 'login'} /></label>
              {mode === 'signup' && (
                <label className="fld"><span>Mobile number <em>(optional)</em></span><input inputMode="numeric" value={f.phone} onChange={set('phone')} autoComplete="tel" maxLength={14} placeholder="10-digit number" /></label>
              )}
              {err && <p className="fld-err" role="alert">{err}</p>}
              <button className="btn btn-dark btn-lg block" disabled={busy}>{busy ? 'Sending code…' : 'Send code'} <span className="arrow" aria-hidden="true">→</span></button>
              <p className="auth-fine">By continuing you agree to our terms. You stay signed in on this device — no need to log in every visit.</p>
            </motion.form>
          ) : (
            <motion.form key="code" onSubmit={verify} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
              <h1>Check your e-mail</h1>
              <p className="auth-sub">We sent a 6-digit code to <b>{email}</b>. It is valid for 10 minutes.</p>
              <label className="fld code-fld" onClick={() => codeRef.current?.focus()}>
                <span>Verification code</span>
                <input ref={codeRef} className="code-input" value={code} onChange={onCode} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" aria-label="6-digit code" />
              </label>
              {err && <p className="fld-err" role="alert">{err}</p>}
              <button className="btn btn-dark btn-lg block" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : mode === 'signup' ? 'Verify & create account' : 'Verify & log in'}</button>
              <div className="auth-row">
                <button type="button" className="link" onClick={() => { setStep('form'); setErr('') }}>← Change e-mail</button>
                <button type="button" className="link" disabled={wait > 0 || busy} onClick={send}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button>
              </div>
              <p className="auth-fine">Can't find it? Check your spam folder.</p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
