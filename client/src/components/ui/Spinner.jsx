const tones = {
  // On a filled brand button.
  onBrand: 'border-white/35 border-t-white',
  // On a white/outline surface.
  brand: 'border-brand/25 border-t-brand',
}

export default function Spinner({ tone = 'onBrand', className = '' }) {
  return (
    <span
      role="status"
      aria-label="Se încarcă"
      className={`block h-[13px] w-[13px] animate-spin rounded-full border-2 ${tones[tone]} ${className}`}
    />
  )
}
