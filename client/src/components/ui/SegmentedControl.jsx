/**
 * Joined button row (tip lucrare, archive filters). Uses radio semantics so
 * arrow keys and screen readers behave — the design's visual is unchanged.
 *
 * `options` is `[{ value, label }]`.
 */
export default function SegmentedControl({ options, value, onChange, size = 'md', label }) {
  const padding = size === 'lg' ? 'px-[18px] text-cta tracking-section' : 'px-4 text-meta tracking-tab'

  return (
    <div role="radiogroup" aria-label={label} className="flex w-fit flex-wrap border border-line-strong">
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={[
              'h-10 cursor-pointer border-0 border-r border-line-strong font-bold uppercase',
              'transition-colors duration-150 last:border-r-0',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
              padding,
              active
                ? 'bg-brand text-white hover:bg-brand-hover'
                : 'bg-surface text-ink-600 hover:bg-info-bg hover:text-brand-text',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
