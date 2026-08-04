import { useOutletContext } from 'react-router-dom'

import PageTransition from '../components/layout/PageTransition.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import ArchiveTable from '../features/archive/ArchiveTable.jsx'
import { FILTERS, useArchiveFilters } from '../features/archive/useArchiveFilters.js'
import { PERMITS } from '../lib/placeholderData.js'

export default function ArchivePage() {
  const { user } = useOutletContext()
  // TODO(backend): replace PERMITS with the permits fetched for this user.
  const permits = PERMITS
  const { filter, setFilter, query, setQuery, rows } = useArchiveFilters(permits)

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-7 pb-[72px] pt-10">
        <PageHeading
          title="Arhivă permise"
          subtitle="Toate permisele emise de tine, cu starea documentului și a semnăturilor."
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            label="Filtrează permisele"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
          />

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după locație, instalație sau șef de lucrare"
            aria-label="Caută permise"
            className="h-10 w-[340px] max-w-full border border-line-strong bg-surface px-3 text-body-sm text-ink-900 outline-0 transition-colors duration-150 focus:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </div>

        <ArchiveTable
          rows={rows}
          total={permits.length}
          emitentNume={user.nume}
          // TODO(backend): wire these to your detail route / download endpoint.
          onOpen={() => {}}
          onDownload={() => {}}
        />
      </main>
    </PageTransition>
  )
}
