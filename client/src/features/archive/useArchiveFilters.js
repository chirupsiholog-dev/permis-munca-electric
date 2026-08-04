import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * The four states mirror the home-screen tiles one-for-one, so each tile has a
 * distinct destination. `toate` is the absence of a filter rather than a value.
 */
export const FILTERS = [
  { value: 'toate', label: 'Toate' },
  { value: 'semnatura_ta', label: 'Semnătura ta' },
  { value: 'asteapta_altii', label: 'Așteaptă alții' },
  { value: 'complet', label: 'Complet' },
]

export const FILTER_VALUES = FILTERS.map((f) => f.value)

/**
 * Which of the four states a permit is in.
 *
 * Ordered, not independent: nothing can be waiting on the șef until the emitent
 * has signed. Maps onto workflow_status as
 *   pending_emitent → semnatura_ta
 *   pending_sef_lucrare / processing_* → asteapta_altii
 *   completed → complet
 */
export const stareKey = (permit) => {
  if (!permit.emitentSemnat) return 'semnatura_ta'
  if (!permit.sefSemnat) return 'asteapta_altii'
  return 'complet'
}

/**
 * Filter + search over the permit list.
 *
 * The filter lives in the URL (`/arhiva?stare=semnatura_ta`) so the home tiles
 * can link straight to a filtered view, and so a reload or a shared link lands
 * on the same thing. The search box stays local — it's transient typing, not a
 * destination.
 */
export function useArchiveFilters(permits) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  const param = searchParams.get('stare')
  // Ignore anything we don't recognise rather than showing an empty table.
  const filter = FILTER_VALUES.includes(param) ? param : 'toate'

  const setFilter = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'toate') next.delete('stare')
    else next.set('stare', value)
    // replace: the filter is a view toggle, not a place worth a Back stop.
    setSearchParams(next, { replace: true })
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()

    return permits
      .filter((p) => filter === 'toate' || stareKey(p) === filter)
      .filter((p) => !q || `${p.locatie} ${p.instalatie} ${p.sef}`.toLowerCase().includes(q))
  }, [permits, filter, query])

  return { filter, setFilter, query, setQuery, rows }
}
