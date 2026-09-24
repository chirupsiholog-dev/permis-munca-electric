import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import Button from '../components/ui/Button.jsx'

import PageTransition from '../components/layout/PageTransition.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'

// ---------------------------------------------------------------------------
// Raw record shape returned by GET /api/autorizatie/all (as confirmed):
//   id                  — string
//   created_at          — string (ISO date)
//   workflow_status     — string, one of the STATUS_GROUPS values below
//   email_admitent      — string
//   email_sef_lucrare   — string
//   cod_acces           — string
// ---------------------------------------------------------------------------

function mapRecord(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    status: r.workflow_status,
    admitentEmail: r.email_admitent,
    sefLucrareEmail: r.email_sef_lucrare,
    codAcces: r.cod_acces,
    emitentSigningLink: r.emitent_signing_link
  }
}

// URL-facing tab keys (kept identical to the ?stare= values HomePage.jsx
// already links to) mapped to the real Supabase workflow_status values.
// `null` group = no filtering, i.e. "Toate".
const STATUS_GROUPS = {
  semnatura_ta: ['pending_emitent'],
  asteapta_altii: ['pending_sef_lucrare', 'pending_admitent', 'pending_executanti'],
  complet: ['semnat'],
}

const TABS = [
  { key: null, label: 'Toate' },
  { key: 'semnatura_ta', label: 'Semnătura ta' },
  { key: 'asteapta_altii', label: 'Așteaptă alții' },
  { key: 'complet', label: 'Complet' },
]

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusPill({ status }) {

  const label = status?.replace(/_/g, ' ') ?? '—'
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-body-sm font-medium uppercase tracking-wide text-ink-800">
      <span className="h-2 w-2 shrink-0 bg-brand" />
      {label}
    </span>
  )
}

const GRID_COLS =
  'grid-cols-[100px_190px_minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(220px,1.4fr)_110px_120px_90px]'

export default function AutorizatiePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const stare = searchParams.get('stare')
  const { profile } = useOutletContext()

  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
  const jwt = localStorage.getItem('token')
  return fetch('/api/autorizatie/all', {
    headers: { Authorization: `Bearer ${jwt}` },
  })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then((d) => setRows((d.data ?? []).map(mapRecord)))
  }


  useEffect(() => {
    setLoading(true)
    setError(false)
    load().catch(() => setError(true)).finally(() => setLoading(false))

    const onFocus = () => load().catch(() => {})
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const filteredRows = useMemo(() => {
    let result = rows

    if (stare && STATUS_GROUPS[stare]) {
      const allowed = STATUS_GROUPS[stare]
      result = result.filter((r) => allowed.includes(r.status))
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter(
        (r) =>
          (r.sefLucrareEmail ?? '').toLowerCase().includes(q) ||
          (r.admitentEmail ?? '').toLowerCase().includes(q) ||
          (r.codAcces ?? '').toLowerCase().includes(q),
      )
    }

    return result
  }, [rows, stare, query])

  const setTab = (key) => {
    if (key) setSearchParams({ stare: key })
    else setSearchParams({})
  }

  const handleDownload = async (row) => {
    const jwt = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/autorizatie/download/${row.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `permis-${row.codAcces}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      return
    }
  }

  return (
    <PageTransition>
      {/* Widened from max-w-[1080px] to max-w-[1400px] so the extra Admitent
          column has room to breathe. Bump this further, or drop max-w for a
          fluid layout, if it still feels tight. */}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-[26px] px-7 pb-16 pt-11">
        <PageHeading
          title="Arhivă autorizații"
          subtitle="Toate autorizațiile emise de tine, cu starea documentului și a semnăturilor."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-0.5">
            {TABS.map((tab) => {
              const active = stare === tab.key || (!stare && tab.key === null)
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setTab(tab.key)}
                  className={`border border-line px-4 py-2 text-body-sm font-semibold uppercase tracking-wide transition-colors ${
                    active ? 'border-brand bg-brand text-white' : 'bg-white text-ink-500 hover:bg-surface-alt'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după email sau cod acces"
            className="w-full max-w-[320px] border border-line bg-white px-3 py-2 text-body-sm text-ink-800 outline-none transition-colors placeholder:text-ink-200 focus:border-brand"
          />
        </div>

        <div className="overflow-x-auto border border-line bg-white">
          <div className="min-w-[1340px]">
            <div className={`grid ${GRID_COLS} gap-4 border-b border-line bg-surface-alt px-5 py-3`}>
              <span className="text-body-sm font-semibold uppercase tracking-wide text-ink-500">Data</span>
              <span className="text-body-sm font-semibold uppercase tracking-wide text-ink-500">Stare permis</span>
              <span className="text-body-sm font-semibold uppercase tracking-wide text-ink-500">Emitent</span>
              <span className="text-body-sm font-semibold uppercase tracking-wide text-ink-500">Șef de lucrare</span>
              <span className="text-body-sm font-semibold uppercase tracking-wide text-ink-500">Admitent</span>
              <span className="text-body-sm font-semibold uppercase tracking-wide text-ink-500">Cod acces</span>
              <span className="text-body-sm font-semibold uppercase tracking-wide text-ink-500">Semnează</span>
              <span className="text-center text-body-sm font-semibold uppercase tracking-wide text-ink-500">Descarcă</span>
            </div>

          <div className="divide-y divide-line">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`grid ${GRID_COLS} items-center gap-4 px-5 py-4`}>
                  <div className="h-4 w-16 animate-pulse bg-surface-alt" />
                  <div className="h-4 w-20 animate-pulse bg-surface-alt" />
                  <div className="h-4 w-32 animate-pulse bg-surface-alt" />
                  <div className="h-4 w-32 animate-pulse bg-surface-alt" />
                  <div className="h-4 w-32 animate-pulse bg-surface-alt" />
                  <div className="h-4 w-16 animate-pulse bg-surface-alt" />
                  <div className="h-4 w-6 animate-pulse bg-surface-alt" />
                  <div className="h-4 w-6 animate-pulse justify-self-center bg-surface-alt" />                </div>
              ))}

            {!loading && error && (
              <div className="px-5 py-8 text-center text-body-sm text-warn-text">
                Nu am putut încărca arhiva. Încearcă din nou mai târziu.
              </div>
            )}

            {!loading && !error && filteredRows.length === 0 && (
              <div className="px-5 py-8 text-center text-body-sm text-ink-500">
                Niciun permis găsit.
              </div>
            )}

            {!loading &&
              !error &&
              filteredRows.map((row) => (
                <div key={row.id} className={`grid ${GRID_COLS} items-center gap-4 px-5 py-4`}>
                  <span className="text-body-sm text-ink-800">{formatDate(row.createdAt)}</span>
                  <StatusPill status={row.status} />
                  <span className="truncate text-body-sm text-ink-800">{profile?.numeAfisat ?? '—'}</span>
                  <span className="break-all text-body-sm text-ink-800" title={row.sefLucrareEmail}>
                    {row.sefLucrareEmail || '—'}
                  </span>
                  <span className="break-all text-body-sm text-ink-800" title={row.admitentEmail}>
                    {row.admitentEmail || '—'}
                  </span>
                  <span className="text-body-sm text-ink-800">{row.codAcces}</span>
                  <Button type="button" size="sm" fullWidth disabled={row.status !== 'pending_emitent' || !row.emitentSigningLink} onClick = {() => { window.open(row.emitentSigningLink, '_blank')}}>
                      {row.status === 'pending_emitent'
                      ? 'Semnează'
                      : row.status === 'semnat'
                        ? 'Ai semnat'
                        : 'În așteptare'}
                  </Button>
                  {row.status === 'semnat' && (
                  <button
                    type="button"
                    onClick={() => handleDownload(row)}
                    title="Descarcă"
                    className="flex h-8 w-8 items-center justify-center justify-self-center border border-line text-brand transition-colors hover:bg-surface-alt"
                  >
                    <Download size={15} />
                  </button>
                  )}
                </div>
              ))}
          </div>
          </div>
        </div>
      </main>
    </PageTransition>
  )
}