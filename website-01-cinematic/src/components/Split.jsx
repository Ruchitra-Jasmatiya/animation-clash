import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../lib/app-context'

const container = (stagger, delay) => ({ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } })
const word = {
  hidden: { y: '115%', rotate: 5 },
  show: { y: '0%', rotate: 0, transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] } },
}

/**
 * Masked word-by-word reveal. Prefix a word with * to italicise it, e.g. "Nature goes *into* every scoop".
 * trigger="view" animates when scrolled into view; trigger="ready" waits for the preloader.
 */
export default function Split({ text, as: Tag = 'span', trigger = 'view', delay = 0, stagger = 0.06, className = '' }) {
  const { ready } = useApp()
  const words = text.split(' ')
  const plain = text.replace(/\*/g, '')
  const motionProps =
    trigger === 'view'
      ? { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '0px 0px -12% 0px' } }
      : { initial: 'hidden', animate: ready ? 'show' : 'hidden' }

  return (
    <Tag className={className} aria-label={plain}>
      <motion.span aria-hidden="true" variants={container(stagger, delay)} {...motionProps} style={{ display: 'inline' }}>
        {words.map((w, i) => {
          const em = w.startsWith('*')
          const label = w.replace(/\*/g, '')
          return (
            <Fragment key={i}>
              <span className="w-mask">
                <motion.span className={`w-in${em ? ' is-em' : ''}`} variants={word}>
                  {label}
                </motion.span>
              </span>
              {i < words.length - 1 ? ' ' : ''}
            </Fragment>
          )
        })}
      </motion.span>
    </Tag>
  )
}
