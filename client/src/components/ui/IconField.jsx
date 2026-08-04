import { forwardRef } from 'react'

/**
 * Login-screen input: a white icon gutter fused to a tinted input.
 * The tint lives on the wrapper and reacts to `focus-within`, so the gutter
 * stays white while the typing area lights up — matching the design.
 */
const IconField = forwardRef(function IconField({ icon, className = '', ...props }, ref) {
  return (
    <div className="flex border border-line-strong bg-field transition-colors duration-150 focus-within:bg-field-focus">
      <div className="flex w-[42px] flex-none items-center justify-center border-r border-line-strong bg-surface">
        {icon}
      </div>
      <input
        ref={ref}
        {...props}
        className={
          'h-[42px] min-w-0 flex-1 border-0 bg-transparent px-3 text-body text-ink-900 ' +
          'outline-0 ' + className
        }
      />
    </div>
  )
})

export default IconField

/* ---- the two icons the login form uses, inlined to avoid an icon dep ---- */

export function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b939c" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="9" r="3.2" />
      <path d="M5.5 19.5c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6" />
    </svg>
  )
}

export function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b939c" strokeWidth="1.6" aria-hidden="true">
      <rect x="5.2" y="10.5" width="13.6" height="9" />
      <path d="M8.6 10.5V8.1a3.4 3.4 0 0 1 6.8 0v2.4" />
    </svg>
  )
}
