import { AnimatePresence, motion } from 'framer-motion'

import Button from '../../components/ui/Button.jsx'


export default function SubmitBar({ toast, loading, done, onSubmit }) {
  const label = loading
    ? 'Se generează permisul…'
    : done
      ? 'Permis trimis'
      : 'Trimite spre semnare'

  return (
    <div className="sticky bottom-0 border-t border-line bg-surface shadow-bar">
      <div className="mx-auto flex w-full max-w-[880px] flex-col items-center gap-2.5 px-7 py-3.5">
        <AnimatePresence initial={false} mode="wait">
          {loading ? (
            <motion.span
              key="progress"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-center text-cta text-ink-500"
            >
              Se generează documentul și se trimite spre semnare. Poate dura câteva secunde — nu
              închide pagina.
            </motion.span>
          ) : (
            toast && (
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
            )
          )}
        </AnimatePresence>

        <Button onClick={onSubmit} loading={loading} disabled={done} aria-busy={loading}>
          {label}
        </Button>
      </div>
    </div>
  )
}
