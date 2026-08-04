import { motion } from 'framer-motion'

import { inputClasses } from '../../components/ui/TextField.jsx'

export default function ExecutantRow({ index, value, onChange, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex items-center gap-2.5"
    >
      <span className="flex h-[42px] w-[30px] flex-none items-center justify-center border border-line-strong bg-surface text-cta font-bold text-ink-400">
        {index + 1}
      </span>

      <input
        type="text"
        placeholder="Nume și prenume"
        aria-label={`Executant ${index + 1}`}
        value={value}
        onChange={(e) => onChange(index, e.target.value)}
        className={`${inputClasses} min-w-0 flex-1`}
      />

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="h-[42px] flex-none cursor-pointer border border-line-btn bg-surface px-3 text-label font-bold uppercase tracking-label text-ink-500 transition-colors duration-150 hover:border-ink-200 hover:text-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Elimină
      </button>
    </motion.div>
  )
}
