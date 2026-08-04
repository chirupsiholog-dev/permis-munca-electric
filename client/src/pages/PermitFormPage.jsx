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
import { CONFIRMARI, EIP, MASURI, RISCURI, TIPURI_LUCRARE } from '../lib/constants.js'

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
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  function flash(message) {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }

  function handleSubmit() {
    if (!completeness.isComplete) {
      flash('Completează toate secțiunile obligatorii înainte de trimitere.')
      return
    }

    // ─────────────────────────────────────────────────────────────────────
    // TODO(backend): POST `values` to your permit endpoint here.
    // `values` is already the exact payload shape — nothing to reshape.
    // ─────────────────────────────────────────────────────────────────────
    flash(`Permis trimis spre semnare către ${values.sefLucrare}.`)
  }

  const tipOptions = TIPURI_LUCRARE.map((t) => ({ value: t, label: t }))

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
              show={values.tip === 'Altul'}
              type="text"
              placeholder="Descrie tipul lucrării"
              aria-label="Descrie tipul lucrării"
              value={values.tipAltul}
              onChange={setField('tipAltul')}
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
          <TextField
            id="f-sef"
            label="Șef de lucrare"
            type="text"
            placeholder="Nume și prenume"
            value={values.sefLucrare}
            onChange={setField('sefLucrare')}
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
          <CheckboxGrid items={RISCURI} values={values.riscuri} onToggle={toggleIn('riscuri')} />

          <div className="flex flex-col gap-[11px]">
            <Checkbox
              label="Alte riscuri"
              checked={values.alteRiscuriOn}
              onChange={(e) => {
                setValue('alteRiscuriOn', e.target.checked)
                if (!e.target.checked) setValue('alteRiscuri', '')
              }}
            />
            <RevealInput
              show={values.alteRiscuriOn}
              type="text"
              placeholder="Descrie riscurile suplimentare"
              aria-label="Alte riscuri"
              value={values.alteRiscuri}
              onChange={setField('alteRiscuri')}
            />
          </div>
        </SectionCard>

        {/* 5 ─ Măsuri ------------------------------------------------------- */}
        <SectionCard index={5} title="Măsuri de securitate aplicate">
          <CheckboxGrid items={MASURI} values={values.masuri} onToggle={toggleIn('masuri')} />
          <Checkbox
            label="Alte măsuri: se va respecta foaia de manevră"
            checked={values.alteMasuriOn}
            onChange={(e) => setValue('alteMasuriOn', e.target.checked)}
          />
        </SectionCard>

        {/* 6 ─ EIP ---------------------------------------------------------- */}
        <SectionCard index={6} title="Echipament individual de protecție">
          <CheckboxGrid items={EIP} values={values.eip} onToggle={toggleIn('eip')} />

          <div className="flex flex-col gap-[11px]">
            <Checkbox
              label="Alte EIP"
              checked={values.alteEipOn}
              onChange={(e) => {
                setValue('alteEipOn', e.target.checked)
                if (!e.target.checked) setValue('alteEip', '')
              }}
            />
            <RevealInput
              show={values.alteEipOn}
              type="text"
              placeholder="Descrie echipamentul suplimentar"
              aria-label="Alte EIP"
              value={values.alteEip}
              onChange={setField('alteEip')}
            />
          </div>
        </SectionCard>

        {/* 7 ─ Confirmări --------------------------------------------------- */}
        <SectionCard index={7} title="Confirmări înainte de începerea lucrării">
          <CheckboxGrid
            items={CONFIRMARI}
            values={values.confirmari}
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
      </main>

      <SubmitBar toast={toast} onSubmit={handleSubmit} />
    </PageTransition>
  )
}
