import { AnimatePresence } from 'framer-motion'

import Card from '../../components/ui/Card.jsx'
import ArchiveRow from './ArchiveRow.jsx'
import { GRID } from './archiveGrid.js'

const COLUMNS = ['Data', 'Lucrare', 'Stare permis', 'Emitent (tu)', 'Șef de lucrare', '']

export default function ArchiveTable({ rows, total, emitentNume, onOpen, onDownload }) {
  return (
    <Card className="overflow-x-auto">
      <div
        style={GRID}
        className="items-center border-b border-line bg-surface-alt px-[22px] py-[13px] text-table-head font-bold uppercase tracking-label text-ink-400"
      >
        {COLUMNS.map((column, i) => (
          <span key={i}>{column}</span>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {rows.map((permit) => (
          <ArchiveRow
            key={permit.id}
            permit={permit}
            emitentNume={emitentNume}
            onOpen={onOpen}
            onDownload={onDownload}
          />
        ))}
      </AnimatePresence>

      {rows.length === 0 && (
        <div className="px-[22px] py-[34px] text-center text-body-sm text-ink-400">
          Nu există permise care corespund filtrului selectat.
        </div>
      )}

      <div className="flex items-center justify-between gap-4 px-[22px] py-[13px] text-meta text-ink-400">
        <span>
          {rows.length} din {total} permise
        </span>
        <span className="uppercase tracking-status">
          Permisele sunt valabile doar în ziua emiterii
        </span>
      </div>
    </Card>
  )
}
