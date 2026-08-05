import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import Spinner from '../../components/ui/Spinner.jsx'
import StatusDot from '../../components/ui/StatusDot.jsx'
import { GRID } from './archiveGrid.js'
import { stareKey } from './useArchiveFilters.js'

const STARI = {
  semnatura_ta: { label: 'Semnătura ta', tone: 'pending' },
  asteapta_altii: { label: 'Așteaptă alții', tone: 'signed' },
  complet: { label: 'Complet', tone: 'done' },
}

const semnatura = (signed) =>
  signed ? { label: 'Semnat', tone: 'signed' } : { label: 'În așteptare', tone: 'pending' }

export default function ArchiveRow({ permit, emitentNume, onOpen, onDownload }) {
  const stare = STARI[stareKey(permit)]
  const complet = stareKey(permit) === 'complet'
  const emitent = semnatura(permit.emitentSemnat)
  const sef = semnatura(permit.sefSemnat)

  //per-row, not per-table
  const [downloading, setDownloading] = useState(false)
  const [failed, setFailed] = useState(false)
  const errorTimer = useRef(null)

  useEffect(() => () => clearTimeout(errorTimer.current), [])

  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    setFailed(false)

    try {
      // Only an explicit `false` counts as failure, so a handler that returns
      // nothing isn't misread as a broken download.
      if ((await onDownload(permit.id)) === false) flashError()
    } catch {
      flashError()
    } finally {
      setDownloading(false)
    }
  }

  /** Self-clearing: the button is the retry, so the error shouldn't be sticky. */
  function flashError() {
    setFailed(true)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setFailed(false), 4000)
  }

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

      <span className="font-mono text-cta tracking-[0.1em] text-ink-700">
        {permit.codAcces || '—'}
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
            title={
              downloading
                ? 'Se descarcă…'
                : failed
                  ? 'Descărcarea a eșuat. Încearcă din nou.'
                  : 'Descarcă'
            }
            aria-label={`Descarcă — ${permit.instalatie}`}
            aria-busy={downloading}
            disabled={downloading}
            onClick={handleDownload}
            className={`flex h-[30px] w-[30px] flex-none cursor-pointer items-center justify-center border bg-surface p-0 transition-colors duration-150 disabled:cursor-wait ${
              failed
                ? 'border-danger bg-danger-bg'
                : 'border-line-btn hover:border-brand hover:bg-info-bg disabled:border-brand disabled:bg-info-bg'
            }`}
          >
            {downloading ? (
              <Spinner tone="brand" />
            ) : failed ? (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="square"
                className="text-danger"
                aria-hidden="true"
              >
                <path d="M12 6.5v7" />
                <path d="M12 16.8v.7" />
              </svg>
            ) : (
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
            )}
          </button>
        )}
      </span>
    </motion.div>
  )
}
