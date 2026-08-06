import { NavLink } from 'react-router-dom'

import Wordmark from '../brand/Wordmark.jsx'
import LogoutButton from './LogoutButton.jsx'
import UserBadge from './UserBadge.jsx'

const NAV = [
  { to: '/', label: 'Acasă', end: true },
  { to: '/permise', label: 'Permise' },
  { to: '/arhiva', label: 'Arhivă' },
]

export default function Header({ user }) {
  return (
    <header className="flex h-[62px] flex-none items-center justify-between border-b border-line bg-surface px-7">
      <NavLink to="/" aria-label="Permis Muncă Electric — acasă">
        <Wordmark />
      </NavLink>

      <div className="flex items-center gap-[22px]">
        <nav className="flex items-center gap-[22px] text-nav font-bold uppercase tracking-label">
          {NAV.map((item) => (
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
