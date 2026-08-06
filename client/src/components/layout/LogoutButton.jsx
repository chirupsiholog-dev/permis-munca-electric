import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Spinner from '../ui/Spinner.jsx'

/**
 * Ends the session.
 *
 * POST /api/auth/logout blacklists the jwtId in Redis for the token's remaining
 * lifetime, which is what actually invalidates it server side. But the local
 * token is dropped and the user redirected *regardless* of how that call goes —
 * if the network is down, "log me out" still has to mean logged out on this
 * device. Worst case the token stays technically valid until it expires, which
 * is no worse than never having called logout at all.
 */
export default function LogoutButton() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    if (busy) return
    setBusy(true)

    try {
      const jwt = localStorage.getItem('token')
      if (jwt) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
        })
      }
    } catch {
      // Best effort — falling through to the local cleanup below.
    } finally {
      localStorage.removeItem('token')
      // replace: no going "back" into an authenticated page after logging out.
      navigate('/login', { replace: true })
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      title="Ieși din cont"
      className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-nav font-bold uppercase tracking-label text-ink-400 transition-colors duration-150 hover:text-ink disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {busy && <Spinner tone="brand" className="h-[11px] w-[11px]" />}
      Ieșire
    </button>
  )
}
