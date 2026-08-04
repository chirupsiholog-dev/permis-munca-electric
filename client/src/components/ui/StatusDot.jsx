/**
 * Square status marker + uppercase label. Two tones only, mirroring the
 * design: `signed` (brand) and `pending` (amber).
 */
const tones = {
  signed: { dot: 'bg-brand', text: 'text-brand-text' },
  pending: { dot: 'bg-warn', text: 'text-warn-text' },
  // Terminal state — matches the black "Complet" tile on the home screen.
  done: { dot: 'bg-ink', text: 'text-ink' },
}

export default function StatusDot({ tone = 'pending', label, size = 'md' }) {
  const t = tones[tone]
  const dotSize = size === 'sm' ? 'h-[7px] w-[7px]' : 'h-2 w-2'
  const textSize = size === 'sm' ? 'text-nav' : 'text-meta'
  const gap = size === 'sm' ? 'gap-[7px]' : 'gap-2'

  return (
    <span className={`flex items-center ${gap}`}>
      <span className={`${dotSize} flex-none ${t.dot}`} aria-hidden="true" />
      <span className={`${textSize} font-bold uppercase tracking-status ${t.text}`}>{label}</span>
    </span>
  )
}
