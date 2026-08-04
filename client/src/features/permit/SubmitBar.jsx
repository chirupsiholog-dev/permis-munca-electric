import { AnimatePresence, motion } from 'framer-motion'

import Button from '../../components/ui/Button.jsx'

/** Sticky action bar at the bottom of the permit form, with an inline toast. */
export default function SubmitBar({ toast, loading, onSubmit }) {
  return (
    <div className="sticky bottom-0 border-t border-line bg-surface shadow-bar">
      <div className="mx-auto flex w-full max-w-[880px] flex-col items-center gap-2.5 px-7 py-3.5">
        <AnimatePresence initial={false}>
          {toast && (
            <motion.span
              key={toast}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-center text-cta text-ink-500"
            >
              {toast}
            </motion.span>
          )}
        </AnimatePresence>

        <Button onClick={onSubmit} loading={loading}>
          Trimite spre semnare
        </Button>
      </div>
    </div>
  )
}
