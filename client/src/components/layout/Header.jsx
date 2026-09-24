import { NavLink } from 'react-router-dom'

import Wordmark from '../brand/Wordmark.jsx'
import LogoutButton from './LogoutButton.jsx'
import UserBadge from './UserBadge.jsx'
import { homePath } from '../../lib/roles.js'

const ADMIN_NAV = [
  { to: '/', label: 'Acasă', end: true },
  { to: '/permise', label: 'Permise' },
  { to: '/autorizatii', label: 'Autorizații' },
  { to: '/arhiva', label: 'Arhivă' },
  { to: '/rapoarte-on-site', label: 'Rapoarte on-site' },
  {to: '/cont-nou', label: 'Cont nou'},
  {to: '/inventare', label: 'Invertoare'},
  {to: '/autorizatie', label: 'Autorizatii'}
]

const USER_NAV = [
  { to: '/pagina-rapoarte', label: 'Rapoarte' },
  { to: '/inventare', label: 'Invertoare' },
]

export default function Header({ user }) {
  const nav = user.role === 'superuser' || user.role === 'admin' ? ADMIN_NAV : USER_NAV

  return (
    <header className="flex min-h-[62px] flex-none flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-7">
      <NavLink to={homePath(user.role)} aria-label="Permis Muncă Electric — pagina principală">
        <Wordmark />
      </NavLink>

      <div className="flex flex-wrap items-center gap-4 sm:gap-[22px]">
        <nav aria-label="Navigare principală" className="flex flex-wrap items-center gap-x-[22px] gap-y-3 text-nav font-bold uppercase tracking-label">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'border-b-2 pb-0.5 no-underline transition-colors duration-150',
                  isActive
                    ? 'border-brand text-ink'
                    : 'border-transparent text-ink-500 hover:text-ink',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <UserBadge user={user} />
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
