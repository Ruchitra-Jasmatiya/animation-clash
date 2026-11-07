/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const Ctx = createContext(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [t, setT] = useState(null)
  const timer = useRef()
  const show = useCallback((msg, type = 'ok') => {
    clearTimeout(timer.current)
    setT({ msg, type, id: Date.now() })
    timer.current = setTimeout(() => setT(null), 3200)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        <AnimatePresence>
          {t && <motion.div key={t.id} className={`toast ${t.type === 'err' ? 'is-err' : ''}`} role="status" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>{t.msg}</motion.div>}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
