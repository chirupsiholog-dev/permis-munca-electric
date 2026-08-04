/**
 * The PDF is filled with WinAnsi-encoded Helvetica, which cannot encode
 * `ă Ă ș Ș ț Ț ş Ş ţ Ţ` — any of those in a text value fails the request with a
 * 500 (see the `PdfData` description in src/docs/openapi.ts). `â Â î Î` are fine.
 *
 * Decomposing to NFD lets us drop exactly the three offending marks and keep the
 * circumflex, so `Ștefan Ducică` → `Stefan Ducica` while `România` → `Romania`
 * and `Târgoviște` → `Targoviste` (the â survives).
 */
const BREVE = '̆' // ă
const COMMA_BELOW = '̦' // ș ț
const CEDILLA = '̧' // ş ţ (legacy encoding of the same letters)

const OFFENDING = new RegExp(`[${BREVE}${COMMA_BELOW}${CEDILLA}]`, 'g')

/** Strip only the diacritics the PDF font cannot encode. */
export function stripDiacritics(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(OFFENDING, '')
    .normalize('NFC')
}

/** True when a value would be altered by stripping — used to warn in the UI. */
export function hasUnsupportedDiacritics(value) {
  return stripDiacritics(value) !== String(value ?? '')
}

/** `2026-04-27` (native date input) → `27.04.2026` (what the PDF expects). */
export function toRomanianDate(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}
