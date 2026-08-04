/**
 * A placeholder block for content that hasn't arrived yet.
 *
 * Square corners and a flat fill to match the rest of the system — the pulse is
 * the only thing signalling "loading", so it stays subtle. Size it with
 * className; the component itself is unopinionated about dimensions.
 */
export default function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`block animate-pulse bg-line-soft ${className}`} />
}
