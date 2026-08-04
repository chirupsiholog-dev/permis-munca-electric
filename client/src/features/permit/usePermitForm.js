import { useCallback, useMemo, useState } from 'react'

import { CONFIRMARI, MASURI, MAX_EXECUTANTI } from '../../lib/constants.js'

const INITIAL = {
  data: '',
  locatie: '',
  instalatie: '',
  tip: 'Mentenanță',
  tipAltul: '',
  descriere: '',
  sefLucrare: '',
  executanti: ['', ''],
  riscuri: {},
  masuri: {},
  eip: {},
  confirmari: {},
  alteRiscuri: '',
  alteEip: '',
  alteRiscuriOn: false,
  alteMasuriOn: false,
  alteEipOn: false,
  oraStart: '08:00',
  oraEnd: '18:00',
  observatii: '',
}

/**
 * Owns the whole permit form. Returns the raw `values` object — that is exactly
 * the payload shape to POST once you wire the backend up.
 */
export function usePermitForm() {
  const [values, setValues] = useState(INITIAL)

  const setField = useCallback(
    (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value })),
    [],
  )

  const setValue = useCallback((key, value) => setValues((v) => ({ ...v, [key]: value })), [])

  /** Flip one checkbox inside a `{ [label]: boolean }` group. */
  const toggleIn = useCallback(
    (group) => (label) =>
      setValues((v) => ({ ...v, [group]: { ...v[group], [label]: !v[group][label] } })),
    [],
  )

  const setExecutant = useCallback(
    (index, value) =>
      setValues((v) => {
        const next = v.executanti.slice()
        next[index] = value
        return { ...v, executanti: next }
      }),
    [],
  )

  const removeExecutant = useCallback(
    (index) =>
      setValues((v) => ({ ...v, executanti: v.executanti.filter((_, i) => i !== index) })),
    [],
  )

  const addExecutant = useCallback(
    () =>
      setValues((v) =>
        v.executanti.length < MAX_EXECUTANTI
          ? { ...v, executanti: [...v.executanti, ''] }
          : v,
      ),
    [],
  )

  const reset = useCallback(() => setValues(INITIAL), [])

  /**
   * Completeness mirrors the design's rule: the five required text fields, at
   * least one executant, at least one safety measure, and every confirmation.
   */
  const completeness = useMemo(() => {
    const required = [
      values.data,
      values.locatie,
      values.instalatie,
      values.descriere,
      values.sefLucrare,
    ]

    const filled =
      required.filter((v) => String(v).trim()).length +
      (values.executanti.some((e) => e.trim()) ? 1 : 0) +
      (MASURI.some((m) => values.masuri[m]) || values.alteMasuriOn ? 1 : 0) +
      (CONFIRMARI.every((c) => values.confirmari[c]) ? 1 : 0)

    const total = required.length + 3
    return { filled, total, isComplete: filled >= total }
  }, [values])

  /** Human-readable validity notice shown under the time inputs. */
  const valabilitate = useMemo(() => {
    if (!values.data) return 'Permisul este valabil doar pentru ziua emiterii.'
    const [y, m, d] = values.data.split('-')
    return `Permisul este valabil doar în data de ${d}.${m}.${y}, între orele ${values.oraStart} și ${values.oraEnd}.`
  }, [values.data, values.oraStart, values.oraEnd])

  return {
    values,
    setField,
    setValue,
    toggleIn,
    setExecutant,
    addExecutant,
    removeExecutant,
    reset,
    completeness,
    valabilitate,
    canAddExecutant: values.executanti.length < MAX_EXECUTANTI,
  }
}
