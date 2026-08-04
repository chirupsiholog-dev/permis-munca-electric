import { AnimatePresence } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

import Header from './Header.jsx'
import { useEffect, useState } from 'react'


export default function AppLayout() {

  const location = useLocation()
  const [user, setUser] = useState({id: '', email: '', username: ''})

  useEffect(() => {
    const jwt = localStorage.getItem('token');
    fetch('/api/auth/me', {method: 'GET', headers:{
      Authorization: `Bearer ${jwt}`
    }}).then(r => r.json()).then(d => setUser(d.data??''))
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
