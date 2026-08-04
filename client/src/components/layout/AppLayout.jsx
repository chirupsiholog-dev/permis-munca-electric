import { Outlet } from 'react-router-dom'

import { CURRENT_USER } from '../../lib/placeholderData.js'
import Header from './Header.jsx'

/**
 * Shell for every authenticated screen: fixed-height header, then the page.
 * Pages own their own <main> because the max-width differs per screen
 * (1080 home / 880 form / 1240 archive) and the form adds a sticky footer.
 */
export default function AppLayout() {
  // TODO(backend): swap for the authenticated user from your session/context.
  const user = CURRENT_USER

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink-900">
      <Header user={user} />
      <Outlet context={{ user }} />
    </div>
  )
}
