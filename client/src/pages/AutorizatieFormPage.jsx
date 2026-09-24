import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ImagePlus, ArrowLeft, ArrowRight, FileText, Trash2 } from 'lucide-react'
import PageTransition from '../components/layout/PageTransition.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import TextField, { inputClasses } from '../components/ui/TextField.jsx'
import Textarea from '../components/ui/Textarea.jsx'
import Checkbox from '../components/ui/Checkbox.jsx'
import Button from '../components/ui/Button.jsx'
import Alert from '../components/ui/Alert.jsx'
import { emptyRow, initialValues, projectDraft, repeatGroups, sections, splitLines } from '../features/autorizatie/formModel.js'

function FormField({ field: f, value, onChange, prefix = 'authorization' }) {
  const id = `${prefix}-${f.key}`
  if (f.type === 'checkbox') return <Checkbox label={f.label} checked={value} onChange={() => onChange(!value)} />
  if (f.type === 'select') return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-label font-bold text-ink-800">{f.label}</label>
      <select id={id} className={inputClasses} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Nespecificat</option>
        {f.options.map(option => <option key={option}>{option}</option>)}
      </select>
    </div>
  )
  if (f.type === 'lines') {
    const preview = splitLines(value, f.capacity)
    const tooLong = preview.length > f.targets.length
    return (
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label htmlFor={id} className="text-label font-bold text-ink-800">{f.label}</label>
        <Textarea id={id} rows={f.targets.length} value={value} onChange={e => onChange(e.target.value)} aria-describedby={`${id}-hint`} aria-invalid={tooLong} />
        <p id={`${id}-hint`} className={`m-0 text-body-sm ${tooLong ? 'text-red-700' : 'text-ink-500'}`}>
          {tooLong ? `Textul ocupă ${preview.length} rânduri. Scurtează-l pentru cele ${f.targets.length} rânduri disponibile.` : `Textul se distribuie automat pe ${f.targets.length} rânduri în document.`}
        </p>
        {value && <div aria-label="Distribuirea textului pe rânduri" className="border-l-2 border-line pl-3 text-body-sm text-ink-500">
          {preview.map((line, i) => <div key={i} className="break-words">{i + 1}. {line || '—'}</div>)}
        </div>}
      </div>
    )
  }
  return <TextField id={id} label={f.label} type={f.type} value={value} min={f.type === 'number' ? 1 : undefined} step={f.type === 'number' ? 1 : undefined} onChange={e => onChange(e.target.value)} />
}

function RepeatingSection({ name, index, rows, onChange }) {
  const group = repeatGroups[name]
  return <SectionCard index={index} title={group.title}>
    <p className="m-0 text-body-sm text-ink-500">{rows.length} / {group.max} rânduri · Adaugă doar persoanele sau înregistrările necesare.</p>
    {rows.map((row, i) => <fieldset key={i} className="min-w-0 border border-line p-4">
      <legend className="px-2 text-label font-bold">{group.singular} {i + 1}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {group.fields.map(f => <FormField key={f.key} field={f} value={row[f.key]} prefix={`${name}-${i}`} onChange={value => onChange(rows.map((r, j) => j === i ? { ...r, [f.key]: value } : r))} />)}
      </div>
      <Button variant="neutral" size="sm" className="mt-4" aria-label={`Elimină ${group.singular.toLowerCase()} ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => i !== j))}><Trash2 size={14} /> Elimină</Button>
    </fieldset>)}
    {rows.length < group.max && <Button className="self-start" variant="outline" size="sm" onClick={() => onChange([...rows, emptyRow(name)])}>+ Adaugă {group.singular.toLowerCase()}</Button>}
  </SectionCard>
}

export default function AutorizatieFormPage() {
  const { profile } = useOutletContext()
  const [step, setStep] = useState(1)
  const [values, setValues] = useState(initialValues)
  const [photo, setPhoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [dragging, setDragging] = useState(false)
  const photoInput = useRef(null)
  const heading = useRef(null)
  const draft = projectDraft(values, profile.username)
  const setValue = (key, value) => setValues(previous => ({ ...previous, [key]: value }))

  useEffect(() => {
    if (!photo) { setPreviewUrl(''); return }
    const url = URL.createObjectURL(photo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])
  useEffect(() => { heading.current?.focus() }, [step])

  // Local selection only. The integration will create the image PDF before
  // unlocking step 2; this prototype never invents a storage path or success.
  function selectPhoto(files) {
    if (files.length !== 1) { setPhotoError('Selectează o singură imagine.'); return }
    const file = files[0]
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setPhotoError('Alege o imagine JPG sau PNG.'); return }
    if (!file.size || file.size > 10 * 1024 * 1024) { setPhotoError('Imaginea trebuie să aibă cel mult 10 MB și să nu fie goală.'); return }
    setPhoto(file)
    setPhotoError('')
  }

  const renderSection = (section, index) => <SectionCard key={section.title} index={index} title={section.title}>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {section.fields.map(f => <FormField key={f.key} field={f} value={values[f.key]} onChange={value => setValue(f.key, value)} />)}
    </div>
  </SectionCard>

  return <PageTransition>
    <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-[18px] px-4 pb-32 pt-10 sm:px-7">
      <div tabIndex={-1} ref={heading} className="outline-none"><PageHeading title="Autorizație de lucru" subtitle="Adaugă imaginea instalației, apoi completează datele autorizației." /></div>
      <ol aria-label="Pașii autorizației" className="m-0 grid list-none grid-cols-2 gap-3 p-0">
        {['Imaginea instalației', 'Datele autorizației'].map((label, i) => <li key={label} aria-current={step === i + 1 ? 'step' : undefined} className={`flex items-center gap-3 border p-4 text-body-sm font-bold ${step === i + 1 ? 'border-brand bg-surface text-brand' : 'border-line text-ink-500'}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-current">{i + 1}</span>{label}
        </li>)}
      </ol>
      <Alert tone="info">Previzualizare formular · Imaginea și datele rămân în această pagină. Crearea PDF-ului și trimiterea autorizației nu sunt încă disponibile.</Alert>
      {step === 1 ? <SectionCard index={1} title="Imaginea instalației">
        <p className="m-0 text-body-sm text-ink-500">O singură imagine JPG sau PNG, maximum 10 MB. Aceasta va fi inclusă în autorizație înainte de completarea datelor.</p>
        <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); selectPhoto(e.dataTransfer.files) }} className={`flex flex-col items-center gap-4 border-2 border-dashed p-6 text-center ${dragging ? 'border-brand bg-info-bg' : 'border-line-strong bg-field'}`}>
          {previewUrl ? <img src={previewUrl} alt="Imaginea selectată pentru autorizație" className="max-h-80 max-w-full object-contain" onError={() => { setPhoto(null); setPhotoError('Imaginea nu poate fi deschisă. Alege un alt fișier JPG sau PNG.') }} /> : <ImagePlus size={36} className="text-ink-500" />}
          {photo ? <p className="m-0 max-w-full break-all text-body-sm">{photo.name} · {(photo.size / 1024 / 1024).toFixed(2)} MB</p> : <p className="m-0 text-body-sm">Trage imaginea aici sau alege un fișier.</p>}
          <input ref={photoInput} type="file" accept="image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-label="Imaginea instalației" onChange={e => { if (e.target.files.length) selectPhoto(e.target.files); e.target.value = '' }} />
          <Button variant="outline" onClick={() => photoInput.current?.click()}>{photo ? 'Înlocuiește imaginea' : 'Alege imaginea'}</Button>
          {photo && <Button variant="neutral" size="sm" onClick={() => { setPhoto(null); setPhotoError('') }}>Elimină imaginea</Button>}
        </div>
        {photoError && <div role="alert"><Alert tone="warn">{photoError}</Alert></div>}
        <div className="flex items-start gap-3 border border-line p-4 text-body-sm text-ink-500"><FileText size={20} className="shrink-0" /><span>PDF cu imagine: {photo ? 'imagine selectată local; documentul nu a fost creat.' : 'alege mai întâi imaginea instalației.'}</span></div>
        <Button disabled={!photo || !!photoError} className="self-end" onClick={() => setStep(2)}>Continuă la formular <ArrowRight size={16} /></Button>
      </SectionCard> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface p-4">
          <span className="min-w-0 break-all text-body-sm">Imagine: {photo?.name}</span>
          <Button variant="neutral" size="sm" onClick={() => setStep(1)}><ArrowLeft size={14} /> Schimbă imaginea</Button>
        </div>
        {renderSection(sections[0], 1)}
        <SectionCard index={2} title="Personal responsabil">
          <TextField label="Emitent" value={profile.username ?? ''} readOnly />
          <p className="m-0 text-body-sm text-ink-500">Emitentul este utilizatorul autentificat. Numele șefului de lucrare și al admitentului se completează o singură dată și se reutilizează în toate capitolele.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Șef de lucrare — nume și prenume" value={values.sefName} onChange={e => setValue('sefName', e.target.value)} />
            <TextField label="Email șef de lucrare" type="email" value={values.sefEmail} onChange={e => setValue('sefEmail', e.target.value)} />
            <TextField label="Admitent — nume și prenume" value={values.admitentName} onChange={e => setValue('admitentName', e.target.value)} />
            <TextField label="Email admitent" type="email" value={values.admitentEmail} onChange={e => setValue('admitentEmail', e.target.value)} />
          </div>
        </SectionCard>
        <RepeatingSection name="executanti" index={3} rows={values.executanti} onChange={rows => setValue('executanti', rows)} />
        {renderSection(sections[1], 4)}
        {renderSection(sections[2], 5)}
        {renderSection(sections[3], 6)}
        <RepeatingSection name="zone" index={7} rows={values.zone} onChange={rows => setValue('zone', rows)} />
        <RepeatingSection name="modificari" index={8} rows={values.modificari} onChange={rows => setValue('modificari', rows)} />
        <RepeatingSection name="intreruperi" index={9} rows={values.intreruperi} onChange={rows => setValue('intreruperi', rows)} />
        {renderSection(sections[4], 10)}
        {draft.overflow.length > 0 && <div role="status"><Alert tone="warn">Scurtează textele marcate pentru a încăpea în rândurile documentului. Datele introduse sunt păstrate integral în formular.</Alert></div>}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <Button variant="neutral" onClick={() => setStep(1)}><ArrowLeft size={16} /> Înapoi la imagine</Button>
          <div className="flex flex-col gap-2"><Button disabled>Creează autorizația</Button><span className="text-body-sm text-ink-500">Trimiterea nu este încă disponibilă.</span></div>
        </div>
      </>}
    </main>
  </PageTransition>
}
