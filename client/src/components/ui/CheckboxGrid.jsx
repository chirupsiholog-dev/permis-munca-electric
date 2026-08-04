import Checkbox from './Checkbox.jsx'

/**
 * Checkbox group backed by an array of slugs.
 *
 * `items`    — `[{ slug, label }]` from lib/constants.js
 * `selected` — the array of currently-ticked slugs (e.g. `values.riscuri`)
 * `onToggle` — `(slug) => void`, i.e. `toggleIn('riscuri')`
 */
export default function CheckboxGrid({ items, selected, onToggle, columns = 2 }) {
  return (
    <div
      className={`grid grid-cols-1 gap-x-[22px] gap-y-[11px] ${
        columns === 2 ? 'sm:grid-cols-2' : ''
      }`}
    >
      {items.map(({ slug, label }) => (
        <Checkbox
          key={slug}
          label={label}
          checked={selected.includes(slug)}
          onChange={() => onToggle(slug)}
        />
      ))}
    </div>
  )
}
