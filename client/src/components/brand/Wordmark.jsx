/**
 * The two-line "PERMIS MUNCĂ / ELECTRIC" lockup.
 * The wide tracking on the second line is what optically aligns it to the
 * first — don't change one without the other.
 */
export default function Wordmark({ size = 'sm', className = '' }) {
  const fontSize = size === 'lg' ? 'text-[19px]' : 'text-[13px]'

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className={`${fontSize} font-bold leading-none tracking-wordmark text-brand`}>
        PERMIS MUNCĂ
      </span>
      <span className={`${fontSize} font-bold leading-none tracking-wordmark-wide text-ink`}>
        ELECTRIC
      </span>
    </div>
  )
}
