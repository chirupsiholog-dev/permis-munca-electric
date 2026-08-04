/**
 * Fixed vocabulary of the permit form — these are the exact strings printed on
 * the PDF, so they are content, not placeholder data. Keep them in sync with
 * the backend's PDF field mapping.
 */

export const TIPURI_LUCRARE = ['Mentenanță', 'Intervenție', 'Testare', 'Altul']

export const RISCURI = [
  'Electrocutare AC',
  'Electrocutare DC (panouri fotovoltaice)',
  'Arc electric',
  'Tensiuni reziduale (invertoare)',
  'Backfeed (alimentare inversă)',
  'Lucru la înălțime',
  'Condiții meteo nefavorabile',
]

export const MASURI = [
  'Deconectare instalație',
  'Separare vizibilă',
  'Verificare lipsă tensiune',
  'Punere la pământ și în scurtcircuit',
  'Aplicare LOTO (Lock-Out / Tag-Out)',
  'Delimitare și semnalizare zonă de lucru',
  'Verificare absență tensiune DC',
  'Descărcare tensiuni reziduale invertor',
]

export const EIP = [
  'Mănuși electroizolante',
  'Cască protecție',
  'Ochelari protecție',
  'Încălțăminte dielectrică',
  'Îmbrăcăminte ignifugă (arc electric)',
  'Ham (lucru la înălțime)',
]

export const CONFIRMARI = [
  'Instalația a fost scoasă de sub tensiune (unde este posibil)',
  'S-au aplicat toate măsurile de securitate',
  'Zona de lucru este sigură',
  'Personalul a fost instruit',
]

export const MAX_EXECUTANTI = 3
