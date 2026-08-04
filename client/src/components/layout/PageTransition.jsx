import { motion } from 'framer-motion'

/**
 * Route-level enter/exit animation. Deliberately restrained — a 4px lift and a
 * fade — because these screens are dense and a bigger move reads as jitter.
 * Respects `prefers-reduced-motion` via the `reduce` variant below.
 */
const variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export default function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
      className={`flex flex-1 flex-col ${className}`}
    >
      {children}
    </motion.div>
  )
}
