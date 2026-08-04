export default function Checkbox({ label, className = '', ...props }) {
  return (
    <label
      className={`group flex cursor-pointer items-start gap-2.5 text-body-sm text-ink-700 transition-colors duration-150 hover:text-ink ${className}`}
    >
      <input
        type="checkbox"
        {...props}
        className="mt-0.5 h-[15px] w-[15px] flex-none cursor-pointer rounded-none accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
      <span>{label}</span>
    </label>
  )
}
