import { motion } from 'framer-motion'

import StatusDot from '../../components/ui/StatusDot.jsx'
import { GRID } from './archiveGrid.js'
import { stareKey } from './useArchiveFilters.js'

const STARI = {
  complet: { label: 'Complet', tone: 'signed' },
  in_asteptare: { label: 'În așteptare', tone: 'pending' },
}

const semnatura = (signed) =>
  signed ? { label: 'Semnat', tone: 'signed' } : { label: 'În așteptare', tone: 'pending' }

export default function ArchiveRow({ permit, emitentNume, onOpen, onDownload }) {
  const stare = STARI[stareKey(permit)]
  const complet = stareKey(permit) === 'complet'
  const emitent = semnatura(permit.emitentSemnat)
  const sef = semnatura(permit.sefSemnat)

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={GRID}
      className="items-center border-b border-line-faint px-[22px] py-[15px] text-body-sm text-ink-700 transition-colors duration-150 hover:bg-surface-alt"
    >
      <span className="text-ink-600">{permit.data}</span>

      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="truncate font-bold text-ink">{permit.instalatie}</span>
        <span className="text-meta text-ink-400">
          {permit.locatie} · {permit.tip}
        </span>
      </span>

      <StatusDot tone={stare.tone} label={stare.label} />

      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="text-cta text-ink-700">{emitentNume}</span>
        <StatusDot size="sm" tone={emitent.tone} label={emitent.label} />
      </span>

      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="truncate text-cta text-ink-700">{permit.sef}</span>
        <StatusDot size="sm" tone={sef.tone} label={sef.label} />
      </span>

      <span className="flex items-center gap-2.5 justify-self-end">
        <button
          type="button"
          onClick={() => onOpen?.(permit)}
          className="cursor-pointer border-0 bg-transparent p-0 text-label font-bold uppercase tracking-label text-brand transition-colors duration-150 hover:text-brand-hover hover:underline"
        >
          Deschide
        </button>

        {complet && (
          <button
            type="button"
            title="Descarcă PDF"
            aria-label={`Descarcă PDF — ${permit.instalatie}`}
            onClick={() => onDownload?.(permit)}
            className="flex h-[30px] w-[30px] flex-none cursor-pointer items-center justify-center border border-line-btn bg-surface p-0 transition-colors duration-150 hover:border-brand hover:bg-info-bg"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="square"
              className="text-brand"
              aria-hidden="true"
            >
              <path d="M12 4v11" />
              <path d="M7 11l5 5 5-5" />
              <path d="M5 20h14" />
            </svg>
          </button>
        )}
      </span>
    </motion.div>
  )
}
