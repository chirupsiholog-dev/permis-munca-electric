import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import PageTransition from '../components/layout/PageTransition.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import CheckboxGrid from '../components/ui/CheckboxGrid.jsx'
import Checkbox from '../components/ui/Checkbox.jsx'
import FieldLabel from '../components/ui/FieldLabel.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import SectionCard from '../components/ui/SectionCard.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import TextField from '../components/ui/TextField.jsx'
import Textarea from '../components/ui/Textarea.jsx'
import ExecutantRow from '../features/permit/ExecutantRow.jsx'
import SubmitBar from '../features/permit/SubmitBar.jsx'
import { usePermitForm } from '../features/permit/usePermitForm.js'
import {
  CONFIRMARI,
  EIP,
  EIP_ALTE,
  INCHIDERE,
  MASURI,
  MASURI_ALTE,
  RISCURI,
  RISC_ALTE,
  TIPURI_LUCRARE,
} from '../lib/constants.js'
import {toRomanianDate, stripDiacritics} from '../lib/text.js'

/** Collapsible "Alte ..." free-text input that appears when its box is ticked. */
function RevealInput({ show, ...props }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <TextField {...props} wrapperClassName="pt-px" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function PermitFormPage() {
  const {
    values,
    setField,
    setValue,
    toggleIn,
    setExecutant,
    addExecutant,
    removeExecutant,
    completeness,
    valabilitate,
    canAddExecutant,
  } = usePermitForm()

  const [toast, setToast] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const timer = useRef(null)

  const inFlight = useRef(false)

  useEffect(() => () => clearTimeout(timer.current), [])

  function flash(message) {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }

  async function handleSubmit() {

    if (inFlight.current || sent) return

    if (!completeness.isComplete) {
      flash('Completează toate secțiunile obligatorii înainte de trimitere.')
      return
    }

    let payload = {};
    payload.emailSefLucrare = values.sefEmail;

    payload.numeSefLucrare = stripDiacritics(values.sefNume);
    payload.prenumeSefLucrare = stripDiacritics(values.sefPrenume);
    payload.link_expiration_date = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
    payload.pdfData = {
      data: toRomanianDate(values.data),
      locatia: stripDiacritics(values.locatie),
      instalatia: stripDiacritics(values.instalatie),
      tipLucrare: stripDiacritics(values.tip),
      tip_lucrare_altul_text: values.tip.includes('altul')?stripDiacritics(values.tipAltulText):'',
      descriere_lucrare: stripDiacritics(values.descriere),
      executanti: values.executanti.map(e => stripDiacritics(e)).filter(Boolean).slice(0, 3),
      riscuri: values.riscuri,
      risc_alte_text: values.riscuri.includes('alte')?stripDiacritics(values.riscAlteText):'',
      masuri: values.masuri,
      echipamente: values.echipamente,
      eip_alte_text: values.echipamente.includes('alte')?stripDiacritics(values.eipAlteText):'',
      confirmari: values.confirmari,
      ora_inceput: values.oraStart,
      ora_sfarsit: values.oraEnd,
      observatii: stripDiacritics(values.observatii),
      inchidere_permis: values.inchidere,
      inchidere_data_an: toRomanianDate(values.inchidereData),
      inchidere_ora: values.inchidereOra
    };

    const jwt = localStorage.getItem('token');

    inFlight.current = true
    setSubmitting(true)

    try{
      const res = await fetch(`/api/documents/new`,
      {method: 'POST', body: JSON.stringify(payload), headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'Application/json'
      }})

      const data = await res.json();
      if(data.success){
        setSent(true)
        flash(`Permis trimis spre semnare către ${values.sefEmail}.`)
      }
      else
        flash(data.error)

    }catch(error){
      flash('Something failed');
    }finally{
      inFlight.current = false
      setSubmitting(false)
    }

  }

  const tipOptions = TIPURI_LUCRARE.map((t) => ({ value: t.slug, label: t.label }))

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-[18px] px-7 pb-[120px] pt-10">
        <PageHeading
          title="Permis de lucru în instalații electrice"
          subtitle="Completează datele care vor fi înscrise în permis (PV)."
        />

        {/* 1 ─ Date generale ------------------------------------------------ */}
        <SectionCard index={1} title="Date generale">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="f-data"
              label="Data lucrării"
              type="date"
              value={values.data}
              onChange={setField('data')}
            />
            <TextField
              id="f-loc"
              label="Locația"
              type="text"
              placeholder="ex. Mereni"
              value={values.locatie}
              onChange={setField('locatie')}
            />
          </div>

          <TextField
            id="f-inst"
            label="Instalația / echipamentul"
            type="text"
            placeholder="ex. Celule MT — PC Mereni"
            value={values.instalatie}
            onChange={setField('instalatie')}
          />

          <div className="flex flex-col gap-[9px]">
            <FieldLabel>Tip lucrare</FieldLabel>
            <SegmentedControl
              label="Tip lucrare"
              size="lg"
              options={tipOptions}
              value={values.tip}
              onChange={(v) => setValue('tip', v)}
            />
            <RevealInput
              show={values.tip === 'altul'}
              type="text"
              placeholder="Descrie tipul lucrării"
              aria-label="Descrie tipul lucrării"
              value={values.tipAltulText}
              onChange={setField('tipAltulText')}
            />
          </div>
        </SectionCard>

        {/* 2 ─ Descriere ---------------------------------------------------- */}
        <SectionCard index={2} title="Descrierea lucrării">
          <Textarea
            rows={4}
            aria-label="Descrierea lucrării"
            placeholder="ex. Manevre pe celule de medie tensiune din PC, deconectare și reconectare celulă"
            value={values.descriere}
            onChange={setField('descriere')}
          />
        </SectionCard>

        {/* 3 ─ Personal ----------------------------------------------------- */}
        <SectionCard index={3} title="Personal implicat">
          {/* Three fields, not one: the backend needs the email to send the
              signing link, and nume/prenume separately for the stored filename. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="f-sef-nume"
              label="Șef de lucrare — nume"
              type="text"
              placeholder="ex. Ducica"
              value={values.sefNume}
              onChange={setField('sefNume')}
            />
            <TextField
              id="f-sef-prenume"
              label="Șef de lucrare — prenume"
              type="text"
              placeholder="ex. Ștefan"
              value={values.sefPrenume}
              onChange={setField('sefPrenume')}
            />
          </div>

          <TextField
            id="f-sef-email"
            label="Email șef de lucrare"
            type="email"
            placeholder="nume@companie.ro"
            value={values.sefEmail}
            onChange={setField('sefEmail')}
          />

          <div className="flex flex-col gap-[9px]">
            <FieldLabel>Executanți</FieldLabel>

            <AnimatePresence initial={false}>
              {values.executanti.map((value, index) => (
                <ExecutantRow
                  key={index}
                  index={index}
                  value={value}
                  onChange={setExecutant}
                  onRemove={removeExecutant}
                />
              ))}
            </AnimatePresence>

            {canAddExecutant && (
              <Button variant="outline" size="sm" onClick={addExecutant} className="self-start">
                + Adaugă executant
              </Button>
            )}
          </div>
        </SectionCard>

        {/* 4 ─ Riscuri ------------------------------------------------------ */}
        <SectionCard index={4} title="Identificarea riscurilor">
          <CheckboxGrid items={RISCURI} selected={values.riscuri} onToggle={toggleIn('riscuri')} />

          <div className="flex flex-col gap-[11px]">
            {/* "Alte" is just another slug in the same array. */}
            <Checkbox
              label="Alte riscuri"
              checked={values.riscuri.includes(RISC_ALTE)}
              onChange={() => toggleIn('riscuri')(RISC_ALTE)}
            />
            <RevealInput
              show={values.riscuri.includes(RISC_ALTE)}
              type="text"
              placeholder="Descrie riscurile suplimentare"
              aria-label="Alte riscuri"
              value={values.riscAlteText}
              onChange={setField('riscAlteText')}
            />
          </div>
        </SectionCard>

        {/* 5 ─ Măsuri ------------------------------------------------------- */}
        <SectionCard index={5} title="Măsuri de securitate aplicate">
          <CheckboxGrid items={MASURI} selected={values.masuri} onToggle={toggleIn('masuri')} />
          <Checkbox
            label="Alte măsuri: se va respecta foaia de manevră"
            checked={values.masuri.includes(MASURI_ALTE)}
            onChange={() => toggleIn('masuri')(MASURI_ALTE)}
          />
        </SectionCard>

        {/* 6 ─ EIP ---------------------------------------------------------- */}
        <SectionCard index={6} title="Echipament individual de protecție">
          <CheckboxGrid items={EIP} selected={values.echipamente} onToggle={toggleIn('echipamente')} />

          <div className="flex flex-col gap-[11px]">
            <Checkbox
              label="Alte EIP"
              checked={values.echipamente.includes(EIP_ALTE)}
              onChange={() => toggleIn('echipamente')(EIP_ALTE)}
            />
            <RevealInput
              show={values.echipamente.includes(EIP_ALTE)}
              type="text"
              placeholder="Descrie echipamentul suplimentar"
              aria-label="Alte EIP"
              value={values.eipAlteText}
              onChange={setField('eipAlteText')}
            />
          </div>
        </SectionCard>

        {/* 7 ─ Confirmări --------------------------------------------------- */}
        <SectionCard index={7} title="Confirmări înainte de începerea lucrării">
          <CheckboxGrid
            items={CONFIRMARI}
            selected={values.confirmari}
            onToggle={toggleIn('confirmari')}
            columns={1}
          />
        </SectionCard>

        {/* 8 ─ Valabilitate ------------------------------------------------- */}
        <SectionCard index={8} title="Interval de valabilitate">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="f-start"
              label="Ora început"
              type="time"
              value={values.oraStart}
              onChange={setField('oraStart')}
            />
            <TextField
              id="f-end"
              label="Ora sfârșit"
              type="time"
              value={values.oraEnd}
              onChange={setField('oraEnd')}
            />
          </div>
          <Alert tone="info">{valabilitate}</Alert>
        </SectionCard>

        {/* 9 ─ Observații --------------------------------------------------- */}
        <SectionCard index={9} title="Observații">
          <Textarea
            rows={3}
            aria-label="Observații"
            placeholder="Opțional"
            value={values.observatii}
            onChange={setField('observatii')}
          />
        </SectionCard>

        {/* 10 ─ Închidere ---------------------------------------------------- */}
        <SectionCard index={10} title="Închiderea permisului">
          <Alert tone="warn">
            Aceste câmpuri se completează o singură dată, la emiterea permisului. Documentul PDF
            este blocat imediat după generare, deci ce nu este bifat aici rămâne necompletat
            definitiv.
          </Alert>

          <CheckboxGrid
            items={INCHIDERE}
            selected={values.inchidere}
            onToggle={toggleIn('inchidere')}
            columns={1}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="f-inchidere-data"
              label="Data închiderii"
              type="date"
              value={values.inchidereData}
              onChange={setField('inchidereData')}
            />
            <TextField
              id="f-inchidere-ora"
              label="Ora închiderii"
              type="time"
              value={values.inchidereOra}
              onChange={setField('inchidereOra')}
            />
          </div>
        </SectionCard>
      </main>

      <SubmitBar toast={toast} loading={submitting} done={sent} onSubmit={handleSubmit} />
    </PageTransition>
  )
}
