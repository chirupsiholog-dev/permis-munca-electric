import Spinner from './Spinner.jsx'

const base =
  'inline-flex items-center justify-center gap-2.5 border font-bold uppercase ' +
  'transition-colors duration-150 cursor-pointer no-underline ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const variants = {
  primary:
    'border-transparent bg-brand text-white hover:bg-brand-hover active:bg-brand-active hover:text-white',
  outline:
    'border-line-btn bg-surface text-brand hover:border-brand hover:bg-info-bg',
  neutral:
    'border-line-btn bg-surface text-ink-500 hover:border-ink-200 hover:text-ink-800',
}

const sizes = {
  lg: 'h-[46px] px-7 text-cta tracking-cta',
  md: 'h-11 px-[26px] text-[12px] tracking-label',
  sm: 'h-[38px] px-4 text-nav tracking-label',
  xs: 'h-[42px] px-3 text-label tracking-label',
}

/**
 * Renders a <button> by default; pass `as={Link} to="..."` for navigation that
 * needs to look identical to a button (used by the home-screen CTA).
 */
export default function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  type,
  disabled,
  className = '',
  children,
  ...props
}) {
  const isButton = Tag === 'button'

  return (
    <Tag
      {...props}
      {...(isButton ? { type: type ?? 'button', disabled: loading || disabled } : {})}
      className={[
        base,
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading && <Spinner />}
      {children}
    </Tag>
  )
}
