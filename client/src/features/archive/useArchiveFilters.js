import { useMemo, useState } from 'react'

export const FILTERS = [
  { value: 'toate', label: 'Toate' },
  { value: 'in_asteptare', label: 'În așteptare' },
  { value: 'complet', label: 'Complet' },
]

/** A permit is complete only when both signatures are in. */
export const stareKey = (permit) =>
  permit.emitentSemnat && permit.sefSemnat ? 'complet' : 'in_asteptare'

/** Filter + free-text search over the permit list. Pure client-side. */
export function useArchiveFilters(permits) {
  const [filter, setFilter] = useState('toate')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()

    return permits
      .filter((p) => filter === 'toate' || stareKey(p) === filter)
      .filter((p) => !q || `${p.locatie} ${p.instalatie} ${p.sef}`.toLowerCase().includes(q))
  }, [permits, filter, query])

  return { filter, setFilter, query, setQuery, rows }
}
