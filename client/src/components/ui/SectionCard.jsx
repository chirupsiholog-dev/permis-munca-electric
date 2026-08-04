import { motion } from 'framer-motion'

import Card from './Card.jsx'

/**
 * A numbered form section (1..9). Staggered in on mount via `index` so the
 * long form assembles top-to-bottom instead of appearing all at once.
 */
export default function SectionCard({ index, title, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 9) * 0.035, ease: 'easeOut' }}
    >
      <Card className="flex flex-col gap-[18px] px-7 pb-[26px] pt-6">
        <div className="flex items-center gap-3 border-b border-line-soft pb-3.5">
          <span className="flex h-[26px] w-[26px] flex-none items-center justify-center bg-ink text-[12px] font-bold text-white">
            {index}
          </span>
          <h2 className="m-0 text-section font-bold uppercase tracking-section text-ink-800">
            {title}
          </h2>
        </div>
        {children}
      </Card>
    </motion.section>
  )
}
