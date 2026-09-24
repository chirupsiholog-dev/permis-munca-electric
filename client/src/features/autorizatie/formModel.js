import { stripDiacritics, toRomanianDate } from '../../lib/text.js'

const field = (key, label, type = 'text') => ({ key, label, type })
const check = (key, label) => field(key, label, 'checkbox')
const lines = (key, label, targets, capacity = 80) => ({ key, label, type: 'lines', targets, capacity })
const numbered = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`)
export const sections = [
  { title: 'Date generale', fields: [
    field('nr_autorizatie', 'Numărul autorizației'), field('data_autorizatie', 'Data autorizației', 'date'),
    lines('instalatia', 'Instalația', ['instalatia_l1', 'instalatia_l2']),
    lines('partea_instalatie', 'Partea instalației', ['partea_instalatie_l1', 'partea_instalatie_l2']),
    lines('continutul_lucrarii', 'Conținutul lucrării', ['continutul_lucrarii_l1', 'continutul_lucrarii_l2']),
    field('durata_zile', 'Durata (zile)', 'number'), field('data_inceperii', 'Data începerii', 'date'),
    check('revenire_zilnica_check', 'Revenire zilnică'), field('nr_zone_lucru', 'Numărul zonelor de lucru', 'number'),
    lines('nominalizare_zone', 'Nominalizarea zonelor', ['nominalizare_zone_l1', 'nominalizare_zone_l2']), field('de_la_cine', 'Dispoziția de la'),
  ] },
  { title: 'A · Pregătirea lucrării', fields: [
    check('foaie_manevra_check', 'Foaie de manevră'), check('preluare_mesaj_check', 'Preluare prin mesaj'),
    check('utilaje_speciale_check', 'Utilaje speciale'), check('fisa_tehnologica_check', 'Fișă tehnologică'), check('instructiune_tehnica_check', 'Instrucțiune tehnică'),
    field('instalatii_afectate', 'Instalații afectate'), field('separare_electrica_catre', 'Separarea electrică executată de'),
    check('aparate_comutatie_check', 'Aparate de comutație'), check('dezlegare_conductoare_check', 'Dezlegare conductoare'),
    check('dezlegare_cordoane_check', 'Dezlegare cordoane'), check('dezlegare_bare_aparataj_check', 'Dezlegare bare / aparataj'), check('dezlegare_cabluri_check', 'Dezlegare cabluri'),
    field('cabluri_detaliu', 'Detalii cabluri'), field('separare_electrica_continuare', 'Separarea electrică — continuare'), field('legari_pamant_catre', 'Legări la pământ executate de'),
  ] },
  { title: 'B · Admiterea la lucru', fields: [
    ...numbered('manevra_nr', 3).map((k, i) => field(k, `Foaie de manevră ${i + 1}`)),
    ...numbered('mesaj_nr', 5).map((k, i) => field(k, `Mesaj ${i + 1}`)),
    lines('separat_vizibil', 'Separare vizibilă — nominalizare', ['separat_vizibil_nominalizare', 'separat_vizibil_nominalizare_l2', 'separat_vizibil_nominalizare_l3']),
    field('este_separat_vizibil', 'Confirmarea separării vizibile'),
    lines('legat_pamant', 'Legare la pământ și în scurtcircuit — locul', ['legat_pamant_scurtcircuit_unde', 'legat_pamant_scurtcircuit_l2', 'legat_pamant_scurtcircuit_l3', 'legat_pamant_scurtcircuit_l4']),
    field('este_legat_pamant_scurtcircuit', 'Confirmarea legării la pământ și în scurtcircuit'),
    lines('masuri_admitere', 'Măsuri suplimentare de admitere', ['masuri_suplimentare_admitere', 'masuri_suplimentare_admitere_l2', 'masuri_suplimentare_admitere_l3']),
    field('data_ora_admiterii', 'Data și ora admiterii', 'datetime-local'), check('schema_diferita_check', 'Schema diferă de cea prevăzută'),
    lines('continut_mesaj', 'Conținutul mesajului', numbered('continut_mesaj_nr', 3)),
  ] },
  { title: 'C · Începerea și desfășurarea lucrării', fields: [
    check('identificare_instalatie_cap_c_check', 'Am identificat instalația'), check('fisa_tehnologica_cap_c_check', 'Dețin și cunosc fișa tehnologică'),
    check('instructiune_tehnica_cap_c_check', 'Dețin și cunosc instrucțiunea tehnică'), check('instruire_formatie_cap_c_check', 'Am instruit formația de lucru'),
    check('preluare_zone_lucru_cap_c_check', 'Am preluat zonele de lucru'), check('lucru_inaltime_cap_c_check', 'Am realizat condițiile pentru lucrul la înălțime'),
    lines('masuri_cap_c', 'Măsuri suplimentare de protecție', ['masuri_suplimentare_cap_c_l1', 'masuri_suplimentare_cap_c_l2'], 100),
  ] },
  { title: 'F · Terminarea lucrării', fields: [
    check('lucrare_terminata_cap_f_check', 'Lucrarea a fost terminată'), check('unelte_materiale_stranse_cap_f_check', 'Uneltele și materialele au fost strânse'),
    check('mijloace_protectie_demontate_cap_f_check', 'Mijloacele de protecție au fost demontate'), check('membri_evacuati_cap_f_check', 'Membrii formației au fost evacuați'),
    check('masuri_suplimentare_retrase_cap_f_check', 'Măsurile suplimentare au fost retrase'), check('scurtcircuitoare_demontate_cap_f_check', 'Scurtcircuitoarele au fost demontate'),
    check('curatenie_zone_cap_f_check', 'S-a făcut curățenie în zonele de lucru'), check('probe_functionale_executate_cap_f_check', 'Probele funcționale au fost executate'),
    field('terminare_comunicare_data', 'Data comunicării terminării', 'date'), field('terminare_comunicare_ora', 'Ora comunicării terminării', 'time'), field('terminare_comunicare_cale', 'Calea comunicării terminării'),
    field('predat_data_cap_f', 'Data predării', 'date'), field('predat_ora_cap_f', 'Ora predării', 'time'), field('primit_data_cap_f', 'Data primirii', 'date'), field('primit_ora_cap_f', 'Ora primirii', 'time'),
    { key: 'pusa_tensiune', label: 'Instalația a fost pusă sub tensiune?', type: 'select', options: ['Da', 'Nu'] },
    field('punere_tensiune_comunicare_data', 'Data comunicării punerii sub tensiune', 'date'), field('punere_tensiune_comunicare_ora', 'Ora comunicării punerii sub tensiune', 'time'),
    field('treapta_operativa_decizie', 'Treapta operativă de decizie'), field('punere_tensiune_cale', 'Calea comunicării punerii sub tensiune'),
    field('admitent_confirmare_data_cap_f', 'Data confirmării admitentului', 'date'), field('admitent_confirmare_ora_cap_f', 'Ora confirmării admitentului', 'time'),
  ] },
]
export const repeatGroups = {
  executanti: { title: 'Executanți', singular: 'Executant', max: 8, fields: [field('name', 'Nume și prenume'), field('email', 'Email', 'email')] },
  zone: { title: 'C · Zone de lucru', singular: 'Zonă', max: 6, fields: [field('zona_lucru', 'Numărul zonei'), field('legari_pamant_delimitare', 'Legări la pământ pentru delimitare'), field('admitere_zona_data_ora', 'Data și ora admiterii', 'datetime-local')] },
  modificari: { title: 'D · Modificări în formația de lucru', singular: 'Modificare', max: 4, fields: [field('modificare_nume_prenume', 'Nume și prenume'), field('email', 'Email', 'email'), { key: 'modificare_scoatere_introducere', label: 'Modificare', type: 'select', options: ['Introducere', 'Scoatere'] }, field('modificare_ziua', 'Data', 'date'), field('modificare_ora', 'Ora', 'time')] },
  intreruperi: { title: 'E · Întreruperea și reluarea lucrării', singular: 'Întrerupere', max: 8, fields: [field('zona_lucru_cap_e', 'Zona de lucru'), field('intrerupere_data_cap_e', 'Data întreruperii', 'date'), field('intrerupere_ora_cap_e', 'Ora întreruperii', 'time'), field('reluare_data_cap_e', 'Data reluării', 'date'), field('reluare_ora_cap_e', 'Ora reluării', 'time')] },
}
export const emptyRow = (group) => Object.fromEntries(repeatGroups[group].fields.map(f => [f.key, '']))
export function initialValues() {
  return { sefName: '', sefEmail: '', admitentName: '', admitentEmail: '',
    ...Object.fromEntries(sections.flatMap(s => s.fields.map(f => [f.key, f.type === 'checkbox' ? false : '']))),
    ...Object.fromEntries(Object.keys(repeatGroups).map(key => [key, []])),
  }
}

// Word wrapping is a state projection, not a submission handler. Preserve all
// overflow so the UI can ask for a shorter value instead of silently losing text.
export function splitLines(value, capacity) {
  const result = []
  for (const paragraph of value.split('\n')) {
    let line = ''
    for (let word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > capacity) { result.push(line); line = '' }
      while (word.length > capacity) { result.push(word.slice(0, capacity)); word = word.slice(capacity) }
      line = line ? `${line} ${word}` : word
    }
    result.push(line)
  }
  return result
}
const formatted = (f, value) => f.type === 'date' ? toRomanianDate(value) : f.type === 'datetime-local' ? (value ? `${toRomanianDate(value.split('T')[0])}, ${value.split('T')[1]}` : '') : typeof value === 'string' ? stripDiacritics(value) : value

// Local projection for the eventual integration; no requests, upload or submit.
export function projectDraft(values, emitentName = '') {
  const pdfData = {}, overflow = []
  for (const f of sections.flatMap(s => s.fields)) {
    if (f.type === 'lines') {
      const wrapped = splitLines(values[f.key], f.capacity)
      if (wrapped.length > f.targets.length) overflow.push(f.key)
      f.targets.forEach((target, i) => { pdfData[target] = stripDiacritics(wrapped[i] ?? '') })
    } else if (f.key !== 'pusa_tensiune') pdfData[f.key] = formatted(f, values[f.key])
  }
  for (const key of ['sef_lucrare_desemnat', 'sef_lucrare_semnatar', 'sef_lucrare_nume_admitere', 'sef_lucrare_nume_cap_c', 'sef_lucrare_nume_cap_f']) pdfData[key] = stripDiacritics(values.sefName)
  for (const key of ['admitent_nume', 'admitent_nume_admitere', 'terminare_comunicare_admitent']) pdfData[key] = stripDiacritics(values.admitentName)
  pdfData.emitent_nume = stripDiacritics(emitentName)
  pdfData.instalatie_pusa_tensiune_da_check = values.pusa_tensiune === 'Da'
  pdfData.instalatie_pusa_tensiune_nu_check = values.pusa_tensiune === 'Nu'
  const emailExecutanti = {}, emailPersonalModificat = {}
  for (const [key, group] of Object.entries(repeatGroups)) {
    for (let i = 0; i < group.max; i++) {
      const row = values[key][i] ?? emptyRow(key), nr = i + 1
      for (const f of group.fields) {
        if (f.key === 'email') {
          const target = key === 'executanti' ? emailExecutanti : emailPersonalModificat
          target[`email_${key === 'executanti' ? 'executant' : 'modificat'}_${nr}`] = row.email.trim()
        } else pdfData[key === 'executanti' ? `executant_nume_nr${nr}` : `${f.key}_nr${nr}`] = formatted(f, row[f.key])
      }
    }
  }
  // An overflowing draft is deliberately not exposed as a usable payload.
  return { overflow, data: overflow.length ? null : { pdfData, emailSefLucrare: values.sefEmail.trim(), emailAdmitent: values.admitentEmail.trim(), emailExecutanti, emailPersonalModificat } }
}
