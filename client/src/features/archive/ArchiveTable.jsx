import { AnimatePresence } from 'framer-motion'

import Card from '../../components/ui/Card.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import ArchiveRow from './ArchiveRow.jsx'
import ArchiveRowSkeleton from './ArchiveRowSkeleton.jsx'
import { GRID } from './archiveGrid.js'

const COLUMNS = ['Data', 'Lucrare', 'Stare permis', 'Emitent (tu)', 'Șef de lucrare', 'Cod acces', '']

const SKELETON_ROWS = 5

export default function ArchiveTable({ rows, total, emitentNume, loading, onOpen, onDownload }) {
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

      {loading ? (
        Array.from({ length: SKELETON_ROWS }, (_, i) => <ArchiveRowSkeleton key={i} index={i} />)
      ) : (
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
      )}

      {/* Only an empty result once we know it's empty — while loading, an empty
          `rows` just means the request hasn't landed. */}
      {!loading && rows.length === 0 && (
        <div className="px-[22px] py-[34px] text-center text-body-sm text-ink-400">
          Nu există permise care corespund filtrului selectat.
        </div>
      )}

      <div className="flex items-center justify-between gap-4 px-[22px] py-[13px] text-meta text-ink-400">
        <span>
          {loading ? (
            <Skeleton className="h-[10px] w-[104px]" />
          ) : (
            `${rows.length} din ${total} permise`
          )}
        </span>
        <span className="uppercase tracking-status">
          Permisele sunt valabile doar în ziua emiterii
        </span>
      </div>
    </Card>
  )
}
