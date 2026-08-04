import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'

/**
 * Shown once the permit exists in the DB and at Namirial.
 *
 * This is the only place the emitent ever sees their own signing link — nothing
 * emails it to them, and the whole workflow is blocked on their signature. So the
 * link and the access code stay on screen rather than in a toast that disappears.
 *
 * `permit` is the row returned by POST /api/documents/new (`data.data`).
 */
export default function PermitCreatedPanel({ permit }) {
  const link = permit?.emitent_signing_link
  const code = permit?.cod_acces

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="flex flex-col items-center gap-5 px-9 pb-9 pt-10 text-center">
        <CheckMark />

        <div className="flex flex-col items-center gap-2">
          <h1 className="m-0 text-display font-medium text-ink-800">Permis creat</h1>
          <p className="m-0 max-w-[460px] text-lead text-ink-550 [text-wrap:pretty]">
            Documentul a fost generat. Trebuie să îl semnezi tu primul - șeful de lucrare primește
            link-ul automat, prin email, imediat după semnătura ta.
          </p>
        </div>

        {code && <AccessCode code={code} />}

        {link ? (
          <Button
            as="a"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="w-full max-w-[380px]"
          >
            Semnează permisul
          </Button>
        ) : (
          <Alert tone="warn" className="w-full max-w-[460px] text-left">
            Link-ul de semnare nu a fost returnat. Deschide permisul din arhivă pentru a relua
            semnarea.
          </Alert>
        )}

        <p className="m-0 text-meta text-ink-400">
          Link-ul se deschide într-o filă nouă. Îl regăsești oricând în{' '}
          <Link to="/arhiva">arhivă</Link>.
        </p>
      </Card>
    </motion.div>
  )
}

/** The code Namirial prompts for at the signing step — useless link without it. */
function AccessCode({ code }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (insecure origin, permissions) — the code is on screen
      // anyway, so there is nothing to recover from.
    }
  }

  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-2.5 border-l-[3px] border-warn bg-[#fdf9ef] px-5 py-4">
      <span className="text-label font-bold uppercase tracking-label text-warn-text">
        Cod de acces
      </span>

      <span className="font-mono text-[26px] font-bold leading-none tracking-[0.28em] text-ink">
        {code}
      </span>

      <button
        type="button"
        onClick={copy}
        className="cursor-pointer border-0 bg-transparent p-0 text-label font-bold uppercase tracking-label text-brand transition-colors duration-150 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {copied ? 'Copiat' : 'Copiază'}
      </button>

      <span className="text-meta leading-normal text-ink-500">
        Ți se va cere acest cod la pasul de semnare.
      </span>
    </div>
  )
}

function CheckMark() {
  return (
    <div className="flex h-14 w-14 items-center justify-center bg-brand">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="square"
        aria-hidden="true"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </div>
  )
}
