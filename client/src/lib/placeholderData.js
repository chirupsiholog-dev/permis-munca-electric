/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER DATA — replace every export in this file with real API data.
 * Nothing else in the app fabricates data; this is the single seam.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Shape the logged-in user like this (see: GET /api/auth/me). */
export const CURRENT_USER = {
  id: 'placeholder-user-id',
  nume: 'Răzvan Chiru',
  initiale: 'RC',
  email: 'razvan.chiru@companie.ro',
}

/**
 * One row per issued permit.
 * `emitentSemnat` / `sefSemnat` drive every status indicator in the archive —
 * a permit counts as "Complet" only when both are true.
 */
export const PERMITS = [
  {
    id: 'p-1',
    data: '27.04.2026',
    instalatie: 'Celule MT — PC Mereni',
    locatie: 'Mereni',
    tip: 'Mentenanță',
    sef: 'Ștefan Ducica',
    emitentSemnat: true,
    sefSemnat: true,
  },
  {
    id: 'p-2',
    data: '21.04.2026',
    instalatie: 'Invertoare string 4–7',
    locatie: 'Parc FV Dâmbovița',
    tip: 'Intervenție',
    sef: 'Antonache Petru',
    emitentSemnat: true,
    sefSemnat: false,
  },
  {
    id: 'p-3',
    data: '14.04.2026',
    instalatie: 'Tablou general TG-2',
    locatie: 'Stație Titu',
    tip: 'Testare',
    sef: 'Ștefan Ducica',
    emitentSemnat: true,
    sefSemnat: true,
  },
  {
    id: 'p-4',
    data: '09.04.2026',
    instalatie: 'Celulă 20 kV — linie L3',
    locatie: 'Mereni',
    tip: 'Mentenanță',
    sef: 'Marius Oprea',
    emitentSemnat: true,
    sefSemnat: true,
  },
  {
    id: 'p-5',
    data: '02.04.2026',
    instalatie: 'Cutii de joncțiune DC',
    locatie: 'Parc FV Dâmbovița',
    tip: 'Intervenție',
    sef: 'Antonache Petru',
    emitentSemnat: false,
    sefSemnat: false,
  },
  {
    id: 'p-6',
    data: '27.03.2026',
    instalatie: 'Transformator T1 — 630 kVA',
    locatie: 'Stație Titu',
    tip: 'Mentenanță',
    sef: 'Ștefan Ducica',
    emitentSemnat: true,
    sefSemnat: true,
  },
]

/** Derived counters shown on the home screen. Compute these server-side later. */
export function permitStats(permits = PERMITS) {
  return {
    necesitaSemnatura: permits.filter((p) => !p.emitentSemnat).length,
    inAsteptareaAltora: permits.filter((p) => p.emitentSemnat && !p.sefSemnat).length,
    complet: permits.filter((p) => p.emitentSemnat && p.sefSemnat).length,
    total: permits.length,
  }
}
