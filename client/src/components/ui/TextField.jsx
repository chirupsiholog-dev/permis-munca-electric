import { forwardRef, useId } from 'react'

import FieldLabel from './FieldLabel.jsx'

export const inputClasses =
  'h-[42px] w-full border border-line-strong bg-field px-3 text-body text-ink-900 outline-0 ' +
  'transition-colors duration-150 focus:bg-field-focus ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

/** Label + input pair. Generates its own id when one isn't supplied. */
const TextField = forwardRef(function TextField(
  { label, id, className = '', wrapperClassName = '', ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className={`flex flex-col gap-[7px] ${wrapperClassName}`}>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <input ref={ref} id={inputId} className={`${inputClasses} ${className}`} {...props} />
    </div>
  )
})

export default TextField
