/**
 * Single source of truth linking each UI label to the slug the backend expects.
 * The slugs are the enums documented in `src/docs/openapi.ts` (schema `PdfData`);
 * the server re-adds the group prefix, e.g. `arc_electric` → checkbox
 * `risc_arc_electric`. A slug outside these lists makes the PDF fill throw a 500,
 * so never invent one here.
 */

/** → `pdfData.tipLucrare` (prefix `tip_lucrare_`). Exactly one is sent. */
export const TIPURI_LUCRARE = [
  { slug: 'mentenanta', label: 'Mentenanță' },
  { slug: 'interventie', label: 'Intervenție' },
  { slug: 'testare', label: 'Testare' },
  { slug: 'altul', label: 'Altul' },
]

/** → `pdfData.riscuri` (prefix `risc_`). */
export const RISCURI = [
  { slug: 'electrocutare_ac', label: 'Electrocutare AC' },
  { slug: 'electrocutare_dc', label: 'Electrocutare DC (panouri fotovoltaice)' },
  { slug: 'arc_electric', label: 'Arc electric' },
  { slug: 'tensiuni_reziduale', label: 'Tensiuni reziduale (invertoare)' },
  { slug: 'backfeed', label: 'Backfeed (alimentare inversă)' },
  { slug: 'lucru_inaltime', label: 'Lucru la înălțime' },
  { slug: 'conditii_meteo', label: 'Condiții meteo nefavorabile' },
]

/** The `alte`/`alte_foaie_manevra` boxes are rendered separately, below the grid. */
export const RISC_ALTE = 'alte'

/** → `pdfData.masuri` (prefix `masuri_`). */
export const MASURI = [
  { slug: 'deconectare_instalatie', label: 'Deconectare instalație' },
  { slug: 'separare_vizibila', label: 'Separare vizibilă' },
  { slug: 'verificare_lipsa_tensiune', label: 'Verificare lipsă tensiune' },
  { slug: 'punere_pamant_scurtcircuit', label: 'Punere la pământ și în scurtcircuit' },
  { slug: 'aplicare_loto', label: 'Aplicare LOTO (Lock-Out / Tag-Out)' },
  { slug: 'delimitare_semnalizare', label: 'Delimitare și semnalizare zonă de lucru' },
  { slug: 'verificare_absenta_tensiune_dc', label: 'Verificare absență tensiune DC' },
  { slug: 'descarcare_tensiuni_reziduale_invertor', label: 'Descărcare tensiuni reziduale invertor' },
]

export const MASURI_ALTE = 'alte_foaie_manevra'

/** → `pdfData.echipamente` (prefix `eip_`, NOT `echipamente_`). */
export const EIP = [
  { slug: 'manusi_electroizolante', label: 'Mănuși electroizolante' },
  { slug: 'casca_protectie', label: 'Cască protecție' },
  { slug: 'ochelari_protectie', label: 'Ochelari protecție' },
  { slug: 'incaltaminte_dielectrica', label: 'Încălțăminte dielectrică' },
  { slug: 'imbracaminte_ignifuga', label: 'Îmbrăcăminte ignifugă (arc electric)' },
  { slug: 'ham', label: 'Ham (lucru la înălțime)' },
]

export const EIP_ALTE = 'alte'

/** → `pdfData.confirmari` (prefix `confirm_`). All four are required to submit. */
export const CONFIRMARI = [
  { slug: 'scoasa_sub_tensiune', label: 'Instalația a fost scoasă de sub tensiune (unde este posibil)' },
  { slug: 'masuri_securitate', label: 'S-au aplicat toate măsurile de securitate' },
  { slug: 'zona_sigura', label: 'Zona de lucru este sigură' },
  { slug: 'personal_instruit', label: 'Personalul a fost instruit' },
]

/**
 * → `pdfData.inchidere_permis` (prefix `inchidere_`).
 *
 * Filled at creation time, because fillPdf() flattens the form — whatever is not
 * ticked here can never be ticked afterwards. See the note in section 10 of the
 * form: this is a declaration of intent, not a record of completed work.
 */
export const INCHIDERE = [
  { slug: 'lucrare_finalizata', label: 'Lucrarea a fost finalizată' },
  { slug: 'zona_stare_initiala', label: 'Zona de lucru a fost adusă la starea inițială' },
  { slug: 'instalatie_repusa', label: 'Instalația a fost repusă sub tensiune' },
]

/** The PDF template has only three executant slots — a fourth throws a 500. */
export const MAX_EXECUTANTI = 3
