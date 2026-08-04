import { AnimatePresence } from 'framer-motion'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import Header from './Header.jsx'
import Wordmark from '../brand/Wordmark.jsx'
import { useEffect, useState } from 'react'

const EMPTY = { id: '', email: '', username: '' }

export default function AppLayout() {

  const location = useLocation()
  const [user, setUser] = useState(EMPTY)
  const [status, setStatus] = useState('checking') // checking | authed | anon | error

  useEffect(() => {
    const jwt = localStorage.getItem('token')

    if (!jwt) {
      setStatus('anon')
      return
    }

    const controller = new AbortController()

    async function loadMe() {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${jwt}` },
          signal: controller.signal,
        })

        if (res.status === 401) {
          localStorage.removeItem('token')
          setStatus('anon')
          return
        }

        if (!res.ok) {
          setStatus('error')
          return
        }

        const d = await res.json()
        setUser(d.data ?? EMPTY)
        setStatus('authed')
      } catch (err) {
        if (err.name === 'AbortError') return
        setStatus('error')
      }
    }

    loadMe()
    return () => controller.abort()
  }, [])

  const tokens = String(user?.username ?? '').trim().split(/\s+/).filter(Boolean)
  const nume = tokens[0] ?? ''
  const prenume = tokens.slice(1).join(' ');
  const numeAfisat = [prenume, nume].filter(Boolean).join(' ');
  const initiale = [prenume, nume].filter(Boolean).map(p => p[0].toUpperCase()).join('');

  const profile = {
    ...user,
    nume,
    prenume,
    numeAfisat,
    initiale
  }

  if (status === 'checking') return <AuthSplash />

  // `state` carries where they were headed so login can send them back, and
  // `replace` keeps the protected URL out of the history stack.
  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (status === 'error') return <AuthSplash failed />

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink-900">
      <Header user={profile} />

      {/* Only the page is keyed, so this layout — and its /auth/me fetch —
          survives navigation. PageTransition inside each page still supplies the
          exit variants AnimatePresence waits on. */}
      <AnimatePresence mode="wait" initial={false}>
        <Outlet key={location.pathname} context={{ profile }} />
      </AnimatePresence>
    </div>
  )
}

/** Shown while the session is being verified, and if that check fails outright. */
function AuthSplash({ failed = false }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-5 text-center">
      <Wordmark size="lg" />

      {failed ? (
        <>
          <p className="m-0 max-w-[380px] text-body-sm text-ink-500">
            Nu am putut verifica sesiunea. Verifică conexiunea și încearcă din nou.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-[38px] cursor-pointer border border-line-btn bg-surface px-4 text-nav font-bold uppercase tracking-label text-brand transition-colors duration-150 hover:border-brand hover:bg-info-bg"
          >
            Reîncearcă
          </button>
        </>
      ) : (
        <span className="text-label font-bold uppercase tracking-label text-ink-400">
          Se verifică sesiunea…
        </span>
      )}
    </div>
  )
}
