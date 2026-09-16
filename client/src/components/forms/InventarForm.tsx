import { motion } from 'framer-motion'
import { Check, X, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import PageHeading from '../ui/PageHeading.jsx'

const OPERATIONS: string[] = [
  'Verificați dacă există praf pe orificiile de admisie și evacuare ale aerului. Dacă este necesar, îndepărtați deflectorul de la orificiul de admisie al aerului.',
  'Verificați dacă ventilatoarele produc sunete anormale în timpul funcționării.',
  'Invertorul nu este deteriorat sau deformat.',
  'Invertorul funcționează fără sunete anormale.',
  'Atunci când invertorul funcționează, verificați dacă toți parametrii invertorului sunt setați corect.',
  'Cablurile sunt conectate în siguranță.',
  'Cablurile sunt intacte și, în special, părțile care ating suprafața metalică nu sunt zgâriate.',
  'Verificați dacă capacele de etanșare ale terminalelor de intrare de curent continuu inactive cad.',
  'Verificați dacă porturile COM și USB inactive sunt blocate cu capace impermeabile.',
  'Cablurile de împământare sunt conectate în siguranță.',
  'Opriți și porniți comutatorul de curent continuu pentru a curăța oxidul de pe contactul comutatorului.',
  'Verificare și strângere șuruburi, dacă este cazul, cu cheia dinamometrică.',
]

type ResultValue = 'check' | 'cross' | null

interface ChecklistRow {
  id: number
  text: string
  result: ResultValue
}

interface MetaState {
  data: string
  invertor: string
  startTime: string
  endTime: string
}

interface UploadedImage {
  id: string
  url: string
  file: File
  name: string
}

const RESULT_FIELDS = [
  'praf', 'ventilatoare', 'inventor_deteriorat', 'inventor_sunete',
  'parametrii_corecti', 'cabluri_conectate', 'cabluri_intacte', 'capace_etansare',
  'porturi', 'impamantare', 'comutator_curent', 'suruburi',
] as const

export type InventarRecord = Partial<Record<typeof RESULT_FIELDS[number], boolean | null>> & {
  id: string | number
  data?: string
  inverter?: string
  turn_on?: string
  turn_off?: string
  remarks?: string
}

const dateForInput = (value = '') => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  const local = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(value)
  return local ? `${local[1].padStart(2, '0')}/${local[2].padStart(2, '0')}/${local[3]}` : value
}

export interface InventarFormProps {
  initialData?: InventarRecord | null
  title?: string
  subtitle?: string
  submitLabel?: string
  onSuccess?: () => void
  className?: string
}

interface SectionLabelProps {
  n: number
  title: string
}

function SectionLabel({ n, title }: SectionLabelProps) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink text-body-sm font-medium text-white">
        {n}
      </span>
      <h2 className="m-0 text-body-sm font-medium uppercase tracking-wide text-ink-800">
        {title}
      </h2>
    </div>
  )
}

interface FieldProps {
  label: string
  placeholder?: string,
  type?: 'text' | 'time',
  inputMode?: 'text' | 'numeric'
  maxLength?: number
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

function Field({ label, placeholder, type, inputMode, maxLength, value, onChange }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-body-sm text-ink-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full border border-line bg-surface px-3 py-2.5 text-body-sm text-ink-800 outline-none transition-colors placeholder:text-ink-200 focus:border-brand focus:bg-white"
      />
    </div>
  )
}

interface ResultToggleProps {
  value: ResultValue
  onChange: (value: ResultValue) => void
}

function ResultToggle({ value, onChange }: ResultToggleProps) {
  return (
    <div className="flex overflow-hidden border border-line">
      <button
        type="button"
        onClick={() => onChange(value === 'check' ? null : 'check')}
        aria-pressed={value === 'check'}
        title="Conform"
        className={`flex h-9 w-11 items-center justify-center border-r border-line transition-colors ${
          value === 'check' ? 'bg-brand text-white' : 'bg-surface text-ink-200 hover:bg-surface-alt'
        }`}
      >
        <Check size={17} strokeWidth={2.75} />
      </button>
      <button
        type="button"
        onClick={() => onChange(value === 'cross' ? null : 'cross')}
        aria-pressed={value === 'cross'}
        title="Neconform"
        className={`flex h-9 w-11 items-center justify-center transition-colors ${
          value === 'cross' ? 'bg-warn text-white' : 'bg-surface text-ink-200 hover:bg-surface-alt'
        }`}
      >
        <X size={17} strokeWidth={2.75} />
      </button>
    </div>
  )
}

// Match the date input used by DailyReportForm.
const maskDate = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const parseDataToIso = (date: string) => {
  const [day, month, year] = date.split('/')
  return `${year}-${month}-${day}`
}

export default function InventarForm({
  title = 'Checklist invertoare - 6 luni',
  subtitle = 'Completează verificarea semestrială și trimite-o spre semnare.',
  submitLabel = 'Trimite spre semnare',
  onSuccess,
  initialData = null,
  className = '',
}: InventarFormProps = {}) {
  const [meta, setMeta] = useState<MetaState>(() => ({
    data: dateForInput(initialData?.data),
    invertor: initialData?.inverter ?? '',
    startTime: initialData?.turn_on ?? '',
    endTime: initialData?.turn_off ?? '',
  }))
  const [rows, setRows] = useState<ChecklistRow[]>(
    () => OPERATIONS.map((text, i) => ({
      id: i + 1,
      text,
      result: initialData?.[RESULT_FIELDS[i]] === true ? 'check'
        : initialData?.[RESULT_FIELDS[i]] === false ? 'cross' : null,
    })),
  )
  const [remarks, setRemarks] = useState<string>(initialData?.remarks ?? '')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageUrls = useRef(new Set<string>())

  useEffect(() => {
    const urls = imageUrls.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const updateMeta = (field: keyof MetaState) => (e: ChangeEvent<HTMLInputElement>) =>
    setMeta((m) => ({ ...m, [field]: e.target.value }))

  const handleDataChange = (event: ChangeEvent<HTMLInputElement>) => {
    const data = maskDate(event.target.value)
    setMeta((current) => ({ ...current, data }))
  }

  const updateRow = (id: number, patch: Partial<ChecklistRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const handleFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'))
    const next: UploadedImage[] = files.map((f) => ({
      id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(f),
      file: f,
      name: f.name,
    }))
    next.forEach((image) => imageUrls.current.add(image.url))
    setImages((imgs) => [...imgs, ...next])
  }

  const removeImage = (id: string) => {
    const target = images.find((image) => image.id === id)
    if (target) {
      URL.revokeObjectURL(target.url)
      imageUrls.current.delete(target.url)
    }
    setImages((imgs) => imgs.filter((image) => image.id !== id))
  }

  const answeredCount = rows.filter((r) => r.result).length

  const emptyRows = () => OPERATIONS.map((text, i) => ({
    id: i + 1,
    text,
    result: null,
  }))

  const clearForm = () => {
    setMeta({ data: '', invertor: '', startTime: '', endTime: ''})
    setRows(emptyRows())
    setRemarks('')

    imageUrls.current.forEach((url) => URL.revokeObjectURL(url))
    imageUrls.current.clear()
    setImages([])

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(meta.data)) {
      setSubmitted(false)
      setSubmitError('Data trebuie în format zz/ll/aaaa.')
      return
    }
    if (!meta.invertor.trim() || !meta.startTime.trim() || !meta.endTime.trim()) {
      setSubmitted(false)
      setSubmitError('Completați toate câmpurile din informațiile generale.')
      return
    }
    if (rows.some((row) => row.result === null)) {
      setSubmitted(false)
      setSubmitError('Completați toate operațiile de verificare.')
      return
    }
    setSubmitting(true)
    setSubmitted(false)
    setSubmitError(null)
    const jwt = localStorage.getItem('token')

    const payload = {
      praf: rows[0].result === 'check',
      ventilatoare: rows[1].result === 'check',
      inventorDeteriorat: rows[2].result === 'check',
      inventorSunete: rows[3].result === 'check',
      parametriiCorecti: rows[4].result === 'check',
      cabluriConectate: rows[5].result === 'check',
      cabluriIntacte: rows[6].result === 'check',
      capaceEtansare: rows[7].result === 'check',
      porturi: rows[8].result === 'check',
      impamantare: rows[9].result === 'check',
      comutatorCurent: rows[10].result === 'check',
      suruburi: rows[11].result === 'check',
      remarks: remarks,
      inverter: meta.invertor,
      data: parseDataToIso(meta.data),
      turnon: meta.startTime,
      turnoff: meta.endTime,
    }

    try {
      const endpoint = initialData
        ? `/api/inventar/${encodeURIComponent(initialData.id)}`
        : '/api/inventar/'
      const res = await fetch(endpoint, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let errorMessage = `A apărut o eroare la trimiterea checklistului (${res.status}).`
        const contentType = res.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          const errorBody = await res.json() as { error?: string; message?: string }
          errorMessage = errorBody.error ?? errorBody.message ?? errorMessage
        }
        throw new Error(errorMessage)
      }
      setSubmitted(true)
      clearForm()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Checklistul nu a putut fi trimis.')
      return
    } finally {
      setSubmitting(false)
    }
    onSuccess?.()
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={title}
      aria-busy={submitting}
      className={`flex w-full flex-col gap-[26px] bg-white p-4 sm:p-7 ${className}`}
    >
      <PageHeading title={title} subtitle={subtitle} />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
        <Card className="px-7 py-6">
          <SectionLabel n={1} title="Informații generale" />
          <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
            <Field label="Data" placeholder="zz/ll/aaaa" inputMode="numeric" maxLength={10} value={meta.data} onChange={handleDataChange} />
            <Field label="Invertor" placeholder="ex. SG110CX-#3" value={meta.invertor} onChange={updateMeta('invertor')} />
            <Field label="Ora de început" placeholder="ex. 09:00" type="time" maxLength={10} value={meta.startTime} onChange={updateMeta('startTime')} />
            <Field label="Ora de sfârșit" placeholder="ex. 11:30" type="time" maxLength={10} value={meta.endTime} onChange={updateMeta('endTime')} />
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.05, ease: 'easeOut' }}>
        <Card className="px-7 py-6">
          <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink text-body-sm font-medium text-white">
                2
              </span>
              <h2 className="m-0 text-body-sm font-medium uppercase tracking-wide text-ink-800">
                Operații de verificare
              </h2>
            </div>
            <span className="text-body-sm text-ink-500">
              {answeredCount}/{rows.length} completate
            </span>
          </div>

          <div className="divide-y divide-line">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[28px_1fr] items-start gap-4 py-4 sm:grid-cols-[36px_1fr_92px] sm:items-center">
                <span className="pt-0.5 text-body-sm font-medium text-ink-200 sm:pt-0">{row.id}</span>
                <div>
                  <p className="m-0 text-body-sm leading-snug text-ink-800">{row.text}</p>

                  <div className="mt-2 sm:hidden">
                    <ResultToggle value={row.result} onChange={(v) => updateRow(row.id, { result: v })} />
                  </div>
                </div>
                <div className="hidden sm:flex sm:justify-start">
                  <ResultToggle value={row.result} onChange={(v) => updateRow(row.id, { result: v })} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.1, ease: 'easeOut' }}>
        <Card className="px-7 py-6">
          <SectionLabel n={3} title="Observații generale" />
          <label className="mb-1.5 block text-body-sm text-ink-500">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Notați aici orice observații suplimentare privind starea invertorului..."
            rows={5}
            className="w-full resize-y border border-line bg-surface px-3 py-2.5 text-body-sm leading-relaxed text-ink-800 outline-none transition-colors placeholder:text-ink-200 focus:border-brand focus:bg-white"
          />
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.15, ease: 'easeOut' }}>
        <Card className="px-7 py-6">
          <SectionLabel n={4} title="Fotografii" />

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-line bg-surface-alt px-6 py-8 text-center transition-colors hover:border-brand hover:bg-surface"
          >
            <Upload size={22} className="text-ink-500" strokeWidth={1.75} />
            <p className="m-0 text-body-sm font-medium text-ink-800">
              Trage imagini aici sau apasă pentru a încărca
            </p>
            <p className="m-0 text-body-sm text-ink-200">PNG, JPG — mai multe fișiere acceptate</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {images.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img) => (
                <div key={img.id} className="group relative overflow-hidden border border-line bg-surface-alt">
                  <img src={img.url} alt={img.name} className="h-28 w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(img.id)
                    }}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center bg-ink/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="Elimină"
                  >
                    <Trash2 size={13} />
                  </button>
                  <p className="m-0 truncate border-t border-line bg-white px-2 py-1 text-body-sm text-ink-500">
                    {img.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-body-sm text-ink-200">
              <ImageIcon size={14} />
              <span>Nicio imagine încărcată încă</span>
            </div>
          )}
        </Card>
      </motion.div>

      {submitError && <p role="alert" className="m-0 text-body-sm text-warn">{submitError}</p>}
      {submitted && <p role="status" className="m-0 text-body-sm text-brand">{initialData ? 'Checklist modificat cu succes.' : 'Checklist trimis cu succes.'}</p>}
      <Button type="submit" size="lg" fullWidth disabled={submitting}>
        {submitting ? 'Se trimite...' : submitLabel}
      </Button>
    </form>
  )
}
