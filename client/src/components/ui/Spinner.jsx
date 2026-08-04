export default function Spinner({ className = '' }) {
  return (
    <span
      role="status"
      aria-label="Se încarcă"
      className={`block h-[13px] w-[13px] animate-spin rounded-full border-2 border-white/35 border-t-white ${className}`}
    />
  )
}
