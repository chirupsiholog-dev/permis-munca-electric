import { Outlet } from 'react-router-dom'

/**
 * Shell for unauthenticated screens. The horizontal gradient is what separates
 * the login screen from the flat canvas used everywhere else.
 */
export default function AuthLayout() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-[26px] px-5 py-14 text-ink-900"
      style={{
        background: 'linear-gradient(90deg, #f5f6f7 0%, #e8eaeb 50%, #f5f6f7 100%)',
      }}
    >
      <Outlet />
    </div>
  )
}
