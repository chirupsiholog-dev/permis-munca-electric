import { motion } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { Check, X, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'

import PageTransition from '../components/layout/PageTransition.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'

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
  observations: string
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

interface OutletContext {
  profile?: { prenume?: string }
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
  placeholder?: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

function Field({ label, placeholder, value, onChange }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-body-sm text-ink-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
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

export default function InventarePage() {
  const { profile } = useOutletContext<OutletContext>()

  const [meta, setMeta] = useState<MetaState>({ data: '', invertor: '', startTime: '', endTime: '' })
  const [rows, setRows] = useState<ChecklistRow[]>(
    OPERATIONS.map((text, i) => ({ id: i + 1, text, result: null, observations: '' })),
  )
  const [remarks, setRemarks] = useState<string>('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateMeta = (field: keyof MetaState) => (e: ChangeEvent<HTMLInputElement>) =>
    setMeta((m) => ({ ...m, [field]: e.target.value }))

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
    setImages((imgs) => [...imgs, ...next])
  }

  const removeImage = (id: string) =>
    setImages((imgs) => {
      const target = imgs.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return imgs.filter((i) => i.id !== id)
    })

  const answeredCount = rows.filter((r) => r.result).length

  const emptyRows = () => OPERATIONS.map((text, i) => ({
    id: i + 1,
    text,
    result: null,
    observations: '',
  }))

  const clearForm = () => {
    setMeta({ data: '', invertor: '', startTime: '', endTime: ''})
    setRows(emptyRows())
    setRemarks('')

    setImages((currentImages) => {
      currentImages.forEach((image) => URL.revokeObjectURL(image.url))
      return []
    })
  
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const jwt = localStorage.getItem('token')

    const form = new FormData()
    form.append('meta', JSON.stringify(meta))
    form.append('rows', JSON.stringify(rows))
    form.append('remarks', remarks)
    images.forEach((img) => form.append('images', img.file, img.name))

    let payload = {
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
      remarks,
      inverter: meta.invertor,
      data: meta.data,
      oraInceput: meta.startTime,
      oraSfarsit: meta.endTime,
    }

    try {
      const res = await fetch('/api/inventar/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${jwt}` },
          body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSubmitted(true)
        clearForm()
      }
    } catch {
      return
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-[26px] px-7 pb-16 pt-11">
        <PageHeading
          title="Checklist invertoare — 6 luni"
          subtitle={`Completează verificarea semestrială${profile?.prenume ? `, ${profile.prenume}` : ''} și trimite-o spre semnare.`}
        />

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
          <Card className="px-7 py-6">
            <SectionLabel n={1} title="Informații generale" />
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field label="Data" placeholder="ex. 14.09.2026" value={meta.data} onChange={updateMeta('data')} />
              <Field label="Invertor" placeholder="ex. SG110CX-#3" value={meta.invertor} onChange={updateMeta('invertor')} />
              <Field label="Ora de început" placeholder="ex. 09:00" value={meta.startTime} onChange={updateMeta('startTime')} />
              <Field label="Ora de sfârșit" placeholder="ex. 11:30" value={meta.endTime} onChange={updateMeta('endTime')} />
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
                    <input
                      type="text"
                      value={row.observations}
                      onChange={(e) => updateRow(row.id, { observations: e.target.value })}
                      placeholder="Observații (opțional)"
                      className="mt-2 w-full border border-line bg-surface-alt px-2.5 py-1.5 text-body-sm text-ink-800 outline-none transition-colors placeholder:text-ink-200 focus:border-brand focus:bg-white"
                    />
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

        <Button type="button" onClick={handleSubmit} size="lg" fullWidth disabled={submitting}>
          {submitted ? 'Trimis ✓' : submitting ? 'Se trimite...' : 'Trimite spre semnare'}
        </Button>
      </main>
    </PageTransition>
  )
}