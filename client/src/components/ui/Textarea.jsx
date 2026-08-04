export default function Textarea({ className = '', ...props }) {
  return (
    <textarea
      {...props}
      className={
        'w-full resize-y border border-line-strong bg-field px-3 py-[11px] text-body ' +
        'leading-normal text-ink-900 outline-0 transition-colors duration-150 focus:bg-field-focus ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
        className
      }
    />
  )
}
