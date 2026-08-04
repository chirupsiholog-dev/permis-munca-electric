import { useCallback, useMemo, useState } from 'react'

import { CONFIRMARI, MAX_EXECUTANTI } from '../../lib/constants.js'

/**
 * Form state mirrors the backend contract as closely as a form can: the four
 * checkbox groups are **arrays of slugs**, exactly as `pdfData` expects them.
 * See buildPayload.js for the last-mile assembly (date format, diacritics).
 */
const INITIAL = {
  data: '', // YYYY-MM-DD from the native date input
  locatie: '',
  instalatie: '',
  tip: 'mentenanta', // slug, not label
  tipAltulText: '',
  descriere: '',

  // The supervisor is three separate fields — the backend needs the email to
  // send the signing link, and nume/prenume separately for the file name.
  sefNume: '',
  sefPrenume: '',
  sefEmail: '',

  executanti: ['', ''],

  riscuri: [], // e.g. ['electrocutare_ac', 'arc_electric']
  masuri: [],
  echipamente: [],
  confirmari: [],

  riscAlteText: '',
  eipAlteText: '',

  oraStart: '08:00',
  oraEnd: '18:00',
  observatii: '',

  // Close-out block. Filled now or never: fillPdf() flattens the form, so the
  // PDF cannot be edited after creation.
  inchidere: [], // → pdfData.inchidere_permis
  inchidereData: '', // → pdfData.inchidere_data_an (a full date despite the name)
  inchidereOra: '', // → pdfData.inchidere_ora
}

export function usePermitForm() {
  const [values, setValues] = useState(INITIAL)

  const setField = useCallback(
    (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value })),
    [],
  )

  const setValue = useCallback((key, value) => setValues((v) => ({ ...v, [key]: value })), [])

  /**
   * Add/remove a slug in one of the checkbox groups.
   * Curried by group so it can be handed straight to <CheckboxGrid onToggle>.
   */
  const toggleIn = useCallback(
    (group) => (slug) =>
      setValues((v) => ({
        ...v,
        [group]: v[group].includes(slug)
          ? v[group].filter((s) => s !== slug)
          : [...v[group], slug],
      })),
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
    (index) => setValues((v) => ({ ...v, executanti: v.executanti.filter((_, i) => i !== index) })),
    [],
  )

  const addExecutant = useCallback(
    () =>
      setValues((v) =>
        v.executanti.length < MAX_EXECUTANTI ? { ...v, executanti: [...v.executanti, ''] } : v,
      ),
    [],
  )

  const reset = useCallback(() => setValues(INITIAL), [])

  /** Seven required text fields + ≥1 executant + ≥1 măsură + all confirmations. */
  const completeness = useMemo(() => {
    const required = [
      values.data,
      values.locatie,
      values.instalatie,
      values.descriere,
      values.sefNume,
      values.sefPrenume,
      values.sefEmail,
    ]

    const filled =
      required.filter((v) => String(v).trim()).length +
      (values.executanti.some((e) => e.trim()) ? 1 : 0) +
      (values.masuri.length > 0 ? 1 : 0) +
      (values.confirmari.length === CONFIRMARI.length ? 1 : 0)

    const total = required.length + 3
    return { filled, total, isComplete: filled >= total }
  }, [values])

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
