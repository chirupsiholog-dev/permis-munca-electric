import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Check, X } from 'lucide-react'


import PageTransition from '../components/layout/PageTransition.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { useOutletContext } from 'react-router-dom'
import Modal from '../components/ui/Modal.jsx'
import InventarForm from '../components/forms/InventarForm.tsx'
import Photos from '../components/ui/Photos.tsx'

/**
 * Vederea de admin peste inventare:
 */

const TABLE_SHELL = { minWidth: 'min-content' }
const SKELETON_ROWS = 5

// A single definition keeps each heading, value, and column width aligned.
const TABLE_COLUMNS = [
  { key: 'inverter', label: 'Invertor', width: '200px' },
  { key: 'data', label: 'Data', width: '112px' },
  { key: 'turn_on', label: 'Ora de început', width: '100px' },
  { key: 'turn_off', label: 'Ora de sfârșit', width: '100px' },
  { key: 'praf', label: 'Verificare praf', boolean: true },
  { key: 'ventilatoare', label: 'Sunete ventilatoare', boolean: true },
  { key: 'inventor_deteriorat', label: 'Invertor intact', boolean: true },
  { key: 'inventor_sunete', label: 'Fără sunete anormale', boolean: true },
  { key: 'parametrii_corecti', label: 'Parametri corecți', boolean: true },
  { key: 'cabluri_conectate', label: 'Cabluri conectate', boolean: true },
  { key: 'cabluri_intacte', label: 'Cabluri intacte', boolean: true },
  { key: 'capace_etansare', label: 'Capace de etanșare', boolean: true },
  { key: 'porturi', label: 'Porturi blocate', boolean: true },
  { key: 'impamantare', label: 'Împământare', boolean: true },
  { key: 'comutator_curent', label: 'Comutator curent continuu', boolean: true },
  { key: 'suruburi', label: 'Verificare șuruburi', boolean: true },
  { key: 'remarks', label: 'Observații', width: 'minmax(260px, 1fr)' },
  { key: 'images', label: 'Imagini'},
  { key: 'actions', label: 'Acțiuni', width: '180px' },
]

function InventarRowSkeleton({ index, grid }) {
  return (
    <motion.div
      role="row"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      style={grid}
      className="items-stretch border-b border-line-faint bg-white text-body-sm odd:bg-surface-alt"
    >
      {TABLE_COLUMNS.map((column) => (
        <div
          key={column.key}
          role="cell"
          className={`flex min-w-0 items-center px-4 py-4 ${column.boolean ? 'justify-center' : ''} ${column.key === 'inverter' ? 'sticky left-0 z-10 border-r border-line bg-white group-odd:bg-surface-alt' : ''}`}
        >
          <Skeleton className={column.boolean ? 'h-5 w-8' : column.key === 'actions' ? 'h-8 w-24' : 'h-3 w-[68%]'} />
        </div>
      ))}
    </motion.div>
  )
}

function ChecklistResult({ value }) {
  if (typeof value !== 'boolean') return <span aria-label="Nespecificat" className="text-ink-400">—</span>
  return (
    <span className={`inline-flex min-w-12 justify-center rounded px-2 py-1 text-meta font-bold ${value ? 'bg-info-bg text-brand-text' : 'bg-surface-alt text-danger'}`}>
      {value ? <Check size={16} /> : <X size={16} />}
    </span>
  )
}

const TOATE = 'toate'

// Accept ISO dates/timestamps and Romanian dates from the checklist form.
const parseInventarDate = (value) => {
  const text = String(value ?? '').trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(text)
  const local = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4})$/.exec(text)
  if (!iso && !local) return null

  const year = Number(iso ? iso[1] : local[4])
  const month = Number(iso ? iso[2] : local[3])
  const day = Number(iso ? iso[3] : local[1])
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

const formatData = (data) => {
  const date = parseInventarDate(data)
  return date
    ? date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : String(data || '-')
}

const normalizeText = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** Normalize supported date formats to the same sortable month key. */
const lunaKey = (data) => {
  const date = parseInventarDate(data)
  if (!date) return ''
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** `2026-08` → `August 2026`. */
const lunaLabel = (key) => {
  const d = new Date(`${key}-01T00:00:00`)
  if (isNaN(d.getTime())) return key
  const label = d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function InventarePage() {
  const [inventare, setInventare] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [invertor, setInvertor] = useState(TOATE)
  const [luna, setLuna] = useState(TOATE)
  const [query, setQuery] = useState('')

  const {profile} = useOutletContext();
  const canDownload = profile.role === 'admin' || profile.role === 'superuser'
  const COLUMNS = TABLE_COLUMNS.map((column) => column.key === 'actions' && !canDownload
    ? { ...column, width: '240px' } : column)
  const GRID = {
    display: 'grid',
    gridTemplateColumns: COLUMNS.map((column) => column.width ?? '128px').join(' '),
    width: '100%',
  }

  const invertorOptions = useMemo(
    () => [
      { value: TOATE, label: 'Toate' },
      ...[...new Set(inventare.map((i) => i.inverter))].map((p) => ({ value: p, label: p })),
    ],
    [inventare],
  )

  const lunaOptions = useMemo(
    () =>
      [...new Set(inventare.map((i) => lunaKey(i.data)))]
        .filter(Boolean)
        .sort()
        .reverse()
        .map((key) => ({ value: key, label: lunaLabel(key) })),
    [inventare],
  )

  const rows = useMemo(() => {
    const q = normalizeText(query.trim())

    return inventare
      .filter((i) => invertor === TOATE || i.inverter === invertor)
      .filter((i) => luna === TOATE || lunaKey(i.data) === luna)
      .filter((i) => {
        if (!q) return true
        const searchString = `${i.inverter}`
        return normalizeText(searchString).includes(q)
      })
  }, [inventare, invertor, luna, query])

  //we keep the current active controller in a reference
  const abortControllerRef = useRef(null);

  const fetchResponse = async() => {

      //create controller for active request that handles request cancelation
      const controller = new AbortController();

      //if there is an active request (controller)
      if(abortControllerRef.current){
        //stop it before we start another request to avoid concurrency problems, like an old request overwriting the latest request
        abortControllerRef.current.abort();
      }
      //save the new controller before starting the request
      abortControllerRef.current = controller;
      
      const jwt = localStorage.getItem('token');

      try{

        setIsLoading(true);
        setError(null);

        const endpoint = profile.role === 'admin'
          ? '/api/inventar/subordinates'
          : profile.role === 'superuser'
            ? '/api/inventar/all-inventare'
            : '/api/inventar/my-inventare'
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { Authorization: `Bearer ${jwt}` },
          signal: controller.signal,
        });

        if(!res.ok)
          throw new Error(`A apărut o eroare la descărcarea datelor (${res.status})`)

        const data = await res.json();

        if(data.error){
          throw new Error(data.error);
        }

        //safety check - we make sure the current request is still the active one
        if(abortControllerRef.current === controller)
          setInventare(Array.isArray(data?.data) ? data.data : []);

      }catch(err){
        //ignore the error is the request was cancelled by the user intentionally
        if(err.name !== 'AbortError' && abortControllerRef.current === controller)
          setError(err.message);
      }finally{
        //we stop the loading only if the current controller is still the active one
        //otherwise, stopping another request that ran before this one but did not finish
        //would be canceled and would also stop the loading of the new request
        if(abortControllerRef.current === controller)
          setIsLoading(false);
      }
    }

  useEffect(() => {
    fetchResponse();
    return () => {
      if(abortControllerRef.current)
        abortControllerRef.current.abort();
    }
  }, [])

  const handleDownloadFișă = async(invertorId, invertorName) => {
    try{

      setError(null);

      const jwt = localStorage.getItem('token');

      const url = `/api/inventar/download/${invertorId}`;
      
      const res = await fetch(url, {method: 'GET', headers: {Authorization: `Bearer ${jwt}`}})

      if(!res.ok){
        if(res.status === 404){
            throw new Error('Nu există checklist.');
        }
        throw new Error(`Eroare la descărcarea fișierului (${res.status})`);
      }

      const blob = await res.blob();

      //fallback name
      let filename = `Checklist_${invertorId}_${invertorName}.pdf`;
      //try to extract filename from content-disposition header
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      //create an invisible url
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

    }catch(err){
      alert(err.message);
    }
    
    
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const deletingRef = useRef(false)

  const [isPhotosOpen, setIsPhotosOpen] = useState(false)
  
  const currentInventarRef = useRef(null)
  const handleOpenPhotos = (inventar)=>{
    currentInventarRef.current = inventar;
    setIsPhotosOpen(true);
  }
  const handleClosePhotos = useCallback(() => {
    setIsPhotosOpen(false)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsFormOpen(false)
  }, [])

  const handleFormSuccess = () => {
    handleCloseModal()
    fetchResponse()
  }

  const handleAdd = () => {
    setEditingChecklist(null)
    setIsFormOpen(true)
  }

  const handleEdit = (checklist) => {
    setEditingChecklist(checklist)
    setIsFormOpen(true)
  }

  const handleDelete = async (checklist) => {
    if (canDownload || deletingRef.current) return
    if (!window.confirm(`Ștergi checklist-ul pentru ${checklist.inverter}, din ${formatData(checklist.data)}? Această acțiune este ireversibilă.`)) return

    deletingRef.current = true
    setDeletingId(checklist.id)
    setActionError(null)
    try {
      const response = await fetch(`/api/inventar/${encodeURIComponent(checklist.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (!response.ok) throw new Error(`Checklist-ul nu a putut fi șters (${response.status}).`)
      // Refresh from the API; abort any older list request before replacing it.
      await fetchResponse()
    } catch (error) {
      setActionError(error.message)
    } finally {
      deletingRef.current = false
      setDeletingId(null)
    }
  }

  return (
    <PageTransition>

      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseModal}
        label={editingChecklist ? 'Editează checklist-ul' : 'Checklist invertor'}
      >
        <InventarForm
          key={editingChecklist?.id ?? 'new'}
          initialData={editingChecklist}
          onSuccess={handleFormSuccess}
          title={editingChecklist ? 'Editează checklist-ul' : 'Checklist invertor'}
          submitLabel={editingChecklist ? 'Salvează modificările' : 'Trimite checklist-ul'}
        />
      </Modal>

      <Modal
        isOpen = {isPhotosOpen}
        onClose={handleClosePhotos}
        label='Imagini ataște'>

        <Photos
          title = 'Fotografii ataște'
          subtitle='Imagini ataște checklist-ului'
          photos={currentInventarRef.current?.images ?? []}
        />

      </Modal>

      <main className="mx-auto flex w-full min-w-0 max-w-[1240px] flex-1 flex-col gap-5 px-7 pb-[72px] pt-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeading
            title="Checklist-uri invertoare"
            subtitle={canDownload ? 'Toate checklist-urile trimise de echipe.' : 'Checklist-urile de invertoare trimise de tine.'}
          />
          {
            !canDownload && (
              <Button type="button" onClick={handleAdd}>Adaugă checklist</Button>
            )
          }

        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            label="Filtrează după invertor"
            options={invertorOptions}
            value={invertor}
            onChange={setInvertor}
          />

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={luna}
              onChange={(e) => setLuna(e.target.value)}
              aria-label="Filtrează după lună"
              className="h-10 cursor-pointer border border-line-strong bg-surface px-3 text-body-sm text-ink-900 outline-0 transition-colors duration-150 focus:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <option value={TOATE}>Toate lunile</option>
              {lunaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută invertor"
              aria-label="Caută după invertor"
              className="h-10 w-[340px] max-w-full border border-line-strong bg-surface px-3 text-body-sm text-ink-900 outline-0 transition-colors duration-150 focus:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </div>
        </div>

        {actionError && <p role="alert" className="m-0 text-body-sm text-danger">{actionError}</p>}
        <Card className="min-w-0 overflow-hidden">
          <div role="region" aria-label="Checklist-uri invertoare — derulare orizontală" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
            <div style={TABLE_SHELL} role="table" aria-label="Checklist-uri invertoare" aria-busy={isLoading}>
              <div
                style={GRID}
                role="row"
                className="items-stretch border-b border-line bg-surface-alt text-table-head font-bold uppercase tracking-label text-ink-500"
              >
                {COLUMNS.map((column) => (
                  <span key={column.key} role="columnheader" className={`flex items-center px-4 py-4 leading-snug ${column.boolean ? 'justify-center text-center' : ''} ${column.key === 'inverter' ? 'sticky left-0 z-10 border-r border-line bg-surface-alt' : ''}`}>
                    {column.label}
                  </span>
                ))}
              </div>

              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18 }}
                  role="rowgroup"
                  aria-label="Se încarcă checklist-urile"
                >
                  {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <InventarRowSkeleton key={index} index={index} grid={GRID} />
                  ))}
                </motion.div>
              ) : error ? (
                <div role="row">
                  <div role="cell" aria-colspan={COLUMNS.length} className="px-5 py-9 text-body-sm text-danger">
                    <p role="alert" className="sticky left-5 m-0 w-fit max-w-[75vw]">{error}</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {rows.map((inventar) => (
                    <motion.div
                      key={inventar.id}
                      role="row"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={GRID}
                      className="group items-stretch border-b border-line-faint bg-white text-body-sm text-ink-700 odd:bg-surface-alt hover:bg-info-bg"
                    >
                      {COLUMNS.map((column) => (
                        <div
                          key={column.key}
                          role={column.key === 'inverter' ? 'rowheader' : 'cell'}
                          className={`flex min-w-0 items-center px-4 py-4 ${column.boolean ? 'justify-center' : ''} ${column.key === 'inverter' ? 'sticky left-0 z-10 border-r border-line bg-white font-bold text-ink group-odd:bg-surface-alt group-hover:bg-info-bg' : ''}`}
                        >
                          {column.key === 'actions' ? (canDownload ? (
                            <Button type="button" size="sm" variant="outline" aria-label={`Descarcă fișa pentru ${inventar.inverter || 'invertor'}, ${formatData(inventar.data)}`} onClick={() => handleDownloadFișă(inventar.id, inventar.inverter)}>
                              Descarcă fișă
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button type="button" size="sm" variant="outline" disabled={deletingId !== null} onClick={() => handleEdit(inventar)} aria-label={`Editează checklist-ul pentru ${inventar.inverter}, ${formatData(inventar.data)}`}>
                                Editează
                              </Button>
                              <Button type="button" size="sm" variant="neutral" className="text-danger" disabled={deletingId !== null} onClick={() => handleDelete(inventar)} aria-label={`Șterge checklist-ul pentru ${inventar.inverter}, ${formatData(inventar.data)}`}>
                                {deletingId === inventar.id ? 'Se șterge...' : 'Șterge'}
                              </Button>
                            </div>
                          )) : column.boolean ? (
                            <ChecklistResult value={inventar[column.key]} />
                          ) : column.key === 'images'?(!Array.isArray(inventar.images) || inventar.images.length === 0 ?'-':(
                            <button className="text-sky-400 cursor-pointer underline underline-offset-2 hover:text-sky-500" onClick={() => handleOpenPhotos(inventar)}>
                              Vezi imagini
                            </button>
                          )):
                          (
                            <span className={column.key === 'remarks' ? 'whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]' : 'min-w-0 break-words tabular-nums [overflow-wrap:anywhere]'}>
                              {column.key === 'data' ? formatData(inventar.data) : column.key !== 'images'? (inventar[column.key] || '—') : 'Imagini'}
                            </span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {!isLoading && !error && rows.length === 0 && (
                <div role="row">
                  <div role="cell" aria-colspan={COLUMNS.length} className="px-5 py-9 text-body-sm text-ink-400">
                    <p role="status" className="sticky left-5 m-0 w-fit max-w-[75vw]">Nu există inventare care corespund filtrelor selectate.</p>
                  </div>
                </div>
              )}

            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-meta text-ink-400">
            <span role="status">{`${rows.length} din ${inventare.length} checklist-uri`}</span>
            <span>Derulează orizontal pentru toate verificările.</span>
          </div>
        </Card>
      </main>
    </PageTransition>
  )
}
