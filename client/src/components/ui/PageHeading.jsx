export default function PageHeading({ title, subtitle, className = '' }) {
  return (
    <div className={`flex flex-col gap-[7px] ${className}`}>
      <h1 className="m-0 text-display font-medium text-ink-800">{title}</h1>
      {subtitle && (
        <p className="m-0 max-w-[560px] text-lead text-ink-550 [text-wrap:pretty]">{subtitle}</p>
      )}
    </div>
  )
}
