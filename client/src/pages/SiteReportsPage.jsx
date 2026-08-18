import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

import PageTransition from '../components/layout/PageTransition.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'

import Modal from '../components/ui/Modal.jsx'
import DailyReportForm from './RaportOnSite.jsx'

/**
 * Singura pagină a utilizatorilor non-admin: rapoartele on-site proprii.
 *
 * Coloanele urmăresc exact corpul cererii POST din siteReportsController
 * (parc, echipa, data, oreLucrate, inductieOre, mediuOre, nearMiss,
 * mentenantaCorectiva, mentenantaPreventiva).
 */

/**
 * Aceeași definiție de grilă pentru antet și pentru rânduri, ca să rămână
 * aliniate. Sub lățimea minimă tabelul derulează orizontal în loc să se rearanjeze —
 * cele nouă coloane numerice devin ilizibile dacă se înghesuie.
 */
const GRID = {
  display: 'grid',
  gridTemplateColumns:
    '96px minmax(160px, 1.2fr) minmax(170px, 1.2fr) 96px 96px 88px 96px 120px 120px 96px',
  gap: '16px',
  minWidth: '1280px',
}

const COLUMNS = [
  { label: 'Data' },
  { label: 'Parc' },
  { label: 'Echipă' },
  { label: 'Ore lucrate', align: 'text-right' },
  { label: 'Inducție', align: 'text-right' },
  { label: 'Mediu', align: 'text-right' },
  { label: 'Near miss', align: 'text-right' },
  { label: 'Ment. corectivă', align: 'text-right' },
  { label: 'Ment. preventivă', align: 'text-right' },
  { label: '' },
]

/** `data` vine ca `YYYY-MM-DD` din backend, fără fus orar. */
const formatData = (data) =>
  new Date(`${data}T00:00:00.000Z`).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

/** Zecimalele apar doar când există (24 rămâne „24”, nu „24,0”). */
const formatNumar = (n) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(n)

const normalizeText = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export default function SiteReportsPage() {
  const [reports, setReports] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [parc, setParc] = useState('toate')
  const [query, setQuery] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)


  const parcOptions = useMemo(
    () => [
      { value: 'toate', label: 'Toate' },
      ...[...new Set(reports.map((r) => r.parc))].map((p) => ({ value: p, label: p })),
    ],
    [reports],
  )

  const rows = useMemo(() => {
    const q = normalizeText(query.trim())

    return reports
      .filter((r) => parc === 'toate' || r.parc === parc)
      .filter((r) => {
        if (!q) return true
        const searchString = `${r.parc} ${(r.echipa || []).join(' ')}`
        return normalizeText(searchString).includes(q)
      })
  }, [reports, parc, query])

  const handleAdd = () => {
    setIsFormOpen(true);
  }

  const handleEdit = (report) => {
    // TODO: deschide formularul precompletat cu `report` (PUT /api/site-reports/:id).
  }

  useEffect(() => {
    //create controller that handles request cancelation
    const controller = new AbortController();

    const jwt = localStorage.getItem('token');

    const fetchResponse = async() => {
      try{

        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/site-reports/", {method: 'GET', headers: {
          Authorization: `Bearer ${jwt}`},
          //if the request is cancelled, stop the fetch - this prevents the request keeping on running even though it was cancelled and in some cases
          //, when it finishes, try to set data on a component that is no longer rendered (if the user changed pages for example)
          signal: controller.signal
        });

        if(!res.ok)
          throw new Error(`A apărut o eroare la descărcarea datelor (${res.status})`)

        const data = await res.json();

        if(data.error){
          throw new Error(data.error);
        }

       setReports(Array.isArray(data?.data) ? data.data : []);

      }catch(err){
        //ignore the error is the request was cancelled by the user intentionally
        if(err.name !== 'AbortError')
          setError(err.message);
      }finally{
        setIsLoading(false);
      }
    }

    fetchResponse();

    //clean up function - useEffect runs when something (which we set) changes
    //or when the component is destroyed - in both cases, if a request is running, we stop it
    return () => controller.abort();

  }, [])

  return (


    <PageTransition>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <DailyReportForm />
      </Modal>

      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-7 pb-[72px] pt-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeading
            title="Rapoarte on-site"
            subtitle="Rapoartele zilnice trimise de tine, cu orele-om și indicatorii HSE raportați."
          />

          <Button onClick={handleAdd}>Adaugă raport</Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            label="Filtrează după parc"
            options={parcOptions}
            value={parc}
            onChange={setParc}
          />

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după parc sau membru al echipei"
            aria-label="Caută rapoarte"
            className="h-10 w-[340px] max-w-full border border-line-strong bg-surface px-3 text-body-sm text-ink-900 outline-0 transition-colors duration-150 focus:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </div>

        <Card className="overflow-x-auto">
          <div
            style={GRID}
            className="items-center border-b border-line bg-surface-alt px-[22px] py-[13px] text-table-head font-bold uppercase tracking-label text-ink-400"
          >
            {COLUMNS.map((column, i) => (
              <span key={i} className={column.align ?? ''}>
                {column.label}
              </span>
            ))}
          </div>

          {isLoading ? (
            <div className="px-[22px] py-[34px] text-center text-body-sm text-ink-400">
              Se încarcă rapoartele...
            </div>
          ) : error ? (
            <div className="px-[22px] py-[34px] text-center text-body-sm text-danger">
              {error}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {rows.map((report) => (
                <motion.div
                  key={report.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={GRID}
                  className="items-center border-b border-line-faint px-[22px] py-[15px] text-body-sm text-ink-700 transition-colors duration-150 hover:bg-surface-alt"
                >
                  <span className="text-ink-600">{formatData(report.data)}</span>

                  <span className="truncate font-bold text-ink">{report.parc}</span>

                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="truncate text-cta text-ink-700">
                      {(report.echipa || []).join(', ')}
                    </span>
                    <span className="text-meta text-ink-400">
                      {report.echipa?.length || 0} {report.echipa?.length === 1 ? 'lucrător' : 'lucrători'}
                    </span>
                  </span>

                  <span className="text-right font-mono text-cta text-ink-700">
                    {formatNumar(report.ore_lucrate)}
                  </span>
                  <span className="text-right font-mono text-cta text-ink-700">
                    {formatNumar(report.inductie_ore)}
                  </span>
                  <span className="text-right font-mono text-cta text-ink-700">
                    {formatNumar(report.mediu_ore)}
                  </span>

                  <span
                    className={`text-right font-mono text-cta ${
                      report.near_miss > 0 ? 'font-bold text-danger' : 'text-ink-700'
                    }`}
                  >
                    {formatNumar(report.near_miss)}
                  </span>

                  <span className="text-right font-mono text-cta text-ink-700">
                    {formatNumar(report.mentenanta_corectiva)}
                  </span>
                  <span className="text-right font-mono text-cta text-ink-700">
                    {formatNumar(report.mentenanta_preventiva)}
                  </span>

                  <span className="justify-self-end">
                    <button
                      type="button"
                      onClick={() => handleEdit(report)}
                      aria-label={`Editează raportul din ${formatData(report.data)} — ${report.parc}`}
                      className="cursor-pointer border-0 bg-transparent p-0 text-label font-bold uppercase tracking-label text-brand transition-colors duration-150 hover:text-brand-hover hover:underline"
                    >
                      Editează
                    </button>
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {!isLoading && !error && rows.length === 0 && (
            <div className="px-[22px] py-[34px] text-center text-body-sm text-ink-400">
              Nu există rapoarte care corespund filtrului selectat.
            </div>
          )}

          <div className="flex items-center justify-between gap-4 px-[22px] py-[13px] text-meta text-ink-400">
            <span>{`${rows.length} din ${reports.length} rapoarte`}</span>
          </div>
        </Card>
      </main>
    </PageTransition>
  )
}