import Checkbox from './Checkbox.jsx'

/**
 * Two-column checkbox group used by riscuri / măsuri / EIP.
 * `values` is a `{ [label]: boolean }` map; `onToggle(label)` flips one entry.
 */
export default function CheckboxGrid({ items, values, onToggle, columns = 2 }) {
  return (
    <div
      className={`grid grid-cols-1 gap-x-[22px] gap-y-[11px] ${
        columns === 2 ? 'sm:grid-cols-2' : ''
      }`}
    >
      {items.map((label) => (
        <Checkbox
          key={label}
          label={label}
          checked={!!values[label]}
          onChange={() => onToggle(label)}
        />
      ))}
    </div>
  )
}
