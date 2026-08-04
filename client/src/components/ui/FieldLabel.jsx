/**
 * The small uppercase caption above every input. Renders as <label> when given
 * an `htmlFor`, otherwise as a <span> (for groups that aren't a single input).
 */
export default function FieldLabel({ htmlFor, className = '', children }) {
  const Tag = htmlFor ? 'label' : 'span'

  return (
    <Tag
      htmlFor={htmlFor}
      className={`text-label font-bold uppercase tracking-label text-ink-500 ${className}`}
    >
      {children}
    </Tag>
  )
}
